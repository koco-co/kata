import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { lintMarkdownReport, parseBugReportMarkdown } from "../../cli/lib/defect-report.ts";

const kata = resolve(import.meta.dir, "../../cli/bin/kata.ts");

function reportPath(kind = "bug") {
  const root = mkdtempSync(join(tmpdir(), "kata-report-"));
  const path = join(
    root,
    "workspace",
    "dataAssets",
    "analyses",
    `${kind}-report`,
    "202607",
    "demo.md",
  );
  mkdirSync(join(path, ".."), { recursive: true });
  return path;
}

describe("formal Markdown defect reports", () => {
  it("accepts a complete bug report and parses it for ZenTao", () => {
    const path = reportPath();
    writeFileSync(
      path,
      [
        "# 登录失败",
        "",
        "## 结论",
        "登录接口返回错误",
        "- 严重程度: major",
        "## 证据",
        "日志 evidence",
        "## 实际行为",
        "页面报错",
        "## 预期行为",
        "登录成功",
        "## 复现步骤",
        "1. 输入账号",
        "## 影响范围",
        "登录用户无法进入系统",
        "## 根因",
        "服务异常",
        "## 建议",
        "修复服务",
      ].join("\n"),
    );
    expect(lintMarkdownReport(path).violations).toHaveLength(0);
    expect(parseBugReportMarkdown(path).summary).toBe("登录接口返回错误");
  });

  it("rejects a bug report without a severity field in the conclusion section", () => {
    const path = reportPath();
    writeFileSync(
      path,
      [
        "# 登录失败",
        "",
        "## 结论",
        "登录接口返回错误",
        "## 证据",
        "日志 evidence",
        "## 实际行为",
        "页面报错",
        "## 预期行为",
        "登录成功",
        "## 复现步骤",
        "1. 输入账号",
        "## 影响范围",
        "登录用户无法进入系统",
        "## 根因",
        "服务异常",
        "## 建议",
        "修复服务",
      ].join("\n"),
    );
    const violations = lintMarkdownReport(path).violations;
    expect(violations.some((v) => v.message.includes("严重程度"))).toBe(true);
  });

  it("only flags real template placeholders, not arbitrary angle brackets", () => {
    const path = reportPath();
    writeFileSync(
      path,
      [
        "# 登录失败",
        "",
        "## 结论",
        "返回 401 <abc>",
        "- 严重程度: major",
        "## 证据",
        "日志 evidence",
        "## 实际行为",
        "页面报错",
        "## 预期行为",
        "登录成功",
        "## 复现步骤",
        "1. 输入账号",
        "## 影响范围",
        "登录用户无法进入系统",
        "## 根因",
        "服务异常",
        "## 建议",
        "修复服务",
      ].join("\n"),
    );
    expect(lintMarkdownReport(path).violations).toHaveLength(0);
  });

  it("accepts the severity field in the report header before the conclusion section", () => {
    const path = reportPath();
    writeFileSync(
      path,
      [
        "# 登录失败",
        "",
        "- 严重程度：major",
        "",
        "## 结论",
        "登录接口返回错误",
        "## 证据",
        "日志 evidence",
        "## 实际行为",
        "页面报错",
        "## 预期行为",
        "登录成功",
        "## 复现步骤",
        "1. 输入账号",
        "## 影响范围",
        "登录用户无法进入系统",
        "## 根因",
        "服务异常",
        "## 建议",
        "修复服务",
      ].join("\n"),
    );
    expect(lintMarkdownReport(path).violations).toHaveLength(0);
  });

  it("rejects placeholders and missing sections", () => {
    const path = reportPath("scan");
    writeFileSync(path, "# Scan：<一句话标题>\n\n## 结论\n待补充\n");
    expect(lintMarkdownReport(path).violations.length).toBeGreaterThan(0);
  });

  it("keeps lint side-effect free and sends only through explicit publish", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-defect-publish-"));
    const path = join(
      root,
      "workspace",
      "dataAssets",
      "analyses",
      "bug-report",
      "202607",
      "git-ref.md",
    );
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(
      path,
      [
        "# Bug 分析报告：非法引用阻断源码更新",
        "",
        "- 严重程度：major",
        "",
        "## 结论",
        "非法 origin 引用导致 fetch 失败，隔离后恢复。",
        "## 证据",
        "Git 报告 bad object。",
        "## 实际行为",
        "源码更新失败。",
        "## 预期行为",
        "源码更新成功。",
        "## 复现步骤",
        "1. 执行 repos prepare。",
        "## 影响范围",
        "源码准备流程。",
        "## 根因",
        "远端跟踪引用名称非法。",
        "## 建议",
        "隔离非法引用后重试。",
      ].join("\n"),
    );
    const stateDir = join(root, "workspace", "dataAssets", ".state", "notifications");

    const linted = spawnSync("bun", [kata, "defects", "lint", "--report", path, "--exit-code"], {
      encoding: "utf8",
    });
    expect(linted.status).toBe(0);
    expect(existsSync(stateDir)).toBe(false);

    const unconfirmed = spawnSync("bun", [kata, "defects", "publish", "--report", path], {
      encoding: "utf8",
    });
    expect(unconfirmed.status).not.toBe(0);

    const published = spawnSync(
      "bun",
      [kata, "defects", "publish", "--report", path, "--confirmed"],
      { encoding: "utf8" },
    );
    expect(published.status).toBe(0);
    expect(existsSync(stateDir)).toBe(true);
    const ledgers = readdirSync(stateDir).filter((file) => file.endsWith(".json"));
    expect(ledgers).toHaveLength(1);
    const ledger = JSON.parse(readFileSync(join(stateDir, ledgers[0] ?? ""), "utf8")) as {
      event: string;
      data: Record<string, unknown>;
    };
    expect(ledger.event).toBe("bug-analysis-completed");
    expect(ledger.data).toMatchObject({
      severity: "major",
      summary: "非法 origin 引用导致 fetch 失败，隔离后恢复。",
    });
  });
});
