import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import matter from "gray-matter";
import type { AgentRuntime } from "../../lib/paths.ts";
import type { SkillReport, SkillViolation } from "./types.ts";

const ALLOWED_TOP_LEVEL_FILES = new Set(["SKILL.md"]);
const ALLOWED_TOP_LEVEL_DIRS = new Set(["references"]);
const SKILL_MD_LINE_LIMIT = 140;
// VENDOR_SKILLS 用于豁免第三方 vendor skill 的 SKILL.md 行数限制；
// Commit 5 删 playwright-cli 后当前没有 vendor skill 需要豁免，集合为空但保留扩展点。
const VENDOR_SKILLS = new Set<string>();
const CODEX_FORBIDDEN_SKILL_DIRECTIVES = [
  "TaskCreate",
  "TaskUpdate",
  "AskUserQuestion",
  "${CLAUDE_SKILL_DIR}",
  ".claude/skills/",
  ".claude/agents/",
  "Read tool",
  "Grep tool",
  "Glob tool",
  "Bash tool",
  "Edit tool",
  "Write tool",
  "model: sonnet",
  "model: opus",
  "model: haiku",
];
const REFERENCE_NON_MD_EXCEPTIONS: Record<string, Set<string>> = {};

export function lintSkillShape(
  skillDir: string,
  opts: { runtime?: AgentRuntime } = {},
): SkillReport {
  const violations: SkillViolation[] = [];
  const skillName = basename(skillDir);
  const runtime = opts.runtime ?? "claude";

  // S1: SKILL.md missing
  const skillMd = join(skillDir, "SKILL.md");
  if (!existsSync(skillMd)) {
    violations.push({ rule: "S1", skillDir, path: skillMd, message: "SKILL.md missing" });
  } else {
    const rawSkillMd = readFileSync(skillMd, "utf8");
    // S4: SKILL.md exceeds the project line limit
    const lines = rawSkillMd.split("\n").length;
    if (!VENDOR_SKILLS.has(skillName) && lines > SKILL_MD_LINE_LIMIT) {
      violations.push({
        rule: "S4",
        skillDir,
        path: skillMd,
        message: `SKILL.md has ${lines} lines (limit ${SKILL_MD_LINE_LIMIT})`,
      });
    }
    if (runtime === "codex") {
      lintCodexSkillMd(skillDir, skillMd, rawSkillMd, violations);
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
          message: `forbidden subdir '${entry.name}'; only 'references/' allowed`,
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
          message: `forbidden top-level file '${entry.name}'; only SKILL.md and references/ are allowed`,
        });
      }
    }
  }

  return { skillDir, violations, passed: violations.length === 0 };
}

function lintCodexSkillMd(
  skillDir: string,
  skillMd: string,
  rawSkillMd: string,
  violations: SkillViolation[],
): void {
  let parsed;
  try {
    parsed = matter(rawSkillMd);
  } catch {
    violations.push({
      rule: "S8",
      skillDir,
      path: skillMd,
      message: "SKILL.md frontmatter parse error",
    });
    return;
  }
  const name = parsed.data?.name;
  const description = parsed.data?.description;
  if (
    typeof name !== "string" ||
    name.trim() === "" ||
    typeof description !== "string" ||
    description.trim() === ""
  ) {
    violations.push({
      rule: "S8",
      skillDir,
      path: skillMd,
      message: "Codex SKILL.md frontmatter must include non-empty name and description",
    });
  }
  for (const token of CODEX_FORBIDDEN_SKILL_DIRECTIVES) {
    if (rawSkillMd.includes(token)) {
      violations.push({
        rule: "S9",
        skillDir,
        path: skillMd,
        message: `Codex SKILL.md contains Claude-only directive '${token}'`,
      });
    }
  }
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
