import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import type { BugReport } from "./bug-report-types.ts";
import { validateBugReport } from "./bug-report-validate.ts";

export type ReportKind = "bug" | "conflict" | "scan";

const REQUIRED: Record<ReportKind, string[]> = {
  bug: ["结论", "证据", "实际行为", "预期行为", "复现步骤", "影响范围", "根因", "建议"],
  conflict: ["结论", "证据", "双方意图", "决策依据", "建议"],
  scan: ["结论", "证据", "发现", "建议"],
};

export interface ReportLintViolation {
  line: number;
  message: string;
}

export interface ReportLintResult {
  kind: ReportKind;
  violations: ReportLintViolation[];
}

export function reportKindFromPath(reportPath: string): ReportKind {
  const year = basename(dirname(reportPath));
  const parent = basename(dirname(dirname(reportPath)));
  const match = parent.match(/^(bug|conflict|scan)-report$/);
  if (!match || !/^\d{6}$/.test(year) || !reportPath.endsWith(".md")) {
    throw new Error("报告路径必须为 analyses/{bug,conflict,scan}-report/<yyyymm>/<slug>.md");
  }
  return match[1] as ReportKind;
}

function headings(text: string): Map<string, number> {
  const result = new Map<string, number>();
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (match) result.set(match[1].trim(), index + 1);
  }
  return result;
}

export function lintMarkdownReport(reportPath: string): ReportLintResult {
  const kind = reportKindFromPath(reportPath);
  const violations: ReportLintViolation[] = [];
  if (!existsSync(reportPath)) return { kind, violations: [{ line: 1, message: "报告不存在" }] };
  const text = readFileSync(reportPath, "utf8");
  if (!/^#\s+\S/m.test(text)) violations.push({ line: 1, message: "缺一级标题" });
  const hs = headings(text);
  const seenHeadings = new Set<string>();
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (!match) continue;
    const heading = match[1].trim();
    if (seenHeadings.has(heading)) {
      violations.push({ line: index + 1, message: `二级章节重复: ${heading}` });
    }
    seenHeadings.add(heading);
  }
  for (const required of REQUIRED[kind]) {
    if (!hs.has(required)) violations.push({ line: 1, message: `缺少二级章节: ${required}` });
  }
  const conclusionLine = hs.get("结论");
  if (kind === "bug" && conclusionLine !== undefined) {
    const lines = text.split(/\r?\n/);
    const nextLine = [...hs.values()].find((n) => n > conclusionLine) ?? lines.length + 1;
    const conclusionRegion = lines.slice(0, nextLine - 1).join("\n");
    if (!/^[-*]\s*严重程度[：:]/m.test(conclusionRegion)) {
      violations.push({ line: conclusionLine, message: "结论章节缺少 - 严重程度： 字段" });
    }
  }
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (/<(?:类型|一句话标题|堆栈摘要|slug|\.\.\.)[^>]*>|TODO|待补充/.test(line)) {
      violations.push({ line: index + 1, message: "报告仍包含模板占位符" });
    }
  }
  for (const [heading, line] of hs) {
    const next = [...hs.values()].find((n) => n > line) ?? text.split(/\r?\n/).length + 1;
    const body = text
      .split(/\r?\n/)
      .slice(line, next - 1)
      .join("\n")
      .trim();
    if (!body || /^（.*）$/.test(body)) violations.push({ line, message: `章节为空: ${heading}` });
  }
  return { kind, violations };
}

function section(text: string, title: string): string {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${title}`);
  if (start < 0) return "";
  const end = lines.findIndex((line, index) => index > start && /^##\s+/.test(line));
  return lines
    .slice(start + 1, end < 0 ? lines.length : end)
    .join("\n")
    .trim();
}

/** Convert the human Markdown source into the minimal ZenTao BugReport contract. */
export function parseBugReportMarkdown(reportPath: string): BugReport {
  const text = readFileSync(reportPath, "utf8");
  const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? basename(reportPath, ".md");
  const summary = (section(text, "结论") || section(text, "Summary"))
    .replace(/^[-*]\s*(?:严重程度|severity)[：:].*$/gim, "")
    .trim();
  const actual = section(text, "实际行为") || section(text, "Actual");
  const expected = section(text, "预期行为") || section(text, "Expected");
  const reproduction = section(text, "复现步骤") || section(text, "Reproduction");
  const rootCause = section(text, "根因") || section(text, "Root Cause");
  const impact = section(text, "影响范围") || section(text, "Impact");
  const severity = (text.match(
    /^[-*]\s*(?:严重程度|severity)[：:]?\s*(critical|major|normal|minor)\s*$/im,
  )?.[1] ?? "normal") as BugReport["severity"];
  return validateBugReport({
    title,
    severity,
    problem_type: "code",
    summary,
    actual,
    expected,
    reproduction_steps: reproduction
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:[-*]|\d+\.)\s*/, "").trim())
      .filter(Boolean),
    root_cause: rootCause,
    impact,
  });
}

export function reportTemplatePath(root: string, kind: ReportKind): string {
  return join(root, ".claude", "skills", "defect-analyze", "templates", `${kind}-report.md`);
}

export function reportRelativePath(root: string, reportPath: string): string {
  return relative(root, reportPath).split("\\").join("/");
}
