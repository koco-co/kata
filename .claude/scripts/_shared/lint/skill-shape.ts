import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { SkillReport, SkillViolation } from "./types.ts";

const ALLOWED_TOP_LEVEL_FILES = new Set(["SKILL.md"]);
// 与 skill-structure.ts 认可的目录保持一致
const ALLOWED_TOP_LEVEL_DIRS = new Set([
  "phases",
  "prompts",
  "references",
  "fewshots",
  "rules",
  "scripts",
  "templates",
]);
const SKILL_MD_LINE_LIMIT = 300;
const REFERENCE_NON_MD_EXCEPTIONS: Record<string, Set<string>> = {};

export function lintSkillShape(skillDir: string, opts: Record<string, unknown> = {}): SkillReport {
  const violations: SkillViolation[] = [];
  const skillName = basename(skillDir);

  // S1: SKILL.md missing
  const skillMd = join(skillDir, "SKILL.md");
  if (!existsSync(skillMd)) {
    violations.push({ rule: "S1", skillDir, path: skillMd, message: "SKILL.md missing" });
  } else {
    const rawSkillMd = readFileSync(skillMd, "utf8");
    // S4: SKILL.md exceeds the project line limit
    const lines = rawSkillMd.split("\n").length;
    if (lines > SKILL_MD_LINE_LIMIT) {
      violations.push({
        rule: "S4",
        skillDir,
        path: skillMd,
        message: `SKILL.md has ${lines} lines (limit ${SKILL_MD_LINE_LIMIT})`,
      });
    }
  }

  // Walk top-level entries for S5, S6, S7
  for (const entry of readdirSync(skillDir, { withFileTypes: true })) {
    const full = join(skillDir, entry.name);
    if (entry.isDirectory()) {
      // S5: forbidden subdir
      if (!ALLOWED_TOP_LEVEL_DIRS.has(entry.name)) {
        violations.push({
          rule: "S5",
          skillDir,
          path: full,
          message: `forbidden subdir '${entry.name}'; allowed: phases/prompts/references/fewshots/rules/scripts/templates`,
        });
      } else if (entry.name === "references") {
        // S7: non-.md files in references/
        for (const ref of walkAll(full)) {
          const refName = basename(ref);
          if (!ref.endsWith(".md")) {
            const allowList = REFERENCE_NON_MD_EXCEPTIONS[skillName];
            if (!allowList?.has(refName)) {
              violations.push({
                rule: "S7",
                skillDir,
                path: ref,
                message: `non-.md file '${refName}' in references/; add to exception list if intentional`,
              });
            }
          }
        }
      }
    } else if (entry.isFile()) {
      // S6: forbidden top-level file
      if (!ALLOWED_TOP_LEVEL_FILES.has(entry.name)) {
        violations.push({
          rule: "S6",
          skillDir,
          path: full,
          message: `forbidden top-level file '${entry.name}'; only SKILL.md allowed at top level`,
        });
      }
    }
  }

  return { skillDir, violations, passed: violations.length === 0 };
}

function walkAll(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkAll(full));
    else if (e.isFile()) out.push(full);
  }
  return out;
}
