import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import matter from "gray-matter";

/**
 * Canonical Codex skill-tree lint.
 *
 * The kata business skills live once under `.claude/skills/<name>` and are
 * exposed to Codex via `.agents/skills/<name>` symlinks (Codex native skill
 * discovery: a project-local `.agents/skills/` tree, zero restructuring). This
 * lint asserts that canonical shape and guards against regressing to the old
 * per-skill `agents/openai.yaml` + `agents/source-map.json` copy scheme, which
 * does not exist anywhere in the real Codex/agentskills ecosystem.
 */
export type CodexSkillRule =
  | "CODEX_SYMLINK_MISSING"
  | "CODEX_NOT_SYMLINK"
  | "CODEX_SYMLINK_TARGET"
  | "CODEX_DANGLING_SYMLINK"
  | "CODEX_INVENTED_ARTIFACT"
  | "CODEX_BOOTSTRAP_MISSING"
  | "CODEX_BOOTSTRAP_FRONTMATTER"
  | "CODEX_MAPPING_MISSING"
  | "CODEX_PLUGIN_MANIFEST_MISSING"
  | "CODEX_PLUGIN_MANIFEST_INVALID";

export interface CodexSkillViolation {
  rule: CodexSkillRule;
  path: string;
  message: string;
}

export interface CodexSkillReport {
  passed: boolean;
  violations: CodexSkillViolation[];
}

const BOOTSTRAP = "using-kata-codex";
const INVENTED_BASENAMES = new Set(["openai.yaml", "source-map.json"]);

function lstatSafe(p: string): ReturnType<typeof lstatSync> | null {
  try {
    return lstatSync(p);
  } catch {
    return null;
  }
}

// 列出 .claude/skills 下的业务 skill（跳过 `_` 前缀聚合目录，与 runtime-sync 一致）
function businessSkillNames(claudeSkills: string): string[] {
  if (!existsSync(claudeSkills)) return [];
  return readdirSync(claudeSkills, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => e.name);
}

// 不跟随 symlink 地遍历，收集任何虚构产物文件（openai.yaml / source-map.json）
function collectInventedArtifacts(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue; // symlink 指向 .claude，不算 .agents 自身产物
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectInventedArtifacts(p, out);
    } else if (INVENTED_BASENAMES.has(entry.name)) {
      out.push(p);
    }
  }
}

function checkSymlinks(
  root: string,
  claudeSkills: string,
  agentSkills: string,
  violations: CodexSkillViolation[],
): void {
  for (const name of businessSkillNames(claudeSkills)) {
    const link = join(agentSkills, name);
    const st = lstatSafe(link);
    if (!st) {
      violations.push({
        rule: "CODEX_SYMLINK_MISSING",
        path: link,
        message: `.agents/skills/${name} is required (symlink to .claude/skills/${name})`,
      });
      continue;
    }
    if (!st.isSymbolicLink()) {
      violations.push({
        rule: "CODEX_NOT_SYMLINK",
        path: link,
        message: `.agents/skills/${name} must be a symlink to .claude/skills/${name}, not a copy`,
      });
      continue;
    }
    let real: string;
    try {
      real = realpathSync(link);
    } catch {
      violations.push({
        rule: "CODEX_DANGLING_SYMLINK",
        path: link,
        message: `.agents/skills/${name} symlink target does not resolve`,
      });
      continue;
    }
    const expected = realpathSync(join(claudeSkills, name));
    if (real !== expected) {
      violations.push({
        rule: "CODEX_SYMLINK_TARGET",
        path: link,
        message: `.agents/skills/${name} must resolve to .claude/skills/${name} (got ${relative(root, real)})`,
      });
    }
  }
}

