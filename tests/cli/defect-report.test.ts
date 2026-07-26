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
<<<<<<< HEAD
        "## 影响范围",
        "登录用户无法进入系统",
=======
>>>>>>> origin/main
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
});
