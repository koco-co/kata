#!/usr/bin/env bun
/**
 * history-convert.ts — Convert historical CSV/XMind files to Archive Markdown.
 *
 * Usage:
 *   kata history-convert --path <file-or-dir> --project <name> [--module <key>] [--detect] [--force] [--no-split]
 *   kata history-convert --help
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { buildMarkdown, todayString } from "@shared/lib/frontmatter.ts";
import { currentYYYYMM } from "@shared/lib/paths.ts";
import { sanitizeFilename } from "./paths.ts";
import { inferTags } from "./tags.ts";
import type { CsvRow } from "./types.ts";

export function parseCsvRecords(content: string): string[][] {
  const records: string[][] = [];
  let current = "";
  let inQuotes = false;
  const row: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current.trim());
        current = "";
      } else if (ch === "\n" || (ch === "\r" && content[i + 1] === "\n")) {
        if (ch === "\r") i++;
        row.push(current.trim());
        current = "";
        if (row.length > 1 || row[0] !== "") {
          records.push([...row]);
        }
        row.length = 0;
      } else {
        current += ch;
      }
    }
  }
  // Flush last row
  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.length > 1 || row[0] !== "") {
      records.push([...row]);
    }
  }

  return records;
}

/** CSV header name mappings */
export const CSV_HEADER_MAP: Record<string, string> = {
  用例编号: "id",
  所属产品: "product",
  所属模块: "module",
  相关需求: "requirement",
  用例标题: "title",
  前置条件: "preconditions",
  步骤: "steps",
  预期: "expected",
  优先级: "priority",
  创建日期: "create_date",
};

export async function parseCsvFile(filePath: string): Promise<CsvRow[]> {
  const raw = readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
  const records = parseCsvRecords(raw);
  if (records.length < 2) return [];

  const headerRow = records[0];
  const colMap = new Map<string, number>();
  for (let i = 0; i < headerRow.length; i++) {
    const normalized =
      CSV_HEADER_MAP[headerRow[i]] ?? headerRow[i].toLowerCase().replace(/\s+/g, "_");
    colMap.set(normalized, i);
  }

  const get = (row: string[], key: string): string => {
    const idx = colMap.get(key);
    return idx !== undefined ? (row[idx] ?? "") : "";
  };

  const rows: CsvRow[] = [];
  for (let i = 1; i < records.length; i++) {
    const r = records[i];
    const title = get(r, "title");
    if (!title) continue;
    rows.push({
      id: get(r, "id"),
      product: get(r, "product"),
      module: get(r, "module"),
      requirement: get(r, "requirement"),
      title,
      preconditions: cleanRichText(get(r, "preconditions")),
      steps: get(r, "steps"),
      expected: get(r, "expected"),
      priority: get(r, "priority"),
      createDate: get(r, "create_date"),
    });
  }
  return rows;
}