function checkBootstrap(agentSkills: string, violations: CodexSkillViolation[]): void {
  const skillMd = join(agentSkills, BOOTSTRAP, "SKILL.md");
  if (!existsSync(skillMd)) {
    violations.push({
      rule: "CODEX_BOOTSTRAP_MISSING",
      path: skillMd,
      message: `${BOOTSTRAP}/SKILL.md is required (tool mapping + routing bootstrap)`,
    });
  } else {
    let data: Record<string, unknown> = {};
    try {
      data = matter(readFileSync(skillMd, "utf8")).data;
    } catch {
      data = {};
    }
    if (
      data.name !== BOOTSTRAP ||
      typeof data.description !== "string" ||
      !data.description.trim()
    ) {
      violations.push({
        rule: "CODEX_BOOTSTRAP_FRONTMATTER",
        path: skillMd,
        message: `${BOOTSTRAP}/SKILL.md frontmatter must set name: ${BOOTSTRAP} and a non-empty description`,
      });
    }
  }

  const mapping = join(agentSkills, BOOTSTRAP, "references", "codex-tools.md");
  if (!existsSync(mapping) || statSync(mapping).size === 0) {
    violations.push({
      rule: "CODEX_MAPPING_MISSING",
      path: mapping,
      message: `${BOOTSTRAP}/references/codex-tools.md is required and must be non-empty`,
    });
  }
}

function checkPluginManifest(root: string, violations: CodexSkillViolation[]): void {
  const manifest = join(root, ".codex-plugin", "plugin.json");
  if (!existsSync(manifest)) {
    violations.push({
      rule: "CODEX_PLUGIN_MANIFEST_MISSING",
      path: manifest,
      message: ".codex-plugin/plugin.json is required (plugin-level interface metadata)",
    });
    return;
  }
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(readFileSync(manifest, "utf8"));
  } catch {
    violations.push({
      rule: "CODEX_PLUGIN_MANIFEST_INVALID",
      path: manifest,
      message: "plugin.json is not valid JSON",
    });
    return;
  }
  const fail = (message: string) =>
    violations.push({ rule: "CODEX_PLUGIN_MANIFEST_INVALID", path: manifest, message });

  if (typeof json.skills !== "string") fail('plugin.json must have a string "skills" pointer');

  const iface = json.interface as Record<string, unknown> | undefined;
  if (!iface || typeof iface !== "object") {
    fail('plugin.json must have an "interface" object');
    return;
  }
  if (typeof iface.displayName !== "string") {
    fail("interface.displayName (camelCase string) is required");
  }
  if (!Array.isArray(iface.defaultPrompt)) {
    fail("interface.defaultPrompt must be an array of example prompts");
  }
  for (const k of ["display_name", "short_description", "default_prompt"]) {
    if (k in iface)
      fail(`interface uses snake_case key "${k}"; canonical Codex interface is camelCase`);
  }
  const policy = (json.policy ?? iface.policy) as Record<string, unknown> | undefined;
  if (policy && "allow_implicit_invocation" in policy) {
    fail(
      "policy.allow_implicit_invocation is not a Codex field; gate invocation via SKILL.md user-invocable",
    );
  }
}

export function lintCodexSkillTree(root: string): CodexSkillReport {
  const violations: CodexSkillViolation[] = [];
  const claudeSkills = join(root, ".claude", "skills");
  const agentSkills = join(root, ".agents", "skills");

  checkSymlinks(root, claudeSkills, agentSkills, violations);

  const invented: string[] = [];
  collectInventedArtifacts(agentSkills, invented);
  for (const p of invented) {
    violations.push({
      rule: "CODEX_INVENTED_ARTIFACT",
      path: p,
      message:
        "per-skill openai.yaml / source-map.json is not a Codex artifact; interface lives in .codex-plugin/plugin.json",
    });
  }

  checkBootstrap(agentSkills, violations);
  checkPluginManifest(root, violations);

  return { passed: violations.length === 0, violations };
}

export function formatCodexSkillReport(report: CodexSkillReport, root: string): string {
  if (report.passed) return "codex skill shape passed";
  const absoluteRoot = resolve(root);
  return [
    "codex skill shape failed",
    ...report.violations.map((v) => {
      const p =
        v.path === absoluteRoot || v.path.startsWith(`${absoluteRoot}/`)
          ? relative(absoluteRoot, v.path)
          : v.path;
      return `${v.rule} ${p} — ${v.message}`;
    }),
  ].join("\n");
}
