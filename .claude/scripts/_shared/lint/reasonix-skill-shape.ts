import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import matter from "gray-matter";

/**
 * Reasonix (DeepSeek Agent) skill-tree lint.
 *
 * The kata business skills live once under `.claude/skills/<name>` and are
 * exposed to reasonix via `.reasonix/skills/<name>` symlinks. This lint asserts
 * that canonical shape: symlinks resolve correctly, bootstrap SKILL.md exists
 * with correct frontmatter, tool mapping is present, and plugin manifest is valid.
 */
export type ReasonixSkillRule =
  | "REASONIX_SYMLINK_MISSING"
  | "REASONIX_NOT_SYMLINK"
  | "REASONIX_SYMLINK_TARGET"
  | "REASONIX_DANGLING_SYMLINK"
  | "REASONIX_BOOTSTRAP_MISSING"
  | "REASONIX_BOOTSTRAP_FRONTMATTER"
  | "REASONIX_MAPPING_MISSING"
  | "REASONIX_PLUGIN_MANIFEST_MISSING"
  | "REASONIX_PLUGIN_MANIFEST_INVALID";

export interface ReasonixSkillViolation {
  rule: ReasonixSkillRule;
  path: string;
  message: string;
}

export interface ReasonixSkillReport {
  passed: boolean;
  violations: ReasonixSkillViolation[];
}

const BOOTSTRAP = "using-kata-reasonix";

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

function checkSymlinks(
  root: string,
  claudeSkills: string,
  agentSkills: string,
  violations: ReasonixSkillViolation[],
): void {
  for (const name of businessSkillNames(claudeSkills)) {
    const link = join(agentSkills, name);
    const st = lstatSafe(link);
    if (!st) {
      violations.push({
        rule: "REASONIX_SYMLINK_MISSING",
        path: link,
        message: `.reasonix/skills/${name} is required (symlink to .claude/skills/${name})`,
      });
      continue;
    }
    if (!st.isSymbolicLink()) {
      violations.push({
        rule: "REASONIX_NOT_SYMLINK",
        path: link,
        message: `.reasonix/skills/${name} must be a symlink to .claude/skills/${name}, not a copy`,
      });
      continue;
    }
    let real: string;
    try {
      real = realpathSync(link);
    } catch {
      violations.push({
        rule: "REASONIX_DANGLING_SYMLINK",
        path: link,
        message: `.reasonix/skills/${name} symlink target does not resolve`,
      });
      continue;
    }
    const expected = realpathSync(join(claudeSkills, name));
    if (real !== expected) {
      violations.push({
        rule: "REASONIX_SYMLINK_TARGET",
        path: link,
        message: `.reasonix/skills/${name} must resolve to .claude/skills/${name} (got ${relative(root, real)})`,
      });
    }
  }
}

function checkBootstrap(agentSkills: string, violations: ReasonixSkillViolation[]): void {
  const skillMd = join(agentSkills, BOOTSTRAP, "SKILL.md");
  if (!existsSync(skillMd)) {
    violations.push({
      rule: "REASONIX_BOOTSTRAP_MISSING",
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
        rule: "REASONIX_BOOTSTRAP_FRONTMATTER",
        path: skillMd,
        message: `${BOOTSTRAP}/SKILL.md frontmatter must set name: ${BOOTSTRAP} and a non-empty description`,
      });
    }
  }

  const mapping = join(agentSkills, BOOTSTRAP, "references", "reasonix-tools.md");
  if (!existsSync(mapping) || statSync(mapping).size === 0) {
    violations.push({
      rule: "REASONIX_MAPPING_MISSING",
      path: mapping,
      message: `${BOOTSTRAP}/references/reasonix-tools.md is required and must be non-empty`,
    });
  }
}

function checkPluginManifest(root: string, violations: ReasonixSkillViolation[]): void {
  const manifest = join(root, ".reasonix-plugin", "plugin.json");
  if (!existsSync(manifest)) {
    violations.push({
      rule: "REASONIX_PLUGIN_MANIFEST_MISSING",
      path: manifest,
      message: ".reasonix-plugin/plugin.json is required (plugin-level interface metadata)",
    });
    return;
  }
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(readFileSync(manifest, "utf8"));
  } catch {
    violations.push({
      rule: "REASONIX_PLUGIN_MANIFEST_INVALID",
      path: manifest,
      message: "plugin.json is not valid JSON",
    });
    return;
  }
  const fail = (message: string) =>
    violations.push({ rule: "REASONIX_PLUGIN_MANIFEST_INVALID", path: manifest, message });

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
}

export function lintReasonixSkillTree(root: string): ReasonixSkillReport {
  const violations: ReasonixSkillViolation[] = [];
  const claudeSkills = join(root, ".claude", "skills");
  const agentSkills = join(root, ".reasonix", "skills");

  checkSymlinks(root, claudeSkills, agentSkills, violations);
  checkBootstrap(agentSkills, violations);
  checkPluginManifest(root, violations);

  return { passed: violations.length === 0, violations };
}

export function formatReasonixSkillReport(report: ReasonixSkillReport, root: string): string {
  if (report.passed) return "reasonix skill shape passed";
  const absoluteRoot = resolve(root);
  return [
    "reasonix skill shape failed",
    ...report.violations.map((v) => {
      const p =
        v.path === absoluteRoot || v.path.startsWith(`${absoluteRoot}/`)
          ? relative(absoluteRoot, v.path)
          : v.path;
      return `${v.rule} ${p} — ${v.message}`;
    }),
  ].join("\n");
}
