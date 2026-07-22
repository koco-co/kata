import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import matter from "gray-matter";

/**
 * Codex Skill tree rules.
 *
 * `case-draft` and `playwright-automation` are native Codex Skills. The other
 * business Skills remain transitional symlinks until they receive their own
 * Codex contracts. Claude prompts stay under `.claude/skills/**` and are not
 * used as the source text for native Codex Skills.
 */
export type CodexSkillRule =
  | "CODEX_SYMLINK_MISSING"
  | "CODEX_NOT_SYMLINK"
  | "CODEX_SYMLINK_TARGET"
  | "CODEX_DANGLING_SYMLINK"
  | "CODEX_NATIVE_SKILL_INVALID"
  | "CODEX_NATIVE_SKILL_FORBIDDEN_TEXT"
  | "CODEX_INVENTED_ARTIFACT"
  | "CODEX_BOOTSTRAP_MISSING"
  | "CODEX_BOOTSTRAP_FRONTMATTER"
  | "CODEX_MAPPING_MISSING"
  | "CODEX_PLUGIN_MANIFEST_MISSING"
  | "CODEX_PLUGIN_MANIFEST_INVALID";

export interface CodexSkillViolation {
  readonly rule: CodexSkillRule;
  readonly path: string;
  readonly message: string;
}

export interface CodexSkillReport {
  readonly passed: boolean;
  readonly violations: CodexSkillViolation[];
}

const BOOTSTRAP = "using-kata-codex";
const NATIVE_CODEX_SKILLS = new Set(["case-draft", "playwright-automation"]);
const INVENTED_BASENAMES = new Set(["openai.yaml", "source-map.json"]);
const FORBIDDEN_NATIVE_PATTERNS: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly label: string;
}> = [
  { pattern: /^model:\s*(?:sonnet|opus|haiku)\b/im, label: "Claude model name" },
  { pattern: /^allowed-tools:/im, label: "Claude allowed-tools frontmatter" },
  { pattern: /\bAskUserQuestion\b/, label: "Claude AskUserQuestion tool" },
  { pattern: /\bTodoWrite\b/, label: "Claude TodoWrite tool" },
  { pattern: /\bsubagent_type\b/, label: "Claude subagent_type field" },
];

type LstatResult = ReturnType<typeof lstatSync>;

function lstatSafe(path: string): LstatResult | null {
  try {
    return lstatSync(path);
  } catch {
    return null;
  }
}

function businessSkillNames(claudeSkills: string): string[] {
  if (!existsSync(claudeSkills)) return [];
  return readdirSync(claudeSkills, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
}

function collectInventedArtifacts(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collectInventedArtifacts(path, out);
    else if (INVENTED_BASENAMES.has(entry.name)) out.push(path);
  }
}

function collectMarkdownFiles(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collectMarkdownFiles(path, out);
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(path);
  }
}

function checkNativeSkill(
  name: string,
  skillDir: string,
  violations: CodexSkillViolation[],
): void {
  const dirStat = lstatSafe(skillDir);
  if (!dirStat || !dirStat.isDirectory() || dirStat.isSymbolicLink()) {
    violations.push({
      rule: "CODEX_NATIVE_SKILL_INVALID",
      path: skillDir,
      message: `.agents/skills/${name} must be a real directory`,
    });
    return;
  }

  const skillMd = join(skillDir, "SKILL.md");
  const skillStat = lstatSafe(skillMd);
  if (!skillStat || !skillStat.isFile() || skillStat.isSymbolicLink()) {
    violations.push({
      rule: "CODEX_NATIVE_SKILL_INVALID",
      path: skillMd,
      message: `${name}/SKILL.md must be a regular file`,
    });
    return;
  }

  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(readFileSync(skillMd, "utf8"));
  } catch {
    violations.push({
      rule: "CODEX_NATIVE_SKILL_INVALID",
      path: skillMd,
      message: `${name}/SKILL.md frontmatter is invalid`,
    });
    return;
  }

  if (
    parsed.data.name !== name ||
    typeof parsed.data.description !== "string" ||
    parsed.data.description.trim() === "" ||
    parsed.content.trim() === ""
  ) {
    violations.push({
      rule: "CODEX_NATIVE_SKILL_INVALID",
      path: skillMd,
      message: `${name}/SKILL.md must set matching name, a description, and a body`,
    });
  }

  const markdownFiles: string[] = [];
  collectMarkdownFiles(skillDir, markdownFiles);
  for (const path of markdownFiles) {
    const text = readFileSync(path, "utf8");
    for (const forbidden of FORBIDDEN_NATIVE_PATTERNS) {
      if (!forbidden.pattern.test(text)) continue;
      violations.push({
        rule: "CODEX_NATIVE_SKILL_FORBIDDEN_TEXT",
        path,
        message: `${name} contains ${forbidden.label}; native Codex prompts must use runtime-neutral contracts`,
      });
    }
  }
}

