import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseCasesYaml } from "../../cli/lib/cases/parse.ts";
import { validateCases } from "../../cli/lib/cases/schema.ts";
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

function expectCheckableTopLevelSteps(path: string): void {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/);
  const starts = lines
    .map((line, index) => (/^(?:##\s+)?\d+\.\s+\S/.test(line) ? index : -1))
    .filter((index) => index >= 0);
  expect(starts.length, `${path} 没有顶层步骤`).toBeGreaterThan(0);
  for (const [position, start] of starts.entries()) {
    const end = starts[position + 1] ?? lines.length;
    expect(
      lines.slice(start, end).join("\n"),
      `${path}:${start + 1} 缺少可检查的完成条件`,
    ).toContain("完成条件：");
  }
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
      const tokens = line.trim().split(/\s+/);
      const name = tokens[0] ?? "";
      if (!/^[a-z][a-z0-9-]*$/.test(name) || name === "help") continue;
      // commander 命令行格式：命令名后紧跟 [options]/<arg>，或空两格以上接描述列；
      // 描述续行(如 "generated runner；…")仅空一格且第二词非参数，不得当作子命令。
      const rest = line.slice(line.indexOf(name) + name.length);
      const isArgs = /^ {1,2}(?:\[[^\]]*\]|<[^>]*>)/.test(rest);
      const isAlone = /^\s*$/.test(rest);
      const isDescGap = /^ {2,}\S/.test(rest);
      if (!(isArgs || isAlone || isDescGap)) continue;
      const path = [...prefix, name];
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

  it("Skill 内的本地 Markdown 指针都能解析到真实文件", () => {
    const broken: string[] = [];
    const visit = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          visit(path);
          continue;
        }
        if (!entry.endsWith(".md")) continue;
        const text = readFileSync(path, "utf8");
        for (const match of text.matchAll(/!?\[[^\]]*]\(([^)]+)\)/g)) {
          const rawTarget = match[1].trim();
          if (/^(?:https?:|mailto:|#)/.test(rawTarget)) continue;
          const target = rawTarget.split("#", 1)[0];
          if (target && !existsSync(resolve(dirname(path), target))) {
            broken.push(`${path}: ${rawTarget}`);
          }
        }
      }
    };
    visit(join(ROOT, ".claude/skills"));
    expect(broken).toEqual([]);
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
    expect(infraPlaybook).not.toMatch(/printf\s+['"]%s/);
    expect(infraPlaybook).toContain("不要把密码写入脚本、命令行、shell 历史或日志");

    const workspaceManagement = readSkillMd("workspace-management");
    expect(workspaceManagement).toContain("再次运行 `kata project scan");
    expect(workspaceManagement).not.toContain("CLAUDE.md 本地配置节");

    expect(existsSync(join(skillDir("defect-analyze"), "templates/report.md"))).toBe(false);
  });

  it("ui-automation 明确已落地平台", () => {
    const skill = readSkillMd("ui-automation");
    expect(skill).toContain("Web 已落地");
    expect(skill).toContain("Electron 未落地");
  });

  it("ui-automation 资源与 CLI 和完成语义一致", () => {
    const content = readSkillContent("ui-automation");
    expect(content).not.toContain("c<四位序号>-<slug>.ts");
    expect(content).not.toContain("kata automation run <requirement_id>");
    expect(content).toContain("kata automation run <feature-path>");
    expect(content).toContain("kata automation lint --shared --project <project> --exit-code");
    expect(content).not.toContain("kata automation lint --shared --exit-code");

    const example = readFileSync(join(skillDir("ui-automation"), "examples/handoff.md"), "utf8");
    expect(example).toContain("full.spec.ts 全量通过：未达成");
    expect(example).not.toContain("全量通过：达成（2 通过 / 1 排除）");

    const api = readFileSync(
      join(skillDir("ui-automation"), "references/playwright-api.md"),
      "utf8",
    );
    expect(api).toContain("const consoleErrors = [];");
    expect(api).not.toContain("addCookies(cookies)");
  });

  it("test-case few-shot 不伪造自动化映射且用例可独立准备", () => {
    const example = readFileSync(join(skillDir("test-case"), "examples/cases.yaml"), "utf8");
    expect(example).not.toContain("\n    automation:");
    expect(example).not.toMatch(/precondition:\s*同 C\d+/);
    expect(example).toContain(`INSERT INTO \${SchemaA}.test_table_15862_c0001`);
    expect(validateCases(parseCasesYaml(example))).toEqual([]);
  });

  it("test-case 的导出元数据始终声明具体派生文件名", () => {
    const content = readSkillContent("test-case");
    const example = readFileSync(join(skillDir("test-case"), "examples/cases.yaml"), "utf8");
    expect(content).not.toContain("exports: [xmind]");
    expect(example).toContain("单表校验规则支持枚举值个数统计.xmind");
  });

  it("test-case 编写规范文件存在且 cases.yaml 顶部索引的章节全部可解析", () => {
    const examples = join(skillDir("test-case"), "examples");
    expect(existsSync(join(examples, "best-practices.md"))).toBe(true);
    expect(existsSync(join(examples, "case-scenario.md"))).toBe(false);
    const caseYaml = readFileSync(join(examples, "cases.yaml"), "utf8");
    const indexLines = caseYaml.split(/\r?\n/).filter((line) => line.startsWith("#"));
    const indexed = indexLines.filter((line) => /best-practices\.md/.test(line));
    expect(indexed.length).toBeGreaterThan(0);
    const content = readFileSync(join(examples, "best-practices.md"), "utf8");
    expect(content).not.toMatch(/<a\s+[^>]*\bid\s*=/i);
    expect(content).not.toMatch(/<span\s+[^>]*\bid\s*=/i);
    const referencedHeadings = [
      "标题",
      "前置条件",
      "数据源、数据库和 SQL",
      "表名",
      "分区表",
      "生成脚本",
      "导入文件（五行以内）",
      "步骤动作",
      "预期",
    ];
    for (const heading of referencedHeadings) {
      expect(content, `best-practices.md 缺少章节「${heading}」`).toMatch(
        new RegExp(`^#{2,3} ${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"),
      );
    }
  });

  it("test-case 强制规范提示只在 SKILL.md 声明一次", () => {
    const mandatory =
      "必须严格遵循 [examples/cases.yaml](examples/cases.yaml) 及 [examples/best-practices.md](examples/best-practices.md)。超出两份文件明确范围的禁止自行创建规范，必须给出建议并取得用户确认。";
    const skill = readSkillMd("test-case");
    const content = readSkillContent("test-case");
    expect(skill.split(mandatory)).toHaveLength(2);
    expect(content.split(mandatory)).toHaveLength(2);
    expect(content).not.toContain("case-scenario.md");
  });

  it("流程型 Skill 的每个顶层步骤都有可检查完成条件", () => {
    const processFiles = [
      ["defect-analyze", "SKILL.md"],
      ...["bug.md", "conflict.md", "scan.md", "hotfix.md"].map((file) => [
        "defect-analyze",
        `workflows/${file}`,
      ]),
      ["domain-knowledge", "SKILL.md"],
      ["domain-knowledge", "workflows/read.md"],
      ["domain-knowledge", "workflows/write.md"],
      ["infra-diagnose", "SKILL.md"],
      ["infra-diagnose", "references/playbook.md"],
      ["test-case", "SKILL.md"],
      ["test-case", "workflows/create.md"],
      ["test-case", "workflows/update.md"],
      ["ui-automation", "SKILL.md"],
      ["ui-automation", "workflows/prepare.md"],
      ["ui-automation", "workflows/implement.md"],
      ["ui-automation", "workflows/deliver.md"],
      ["workspace-management", "SKILL.md"],
    ];
    for (const [skill, file] of processFiles) {
      expectCheckableTopLevelSteps(join(skillDir(skill), file));
    }
  });

  it("每个 SKILL.md 使用统一的四阶段执行合同", () => {
    const requiredStages = ["1. 查明事实", "2. 确认关键决策", "3. 执行", "4. 验证"];
    for (const skill of skillNames) {
      const content = readSkillMd(skill);
      for (const stage of requiredStages) {
        expect(content, `${skill} 缺少 ${stage}`).toContain(stage);
      }
      expect(content, `${skill} 缺少 Outcome`).toContain("# Outcome");
      expect(content, `${skill} 缺少 Routing`).toContain("## Routing");
      expect(content, `${skill} 缺少 Delivery`).toContain("## Delivery");
      expect(content, `${skill} 缺少 Guardrails`).toContain("## Guardrails");
      expect(content, `${skill} 缺少 References`).toContain("## References");
    }
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
