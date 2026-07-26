import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintMarkdownReport, parseBugReportMarkdown } from "../../cli/lib/defect-report.ts";

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
        "- 严重程度: major",
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
        "## 根因",
        "服务异常",
        "## 建议",
        "修复服务",
      ].join("\n"),
    );
    expect(lintMarkdownReport(path).violations).toHaveLength(0);
    expect(parseBugReportMarkdown(path).summary).toBe("登录接口返回错误");
  });

  it("rejects placeholders and missing sections", () => {
    const path = reportPath("scan");
    writeFileSync(path, "# Scan：<一句话标题>\n\n## 结论\n待补充\n");
    expect(lintMarkdownReport(path).violations.length).toBeGreaterThan(0);
  });

  it("accepts the fixed infrastructure report contract", () => {
    const path = reportPath("infra");
    writeFileSync(
      path,
      [
        "# Infra connectivity",
        "## 基本信息",
        "target",
        "## 症状",
        "connection failure",
        "## 诊断路径",
        "SSH2",
        "## 证据",
        "redacted",
        "## 结论",
        "blocked",
        "## 变更计划与结果",
        "none",
        "## Original-path Retest",
        "not run",
        "## Knowledge writeback",
        "not run",
      ].join("\n"),
    );
    expect(lintMarkdownReport(path).violations).toHaveLength(0);
  });
});
