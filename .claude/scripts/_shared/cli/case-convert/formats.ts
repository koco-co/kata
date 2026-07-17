import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { archiveToJson } from "@shared/cli/xmind-gen/archive.ts";
import { countCases, createXmind, validateInput } from "@shared/cli/xmind-gen/render.ts";
import { applyFoldingToFile } from "@shared/cli/xmind-gen/xmind-io.ts";
import { buildMarkdown, todayString } from "@shared/lib/frontmatter.ts";
import type { IntermediateJson, TestCase } from "@shared/lib/types.ts";
import { parseCsvRecords } from "@skills/case-edit/scripts/history-convert/csv.ts";
import {
  parseXmindToL1s,
  readXmindContentJson,
} from "@skills/case-edit/scripts/history-convert/xmind.ts";
import ExcelJS from "exceljs";
import {
  type ImportDefaults,
  intermediateToTableRows,
  recordsToTableRows,
  TABLE_COLUMNS,
  tableRowsToIntermediate,
} from "./model.ts";

export const CASE_FORMATS = ["md", "xlsx", "csv", "xmind", "json"] as const;
export type CaseFormat = (typeof CASE_FORMATS)[number];
const SQL_STATEMENT_START_RE =
  /^(?:CREATE|INSERT|SELECT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|WITH|MERGE|USE|SET|SHOW|DESCRIBE|DESC|GRANT|REVOKE|COMMENT)\b/i;

export interface ConvertOptions {
  input: string;
  output?: string;
  to: CaseFormat;
  project?: string;
  requirement?: string;
  version?: string;
  force?: boolean;
}

export interface ConvertResult {
  input_path: string;
  output_path: string;
  from: CaseFormat;
  to: CaseFormat;
  case_count: number;
}

export async function convertCases(options: ConvertOptions): Promise<ConvertResult> {
  const inputPath = resolve(options.input);
  if (!existsSync(inputPath)) throw new Error(`输入文件不存在: ${inputPath}`);
  const from = inferFormat(inputPath);
  if (from === options.to) throw new Error(`输入和输出格式相同: ${from}`);
  const outputPath = resolve(options.output ?? defaultOutputPath(inputPath, options.to));
  if (existsSync(outputPath) && !options.force) {
    throw new Error(`输出文件已存在；如需覆盖请添加 --force: ${outputPath}`);
  }

  const defaults: ImportDefaults = {
    inputPath,
    project: options.project,
    requirement: options.requirement,
    version: options.version,
  };
  const data = await readCaseFile(inputPath, from, defaults);
  validateInput(data);
  mkdirSync(dirname(outputPath), { recursive: true });
  await writeCaseFile(outputPath, options.to, data, Boolean(options.force));

  return {
    input_path: inputPath,
    output_path: outputPath,
    from,
    to: options.to,
    case_count: countCases(data.modules),
  };
}

export function inferFormat(filePath: string): CaseFormat {
  const extension = extname(filePath).slice(1).toLowerCase();
  if (extension === "markdown") return "md";
  if ((CASE_FORMATS as readonly string[]).includes(extension)) return extension as CaseFormat;
  throw new Error(`不支持的输入格式: .${extension || "(无扩展名)"}`);
}

async function readCaseFile(
  inputPath: string,
  format: CaseFormat,
  defaults: ImportDefaults,
): Promise<IntermediateJson> {
  switch (format) {
    case "md":
      return archiveToJson(inputPath, defaults.project ?? "未分类", defaults.version);
    case "json": {
      const parsed = JSON.parse(readFileSync(inputPath, "utf8")) as unknown;
      validateInput(parsed);
      return parsed;
    }
    case "csv": {
      const content = readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
      return tableRowsToIntermediate(recordsToTableRows(parseCsvRecords(content)), defaults);
    }
    case "xlsx":
      return readXlsx(inputPath, defaults);
    case "xmind":
      return readXmind(inputPath, defaults);
  }
}

