import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import expectations from "./fixtures/parity-expectations.json";

// 双端业务等价:同一份声明矩阵,同时命中 Claude 与 Codex 两侧的 skill 目录。
// Claude 侧用渐进加载(SKILL.md + workflows/references/...),Codex 侧单文件,
// 所以按目录汇总全部 md/yaml 文本后校验业务约定,不逐字比对 prompt。

const ROOT = join(import.meta.dir, "../..");

type Matrix = Record<string, Record<string, string[]>>;
const matrix = (expectations as { skills: Matrix }).skills;

function skillDir(side: "claude" | "agents", skill: string): string {
  const dir = side === "claude" ? ".claude/skills" : ".agents/skills";
  return join(ROOT, dir, skill);
}

/** 汇总 skill 目录下全部声明文本(md + yaml)。 */
function readSkillContent(side: "claude" | "agents", skill: string): string {
  const dir = skillDir(side, skill);
  const parts: string[] = [];
  const walk = (d: string): void => {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(md|yaml)$/.test(entry)) parts.push(readFileSync(p, "utf8"));
    }
  };
  walk(dir);
  return parts.join("\n");
}

function readSkillMd(side: "claude" | "agents", skill: string): string {
  return readFileSync(join(skillDir(side, skill), "SKILL.md"), "utf8");
}

describe("skill behavior parity (claude vs codex)", () => {
  const skillNames = Object.keys(matrix);

  it("两端有完全相同的 skill 集合", () => {
    for (const name of skillNames) {
      expect(() => readSkillMd("claude", name)).not.toThrow();
      expect(() => readSkillMd("agents", name)).not.toThrow();
    }
  });

  for (const [skill, groups] of Object.entries(matrix)) {
    describe(skill, () => {
      for (const [point, patterns] of Object.entries(groups)) {
        for (const pattern of patterns) {
          it(`${point}: "${pattern}" 两端都有声明`, () => {
            const claude = readSkillContent("claude", skill);
            const codex = readSkillContent("agents", skill);
            expect(claude.includes(pattern)).toBe(true);
            expect(codex.includes(pattern)).toBe(true);
          });
        }
      }
    });
  }

  it("两端 frontmatter 都只有 name 与 description", () => {
    for (const name of skillNames) {
      for (const side of ["claude", "agents"] as const) {
        const content = readSkillMd(side, name);
        const fm = content.match(/^---\n([\s\S]*?)\n---/);
        expect(fm, `${side}/${name} 缺 frontmatter`).not.toBeNull();
        const body = fm?.[1] ?? "";
        const keys = [...body.matchAll(/^(\w+):/gm)].map((m) => m[1]);
        expect(keys).toEqual(["name", "description"]);
      }
    }
  });

  it("frontmatter name 与目录名一致", () => {
    for (const name of skillNames) {
      for (const side of ["claude", "agents"] as const) {
        const content = readSkillMd(side, name);
        expect(content).toMatch(new RegExp(`^name: ${name}$`, "m"));
      }
    }
  });
});
