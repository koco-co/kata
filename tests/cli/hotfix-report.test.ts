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
fix_branch: hotfix_6.3.x_155381
fixed_version: 6.3.x
---

# 【155381】验证多表校验修复后不再产生笛卡尔关联

## Bug 证据

禅道记录说明空主键会触发错误关联。

## 环境与前置条件

- 已部署包含修复分支的版本。
- 已准备两张可复现的测试表。

## 回归步骤与预期

| 步骤 | 操作 | 预期 |
| --- | --- | --- |
| 1 | 创建并执行多表校验任务 | 任务执行成功，结果不产生笛卡尔关联 |

## 验证状态

- 已验证：尚未运行
- 未验证：真实环境回归
- 未覆盖原因：需要 ltqc-sy-test 环境
`;

describe("hotfix Markdown contract", () => {
  it("renders a ZenTao rich bug into a lintable Markdown report", () => {
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
          gitBranch1: "hotfix_9.9.x_synth_9001",
          env: "ltqc-sy-test",
        },
        actions: {
          resolved: {
            actor: "bob",
            action: "resolved",
            date: "2026-07-26",
            comment: "<p>问题原因：统计口径错误</p>",
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
    writeFileSync(
      path,
      renderHotfixMarkdown({ bug, source: "https://zenpms.example/zentao/bug-view-9001.html" }),
    );
    expect(lintHotfixMarkdown(path)).toEqual([]);
  });

  it("accepts the single-source report contract", () => {
    const path = report(VALID);
    expect(lintHotfixMarkdown(path)).toEqual([]);
  });

  it("uses defects lint as the only CLI validation entry", () => {
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
    expect(violations.some((v) => v.rule === "placeholder")).toBe(true);
  });

  it("escapes pipe characters inside the regression table operation", () => {
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
    const rendered = renderHotfixMarkdown({
      bug,
      source: "https://zentao.example/zentao/bug-view-9002.html",
    });
    expect(rendered).toContain("a \\| b");
  });

  it("strips legacy numbering and priority prefixes from migrated titles", () => {
    const legacy = [
      "# 旧 hotfix 回归",
      "",
      "- 来源: https://zentao.example/zentao/bug-view-155381.html",
      "",
      "##### 【155381】验证【P1】多表校验不再产生笛卡尔关联",
    ].join("\n");
    const migrated = migrateLegacyHotfixMarkdown(legacy);
    expect(migrated).toContain("# 【155381】验证多表校验不再产生笛卡尔关联");
    expect(lintHotfixMarkdown(report(migrated))).toEqual([]);
  });

  it("keeps lint violations on stderr and JSON on stdout", () => {
    const path = report(VALID.replace("## Bug 证据", "## 证据"));
    const result = spawnSync(
      "bun",
      [resolve(import.meta.dir, "../../cli/bin/kata.ts"), "defects", "lint", "--report", path],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ kind: "hotfix", violations: 1 });
    expect(result.stderr).toContain("缺少二级章节");
  });

  it("rejects a missing section, pending marker, and mismatched bug id", () => {
    const invalid = VALID.replace("bug_id: 155381", "bug_id: 155382")
      .replace("# 【155381】", "# 【155382】")
      .replace("## Bug 证据", "## Bug 证据\n待确认")
      .replace("## 验证状态", "## 状态");
    const violations = lintHotfixMarkdown(report(invalid));
    expect(violations.some((v) => v.rule === "bug-id")).toBe(true);
    expect(violations.some((v) => v.rule === "pending-confirmation")).toBe(true);
    expect(violations.some((v) => v.rule === "section")).toBe(true);
  });
});
