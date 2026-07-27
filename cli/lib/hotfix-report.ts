import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { RichBug } from "../integrations/zentao/parse.ts";
import { parseFrontMatter } from "./frontmatter.ts";

export interface HotfixReportViolation {
  line: number;
  rule: string;
  message: string;
}

export interface HotfixReportSource {
  bug: RichBug;
  source: string;
  fixedVersion?: string | null;
}

const REQUIRED_SECTIONS = ["Bug 证据", "环境与前置条件", "回归步骤与预期", "验证状态"] as const;

function sectionLines(text: string): Map<string, { line: number; body: string }> {
  const lines = text.split(/\r?\n/);
  const headings = lines
    .map((line, index) => ({ line, index }))
    .filter((item) => /^##\s+.+/.test(item.line));
  const result = new Map<string, { line: number; body: string }>();
  for (const [index, heading] of headings.entries()) {
    const title = heading.line.replace(/^##\s+/, "").trim();
    const next = headings[index + 1]?.index ?? lines.length;
    result.set(title, {
      line: heading.index + 1,
      body: lines
        .slice(heading.index + 1, next)
        .join("\n")
        .trim(),
    });
  }
  return result;
}

function lineOf(text: string, needle: string): number {
  const index = text.indexOf(needle);
  return index < 0 ? 1 : text.slice(0, index).split(/\r?\n/).length;
}

function add(
  result: HotfixReportViolation[],
  text: string,
  rule: string,
  message: string,
  needle?: string,
): void {
  result.push({ line: lineOf(text, needle ?? ""), rule, message });
}

export function lintHotfixMarkdown(reportPath: string): HotfixReportViolation[] {
  const violations: HotfixReportViolation[] = [];
  const normalized = reportPath.replaceAll("\\", "/");
  if (!/\/analyses\/hotfix-case\/\d{6}\/[^/]+\.md$/.test(normalized)) {
    add(violations, reportPath, "path", "报告路径必须为 analyses/hotfix-case/<yyyymm>/<slug>.md");
  }
  if (!existsSync(reportPath)) {
    add(violations, reportPath, "missing", "报告不存在");
    return violations;
  }

  const text = readFileSync(reportPath, "utf8");
  const parsed = parseFrontMatter(text);
  const frontMatter = parsed.frontMatter;
  if (frontMatter.type !== "hotfix-case") {
    add(violations, text, "frontmatter", "frontmatter.type 必须为 hotfix-case", "type:");
  }

  const rawBugId = frontMatter.bug_id;
  const bugId = typeof rawBugId === "number" ? String(rawBugId) : String(rawBugId ?? "").trim();
  if (!/^\d+$/.test(bugId)) {
    add(violations, text, "bug-id", "frontmatter.bug_id 必须为数字", "bug_id:");
  }

  const source = typeof frontMatter.source === "string" ? frontMatter.source : "";
  const sourceBugId = source.match(/bug-view-(\d+)/)?.[1];
  if (!sourceBugId) {
    add(violations, text, "source", "frontmatter.source 必须是 ZenTao bug-view URL", "source:");
  } else if (bugId && sourceBugId !== bugId) {
    add(violations, text, "bug-id", "bug_id 必须与 source URL 中的 bug id 一致", "source:");
  }

  for (const key of ["fix_branch", "fixed_version"] as const) {
    const value = frontMatter[key];
    if (typeof value !== "string" || !value.trim()) {
      add(violations, text, "frontmatter", `frontmatter.${key} 不得为空`, `${key}:`);
    }
  }

  if (!/^#\s+【\d+】验证\S/m.test(text)) {
    add(violations, text, "title", "一级标题必须以【<bug_id>】验证开头", "#");
  } else if (bugId && !new RegExp(`^#\\s+【${bugId}】验证`, "m").test(text)) {
    add(violations, text, "bug-id", "一级标题中的 bug id 必须与 frontmatter 一致", "#");
  }

  const titleText = text.match(/^#\s+(.+)$/m)?.[1] ?? "";
  if (/<[^>\n]+>|版本名/.test(titleText)) {
    add(violations, text, "placeholder", "一级标题仍包含模板占位符", "#");
  }

  const sections = sectionLines(text);
  for (const section of REQUIRED_SECTIONS) {
    const found = sections.get(section);
    if (!found) {
      add(violations, text, "section", `缺少二级章节: ${section}`, "");
    } else if (!found.body || /^（.*）$/.test(found.body)) {
      violations.push({ line: found.line, rule: "section", message: `章节为空: ${section}` });
    }
  }

  const pending = text.match(/待确认/);
  if (pending) {
    violations.push({
      line: lineOf(text, pending[0]),
      rule: "pending-confirmation",
      message: "hotfix 报告不得包含待确认事项",
    });
  }

  const steps = sections.get("回归步骤与预期")?.body ?? "";
  if (!/^\s*\|\s*步骤\s*\|/m.test(steps) || !/^\s*\|\s*\d+\s*\|/m.test(steps)) {
    add(
      violations,
      text,
      "steps",
      "回归步骤与预期必须包含至少一行带步骤编号的 Markdown 表格",
      "## 回归步骤与预期",
    );
  }

  return violations;
}

export function hotfixReportPath(
  root: string,
  project: string,
  yyyymm: string,
  slug: string,
): string {
  return join(
    root,
    "workspace",
    project,
    "analyses",
    "hotfix-case",
    yyyymm,
    `${basename(slug)}.md`,
  );
}

export function hotfixTemplatePath(root: string): string {
  return join(root, ".claude", "skills", "defect-analyze", "templates", "hotfix-case.md");
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function markdownBody(value: string | null | undefined, fallback: string): string {
  const body = value?.trim();
  return body || fallback;
}

/** Render the fetched, rich ZenTao payload into the single Markdown hotfix contract. */
export function renderHotfixMarkdown(source: HotfixReportSource): string {
  const { bug } = source;
  const bugId = bug.bug_id;
  if (!bugId || !bug.title?.trim())
    throw new Error("ZenTao 缺少可生成 hotfix 报告所需的 bug id 或标题");
  if (!source.source.trim()) throw new Error("ZenTao 缺少 Bug 来源 URL");

  const evidence = markdownBody(bug.sections.steps_md, "ZenTao 未提供原始复现步骤");
  const resolution = markdownBody(bug.sections.resolution_md, "ZenTao 未提供解决说明");
  const environment = [
    bug.fields.env && `- 环境：${bug.fields.env}`,
    bug.fields.product && `- 产品：${bug.fields.product}`,
    bug.fields.module && `- 模块：${bug.fields.module}`,
    bug.fields.engine && `- 引擎：${bug.fields.engine}`,
  ].filter(Boolean);
  const history = bug.history
    .filter((entry) => entry.comment_md.trim())
    .map(
      (entry) =>
        `- ${entry.date} ${entry.actor}（${entry.action}）：\n\n  ${entry.comment_md.replaceAll("\n", "\n  ")}`,
    )
    .join("\n");
  const operation = evidence
    .replace(/\r?\n+/g, " ")
    .trim()
    .replaceAll("|", "\\|");
  const fixedVersion =
    source.fixedVersion?.trim() || bug.fields.resolved_build?.trim() || "unknown";
  const fixBranch = bug.fields.fix_branch?.trim() || "unknown";

  return [
    "---",
    "type: hotfix-case",
    `bug_id: ${bugId}`,
    `source: ${yamlString(source.source.trim())}`,
    `fix_branch: ${yamlString(fixBranch)}`,
    `fixed_version: ${yamlString(fixedVersion)}`,
    "---",
    "",
    `# 【${bugId}】验证${bug.title.trim()}`,
    "",
    "## Bug 证据",
    "",
    evidence,
    "",
    "### 解决说明",
    "",
    resolution,
    ...(history ? ["", "### ZenTao 处理记录", "", history] : []),
    "",
    "## 环境与前置条件",
    "",
    ...(environment.length > 0 ? environment : ["- 使用与 Bug 来源一致的验证环境。"]),
    "",
    "## 回归步骤与预期",
    "",
    "| 步骤 | 操作 | 预期 |",
    "| --- | --- | --- |",
    `| 1 | ${operation} | 修复后不再出现 Bug 证据中描述的异常，且核心业务结果符合预期。 |`,
    "",
    "## 验证状态",
    "- 已验证：未执行自动化或线上复测；本报告由 ZenTao Bug 证据生成。",
    "- 未验证：实际部署版本、完整回归路径和业务记录。",
    "- 未覆盖原因：生成命令只负责整理来源证据，不代替真实验证。",
    "",
  ].join("\n");
}

/** Convert a legacy cases/exports Markdown file without losing its evidence or step table. */
export function migrateLegacyHotfixMarkdown(legacy: string): string {
  const source = legacy.match(/^[-*]\s*来源[:：]\s*(\S+)/m)?.[1] ?? "";
  const bugId = source.match(/bug-view-(\d+)/)?.[1];
  const title =
    legacy.match(/^#####\s+(.+)$/m)?.[1]?.trim() ?? legacy.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (!bugId || !title || !source)
    throw new Error("旧 hotfix Markdown 缺少 bug id、标题或 ZenTao 来源");

  const branch = legacy.match(/\b(?:hotfix|release)[_/-][\w./-]+/i)?.[0] ?? "unknown";
  const version = legacy.match(/^[-*]\s*版本[:：]\s*(.+)$/m)?.[1]?.trim();
  const fixedVersion = version && version !== "unknown" ? version : "unknown";
  const strippedTitle = title
    .replace(/^【\d+】验证/, "")
    .trim()
    .replace(/^【P\d】/, "")
    .trim();
  const precondition = legacy
    .match(/>\s*前置条件\s*\r?\n([\s\S]*?)(?=\r?\n>\s*用例步骤|\r?\n##\s|$)/)?.[1]
    ?.split(/\r?\n/)
    .map((line) => line.replace(/^>\s?/, ""))
    .join("\n")
    .trim();
  const table = legacy
    .match(/(?:^|\r?\n)(\|[^\n]+\|\r?\n\|[- :|]+\|(?:\r?\n\|[^\n]+\|)*)/)?.[1]
    ?.replace(/^\|\s*编号\s*\|\s*步骤\s*\|\s*预期\s*\|/m, "| 步骤 | 操作 | 预期 |")
    .trim();

  return [
    "---",
    "type: hotfix-case",
    `bug_id: ${bugId}`,
    `source: ${JSON.stringify(source)}`,
    `fix_branch: ${JSON.stringify(branch)}`,
    `fixed_version: ${JSON.stringify(fixedVersion)}`,
    "---",
    "",
    `# 【${bugId}】验证${strippedTitle}`,
    "",
    "## Bug 证据",
    "",
    "以下内容由旧 cases/exports Markdown 原样迁移，作为本条回归用例的来源证据。",
    "",
    legacy.trim(),
    "",
    "## 环境与前置条件",
    "",
    precondition || "旧报告未单独记录前置条件；执行前需依据 Bug 来源补齐并复核。",
    "",
    "## 回归步骤与预期",
    "",
    table ||
      "| 步骤 | 操作 | 预期 |\n| --- | --- | --- |\n| 1 | 按 Bug 来源复现原始场景 | 修复后不再出现来源证据中的异常。 |",
    "",
    "## 验证状态",
    "- 已验证：已迁移原始回归步骤与预期表格；未在本次迁移中执行环境复测。",
    "- 未验证：实际部署版本和业务结果。",
    "- 未覆盖原因：本步骤只迁移文档，不代替真实回归执行。",
    "",
  ].join("\n");
}