function checkBusinessSkills(
  root: string,
  claudeSkills: string,
  agentSkills: string,
  violations: CodexSkillViolation[],
): void {
  for (const name of businessSkillNames(claudeSkills)) {
    const agentPath = join(agentSkills, name);
    if (NATIVE_CODEX_SKILLS.has(name)) {
      checkNativeSkill(name, agentPath, violations);
      continue;
    }

    const stat = lstatSafe(agentPath);
    if (!stat) {
      violations.push({
        rule: "CODEX_SYMLINK_MISSING",
        path: agentPath,
        message: `.agents/skills/${name} is required during the compatibility migration`,
      });
      continue;
    }
    if (!stat.isSymbolicLink()) {
      violations.push({
        rule: "CODEX_NOT_SYMLINK",
        path: agentPath,
        message: `.agents/skills/${name} must remain a symlink until it has a reviewed native Codex contract`,
      });
      continue;
    }

    let real: string;
    try {
      real = realpathSync(agentPath);
    } catch {
      violations.push({
        rule: "CODEX_DANGLING_SYMLINK",
        path: agentPath,
        message: `.agents/skills/${name} symlink target does not resolve`,
      });
      continue;
    }

    const expectedPath = join(claudeSkills, name);
    const expectedStat = lstatSafe(expectedPath);
    if (!expectedStat) {
      violations.push({
        rule: "CODEX_DANGLING_SYMLINK",
        path: agentPath,
        message: `.claude/skills/${name} does not exist`,
      });
      continue;
    }
    const expected = realpathSync(expectedPath);
    if (real !== expected) {
      violations.push({
        rule: "CODEX_SYMLINK_TARGET",
        path: agentPath,
        message: `.agents/skills/${name} must resolve to .claude/skills/${name} (got ${relative(root, real)})`,
      });
    }
  }
}

function checkBootstrap(
  agentSkills: string,
  violations: CodexSkillViolation[],
): void {
  const skillMd = join(agentSkills, BOOTSTRAP, "SKILL.md");
  const stat = lstatSafe(skillMd);
  if (!stat || !stat.isFile() || stat.isSymbolicLink()) {
    violations.push({
      rule: "CODEX_BOOTSTRAP_MISSING",
      path: skillMd,
      message: `${BOOTSTRAP}/SKILL.md is required`,
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
      data.description.trim() === ""
    ) {
      violations.push({
        rule: "CODEX_BOOTSTRAP_FRONTMATTER",
        path: skillMd,
        message: `${BOOTSTRAP}/SKILL.md must set a matching name and non-empty description`,
      });
    }
  }

  const mapping = join(agentSkills, BOOTSTRAP, "references", "codex-tools.md");
  if (!existsSync(mapping) || statSync(mapping).size === 0) {
    violations.push({
      rule: "CODEX_MAPPING_MISSING",
      path: mapping,
      message: `${BOOTSTRAP}/references/codex-tools.md is required for compatibility Skills`,
    });
  }
}

function checkPluginManifest(
  root: string,
  violations: CodexSkillViolation[],
): void {
  const manifest = join(root, ".codex-plugin", "plugin.json");
  if (!existsSync(manifest)) {
    violations.push({
      rule: "CODEX_PLUGIN_MANIFEST_MISSING",
      path: manifest,
      message: ".codex-plugin/plugin.json is required",
    });
    return;
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(readFileSync(manifest, "utf8")) as Record<string, unknown>;
  } catch {
    violations.push({
      rule: "CODEX_PLUGIN_MANIFEST_INVALID",
      path: manifest,
      message: "plugin.json is not valid JSON",
    });
    return;
  }

  const fail = (message: string): void => {
    violations.push({ rule: "CODEX_PLUGIN_MANIFEST_INVALID", path: manifest, message });
  };

  if (typeof json.skills !== "string") {
    fail('plugin.json must have a string "skills" pointer');
  }
  const iface = json.interface as Record<string, unknown> | undefined;
  if (!iface || typeof iface !== "object") {
    fail('plugin.json must have an "interface" object');
    return;
  }
  if (typeof iface.displayName !== "string") {
    fail("interface.displayName is required");
  }
  if (!Array.isArray(iface.defaultPrompt)) {
    fail("interface.defaultPrompt must be an array");
  }
  for (const key of ["display_name", "short_description", "default_prompt"]) {
    if (key in iface) fail(`interface uses unsupported snake_case key "${key}"`);
  }
  const policy = (json.policy ?? iface.policy) as Record<string, unknown> | undefined;
  if (policy && "allow_implicit_invocation" in policy) {
    fail("policy.allow_implicit_invocation is not a Codex field");
  }
}

export function lintCodexSkillTree(root: string): CodexSkillReport {
  const violations: CodexSkillViolation[] = [];
  const claudeSkills = join(root, ".claude", "skills");
  const agentSkills = join(root, ".agents", "skills");

  checkBusinessSkills(root, claudeSkills, agentSkills, violations);

  const invented: string[] = [];
  collectInventedArtifacts(agentSkills, invented);
  for (const path of invented) {
    violations.push({
      rule: "CODEX_INVENTED_ARTIFACT",
      path,
      message: "openai.yaml and source-map.json are not project Skill artifacts",
    });
  }

  checkBootstrap(agentSkills, violations);
  checkPluginManifest(root, violations);
  return { passed: violations.length === 0, violations };
}

export function formatCodexSkillReport(
  report: CodexSkillReport,
  root: string,
): string {
  if (report.passed) return "codex skill shape passed";
  const absoluteRoot = resolve(root);
  return [
    "codex skill shape failed",
    ...report.violations.map((violation) => {
      const path =
        violation.path === absoluteRoot ||
        violation.path.startsWith(`${absoluteRoot}/`)
          ? relative(absoluteRoot, violation.path)
          : violation.path;
      return `${violation.rule} ${path} — ${violation.message}`;
    }),
  ].join("\n");
}