async function writeCaseFile(
  outputPath: string,
  format: CaseFormat,
  data: IntermediateJson,
  force: boolean,
): Promise<void> {
  if (force && existsSync(outputPath)) unlinkSync(outputPath);
  switch (format) {
    case "md":
      writeFileSync(outputPath, intermediateToMarkdown(data), "utf8");
      return;
    case "json":
      writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
      return;
    case "csv":
      writeFileSync(outputPath, tableRowsToCsv(data), "utf8");
      return;
    case "xlsx":
      await writeXlsx(outputPath, data);
      return;
    case "xmind":
      await createXmind(data, outputPath, data.meta.project_name);
      await applyFoldingToFile(outputPath);
  }
}

async function readXlsx(inputPath: string, defaults: ImportDefaults): Promise<IntermediateJson> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputPath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("XLSX 中没有工作表");
  const records: string[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];
    for (let column = 1; column <= worksheet.columnCount; column++) {
      values.push(row.getCell(column).text.trim());
    }
    records.push(values);
  });
  return tableRowsToIntermediate(recordsToTableRows(records), defaults);
}

async function writeXlsx(outputPath: string, data: IntermediateJson): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Cases", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  worksheet.addRow([...TABLE_COLUMNS]);
  for (const row of intermediateToTableRows(data)) {
    worksheet.addRow(TABLE_COLUMNS.map((column) => row[column]));
  }
  worksheet.autoFilter = { from: "A1", to: `${columnLetter(TABLE_COLUMNS.length)}1` };
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  worksheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 24;
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.height = 36;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = {
        vertical: "middle",
        horizontal: rowNumber === 1 ? "center" : "left",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9E2F3" } },
        left: { style: "thin", color: { argb: "FFD9E2F3" } },
        bottom: { style: "thin", color: { argb: "FFD9E2F3" } },
        right: { style: "thin", color: { argb: "FFD9E2F3" } },
      };
    });
  });
  const widths: Record<string, number> = {
    project_name: 16,
    requirement_name: 28,
    requirement_id: 14,
    version: 12,
    tags: 24,
    module: 18,
    page: 20,
    subgroup: 24,
    case_no: 10,
    case_title: 42,
    priority: 10,
    preconditions: 48,
    step_no: 10,
    step: 56,
    expected: 56,
  };
  TABLE_COLUMNS.forEach((column, index) => {
    worksheet.getColumn(index + 1).width = widths[column];
  });
  await workbook.xlsx.writeFile(outputPath);
}