/** Clean HTML entities, tags, and rich-text garbage from Zentao export */
export function cleanRichText(text: string): string {
  if (!text) return text;
  return (
    text
      // Decode common HTML entities
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      // Strip HTML tags: inline tags → strip silently, block tags → newline
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(span|font|b|i|u|em|strong|a|img)[^>]*>/gi, "")
      .replace(/<\/?(p|div|li|ul|ol|table|tr|td|th|thead|tbody|h[1-6])[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      // Strip carriage returns from CRLF line endings
      .replace(/\r/g, "")
      // Collapse excessive blank lines
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** Parse module path like /版本迭代测试用例/v6.4.8/【需求名】(#10220) */
export const CASE_ID_TOKEN_RE = /[（(]#(\d+)[)）]/g;

export function parseTitleAndCaseId(title: string): { name: string; caseId?: string } {
  const matches = [...title.matchAll(CASE_ID_TOKEN_RE)];
  if (matches.length === 0) {
    return { name: title.trim() };
  }

  const lastMatch = matches[matches.length - 1];
  const matchedText = lastMatch[0];
  const startIndex = lastMatch.index ?? title.lastIndexOf(matchedText);
  const endIndex = startIndex + matchedText.length;
  const name = `${title.slice(0, startIndex)}${title.slice(endIndex)}`
    .replace(/\s{2,}/g, " ")
    .trim();

  return { name, caseId: lastMatch[1] };
}

export function parseModulePath(modulePath: string): {
  version: string;
  l1Name: string;
  caseId?: string;
} {
  const segments = modulePath.split("/").filter(Boolean);
  // Typical: ["版本迭代测试用例", "v6.4.8", "【需求名】(#10220)"]
  let version = "";
  let l1Name = "";
  let caseId: string | undefined;

  for (const seg of segments) {
    const vMatch = seg.match(/^v(\d+\.\d+(?:\.\d+)?)$/i);
    if (vMatch) {
      version = vMatch[1];
      continue;
    }
    // L1 requirement segment with possible (#caseId)
    const parsedTitle = parseTitleAndCaseId(seg);
    if (parsedTitle.caseId) {
      l1Name = parsedTitle.name;
      caseId = parsedTitle.caseId;
    } else if (seg !== "版本迭代测试用例") {
      l1Name = seg;
    }
  }

  return { version, l1Name: l1Name || "未命名", caseId };
}

/** Known customer prefix → dev_version mapping */
export const DEV_VERSION_MAP: Record<string, string> = {
  岚图: "岚图汽车",
  Gate: "Gate",
};

/**
 * Extract dev_version(s) from l1Name and requirement field prefixes.
 * e.g. "【岚图】【规则集管理】..." → ["岚图汽车"]
 * No known customer prefix found → ["袋鼠云"]
 */
export function extractDevVersions(sources: string[]): string[] {
  const found = new Set<string>();
  for (const src of sources) {
    if (!src) continue;
    for (const [, name] of src.matchAll(/【([^】]+)】/g)) {
      const mapped = DEV_VERSION_MAP[name];
      if (mapped) {
        found.add(mapped);
        break; // first customer prefix wins per source string
      }
    }
  }
  return found.size > 0 ? [...found].sort() : ["袋鼠云"];
}

/** Parse product string like 数据资产_STD(#23) */
export function parseProduct(product: string): {
  productName: string;
  iterationId?: string;
} {
  const m = product.match(/^(.+?)\(#(\d+)\)\s*$/);
  if (m) return { productName: m[1], iterationId: m[2] };
  return { productName: product };
}

/** Parse multi-line numbered steps into step array */
export function parseNumberedLines(text: string, allowParen = true): string[] {
  if (!text.trim()) return [];
  // Split by numbered prefix: "1. xxx\n2. xxx" or "1、xxx"
  const splitRe = allowParen ? /^\d+[.、)\s]/ : /^\d+[.、\s]/;
  const stripRe = allowParen ? /^\d+[.、)\s]+/ : /^\d+[.、\s]+/;
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const result: string[] = [];
  let current = "";

  for (const line of lines) {
    // Check if line starts with a number prefix like "1. " or "1、"
    if (splitRe.test(line)) {
      if (current) result.push(current);
      current = line.replace(stripRe, "").trim();
    } else {
      // Continuation of previous step
      current = current ? `${current} ${line}` : line;
    }
  }
  if (current) result.push(current);
  return result;
}

/**
 * Split a CSV title into heading path + case title at "验证".
 *
 * Pattern A: 验证「L2」-「L3」-「L4」xxx  → headings=[L2,L3,L4], caseTitle=验证xxx
 * Pattern B: 数据质量-规则库管理 自定义SQL模版 新增 验证xxx → headings=[数据质量-规则库管理,自定义SQL模版,新增], caseTitle=验证xxx
 * Pattern C: 验证xxx (no path prefix) → headings=[], caseTitle=验证xxx
 */
export function splitCsvTitle(title: string): {
  headings: string[];
  caseTitle: string;
} {
  // Pattern A: 验证「X」-「Y」-「Z」rest  or  验证「X」-「Y」rest
  const patA = title.match(/^验证((?:「[^」]+」[-,\-—]+)+)(.+)$/);
  if (patA) {
    const pathPart = patA[1];
    const rest = patA[2];
    const headings = [...pathPart.matchAll(/「([^」]+)」/g)].map((m) => m[1]);
    return { headings, caseTitle: `验证${rest}` };
  }

  // Pattern B0: "段 ❯ 段 ❯ 验证xxx" (❯ delimited, Zentao breadcrumb style)
  // Note: ❯ may also appear inside case titles (e.g. in parentheses), so split
  // only the prefix before "验证" by ❯, and keep everything from 验证 onward as title.
  if (title.includes("❯")) {
    const vIdx = title.indexOf("验证");
    if (vIdx > 0) {
      const prefix = title.slice(0, vIdx);
      const caseTitle = title.slice(vIdx);
      const headings = prefix
        .split(/\s*❯\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      return { headings, caseTitle };
    }
    // No 验证 found — split all by ❯, last part is caseTitle
    const parts = title.split(/\s*❯\s*/);
    return {
      headings: parts.slice(0, -1).filter(Boolean),
      caseTitle: parts[parts.length - 1],
    };
  }

  // Pattern B: "路径段 路径段 ... 验证xxx"
  const idxVerify = title.indexOf("验证");
  if (idxVerify > 0) {
    const prefix = title.slice(0, idxVerify).trim();
    const caseTitle = title.slice(idxVerify);
    const headings = prefix
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return { headings, caseTitle };
  }

  // Pattern C: no hierarchy prefix
  return { headings: [], caseTitle: title };
}

/** Derive archive yyyyMM from create dates of rows in a group */
export function deriveArchiveYYYYMM(rows: CsvRow[]): string {
  for (const row of rows) {
    if (row.createDate) {
      const m = row.createDate.match(/^(\d{4})-(\d{2})/);
      if (m) return `${m[1]}${m[2]}`;
    }
  }
  return currentYYYYMM();
}

/**
 * Group CSV rows by L1 (requirement) and convert each group to a separate archive MD.
 * Returns array of { fileName, content, caseCount, caseId, version, archiveYYYYMM }.
 */
export function csvRowsToArchives(rows: CsvRow[]): Array<{
  title: string;
  fileName: string;
  content: string;
  caseCount: number;
  caseId?: string;
  version: string;
  productName: string;
  iterationId?: string;
  archiveYYYYMM: string;
}> {
  const hasPathModules = rows.some((r) => r.module.includes("/"));
  const grouped = groupCsvRowsByL1(rows, hasPathModules);
  return [...grouped.l1Groups].map(([l1Name, group]) =>
    buildCsvArchive(l1Name, group, hasPathModules, grouped.productName, grouped.iterationId),
  );
}

type CsvL1Group = { rows: CsvRow[]; caseId?: string; version: string };

function groupCsvRowsByL1(
  rows: CsvRow[],
  hasPathModules: boolean,
): {
  l1Groups: Map<string, CsvL1Group>;
  productName: string;
  iterationId?: string;
} {
  const l1Groups = new Map<string, CsvL1Group>();
  let productName = "";
  let iterationId: string | undefined;

  if (hasPathModules) {
    const grouped = groupStructuredCsvRows(rows, l1Groups);
    productName = grouped.productName;
    iterationId = grouped.iterationId;
  } else {
    const grouped = groupSimpleCsvRows(rows, l1Groups);
    productName = grouped.productName;
    iterationId = grouped.iterationId;
  }
  return { l1Groups, productName, iterationId };
}

function groupStructuredCsvRows(rows: CsvRow[], l1Groups: Map<string, CsvL1Group>) {
  let productName = "";
  let iterationId: string | undefined;
  for (const row of rows) {
    const parsedProduct = firstProduct(row, productName, iterationId);
    productName = parsedProduct.productName;
    iterationId = parsedProduct.iterationId;
    const { version, l1Name, caseId } = parseModulePath(row.module);
    const existing = l1Groups.get(l1Name);
    if (existing) updateCsvGroup(existing, row, caseId, version);
    else l1Groups.set(l1Name, { rows: [row], caseId, version });
  }
  return { productName, iterationId };
}

function groupSimpleCsvRows(rows: CsvRow[], l1Groups: Map<string, CsvL1Group>) {
  let productName = "";
  let iterationId: string | undefined;
  const suiteName =
    basename(rows[0]?.product || "", ".csv") ||
    [...new Set(rows.map((r) => r.module).filter(Boolean))].join("、") ||
    "未命名";
  for (const row of rows) {
    const parsedProduct = firstProduct(row, productName, iterationId);
    productName = parsedProduct.productName;
    iterationId = parsedProduct.iterationId;
  }
  l1Groups.set(suiteName, { rows, version: "" });
  return { productName, iterationId };
}

function firstProduct(row: CsvRow, productName: string, iterationId: string | undefined) {
  if (productName || !row.product) return { productName, iterationId };
  const parsed = parseProduct(row.product);
  return { productName: parsed.productName, iterationId: parsed.iterationId };
}

function updateCsvGroup(group: CsvL1Group, row: CsvRow, caseId?: string, version?: string): void {
  group.rows.push(row);
  if (!group.caseId && caseId) group.caseId = caseId;
  if (!group.version && version) group.version = version;
}

function buildCsvArchive(
  l1Name: string,
  group: CsvL1Group,
  hasPathModules: boolean,
  productName: string,
  iterationId: string | undefined,
) {
  const { caseId, version } = group;
  const archiveYYYYMM = deriveArchiveYYYYMM(group.rows);
  const bodyParts = renderCsvCaseBody(csvCasesWithPath(group.rows, hasPathModules));
  const fileName = sanitizeFilename(l1Name);
  return {
    title: l1Name,
    fileName: `${fileName}.md`,
    content: buildMarkdown(
      csvArchiveFrontmatter(l1Name, group, version, caseId),
      bodyParts.join("\n"),
    ),
    caseCount: group.rows.length,
    caseId,
    version,
    productName,
    iterationId,
    archiveYYYYMM,
  };
}

function csvArchiveFrontmatter(
  l1Name: string,
  group: CsvL1Group,
  version: string,
  caseId: string | undefined,
): Record<string, string | number | boolean | string[]> {
  const fm: Record<string, string | number | boolean | string[]> = {
    suite_name: l1Name,
    description: `${l1Name}用例归档`,
    tags: inferTags({
      suiteName: l1Name,
      modules: [],
      pages: [],
      subGroups: [],
      caseTitles: group.rows.map((r) => r.title).filter(Boolean),
    }),
    prd_version: version ? `v${version}` : "",
    dev_version: extractDevVersions([l1Name, ...group.rows.map((r) => r.requirement)]),
    create_at: todayString(),
    status: "草稿",
    origin: "csv",
    case_count: group.rows.length,
  };
  if (caseId) fm.case_id = Number(caseId);
  return fm;
}

type CaseWithPath = { headings: string[]; caseTitle: string; row: CsvRow };

function csvCasesWithPath(rows: CsvRow[], hasPathModules: boolean): CaseWithPath[] {
  return rows
    .filter((r) => r.title)
    .map((r) => {
      const { headings, caseTitle } = splitCsvTitle(r.title);
      const effectiveCaseTitle = caseTitle === "验证" ? r.title : caseTitle;
      const effectiveHeadings =
        !hasPathModules && headings.length === 0 && r.module ? [r.module, ...headings] : headings;
      return { headings: effectiveHeadings, caseTitle: effectiveCaseTitle, row: r };
    });
}

function renderCsvCaseBody(casesWithPath: CaseWithPath[]): string[] {
  const bodyParts: string[] = [];
  const headings = { h2: "", h3: "", h4: "" };
  for (const testCase of casesWithPath) {
    appendCsvHeadingPath(bodyParts, headings, testCase.headings);
    appendCsvCase(bodyParts, testCase.caseTitle, testCase.row);
  }
  return bodyParts;
}

function appendCsvHeadingPath(
  bodyParts: string[],
  previous: { h2: string; h3: string; h4: string },
  headings: string[],
): void {
  const [h2 = "", h3 = "", h4 = ""] = headings;
  if (h2 && h2 !== previous.h2) {
    bodyParts.push(`## ${h2}`, "");
    previous.h2 = h2;
    previous.h3 = "";
    previous.h4 = "";
  }
  if (h3 && h3 !== previous.h3) {
    bodyParts.push(`### ${h3}`, "");
    previous.h3 = h3;
    previous.h4 = "";
  }
  if (h4 && h4 !== previous.h4) {
    bodyParts.push(`#### ${h4}`, "");
    previous.h4 = h4;
  }
}

function appendCsvCase(bodyParts: string[], caseTitle: string, row: CsvRow): void {
  bodyParts.push(`##### 【${normalizePriority(row.priority)}】${caseTitle}`, "");
  bodyParts.push("> 前置条件", "", "```", row.preconditions?.trim() || "无", "```", "");
  if (row.steps || row.expected) appendCsvStepsTable(bodyParts, row);
}

function appendCsvStepsTable(bodyParts: string[], row: CsvRow): void {
  bodyParts.push("> 用例步骤", "", "| 编号 | 步骤 | 预期 |", "| ---- | ---- | ---- |");
  const stepLines = parseNumberedLines(row.steps, true);
  const expectedLines = parseNumberedLines(row.expected, false);
  const count = Math.max(stepLines.length, expectedLines.length, 1);
  for (let i = 0; i < count; i++) {
    const step = (stepLines[i] ?? "").replace(/\|/g, "\\|");
    const exp = (expectedLines[i] ?? "").replace(/\|/g, "\\|");
    bodyParts.push(`| ${i + 1} | ${step} | ${exp} |`);
  }
  bodyParts.push("");
}

export function normalizePriority(raw: string): string {
  const v = raw.trim();
  if (v === "1" || v.toUpperCase() === "P0" || v === "高" || v.toUpperCase() === "HIGH")
    return "P0";
  if (v === "2" || v.toUpperCase() === "P1" || v === "中" || v.toUpperCase() === "MEDIUM")
    return "P1";
  return "P2";
}
