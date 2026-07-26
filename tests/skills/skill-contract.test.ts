import { describe, expect, it } from "bun:test";
import { lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import expectations from "./fixtures/parity-expectations.json";

// 单源业务合同:声明矩阵只校验 Claude skill 树的内容。
// Codex 侧通过 .agents/skills -> .claude/skills 的整目录 symlink 消费同一份内容。

const ROOT = join(import.meta.dir, "../..");

type Matrix = Record<string, Record<string, string[]>>;
const matrix = (expectations as { skills: Matrix }).skills;

function skillDir(skill: string): string {
  return join(ROOT, ".claude/skills", skill);
}

/** 汇总 skill 目录下全部声明文本(md + yaml)。 */
function readSkillContent(skill: string): string {
  const dir = skillDir(skill);
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

function readSkillMd(skill: string): string {
  return readFileSync(join(skillDir(skill), "SKILL.md"), "utf8");
}

describe("skill contract", () => {
  const skillNames = Object.keys(matrix);

  it("单源 skill 集合完整，Codex 侧可经 symlink 读取", () => {
    const agentsSkills = join(ROOT, ".agents/skills");
    for (const name of skillNames) {
      expect(() => readSkillMd(name)).not.toThrow();
      expect(() => readFileSync(join(agentsSkills, name, "SKILL.md"), "utf8")).not.toThrow();
    }
  });

  it("Codex skill 目录是指向 Claude skill 目录的 symlink", () => {
    const agentsSkills = join(ROOT, ".agents/skills");
    const claudeSkills = join(ROOT, ".claude/skills");
    expect(lstatSync(agentsSkills).isSymbolicLink()).toBe(true);
    expect(realpathSync(agentsSkills)).toBe(realpathSync(claudeSkills));
  });

  for (const [skill, groups] of Object.entries(matrix)) {
    describe(skill, () => {
      for (const [point, patterns] of Object.entries(groups)) {
        for (const pattern of patterns) {
          it(`${point}: "${pattern}" 单源声明存在`, () => {
            const content = readSkillContent(skill);
            expect(content.includes(pattern)).toBe(true);
          });
        }
      }
    });
  }

  it("frontmatter 只有 name 与 description", () => {
    for (const name of skillNames) {
      const content = readSkillMd(name);
      const fm = content.match(/^---\n([\s\S]*?)\n---/);
      expect(fm, `${name} 缺 frontmatter`).not.toBeNull();
      const body = fm?.[1] ?? "";
      const keys = [...body.matchAll(/^(\w+):/gm)].map((m) => m[1]);
      expect(keys).toEqual(["name", "description"]);
    }
  });

  it("frontmatter name 与目录名一致", () => {
    for (const name of skillNames) {
      const content = readSkillMd(name);
      expect(content).toMatch(new RegExp(`^name: ${name}$`, "m"));
    }
  });

  it("关键 workflow 契约绑定到具体文件并保持执行顺序", () => {
    const implement = readFileSync(
      join(skillDir("ui-automation"), "workflows/implement.md"),
      "utf8",
    );
    expect(implement).toContain("kata runs exec");
    expect(implement).toContain("bunx playwright test");
    expect(implement).not.toContain("npx playwright test");
    expect(implement.indexOf("kata runs exec")).toBeLessThan(implement.indexOf("kata env run"));

    const create = readFileSync(join(skillDir("test-case"), "workflows/create.md"), "utf8");
    expect(create).toContain("报告为 `unmapped`");
    expect(create).not.toContain("每条正式用例填写 `automation.spec_file`");
  });
});