async function readXmind(inputPath: string, defaults: ImportDefaults): Promise<IntermediateJson> {
  const sheets = await readXmindContentJson(inputPath);
  const l1s = parseXmindToL1s(sheets);
  if (l1s.length !== 1) {
    throw new Error(
      `XMind 必须只包含一个需求根节点，当前为 ${l1s.length} 个；多需求历史文件请使用 kata history convert`,
    );
  }
  const l1 = l1s[0];
  const rootTitle = sheets[0]?.rootTopic?.title;
  const rawL1 = sheets
    .flatMap((sheet) => sheet.rootTopic?.children?.attached ?? [])
    .find((node) => node.title === l1.title);
  const labels = ((rawL1 as { labels?: string[] } | undefined)?.labels ?? []).filter(
    (label): label is string => typeof label === "string",
  );
  const requirementId = labels.map((label) => label.match(/^\(#(\d+)\)$/)?.[1]).find(Boolean);
  const tags = labels.filter((label) => !/^\(#\d+\)$/.test(label));
  const inferredVersion = rootTitle?.match(/v(\d+\.\d+(?:\.\d+)?)/i)?.[1];
  const meta = {
    project_name: defaults.project || rootTitle || "未分类",
    requirement_name: defaults.requirement || l1.title,
    ...(defaults.version || inferredVersion
      ? { version: defaults.version || inferredVersion }
      : {}),
    ...(requirementId ? { requirement_id: Number(requirementId) } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    ...(rootTitle ? { root_name: rootTitle } : {}),
  };
  return {
    meta,
    modules: l1.modules.map((module) => ({
      name: module.name,
      pages: module.pages.map((page) => ({
        name: page.name,
        ...(page.cases.length > 0 ? { test_cases: page.cases.map(parsedCaseToTestCase) } : {}),
        ...(page.subGroups.length > 0
          ? {
              sub_groups: page.subGroups.map((subgroup) => ({
                name: subgroup.name,
                test_cases: subgroup.cases.map(parsedCaseToTestCase),
              })),
            }
          : {}),
      })),
    })),
  };
}

function parsedCaseToTestCase(testCase: {
  title: string;
  priority: string;
  preconditions: string;
  steps: Array<{ step: string; expected: string }>;
}): TestCase {
  return {
    title: `【${testCase.priority}】${testCase.title}`,
    priority: testCase.priority,
    ...(testCase.preconditions ? { preconditions: testCase.preconditions } : {}),
    steps: testCase.steps,
  };
}

export function intermediateToMarkdown(data: IntermediateJson): string {
  const rootAwareMeta = data.meta as IntermediateJson["meta"] & { root_name?: string };
  const frontMatter: Record<string, string | number | string[]> = {
    suite_name: data.meta.requirement_name,
    product_line: data.meta.project_name,
    ...(data.meta.requirement_id ? { prd_id: data.meta.requirement_id } : {}),
    ...(data.meta.version ? { prd_version: data.meta.version } : {}),
    ...(data.meta.description ? { description: data.meta.description } : {}),
    ...(data.meta.tags?.length ? { tags: data.meta.tags } : {}),
    ...(rootAwareMeta.root_name ? { root_name: rootAwareMeta.root_name } : {}),
    create_at: data.meta.create_at ?? todayString(),
    status: data.meta.status ?? "草稿",
    case_count: countCases(data.modules),
  };
  const body: string[] = [];
  for (const module of data.modules) {
    body.push(`## ${module.name}`, "");
    for (const page of module.pages) {
      body.push(`### ${page.name}`, "");
      for (const testCase of page.test_cases ?? []) appendMarkdownCase(body, testCase);
      for (const subgroup of page.sub_groups ?? []) {
        body.push(`#### ${subgroup.name}`, "");
        for (const testCase of subgroup.test_cases) appendMarkdownCase(body, testCase);
      }
    }
  }
  return buildMarkdown(frontMatter, body.join("\n"));
}

function appendMarkdownCase(lines: string[], testCase: TestCase): void {
  const rawTitle = /^【P[0-4]】/.test(testCase.title)
    ? testCase.title
    : `【${testCase.priority}】${testCase.title}`;
  const priority = rawTitle.match(/^【P[0-4]】/)?.[0] ?? "";
  const title = `${priority}${rawTitle
    .slice(priority.length)
    .replaceAll("【", "「")
    .replaceAll("】", "」")}`;
  lines.push(`##### ${title}`, "");
  if (testCase.preconditions) {
    lines.push(
      "> 前置条件",
      "",
      "```SQL",
      formatPreconditionSql(testCase.preconditions),
      "```",
      "",
    );
  }
  if (testCase.steps.length > 0) {
    lines.push("> 用例步骤", "", "| 编号 | 步骤 | 预期 |", "| --- | --- | --- |");
    for (const [index, step] of testCase.steps.entries()) {
      lines.push(
        `| ${index + 1} | ${escapeMarkdownCell(step.step)} | ${escapeMarkdownCell(step.expected)} |`,
      );
    }
    lines.push("");
  }
}

function formatPreconditionSql(preconditions: string): string {
  let inSqlStatement = false;
  return preconditions
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("--") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed === "*/"
      ) {
        return line;
      }
      if (inSqlStatement) {
        if (trimmed.includes(";")) inSqlStatement = false;
        return line;
      }
      if (SQL_STATEMENT_START_RE.test(trimmed)) {
        inSqlStatement = !trimmed.includes(";");
        return line;
      }
      return trimmed === "无" ? "-- 无特殊前置条件" : `-- ${trimmed}`;
    })
    .join("\n");
}

function tableRowsToCsv(data: IntermediateJson): string {
  const lines = [TABLE_COLUMNS.map(quoteCsv).join(",")];
  for (const row of intermediateToTableRows(data)) {
    lines.push(TABLE_COLUMNS.map((column) => quoteCsv(row[column])).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function quoteCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function defaultOutputPath(inputPath: string, target: CaseFormat): string {
  const extension = extname(inputPath);
  return `${inputPath.slice(0, -extension.length)}.${target}`;
}

function columnLetter(columnNumber: number): string {
  let number = columnNumber;
  let result = "";
  while (number > 0) {
    number--;
    result = String.fromCharCode(65 + (number % 26)) + result;
    number = Math.floor(number / 26);
  }
  return result;
}
