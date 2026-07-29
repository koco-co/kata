import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { RichBug } from "../integrations/zentao/parse.ts";
import { parseFrontMatter } from "./frontmatter.ts";

export interface HotfixReportViolation {
  line: number;
  rule: string;
  message: string;
}

export interface HotfixStep {
  action: string;
  expected: string;
}

export interface HotfixEvidence {
  keywords: string;
  evidence_refs: string[];
  precondition: string;
  steps: HotfixStep[];
}

export interface HotfixReportSource {
  bug: RichBug;
  source: string;
  evidence: HotfixEvidence;
}

const FRONTMATTER_KEYS = [
  "type",
  "bug_id",
  "source",
  "keywords",
  "problem_cause",
  "fix_project",
  "fix_branch",
  "fixed_version",
  "resolution",
] as const;
const BODY_SECTIONS = ["前置条件", "用例步骤"] as const;
const SECRET_PATTERNS = [
  /(?:cookie|authorization|bearer|token|password|passwd|secret)\s*[:=]\s*(?:["'`])?(?!\$\{|<)[^\s`"'|]+/i,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9._-]{10,}/,
] as const;
const VAGUE_CONTENT_PATTERNS = [
  /准备[^\n]*(?:与\s*Bug\s*场景对应|测试对象)/i,
  /按\s*Bug\s*(?:来源|原始)[^\n]*(?:复现|执行)/i,
  /按\s*Bug\s*场景准备[^\n]*/i,
  /来源\s*Bug\s*所述异常/,
  /修复后不再出现来源\s*Bug[^\n]*异常/i,
  /(?:当前验证环境|验证环境)[^\n]*(?:不要求部署|未部署)[^\n]*(?:只验证|不得断言|现场证据)/i,
  /页面或任务结果符合预期/,
  /(?:较长|很长)[^\n]*(?:失败信息|错误信息|错误提示|字段列表)/,
] as const;
const BUSINESS_STATE_PATTERN =
  /(?:状态|已上线|已下线|待上线|已存在|已绑定|已关联|引用|创建|开启|关闭|失败|异常|NULL|空串|CREATE\s+TABLE|INSERT\s+INTO)/i;

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

function splitTableRow(row: string): string[] {
  const cells: string[] = [];
  let current = "";
  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === "|" && row[index - 1] !== "\\") {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  if (cells[0] === "") cells.shift();
  if (cells.at(-1) === "") cells.pop();
  return cells;
}

interface StepRow {
  line: number;
  number: number;
  operation: string;
  expected: string;
}

function parseStepRows(section: { line: number; body: string }): {
  headerCount: number;
  rows: StepRow[];
} {
  const lines = section.body.split(/\r?\n/);
  const headerCount = lines.filter((line) =>
    /^\|\s*编号\s*\|\s*步骤\s*\|\s*预期\s*\|\s*$/.test(line),
  ).length;
  const rows: StepRow[] = [];
  for (const [index, line] of lines.entries()) {
    const match = line.match(/^\|\s*(\d+)\s*\|/);
    if (!match) continue;
    const cells = splitTableRow(line);
    rows.push({
      line: section.line + index + 1,
      number: Number(match[1]),
      operation: cells[1] ?? "",
      expected: cells[2] ?? "",
    });
  }
  return { headerCount, rows };
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function vagueContent(value: string): string | null {
  return VAGUE_CONTENT_PATTERNS.find((pattern) => pattern.test(value))?.source ?? null;
}

function evidenceKinds(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(
    value
      .filter(isString)
      .map((ref) => ref.split("|", 1)[0]?.trim().toLowerCase())
      .filter((kind): kind is string => Boolean(kind)),
  );
}

function validateEvidence(evidence: HotfixEvidence, source: string): string[] {
  const errors: string[] = [];
  if (!evidence.keywords.trim() || evidence.keywords.split("|").length !== 6) {
    errors.push("keywords 必须保留 6 个由 | 分隔的位置");
  }

  if (!Array.isArray(evidence.evidence_refs) || evidence.evidence_refs.length < 3) {
    errors.push("evidence_refs 至少需要 ZenTao、知识库和源码/已有用例/UI 三条证据");
  } else {
    const kinds = evidenceKinds(evidence.evidence_refs);
    if (!kinds.has("zentao")) errors.push("evidence_refs 缺少 zentao 证据");
    if (!kinds.has("knowledge")) errors.push("evidence_refs 缺少 knowledge 证据");
    if (!(["source", "case", "ui"] as const).some((kind) => kinds.has(kind))) {
      errors.push("evidence_refs 缺少 source、case 或 ui 证据");
    }
    for (const ref of evidence.evidence_refs) {
      if (!isString(ref) || !/^\w+\|\S+:\d+(?:-\d+)?$/.test(ref.trim())) {
        errors.push("evidence_refs 每项必须使用 kind|path-or-url:line 格式");
        break;
      }
    }
    const zentaoRef = evidence.evidence_refs.find((ref) => ref.startsWith("zentao|"));
    if (source && zentaoRef && !zentaoRef.includes(source)) {
      errors.push("evidence_refs 的 zentao 证据必须与 frontmatter.source 一致");
    }
  }

  if (!evidence.precondition.trim()) {
    errors.push("precondition 不能为空");
  } else {
    const vague = vagueContent(evidence.precondition);
    if (vague) errors.push("precondition 不能使用空泛场景描述");
    if (!BUSINESS_STATE_PATTERN.test(evidence.precondition)) {
      errors.push("precondition 必须写出具体业务对象状态、关联关系或异常数据");
    }
  }

  if (!Array.isArray(evidence.steps) || evidence.steps.length === 0) {
    errors.push("steps 至少需要一个步骤");
  } else {
    evidence.steps.forEach((step, index) => {
      if (!isRecord(step) || !isString(step.action) || !step.action.trim()) {
        errors.push(`steps[${index + 1}].action 不能为空`);
      } else if (vagueContent(step.action)) {
        errors.push(`steps[${index + 1}].action 不能使用空泛场景描述`);
      }
      if (!isRecord(step) || !isString(step.expected) || !step.expected.trim()) {
        errors.push(`steps[${index + 1}].expected 不能为空`);
      } else if (vagueContent(step.expected)) {
        errors.push(`steps[${index + 1}].expected 不能使用通用预期`);
      }
    });
  }
  return errors;
}

export function loadHotfixEvidence(path: string): HotfixEvidence {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(
      `无法读取 hotfix 证据文件 ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!isRecord(parsed)) throw new Error("hotfix 证据文件必须是 JSON 对象");

  const evidence: HotfixEvidence = {
    keywords: isString(parsed.keywords) ? parsed.keywords : "",
    evidence_refs: Array.isArray(parsed.evidence_refs)
      ? parsed.evidence_refs.map((ref) => (isString(ref) ? ref : ""))
      : [],
    precondition: isString(parsed.precondition) ? parsed.precondition : "",
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.map((step) => ({
          action: isRecord(step) && isString(step.action) ? step.action : "",
          expected: isRecord(step) && isString(step.expected) ? step.expected : "",
        }))
      : [],
  };
  const errors = validateEvidence(evidence, "");
  if (errors.length > 0) throw new Error(`hotfix 证据文件不完整: ${errors.join("；")}`);
  return evidence;
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
  const actualKeys = Object.keys(frontMatter);
  if (!/^---\r?\n[\s\S]*\r?\n---\r?\n/.test(text)) {
    add(violations, text, "frontmatter", "报告必须包含一个 frontmatter", "#");
  }
  for (const key of FRONTMATTER_KEYS) {
    if (!(key in frontMatter)) {
      add(violations, text, "frontmatter", `frontmatter 缺少固定字段: ${key}`, "---");
    }
  }
  for (const key of actualKeys) {
    if (!FRONTMATTER_KEYS.includes(key as (typeof FRONTMATTER_KEYS)[number])) {
      add(violations, text, "frontmatter", `frontmatter 不允许额外字段: ${key}`, `${key}:`);
    }
  }

  if (frontMatter.type !== "hotfix-case") {
    add(violations, text, "frontmatter", "frontmatter.type 必须为 hotfix-case", "type:");
  }

  const rawBugId = frontMatter.bug_id;
  const bugId = typeof rawBugId === "number" ? String(rawBugId) : String(rawBugId ?? "").trim();
  if (!/^\d+$/.test(bugId)) {
    add(violations, text, "bug-id", "frontmatter.bug_id 必须为数字", "bug_id:");
  }

  const source = isString(frontMatter.source) ? frontMatter.source : "";
  const sourceBugId = source.match(/bug-view-(\d+)/)?.[1];
  if (!/^https?:\/\/[^\s]+\/zentao\/bug-view-\d+\.html(?:[^\s]*)?$/.test(source)) {
    add(violations, text, "source", "frontmatter.source 必须是 ZenTao bug-view URL", "source:");
  } else if (sourceBugId && bugId && sourceBugId !== bugId) {
    add(violations, text, "bug-id", "bug_id 必须与 source URL 中的 bug id 一致", "source:");
  }

  const keywords = frontMatter.keywords;
  if (!isString(keywords) || !keywords.trim() || keywords.split("|").length !== 6) {
    add(
      violations,
      text,
      "keywords",
      "frontmatter.keywords 必须包含 6 个由 | 分隔的位置",
      "keywords:",
    );
  }

  for (const key of [
    "problem_cause",
    "fix_project",
    "fix_branch",
    "fixed_version",
    "resolution",
  ] as const) {
    const value = frontMatter[key];
    if (!isString(value)) {
      add(violations, text, "frontmatter", `frontmatter.${key} 必须为字符串`, `${key}:`);
    } else if (value.trim().toLowerCase() === "unknown") {
      add(
        violations,
        text,
        "frontmatter",
        `frontmatter.${key} 缺失时必须填空字符串，不得使用 unknown`,
        `${key}:`,
      );
    }
  }

  const titleMatch = text.match(/^#\s+【(\d+)】验证(.+)$/m);
  if (!titleMatch) {
    add(violations, text, "title", "一级标题必须为【<bug_id>】验证<title>", "#");
  } else {
    if (bugId && titleMatch[1] !== bugId) {
      add(violations, text, "bug-id", "一级标题中的 bug id 必须与 frontmatter 一致", "#");
    }
    if (/^【\d+】验证/.test(titleMatch[2]) || /<[^>\n]+>|版本名/.test(titleMatch[2])) {
      add(violations, text, "title", "一级标题不得重复 bug 标记或保留模板占位符", "#");
    }
  }

  const sections = sectionLines(text);
  for (const section of BODY_SECTIONS) {
    const found = sections.get(section);
    if (!found) {
      add(violations, text, "section", `缺少禅道固定字段: ${section}`, "");
    } else if (!found.body || /^（.*）$/.test(found.body)) {
      violations.push({ line: found.line, rule: "section", message: `字段为空: ${section}` });
    }
  }

  const pending = text.match(/待确认/);
  if (pending) {
    violations.push({
      line: lineOf(text, pending[0]),
      rule: "pending-confirmation",
      message: "hotfix 用例不得包含待确认事项",
    });
  }

  const stepSection = sections.get("用例步骤");
  const parsedSteps = stepSection ? parseStepRows(stepSection) : { headerCount: 0, rows: [] };
  if (parsedSteps.headerCount !== 1 || parsedSteps.rows.length === 0) {
    add(
      violations,
      text,
      "steps",
      "用例步骤必须包含且只能包含一张编号 | 步骤 | 预期表格，并至少有一行步骤",
      "## 用例步骤",
    );
  }

  parsedSteps.rows.forEach((row, index) => {
    const expectedNumber = index + 1;
    const cells = splitTableRow(text.split(/\r?\n/)[row.line - 1] ?? "");
    if (row.number !== expectedNumber) {
      violations.push({
        line: row.line,
        rule: "steps-numbering",
        message: `步骤编号必须从 1 连续递增，当前应为 ${expectedNumber}，实际为 ${row.number}`,
      });
    }
    if (cells.length !== 3) {
      violations.push({
        line: row.line,
        rule: "steps-columns",
        message: "每一步必须严格包含编号、步骤、预期三列",
      });
    }
    if (!row.operation || /^<[^>]+>$/.test(row.operation)) {
      violations.push({ line: row.line, rule: "steps-operation", message: "步骤不能为空" });
    }
    if (!row.expected || /^<[^>]+>$/.test(row.expected)) {
      violations.push({
        line: row.line,
        rule: "steps-expected",
        message: "每一步必须填写对应预期，预期不能为空",
      });
    }
    if (vagueContent(row.operation)) {
      violations.push({
        line: row.line,
        rule: "steps-operation",
        message: "步骤必须写具体页面、对象、字段或操作，不能使用空泛场景描述",
      });
    }
    if (vagueContent(row.expected)) {
      violations.push({
        line: row.line,
        rule: "steps-expected",
        message: "预期必须写具体可观察结果，不能使用通用预期",
      });
    }
  });

  if (stepSection) {
    const lines = stepSection.body.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const trimmed = line.trim();
      if (
        trimmed &&
        !/^\|\s*编号\s*\|\s*步骤\s*\|\s*预期\s*\|\s*$/.test(trimmed) &&
        !/^\|\s*:?-{3,}\s*\|\s*:?-{3,}\s*\|\s*:?-{3,}\s*\|\s*$/.test(trimmed) &&
        !/^\|\s*\d+\s*\|/.test(trimmed)
      ) {
        violations.push({
          line: stepSection.line + index + 1,
          rule: "steps-linebreak",
          message: "步骤表格不得拆成多行，单元格内多个内容使用 <br>",
        });
      }
    }
  }

  const preconditionSection = sections.get("前置条件");
  if (preconditionSection) {
    const vague = vagueContent(preconditionSection.body);
    if (vague) {
      violations.push({
        line: preconditionSection.line,
        rule: "precondition",
        message: "前置条件必须写具体业务对象和状态，不能使用空泛场景描述",
      });
    }
    if (!BUSINESS_STATE_PATTERN.test(preconditionSection.body)) {
      violations.push({
        line: preconditionSection.line,
        rule: "precondition",
        message: "前置条件必须包含具体业务状态、关联关系或异常数据",
      });
    }
  }

  const topLevelHeadings = [...text.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
  topLevelHeadings
    .filter((heading) => !BODY_SECTIONS.includes(heading as (typeof BODY_SECTIONS)[number]))
    .forEach((heading) => {
      violations.push({
        line: lineOf(text, `## ${heading}`),
        rule: "section",
        message: `hotfix 正文不得包含禅道固定字段之外的章节: ${heading}`,
      });
    });

  if (/^#{3,6}\s+/m.test(text)) {
    add(violations, text, "section", "hotfix 正文不得嵌套三级及以下 Markdown 章节", "###");
  }

  for (const pattern of SECRET_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push({
        line: lineOf(text, match[0]),
        rule: "secret",
        message: `报告不得包含真实 Cookie、Token、JWT、Authorization、密码或 Secret；请改用 \${...} 占位符`,
      });
    }
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

function redactSecrets(value: string): string {
  return value
    .replace(
      /((?:cookie|authorization|bearer|token|password|passwd|secret)\s*[:=]\s*)(?!\$\{|<)[^\s`"'|]+/gi,
      `$1\${REDACTED}`,
    )
    .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9._-]{10,}/g, `\${JWT}`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Read one explicitly labelled field from developer notes; unlabeled text is not inferred. */
function extractNoteField(notes: string, labels: string[]): string {
  if (!notes.trim()) return "";
  const allLabels = [
    "问题原因",
    "修复工程",
    "修复分支",
    "修复版本",
    "解决版本",
    "解决方案",
    "解决说明",
  ];
  const label = labels.map(escapeRegExp).join("|");
  const stop = allLabels.map(escapeRegExp).join("|");
  const match = notes.match(
    new RegExp(
      `(?:^|[\\n,，;；])\\s*(?:[-*]\\s*)?(?:${label})(?:为)?\\s*[:：]?\\s*([^\\n,，;；]*?)(?=(?:[,，;；]\\s*)?(?:${stop})(?:为)?\\s*[:：]?|$)`,
      "im",
    ),
  );
  const value = (match?.[1] ?? "")
    .replace(/^[-*]\s*/, "")
    .replace(/[。．]\s*$/, "")
    .replace(/[`*]/g, "")
    .trim();
  if (new RegExp(`^(?:${stop})(?:为)?\\s*[:：]`, "i").test(value)) return "";
  return value;
}

function normalizeTitleText(value: string, bugId: string): string {
  return value
    .trim()
    .replace(new RegExp(`^【${bugId}】验证`), "")
    .replace(new RegExp(`^【${bugId}】验证`), "")
    .replace(/^【P\d】/, "")
    .replace(/^验证/, "")
    .trim();
}

function developerMetadata(notes: string): Record<string, string> {
  return {
    problem_cause: extractNoteField(notes, ["问题原因"]),
    fix_project: extractNoteField(notes, ["修复工程"]),
    fix_branch: extractNoteField(notes, ["修复分支"]),
    fixed_version: extractNoteField(notes, ["修复版本", "解决版本"]),
    resolution: extractNoteField(notes, ["解决方案", "解决说明"]),
  };
}

function markdownCell(value: string): string {
  return redactSecrets(value)
    .replace(/\r?\n+/g, "<br>")
    .replaceAll("|", "\\|")
    .trim();
}

/** Render the fetched ZenTao payload into the fixed ZenTao case fields plus note metadata. */
export function renderHotfixMarkdown(source: HotfixReportSource): string {
  const { bug } = source;
  const bugId = bug.bug_id;
  if (!bugId || !bug.title?.trim())
    throw new Error("ZenTao 缺少可生成 hotfix 用例所需的 bug id 或标题");
  if (!source.source.trim()) throw new Error("ZenTao 缺少 Bug 来源 URL");
  const evidenceErrors = validateEvidence(source.evidence, source.source);
  if (evidenceErrors.length > 0) {
    throw new Error(`hotfix 缺少可交付业务证据: ${evidenceErrors.join("；")}`);
  }

  const notes = bug.sections.resolution_md ?? "";
  const metadata = developerMetadata(notes);
  const title = normalizeTitleText(bug.title, String(bugId));

  return [
    "---",
    "type: hotfix-case",
    `bug_id: ${bugId}`,
    `source: ${yamlString(source.source.trim())}`,
    `keywords: ${yamlString(source.evidence.keywords)}`,
    `problem_cause: ${yamlString(metadata.problem_cause)}`,
    `fix_project: ${yamlString(metadata.fix_project)}`,
    `fix_branch: ${yamlString(metadata.fix_branch)}`,
    `fixed_version: ${yamlString(metadata.fixed_version)}`,
    `resolution: ${yamlString(metadata.resolution)}`,
    "---",
    "",
    `# 【${bugId}】验证${title}`,
    "",
    "## 前置条件",
    "",
    redactSecrets(source.evidence.precondition).trim(),
    "",
    "## 用例步骤",
    "",
    "| 编号 | 步骤 | 预期 |",
    "| --- | --- | --- |",
    ...source.evidence.steps.map(
      (step, index) =>
        `| ${index + 1} | ${markdownCell(step.action)} | ${markdownCell(step.expected)} |`,
    ),
    "",
  ].join("\n");
}

function extractSectionBody(text: string, names: string[]): string {
  const sections = sectionLines(text);
  for (const name of names) {
    const body = sections.get(name)?.body;
    if (body) return body;
  }
  const match = text.match(
    />\s*前置条件\s*\r?\n([\s\S]*?)(?=\r?\n>\s*用例步骤|\r?\n##\s|\r?\n#####\s|$)/,
  );
  return (match?.[1] ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^>\s?/, ""))
    .join("\n")
    .trim();
}

function normalizeLegacyStepTable(table: string): string {
  const lines = table.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    /^\|\s*(?:编号|步骤)\s*\|\s*(?:步骤|操作)\s*\|\s*预期\s*\|/.test(line),
  );
  if (headerIndex < 0) return "";
  const rows: string[] = [];
  let current = "";
  for (const line of lines.slice(headerIndex + 1)) {
    if (/^\|\s*-+/.test(line)) continue;
    if (/^\|\s*\d+\s*\|/.test(line)) {
      if (current) rows.push(current);
      current = line.trim();
    } else if (current && line.trim()) {
      current += ` <br>${line.trim()}`;
    }
  }
  if (current) rows.push(current);
  const converted = rows.map((row, index) => {
    const cells = splitTableRow(row);
    const operation = (cells[1] ?? "").trim();
    const expected = (cells[2] ?? "").trim();
    if (!operation || !expected) return "";
    return `| ${index + 1} | ${operation.replaceAll("|", "\\|")} | ${expected.replaceAll("|", "\\|")} |`;
  });
  if (converted.length === 0 || converted.some((row) => !row)) return "";
  return ["| 编号 | 步骤 | 预期 |", "| --- | --- | --- |", ...converted].join("\n");
}

function extractLegacyStepTable(legacy: string): string {
  const candidates: string[] = [];
  const body = extractSectionBody(legacy, ["用例步骤", "回归步骤与预期"]);
  const source = body && /\|\s*(?:编号|步骤)\s*\|/.test(body) ? body : legacy;
  const lines = source.split(/\r?\n/).map((line) => line.replace(/^>\s?/, ""));
  for (const [index, line] of lines.entries()) {
    if (!/^\|\s*(?:编号|步骤)\s*\|\s*(?:步骤|操作)\s*\|\s*预期\s*\|/.test(line)) continue;
    const collected = [line];
    for (const candidate of lines.slice(index + 1)) {
      if (/^#{1,6}\s+/.test(candidate) || /^>\s*(?:前置条件|用例步骤)/.test(candidate)) break;
      if (!candidate.trim() && collected.length > 2) break;
      collected.push(candidate);
    }
    candidates.push(collected.join("\n"));
  }
  return (
    candidates
      .sort(
        (left, right) =>
          (right.match(/^\|\s*\d+\s*\|/gm) ?? []).length -
          (left.match(/^\|\s*\d+\s*\|/gm) ?? []).length,
      )
      .map(normalizeLegacyStepTable)
      .find(Boolean) ?? ""
  );
}

function sourceFromLegacy(legacy: string): string {
  const parsed = parseFrontMatter(legacy).frontMatter;
  if (isString(parsed.source) && parsed.source.trim()) return parsed.source.trim();
  return legacy.match(/(?:来源|source)[:：]\s*<?(https?:\/\/[^\s>`]+)>?/i)?.[1] ?? "";
}

/** Convert a legacy hotfix Markdown file to the fixed ZenTao case contract. */
export function migrateLegacyHotfixMarkdown(legacy: string): string {
  const legacyFrontMatter = parseFrontMatter(legacy).frontMatter;
  const source = sourceFromLegacy(legacy);
  const bugId = legacyFrontMatter.bug_id?.toString() ?? source.match(/bug-view-(\d+)/)?.[1];
  const title =
    legacy.match(new RegExp(`^#{1,6}\\s+(【${bugId}】验证.+)$`, "m"))?.[1]?.trim() ??
    legacy.match(/^#{1,6}\s+(.+)$/m)?.[1]?.trim();
  if (!bugId || !/^\d+$/.test(bugId) || !title || !source) {
    throw new Error("旧 hotfix Markdown 缺少 bug id、标题或 ZenTao 来源");
  }

  const bodyWithoutFrontMatter = parseFrontMatter(legacy).body;
  const metadata = developerMetadata(bodyWithoutFrontMatter);
  const precondition = redactSecrets(extractSectionBody(legacy, ["前置条件", "环境与前置条件"]));
  const table = extractLegacyStepTable(legacy);
  if (
    !precondition ||
    vagueContent(precondition) ||
    !BUSINESS_STATE_PATTERN.test(precondition) ||
    !table
  ) {
    throw new Error("旧 hotfix Markdown 缺少可执行前置条件或成对步骤预期，不能自动迁移");
  }
  const cleanTitle = normalizeTitleText(title, bugId);

  return [
    "---",
    "type: hotfix-case",
    `bug_id: ${bugId}`,
    `source: ${yamlString(source)}`,
    `keywords: ${yamlString(isString(legacyFrontMatter.keywords) ? legacyFrontMatter.keywords : "")}`,
    `problem_cause: ${yamlString(metadata.problem_cause)}`,
    `fix_project: ${yamlString(metadata.fix_project)}`,
    `fix_branch: ${yamlString(metadata.fix_branch)}`,
    `fixed_version: ${yamlString(metadata.fixed_version)}`,
    `resolution: ${yamlString(metadata.resolution)}`,
    "---",
    "",
    `# 【${bugId}】验证${cleanTitle}`,
    "",
    "## 前置条件",
    "",
    precondition,
    "",
    "## 用例步骤",
    "",
    table,
    "",
  ].join("\n");
}
