import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import matter from "gray-matter";

/**
 * Hermes Agent skill-tree lint.
 *
 * The kata business skills live once under `.claude/skills/<name>`. Hermes
 * discovers them via `external_dirs` in `~/.hermes/config.yaml` pointing at the
 * real `.claude/skills/` directory — NOT via symlinks: whole-directory symlinks
 * under the skills dir are omitted from Hermes discovery (upstream bug
 * NousResearch/hermes-agent#8293). This lint asserts the opposite of the
 * codex/reasonix trees: `.hermes/skills/` must hold only the real
 * `using-kata-hermes` bootstrap (with its tool mapping) and NO skill symlinks,
 * and the bootstrap must document the external_dirs discovery mechanism.
 */
export type HermesSkillRule =
  | "HERMES_STRAY_SYMLINK"
  | "HERMES_BOOTSTRAP_MISSING"
  | "HERMES_BOOTSTRAP_FRONTMATTER"
  | "HERMES_MAPPING_MISSING"
  | "HERMES_EXTERNAL_DIRS_UNDOCUMENTED";

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

// `.hermes/skills/` 下不得出现任何 symlink（symlink 目录会被 Hermes 发现机制漏掉，见 #8293）
function checkNoStraySymlinks(agentSkills: string, violations: HermesSkillViolation[]): void {
  if (!existsSync(agentSkills)) return;
  for (const entry of readdirSync(agentSkills)) {
    const p = join(agentSkills, entry);
    const st = lstatSafe(p);
    if (st?.isSymbolicLink()) {
      violations.push({
        rule: "HERMES_STRAY_SYMLINK",
        path: p,
        message: `.hermes/skills/${entry} must not be a symlink; Hermes omits symlinked skill dirs from discovery (#8293). Use external_dirs pointing at .claude/skills instead.`,
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
    const raw = readFileSync(skillMd, "utf8");
    let data: Record<string, unknown> = {};
    try {
      data = matter(raw).data;
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
    if (!raw.includes("external_dirs")) {
      violations.push({
        rule: "HERMES_EXTERNAL_DIRS_UNDOCUMENTED",
        path: skillMd,
        message: `${BOOTSTRAP}/SKILL.md must document the external_dirs discovery mechanism (symlinks don't work on Hermes; see #8293)`,
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
  const agentSkills = join(root, ".hermes", "skills");

  checkNoStraySymlinks(agentSkills, violations);
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
