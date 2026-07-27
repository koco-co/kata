import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { currentYYYYMM, infraReportPath } from "./paths.ts";

export interface InfraReportViolation {
  line: number;
  rule: string;
  message: string;
}

const REQUIRED_SECTIONS = [
  "基本信息",
  "症状",
  "诊断路径",
  "证据",
  "结论",
  "变更计划与结果",
  "Original-path Retest",
  "Knowledge writeback",
] as const;

function headings(text: string): Map<string, number> {
  const result = new Map<string, number>();
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (match) result.set(match[1].trim(), index + 1);
  }
  return result;
}

function sectionBody(lines: string[], line: number, next: number): string {
  return lines
    .slice(line, next - 1)
    .join("\n")
    .trim();
}

export function lintInfraMarkdown(reportPath: string): InfraReportViolation[] {
  const violations: InfraReportViolation[] = [];
  const normalized = reportPath.replaceAll("\\", "/");
  if (!/\/analyses\/infra-report\/\d{6}\/[^/]+\.md$/.test(normalized)) {
    violations.push({
      line: 1,
      rule: "path",
      message: "报告路径必须为 analyses/infra-report/<yyyymm>/<slug>.md",
    });
  }
  if (!existsSync(reportPath)) {
    violations.push({ line: 1, rule: "missing", message: "报告不存在" });
    return violations;
  }
  const text = readFileSync(reportPath, "utf8");
  const lines = text.split(/\r?\n/);
  if (!/^#\s+\S/m.test(text)) violations.push({ line: 1, rule: "title", message: "缺一级标题" });
  const hs = headings(text);
  for (const required of REQUIRED_SECTIONS) {
    const line = hs.get(required);
    if (!line) {
      violations.push({ line: 1, rule: "section", message: `缺少二级章节: ${required}` });
      continue;
    }
    const next = [...hs.values()].find((candidate) => candidate > line) ?? lines.length + 1;
    if (!sectionBody(lines, line, next)) {
      violations.push({ line, rule: "section", message: `章节为空: ${required}` });
    }
  }
  for (const [index, line] of lines.entries()) {
    if (/<(?:类型|一句话标题|堆栈摘要|slug|project|host|\.\.\.)[^>]*>|TODO|待补充/.test(line)) {
      violations.push({ line: index + 1, rule: "placeholder", message: "报告仍包含模板占位符" });
    }
  }
  return violations;
}

export function writeInfraReport(opts: {
  project: string;
  slug: string;
  hostName: string;
  status: "diagnosed" | "blocked";
  evidence: string[];
  conclusion: string;
  fingerprint?: string;
}): string {
  const path = infraReportPath(opts.project, currentYYYYMM(), opts.slug);
  mkdirSync(dirname(path), { recursive: true });
  const safeEvidence = opts.evidence.map((line) =>
    line.replace(/(?:password|token|cookie|secret)\b\s*[:=：]?\s*.*/gi, "[redacted]"),
  );
  writeFileSync(
    path,
    [
      `# Infrastructure 诊断报告：${basename(opts.slug)}`,
      "",
      `- 状态：${opts.status}`,
      `- 目标：${opts.hostName}`,
      "",
      "## 基本信息",
      "",
      `- 生成时间：${new Date().toISOString()}`,
      `- 目标：${opts.hostName}`,
      "",
      "## 症状",
      "",
      "- 请求：SSH connectivity 检查",
      "",
      "## 诊断路径",
      "",
      "- Kata CLI 读取本机 infra 配置并使用 SSH2 连接目标主机。",
      "",
      "## 证据",
      "",
      ...safeEvidence.map((line) => `- ${line}`),
      ...(opts.fingerprint ? [`- 观测到 host fingerprint：${opts.fingerprint}`] : []),
      "",
      "## 结论",
      "",
      `- ${opts.conclusion}`,
      "",
      "## 变更计划与结果",
      "",
      "- 本次未执行任何远程变更。",
      "",
      "## Original-path Retest",
      "",
      "- 本最小版本未执行原始业务路径复测。",
      "",
      "## Knowledge writeback",
      "",
      "- 本次未自动写入知识库。",
      "",
    ].join("\n"),
    { encoding: "utf8", mode: 0o600 },
  );
  return path;
}
