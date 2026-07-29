import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseBugPayload } from "../../cli/integrations/zentao/parse.ts";
import {
  lintHotfixMarkdown,
  migrateLegacyHotfixMarkdown,
  renderHotfixMarkdown,
} from "../../cli/lib/hotfix-report.ts";

function report(content: string, slug = "155381-rule-fix"): string {
  const root = mkdtempSync(join(tmpdir(), "kata-hotfix-report-"));
  const path = join(
    root,
    "workspace",
    "dataAssets",
    "analyses",
    "hotfix-case",
    "202607",
    `${slug}.md`,
  );
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
  return path;
}

const VALID = `---
type: hotfix-case
bug_id: 155381
source: https://zentao.example/zentao/bug-view-155381.html
keywords: "6.3 | 数据标准 | | | 6.3 | 关联任务下线提示"
problem_cause: ""
fix_project: ""
fix_branch: ""
fixed_version: ""
resolution: ""
---

# 【155381】验证多表校验修复后不再产生笛卡尔关联

## 前置条件

- 环境：\${EnvironmentA}。
- 账号：使用具备相关权限的 \${AccountA}。
- 数据：\${DataSourceA} 的 \${SchemaA} 中已存在测试表 hotfix_155381_src，该表已绑定标准 \${StandardA}；落标检查任务 \${TaskA} 状态为开启。

## 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 创建并执行多表校验任务 | 任务执行成功，结果不产生笛卡尔关联 |
`;

