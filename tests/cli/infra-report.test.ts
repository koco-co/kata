import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { lintInfraMarkdown, writeInfraReport } from "../../cli/lib/infra-report.ts";

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
  "## 原始路径复测",
  "not run",
  "## 知识回写",
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

  it("flags unfilled <project> and <host> template placeholders", () => {
    const path = report(VALID.replace("target", "- 项目：<project>\n- 目标：<host>"));
    const violations = lintInfraMarkdown(path);
    expect(violations.some((v) => v.rule === "placeholder")).toBe(true);
  });

  it("redacts full key-value secrets in written evidence and stays lint-clean", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-infra-write-"));
    mkdirSync(join(root, "workspace", "demo"), { recursive: true });
    writeFileSync(join(root, "package.json"), "{}\n");
    const previous = process.cwd();
    process.chdir(root);
    try {
      const path = writeInfraReport({
        project: "demo",
        slug: "redaction-check",
        hostName: "app",
        status: "blocked",
        evidence: ["password = 某某 某", "token: abc123xyz", "SSH result: ready"],
        conclusion: "blocked by credential binding",
      });
      const text = readFileSync(path, "utf8");
      expect(text).not.toContain("某某");
      expect(text).not.toContain("abc123xyz");
      expect(text).toContain("[redacted]");
      expect(text).toContain("SSH result: ready");
      expect(text).toContain("## 原始路径复测");
      expect(text).toContain("## 知识回写");
      expect(text).not.toContain("Original-path Retest");
      expect(text).not.toContain("Knowledge writeback");
      expect(lintInfraMarkdown(path)).toEqual([]);
    } finally {
      process.chdir(previous);
    }
  });

  it("keeps lint violations on stderr and JSON on stdout", () => {
    const path = report("# Infra\n\n## 基本信息\n\n");
    const result = spawnSync(
      "bun",
      [resolve(import.meta.dir, "../../cli/bin/kata.ts"), "infra", "lint", "--report", path],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).violations).toBeGreaterThan(0);
    expect(result.stderr).toContain("缺少二级章节");
  });
});
