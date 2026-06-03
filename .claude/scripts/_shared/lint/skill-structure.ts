import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { repoRoot, skillsDir } from "@shared/lib/paths.ts";
import matter from "gray-matter";

export interface StructureViolation {
  rule: string;
  skill: string;
  path?: string;
  message: string;
}
export interface StructureReport {
  passed: boolean;
  violations: StructureViolation[];
}

// Claude frontmatter 字段白名单（与 frontmatter-policy.ts 对齐）
const ALLOWED_FRONTMATTER = new Set([
  "name",
  "description",
  "when_to_use",
  "user-invocable",
  "model",
  "effort",
  "context",
  "agent",
  "argument-hint",
  "allowed-tools",
  "disable-model-invocation",
]);
const SKILL_MD_CAP = 500;
// 目录级长度上限（行）——按当前全仓库最大值留足余量的防膨胀守卫，非强制拆分阈值
const DIR_LINE_CAPS: Record<string, number> = {
  phases: 260,
  prompts: 220,
  references: 260,
  fewshots: 200,
  rules: 120,
};
// phases 文件名规范：§<数字>-<kebab>.md
const PHASE_NAME_RE = /^§\d+-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

// 从 CLAUDE.md 命令索引表收集 skill id（第 2 列 Skill）
function commandIndexSkills(root: string): Set<string> {
  const ids = new Set<string>();
  const md = join(root, "CLAUDE.md");
  if (!existsSync(md)) return ids;
  for (const line of readFileSync(md, "utf-8").split("\n")) {
    if (!line.trimStart().startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length >= 3 && cells[1].startsWith("/") && /^[a-z][a-z0-9-]*$/.test(cells[2])) {
      ids.add(cells[2]);
    }
  }
  return ids;
}

// 抽取 SKILL.md 正文引用的 phase 文件名（phases/§N-*.md）
function referencedPhaseFiles(body: string): string[] {
  const out = new Set<string>();
  const re = /phases\/(§\d+[^)\s|`"']*\.md)/g;
  for (let m = re.exec(body); m !== null; m = re.exec(body)) out.add(m[1]);
  return [...out];
}

// 扫描 skill 子目录内 .md 文件，套用长度上限与（phases）命名规则
function lintSkillDir(skill: string, dir: string, sub: string, cap: number): StructureViolation[] {
  const out: StructureViolation[] = [];
  const target = join(dir, sub);
  if (!existsSync(target)) return out;
  for (const f of readdirSync(target).filter((x) => x.endsWith(".md"))) {
    const p = join(target, f);
    const n = readFileSync(p, "utf-8").split("\n").length;
    if (n > cap) {
      out.push({ rule: "SK-LEN-DIR", skill, path: p, message: `${sub}/${f} ${n} 行 > ${cap}` });
    }
    if (sub === "phases" && !PHASE_NAME_RE.test(f)) {
      out.push({ rule: "SK-PHASE-NAME", skill, path: p, message: `phases/${f} 不符 §N-<step>.md` });
    }
  }
  return out;
}

export function lintSkillStructure(root: string = repoRoot()): StructureReport {
  const v: StructureViolation[] = [];
  const skillsRoot = skillsDir(root);
  if (!existsSync(skillsRoot)) return { passed: true, violations: v };
  const indexed = commandIndexSkills(root);
  const dirs = readdirSync(skillsRoot).filter(
    (f) => !f.startsWith("_") && statSync(join(skillsRoot, f)).isDirectory(),
  );

  for (const skill of dirs) {
    const dir = join(skillsRoot, skill);
    const skillMd = join(dir, "SKILL.md");
    if (!existsSync(skillMd)) {
      v.push({ rule: "SK-NO-SKILLMD", skill, path: skillMd, message: "缺 SKILL.md" });
      continue;
    }
    const raw = readFileSync(skillMd, "utf-8");
    const fm = matter(raw);
    const data = fm.data as Record<string, unknown>;

    // 1 命名一致：目录名 == frontmatter name == CLAUDE.md 命令索引
    if (data.name !== skill) {
      v.push({
        rule: "SK-NAME-DIR",
        skill,
        path: skillMd,
        message: `name='${String(data.name)}' != 目录 '${skill}'`,
      });
    }
    if (typeof data.name === "string" && !indexed.has(data.name)) {
      v.push({
        rule: "SK-NAME-INDEX",
        skill,
        message: `name '${data.name}' 不在 CLAUDE.md 命令索引`,
      });
    }
    // 4 frontmatter 白名单
    for (const key of Object.keys(data)) {
      if (!ALLOWED_FRONTMATTER.has(key)) {
        v.push({
          rule: "SK-FM-WHITELIST",
          skill,
          path: skillMd,
          message: `非法 frontmatter 字段 '${key}'`,
        });
      }
    }
    // 5 长度：SKILL.md ≤ 500；各子目录长度上限见 DIR_LINE_CAPS（规则 SK-LEN-DIR）
    const n = raw.split("\n").length;
    if (n > SKILL_MD_CAP) {
      v.push({
        rule: "SK-LEN-SKILL",
        skill,
        path: skillMd,
        message: `SKILL.md ${n} 行 > ${SKILL_MD_CAP}`,
      });
    }
    // 2 phase 完整：SKILL.md 引用的 phase 文件必须存在
    const phasesDir = join(dir, "phases");
    for (const pf of referencedPhaseFiles(fm.content)) {
      if (!existsSync(join(phasesDir, pf))) {
        v.push({ rule: "SK-PHASE-MISSING", skill, message: `引用 phases/${pf} 但文件不存在` });
      }
    }
    // 3 prompts 命名：prompts/*.md 必须为 agent-<step>.md
    const promptsDir = join(dir, "prompts");
    if (existsSync(promptsDir)) {
      for (const f of readdirSync(promptsDir).filter((x) => x.endsWith(".md"))) {
        if (!/^agent-.+\.md$/.test(f)) {
          v.push({
            rule: "SK-PROMPT-NAME",
            skill,
            path: join(promptsDir, f),
            message: `prompts/${f} 不符 agent-<step>.md`,
          });
        }
      }
    }
    // 6 目录级长度上限 + phases 命名
    for (const [sub, cap] of Object.entries(DIR_LINE_CAPS)) {
      v.push(...lintSkillDir(skill, dir, sub, cap));
    }
  }
  return { passed: v.length === 0, violations: v };
}

export function formatStructureReport(report: StructureReport, root: string): string {
  if (report.passed) return "skill structure check passed";
  const lines = ["skill structure check failed"];
  for (const x of report.violations) {
    const p = x.path ? ` ${x.path.replace(root, ".")}` : "";
    lines.push(`  ${x.rule} [${x.skill}]${p} — ${x.message}`);
  }
  return lines.join("\n");
}