describe("hotfix Markdown contract", () => {
  it("renders a ZenTao rich bug into fixed ZenTao fields and note metadata", () => {
    const payload = JSON.stringify({
      status: "success",
      data: JSON.stringify({
        bug: {
          id: "9001",
          title: "合成问题",
          steps: "<p>进入页面并确认统计结果。</p>",
          severity: "3",
          pri: "2",
          status: "resolved",
        },
        actions: {
          resolved: {
            actor: "bob",
            action: "resolved",
            date: "2026-07-26",
            comment:
              "<p>问题原因：统计口径错误</p><p>修复工程为 assets，修复分支为 hotfix_9.9.x_9001</p><p>解决方案：统一统计口径</p>",
          },
        },
        users: { bob: "Bob" },
        builds: {},
      }),
    });
    const bug = parseBugPayload(payload);
    if (!bug) throw new Error("synthetic ZenTao payload did not parse");
    const root = mkdtempSync(join(tmpdir(), "kata-hotfix-render-"));
    const path = join(
      root,
      "workspace",
      "dataAssets",
      "analyses",
      "hotfix-case",
      "202607",
      "rendered.md",
    );
    mkdirSync(join(path, ".."), { recursive: true });
    const rendered = renderHotfixMarkdown({
      bug,
      source: "https://zentao.example/zentao/bug-view-9001.html",
      evidence: {
        keywords: "9.9 | 数据质量 | | | 9.9 | 统计口径错误",
        evidence_refs: [
          "zentao|https://zentao.example/zentao/bug-view-9001.html:1",
          "knowledge|workspace/dataAssets/knowledge/modules/data-quality.md:1-4",
          "source|.repos/example/src/stat.ts:20-30",
        ],
        precondition:
          "- 已进入可验证环境，存在状态为已上线的统计任务 `TaskA`，并已配置测试表 `TableA`。",
        steps: [
          {
            action: "进入【数据质量 → 任务查询】，打开 `TaskA` 的执行详情",
            expected: "任务详情打开，统计结果展示当前测试表的数据。",
          },
          {
            action: "点击「立即执行」并查看执行结果",
            expected: "统计结果不再产生笛卡尔关联，任务状态显示为执行成功。",
          },
        ],
      },
    });
    writeFileSync(path, rendered);
    expect(lintHotfixMarkdown(path)).toEqual([]);
    expect(rendered).toContain('problem_cause: "统计口径错误"');
    expect(rendered).toContain('fix_project: "assets"');
    expect(rendered).toContain('fix_branch: "hotfix_9.9.x_9001"');
    expect(rendered).toContain('resolution: "统一统计口径"');
    expect(rendered).toContain('keywords: "9.9 | 数据质量 | | | 9.9 | 统计口径错误"');
    expect(rendered).not.toContain("evidence_refs:");
    expect(rendered).toContain("## 前置条件");
    expect(rendered).toContain("| 编号 | 步骤 | 预期 |");
    expect(rendered).not.toContain("## Bug 证据");
  });

  it("accepts the fixed ZenTao case contract", () => {
    expect(lintHotfixMarkdown(report(VALID))).toEqual([]);
  });

  it("rejects evidence refs from the report frontmatter", () => {
    const invalid = VALID.replace(
      'problem_cause: ""',
      'evidence_refs:\n- "zentao|https://zentao.example/zentao/bug-view-155381.html:1"\nproblem_cause: ""',
    );
    expect(lintHotfixMarkdown(report(invalid)).some((v) => v.rule === "frontmatter")).toBe(true);
  });

  it("rejects a structurally valid but vague business precondition", () => {
    const vague = VALID.replace(/- 数据：[^\n]+/, "- 数据：准备与 Bug 场景对应的测试对象。");
    expect(lintHotfixMarkdown(report(vague)).some((v) => v.rule === "precondition")).toBe(true);
  });

  it("rejects generic fallback expectations and deployment caveats", () => {
    const invalid = VALID.replace(
      `- 环境：\${EnvironmentA}。`,
      "- 当前验证环境不要求部署修复包；未部署时只采集现场证据，不得断言修复效果。",
    ).replace(
      "| 1 | 创建并执行多表校验任务 | 任务执行成功，结果不产生笛卡尔关联 |",
      "| 1 | 按 Bug 来源复现原始场景 | 修复后不再出现来源 Bug 中描述的异常。 |",
    );
    const violations = lintHotfixMarkdown(report(invalid));
    expect(violations.some((v) => v.rule === "precondition")).toBe(true);
    expect(violations.some((v) => v.rule === "steps-operation")).toBe(true);
    expect(violations.some((v) => v.rule === "steps-expected")).toBe(true);
  });

  it("requires business evidence before rendering a report", () => {
    const payload = JSON.stringify({
      status: "success",
      data: JSON.stringify({
        bug: { id: "9003", title: "缺少业务证据", steps: "<p>执行操作</p>" },
        actions: {},
        users: {},
        builds: {},
      }),
    });
    const bug = parseBugPayload(payload);
    if (!bug) throw new Error("synthetic ZenTao payload did not parse");
    expect(() =>
      renderHotfixMarkdown({
        bug,
        source: "https://zentao.example/zentao/bug-view-9003.html",
        evidence: {
          keywords: "",
          evidence_refs: [],
          precondition: "",
          steps: [],
        },
      }),
    ).toThrow("缺少可交付业务证据");
  });

  it("uses defects lint as the CLI validation entry", () => {
    const path = report(VALID);
    const result = spawnSync(
      "bun",
      [
        resolve(import.meta.dir, "../../cli/bin/kata.ts"),
        "defects",
        "lint",
        "--report",
        path,
        "--exit-code",
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ kind: "hotfix", violations: 0 });
  });

  it("rejects a report outside the hotfix-case path", () => {
    const path = report(VALID).replace("hotfix-case", "bug-report");
    expect(lintHotfixMarkdown(path).some((v) => v.rule === "path")).toBe(true);
  });

  it("rejects template placeholders left in the title", () => {
    const placeholder = VALID.replace(
      "# 【155381】验证多表校验修复后不再产生笛卡尔关联",
      "# 【155381】验证【版本名】<title>",
    );
    const violations = lintHotfixMarkdown(report(placeholder));
    expect(violations.some((v) => v.rule === "title")).toBe(true);
  });

  it("escapes pipe characters inside a step", () => {
    const payload = JSON.stringify({
      status: "success",
      data: JSON.stringify({
        bug: {
          id: "9002",
          title: "管道符",
          steps: "<p>执行 a | b 操作</p>",
          severity: "3",
          pri: "2",
          status: "resolved",
        },
        actions: {},
        users: {},
        builds: {},
      }),
    });
    const bug = parseBugPayload(payload);
    if (!bug) throw new Error("synthetic ZenTao payload did not parse");
    expect(
      renderHotfixMarkdown({
        bug,
        source: "https://zentao.example/zentao/bug-view-9002.html",
        evidence: {
          keywords: "9.9 | 数据质量 | | | 9.9 | 管道符",
          evidence_refs: [
            "zentao|https://zentao.example/zentao/bug-view-9002.html:1",
            "knowledge|workspace/dataAssets/knowledge/modules/data-quality.md:1-4",
            "case|workspace/dataAssets/features/v7.0.0/cases/数据质量.yaml:1-2",
          ],
          precondition: "- 已存在状态为已上线的测试任务 `TaskA`。",
          steps: [{ action: "执行 a | b 操作", expected: "结果显示操作成功。" }],
        },
      }),
    ).toContain("a \\| b");
  });

  it("migrates legacy reports without custom sections or duplicated title markers", () => {
    const legacy = [
      "---",
      "bug_id: 155381",
      "source: https://zentao.example/zentao/bug-view-155381.html",
      'keywords: "9.9 | 数据质量 | | | 9.9 | 统计口径"',
      "---",
      "# 旧 hotfix 回归",
      "",
      "- 来源: https://zentao.example/zentao/bug-view-155381.html",
      "",
      "##### 【155381】验证【P1】多表校验不再产生笛卡尔关联",
      "",
      "> 前置条件",
      "> 已存在状态为已上线的测试任务 `TaskA`。",
      "> 用例步骤",
      "> | 编号 | 步骤 | 预期 |",
      "> | --- | --- | --- |",
      "> | 1 | 执行 `TaskA` 任务 | 任务成功，结果不产生笛卡尔关联 |",
    ].join("\n");
    const migrated = migrateLegacyHotfixMarkdown(legacy);
    expect(migrated).toContain("# 【155381】验证多表校验不再产生笛卡尔关联");
    expect(migrated).toContain("## 前置条件");
    expect(migrated).toContain("| 编号 | 步骤 | 预期 |");
    expect(lintHotfixMarkdown(report(migrated))).toEqual([]);
  });

  it("does not manufacture a generic migration step when legacy evidence is missing", () => {
    const legacy = [
      "---",
      "bug_id: 155381",
      "source: https://zentao.example/zentao/bug-view-155381.html",
      "---",
      "# 旧 hotfix 回归",
      "",
      "##### 【155381】验证多表校验不再产生笛卡尔关联",
    ].join("\n");
    expect(() => migrateLegacyHotfixMarkdown(legacy)).toThrow("不能自动迁移");
  });

  it("keeps lint violations on stderr and JSON on stdout", () => {
    const invalid = VALID.replace("## 前置条件", "## 证据");
    const result = spawnSync(
      "bun",
      [
        resolve(import.meta.dir, "../../cli/bin/kata.ts"),
        "defects",
        "lint",
        "--report",
        report(invalid),
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ kind: "hotfix" });
    expect(Number(JSON.parse(result.stdout).violations)).toBeGreaterThan(0);
    expect(result.stderr).toContain("缺少禅道固定字段");
  });

  it("rejects a missing field, pending marker, and mismatched bug id", () => {
    const invalid = VALID.replace('problem_cause: ""\n', "")
      .replace("bug_id: 155381", "bug_id: 155382")
      .replace("# 【155381】", "# 【155382】")
      .replace(`- 环境：\${EnvironmentA}。`, "- 环境：待确认。")
      .replace("## 前置条件", "## 状态");
    const violations = lintHotfixMarkdown(report(invalid));
    expect(violations.some((v) => v.rule === "frontmatter")).toBe(true);
    expect(violations.some((v) => v.rule === "bug-id")).toBe(true);
    expect(violations.some((v) => v.rule === "pending-confirmation")).toBe(true);
    expect(violations.some((v) => v.rule === "section")).toBe(true);
  });

  it("rejects empty expectations and duplicated custom sections", () => {
    const invalid = VALID.replace(
      "| 1 | 创建并执行多表校验任务 | 任务执行成功，结果不产生笛卡尔关联 |",
      "| 1 | 创建并执行多表校验任务 | |",
    ).replace("## 前置条件", "## 数据质量\n\n旧用例内容\n\n## 前置条件");
    const violations = lintHotfixMarkdown(report(invalid));
    expect(violations.some((v) => v.rule === "steps-expected")).toBe(true);
    expect(violations.some((v) => v.rule === "section")).toBe(true);
  });

  it("keeps br tags inside step cells for readable multi-result content", () => {
    const readable = VALID.replace(
      "| 1 | 创建并执行多表校验任务 | 任务执行成功，结果不产生笛卡尔关联 |",
      "| 1 | 创建并执行多表校验任务<br>查看执行详情 | 任务执行成功<br>结果不产生笛卡尔关联 |",
    );
    expect(lintHotfixMarkdown(report(readable))).toEqual([]);
  });

  it("rejects physical line breaks inside a step row", () => {
    const invalid = VALID.replace(
      "| 1 | 创建并执行多表校验任务 | 任务执行成功，结果不产生笛卡尔关联 |",
      "| 1 | 创建并执行多表校验任务\n查看执行详情 | 任务执行成功，结果不产生笛卡尔关联 |",
    );
    expect(lintHotfixMarkdown(report(invalid)).some((v) => v.rule === "steps-linebreak")).toBe(
      true,
    );
  });

  it("rejects credentials while allowing placeholder variables", () => {
    const invalid = VALID.replace(`- 环境：\${EnvironmentA}。`, "- COOKIE=real-cookie-value");
    expect(lintHotfixMarkdown(report(invalid)).some((v) => v.rule === "secret")).toBe(true);
    expect(lintHotfixMarkdown(report(VALID.replace(`\${TableA}`, `\${TableB}`)))).toEqual([]);
  });

  it("rejects unknown as a missing developer-note value", () => {
    const invalid = VALID.replace('fix_branch: ""', 'fix_branch: "unknown"');
    expect(lintHotfixMarkdown(report(invalid)).some((v) => v.rule === "frontmatter")).toBe(true);
  });
});
