import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import expectations from "./fixtures/parity-expectations.json";

// 单源业务合同:声明矩阵只校验 Claude skill 树的内容。
// Codex 侧通过 .agents/skills -> .claude/skills 的整目录 symlink 消费同一份内容。

const ROOT = join(import.meta.dir, "../..");

interface BoundPattern {
  pattern: string;
  file: string;
}
type Matrix = Record<string, Record<string, BoundPattern[]>>;
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

/** 沿 `kata --help` 逐层 BFS,收集全部已注册的命令路径(noun / noun verb / noun verb sub)。 */
function collectCliCommands(): Set<string> {
  const registered = new Set<string>();
  const queue: string[][] = [[]];
  while (queue.length > 0) {
    const prefix = queue.shift() as string[];
    const result = spawnSync("bun", ["cli/bin/kata.ts", ...prefix, "--help"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const help = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    const section = help.split(/^Commands:/m)[1];
    if (!section) continue;
    for (const line of section.split("\n")) {
      const m = line.match(/^\s{2,}([a-z][a-z0-9-]*)(\s|$)/);
      if (!m || m[1] === "help") continue;
      const path = [...prefix, m[1]];
      const key = path.join(" ");
      if (registered.has(key)) continue;
      registered.add(key);
      queue.push(path);
    }
  }
  return registered;
}

/** 提取技能文本里的 `kata ...` 命令引用(小写裸词序列,`a/b` 写法展开为多条)。 */
function extractKataCommands(text: string): string[][] {
  const commands: string[][] = [];
  const re = /\bkata((?:\s+[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*)+)/g;
  for (const match of text.matchAll(re)) {
    let paths: string[][] = [[]];
    for (const token of match[1].trim().split(/\s+/)) {
      const alts = token.split("/");
      paths = paths.flatMap((p) => alts.map((a) => [...p, a]));
    }
    commands.push(...paths);
  }
  return commands;
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
      for (const [point, entries] of Object.entries(groups)) {
        for (const { pattern, file } of entries) {
          it(`${point}: "${pattern}" 声明于 ${file}`, () => {
            const content = readFileSync(join(skillDir(skill), file), "utf8");
            expect(content.includes(pattern)).toBe(true);
          });
        }
      }
    });
  }

  it("技能文件引用的 kata 命令都在 CLI 中真实注册", () => {
    const registered = collectCliCommands();
    const unknown = new Set<string>();
    for (const skill of skillNames) {
      for (const tokens of extractKataCommands(readSkillContent(skill))) {
        let depth = 0;
        while (depth < tokens.length && registered.has(tokens.slice(0, depth + 1).join(" "))) {
          depth++;
        }
        // 名词单独引用(如「kata knowledge 命令」)合法;带子命令的引用必须命中 noun+verb,
        // 命中之后的剩余裸词按命令参数处理(如 `kata env run ltqc-local` 的环境名)。
        if (depth < Math.min(2, tokens.length)) unknown.add(`${skill}: kata ${tokens.join(" ")}`);
      }
    }
    expect([...unknown]).toEqual([]);
  }, 120_000);

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
    expect(implement).toContain("c<四位序号>-<slug>.spec.ts");
    expect(implement).not.toContain("c<四位序号>-<slug>.ts");
    expect(implement).not.toContain("npx playwright test");
    expect(implement.indexOf("kata runs exec")).toBeLessThan(implement.indexOf("kata env run"));

    const create = readFileSync(join(skillDir("test-case"), "workflows/create.md"), "utf8");
    expect(create).toContain("报告为 `unmapped`");
    expect(create).not.toContain("每条正式用例填写 `automation.spec_file`");

    const infraPlaybook = readFileSync(
      join(skillDir("infra-diagnose"), "references/playbook.md"),
      "utf8",
    );
    expect(infraPlaybook).toContain("主机使用 `server-default`");
    expect(infraPlaybook).toContain("数据源使用 `data-source-default`");
    expect(infraPlaybook).not.toContain("每个 host 或 data source 必须显式绑定");

    const workspaceManagement = readSkillMd("workspace-management");
    expect(workspaceManagement).toContain("再次运行 `kata project scan");
    expect(workspaceManagement).not.toContain("CLAUDE.md 本地配置节");
  });
});

describe("codex plugin", () => {
  const plugin = JSON.parse(readFileSync(join(ROOT, ".codex-plugin/plugin.json"), "utf8")) as {
    version?: string;
    skills?: string;
  };
  const skillNames = Object.keys(matrix);

  it("plugin.json 声明 semver version 字段", () => {
    expect(plugin.version).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  });

  it("plugin.json 的 skills 路径存在,且覆盖声明矩阵里的全部 skill", () => {
    expect(typeof plugin.skills).toBe("string");
    const skillsRoot = join(ROOT, (plugin.skills as string).replace(/^\.\//, ""));
    expect(existsSync(skillsRoot)).toBe(true);
    for (const name of skillNames) {
      expect(existsSync(join(skillsRoot, name, "SKILL.md"))).toBe(true);
    }
  });
});
