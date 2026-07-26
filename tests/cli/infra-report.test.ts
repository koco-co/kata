import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintInfraMarkdown } from "../../cli/lib/infra-report.ts";

function report(content: string, segment = "infra-report"): string {
  const root = mkdtempSync(join(tmpdir(), "kata-infra-report-"));
  const path = join(root, "workspace", "dataAssets", "analyses", segment, "202607", "demo.md");
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
  return path;
}

const VALID = [
  "# Infrastructure 诊断报告：demo",
  "",
  "## 基本信息",
  "target",
  "## 症状",
  "SSH connectivity",
  "## 诊断路径",
  "SSH2 host verification",
  "## 证据",
  "redacted result",
  "## 结论",
  "blocked",
  "## 变更计划与结果",
  "no remote change",
  "## Original-path Retest",
  "not run",
  "## Knowledge writeback",
  "not run",
].join("\n");

describe("infra Markdown contract", () => {
  it("accepts a complete infra report", () => {
    expect(lintInfraMarkdown(report(VALID))).toEqual([]);
  });

  it("rejects the old analyses/infra path and empty sections", () => {
    const path = report("# Infra\n\n## 基本信息\n\n", "infra");
    const violations = lintInfraMarkdown(path);
    expect(violations.some((v) => v.rule === "path")).toBe(true);
    expect(violations.some((v) => v.rule === "section")).toBe(true);
  });
});
