import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import matter from "gray-matter";

/**
 * Hermes Agent skill-tree lint.
 *
 * The kata business skills live once under `.claude/skills/<name>` and are
 * exposed to Hermes via `.hermes/skills/<name>` symlinks. This lint asserts
 * that canonical shape: symlinks resolve correctly, bootstrap SKILL.md exists
 * with correct frontmatter, and tool mapping is present.
 */
export type HermesSkillRule =
  | "HERMES_SYMLINK_MISSING"
  | "HERMES_NOT_SYMLINK"
  | "HERMES_SYMLINK_TARGET"
  | "HERMES_DANGLING_SYMLINK"
  | "HERMES_BOOTSTRAP_MISSING"
  | "HERMES_BOOTSTRAP_FRONTMATTER"
  | "HERMES_MAPPING_MISSING";

export interface HermesSkillViolation {
  rule: HermesSkillRule;
  path: string;
  message: string;
}

export interface HermesSkillReport {
  passed: boolean;
  violations: HermesSkillViolation[];
}

const BOOTSTRAP = "using-kata-hermes";

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
  violations: HermesSkillViolation[],
): void {
  for (const name of businessSkillNames(claudeSkills)) {
    const link = join(agentSkills, name);
    const st = lstatSafe(link);
    if (!st) {
      violations.push({
        rule: "HERMES_SYMLINK_MISSING",
        path: link,
        message: `.hermes/skills/${name} is required (symlink to .claude/skills/${name})`,
      });
      continue;
    }
    if (!st.isSymbolicLink()) {
      violations.push({
        rule: "HERMES_NOT_SYMLINK",
        path: link,
        message: `.hermes/skills/${name} must be a symlink to .claude/skills/${name}, not a copy`,
      });
      continue;
    }
    let real: string;
    try {
      real = realpathSync(link);
    } catch {
      violations.push({
        rule: "HERMES_DANGLING_SYMLINK",
        path: link,
        message: `.hermes/skills/${name} symlink target does not resolve`,
      });
      continue;
    }
    const expected = realpathSync(join(claudeSkills, name));
    if (real !== expected) {
      violations.push({
        rule: "HERMES_SYMLINK_TARGET",
        path: link,
        message: `.hermes/skills/${name} must resolve to .claude/skills/${name} (got ${relative(root, real)})`,
      });
    }
  }
}

function checkBootstrap(agentSkills: string, violations: HermesSkillViolation[]): void {
  const skillMd = join(agentSkills, BOOTSTRAP, "SKILL.md");
  if (!existsSync(skillMd)) {
    violations.push({
      rule: "HERMES_BOOTSTRAP_MISSING",
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
        rule: "HERMES_BOOTSTRAP_FRONTMATTER",
        path: skillMd,
        message: `${BOOTSTRAP}/SKILL.md frontmatter must set name: ${BOOTSTRAP} and a non-empty description`,
      });
    }
  }

  const mapping = join(agentSkills, BOOTSTRAP, "references", "hermes-tools.md");
  if (!existsSync(mapping) || statSync(mapping).size === 0) {
    violations.push({
      rule: "HERMES_MAPPING_MISSING",
      path: mapping,
      message: `${BOOTSTRAP}/references/hermes-tools.md is required and must be non-empty`,
    });
  }
}

export function lintHermesSkillTree(root: string): HermesSkillReport {
  const violations: HermesSkillViolation[] = [];
  const claudeSkills = join(root, ".claude", "skills");
  const agentSkills = join(root, ".hermes", "skills");

  checkSymlinks(root, claudeSkills, agentSkills, violations);
  checkBootstrap(agentSkills, violations);

  return { passed: violations.length === 0, violations };
}

export function formatHermesSkillReport(report: HermesSkillReport, root: string): string {
  if (report.passed) return "hermes skill shape passed";
  const absoluteRoot = resolve(root);
  return [
    "hermes skill shape failed",
    ...report.violations.map((v) => {
      const p =
        v.path === absoluteRoot || v.path.startsWith(`${absoluteRoot}/`)
          ? relative(absoluteRoot, v.path)
          : v.path;
      return `${v.rule} ${p} — ${v.message}`;
    }),
  ].join("\n");
}
