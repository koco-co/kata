import { basename } from "node:path";
import { UNCLASSIFIED } from "@shared/cli/xmind-gen/render.ts";
import type { IntermediateJson, Module, TestCase, TestStep } from "@shared/lib/types.ts";

export const TABLE_COLUMNS = [
  "project_name",
  "requirement_name",
  "requirement_id",
  "version",
  "tags",
  "module",
  "page",
  "subgroup",
  "case_no",
  "case_title",
  "priority",
  "preconditions",
  "step_no",
  "step",
  "expected",
] as const;

export type TableColumn = (typeof TABLE_COLUMNS)[number];
export type TableRow = Record<TableColumn, string>;

export interface ImportDefaults {
  inputPath: string;
  project?: string;
  requirement?: string;
  version?: string;
}

const HEADER_ALIASES: Record<string, TableColumn | "level_3" | "level_4" | "level_5"> = {
  projectname: "project_name",
  项目名称: "project_name",
  所属产品: "project_name",
  productline: "project_name",
  requirementname: "requirement_name",
  需求名称: "requirement_name",
  用例集名称: "requirement_name",
  suitename: "requirement_name",
  requirementid: "requirement_id",
  需求id: "requirement_id",
  prdid: "requirement_id",
  相关需求: "requirement_id",
  version: "version",
  版本: "version",
  迭代版本: "version",
  prdversion: "version",
  tags: "tags",
  标签: "tags",
  module: "module",
  模块: "module",
  一级模块用例集名称: "module",
  一级用例集名称: "module",
  page: "page",
  页面: "page",
  二级用例集名称: "page",
  subgroup: "subgroup",
  分组: "subgroup",
  三级用例集名称: "level_3",
  四级用例集名称: "level_4",
  五级用例集名称: "level_5",
  caseno: "case_no",
  用例编号: "case_no",
  编号: "case_no",
  casetitle: "case_title",
  用例标题: "case_title",
  用例名称: "case_title",
  测试用例概述: "case_title",
  priority: "priority",
  优先级: "priority",
  preconditions: "preconditions",
  前置条件: "preconditions",
  stepno: "step_no",
  步骤编号: "step_no",
  step: "step",
  步骤: "step",
  测试步骤: "step",
  expected: "expected",
  预期: "expected",
  预期结果: "expected",
  期望结果: "expected",
};

export function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-()（）/]+/g, "");
}

export function recordsToTableRows(records: string[][]): TableRow[] {
  if (records.length === 0) return [];
  const headers = records[0].map((header) => HEADER_ALIASES[normalizeHeader(header)]);
  if (!headers.includes("case_title")) {
    throw new Error("表格缺少用例标题列；支持 case_title、用例标题、用例名称或测试用例概述");
  }

  return records.slice(1).flatMap((record) => {
    const row = emptyTableRow();
    const deeperLevels: string[] = [];
    for (let index = 0; index < headers.length; index++) {
      const key = headers[index];
      if (!key) continue;
      const value = cleanCellText(record[index] ?? "");
      if (key === "level_3" || key === "level_4" || key === "level_5") {
        if (value) deeperLevels.push(value);
      } else if (!row[key] && value) {
        row[key] = value;
      }
    }
    if (!row.subgroup && deeperLevels.length > 0) row.subgroup = deeperLevels.join(" / ");
    return row.case_title ? [row] : [];
  });
}

export function tableRowsToIntermediate(
  rows: TableRow[],
  defaults: ImportDefaults,
): IntermediateJson {
  if (rows.length === 0) throw new Error("输入表格没有可转换的用例行");
  const first = rows[0];
  const meta: IntermediateJson["meta"] = {
    project_name: defaults.project || first.project_name || "未分类",
    requirement_name:
      defaults.requirement ||
      first.requirement_name ||
      basename(defaults.inputPath).replace(/\.[^.]+$/, ""),
  };
  const version = defaults.version || first.version;
  if (version) meta.version = version;
  const requirementId = first.requirement_id.match(/\d+/)?.[0];
  if (requirementId) meta.requirement_id = Number(requirementId);
  const tags = parseTags(first.tags);
  if (tags.length > 0) meta.tags = tags;

  const modules: Module[] = [];
  const caseIndex = new Map<string, TestCase>();
  for (const [rowIndex, row] of rows.entries()) {
    const moduleName = row.module || UNCLASSIFIED;
    const pageName = row.page || UNCLASSIFIED;
    const subgroupName = row.subgroup;
    const priority = normalizePriority(row.priority, row.case_title);
    const title = withPriority(row.case_title, priority);
    const caseKey = row.case_no ? `id:${row.case_no}` : `row:${rowIndex}`;
    let testCase = caseIndex.get(caseKey);
    if (!testCase) {
      testCase = { title, priority, steps: [] };
      if (row.preconditions) testCase.preconditions = row.preconditions;
      addCase(modules, moduleName, pageName, subgroupName, testCase);
      caseIndex.set(caseKey, testCase);
    }
    testCase.steps.push(...stepsFromRow(row, rowIndex));
  }

  return { meta, modules };
}

export function intermediateToTableRows(data: IntermediateJson): TableRow[] {
  const rows: TableRow[] = [];
  let caseNumber = 0;
  for (const module of data.modules) {
    for (const page of module.pages) {
      for (const subgroup of page.sub_groups ?? []) {
        for (const testCase of subgroup.test_cases) {
          caseNumber++;
          appendCaseRows(rows, data, module.name, page.name, subgroup.name, testCase, caseNumber);
        }
      }
      for (const testCase of page.test_cases ?? []) {
        caseNumber++;
        appendCaseRows(rows, data, module.name, page.name, "", testCase, caseNumber);
      }
    }
  }
  return rows;
}

function appendCaseRows(
  rows: TableRow[],
  data: IntermediateJson,
  module: string,
  page: string,
  subgroup: string,
  testCase: TestCase,
  caseNumber: number,
): void {
  const steps = testCase.steps.length > 0 ? testCase.steps : [{ step: "", expected: "" }];
  for (const [stepIndex, testStep] of steps.entries()) {
    rows.push({
      project_name: data.meta.project_name,
      requirement_name: data.meta.requirement_name,
      requirement_id: data.meta.requirement_id ? String(data.meta.requirement_id) : "",
      version: data.meta.version ?? "",
      tags: data.meta.tags ? JSON.stringify(data.meta.tags) : "",
      module,
      page,
      subgroup,
      case_no: String(caseNumber),
      case_title: stripPriority(testCase.title),
      priority: testCase.priority,
      preconditions: testCase.preconditions ?? "",
      step_no: testCase.steps.length > 0 ? String(stepIndex + 1) : "",
      step: testStep.step,
      expected: testStep.expected,
    });
  }
}

function addCase(
  modules: Module[],
  moduleName: string,
  pageName: string,
  subgroupName: string,
  testCase: TestCase,
): void {
  let module = modules.find((entry) => entry.name === moduleName);
  if (!module) {
    module = { name: moduleName, pages: [] };
    modules.push(module);
  }
  let page = module.pages.find((entry) => entry.name === pageName);
  if (!page) {
    page = { name: pageName };
    module.pages.push(page);
  }
  if (!subgroupName) {
    if (!page.test_cases) page.test_cases = [];
    page.test_cases.push(testCase);
    return;
  }
  let subgroup = page.sub_groups?.find((entry) => entry.name === subgroupName);
  if (!subgroup) {
    subgroup = { name: subgroupName, test_cases: [] };
    if (!page.sub_groups) page.sub_groups = [];
    page.sub_groups.push(subgroup);
  }
  subgroup.test_cases.push(testCase);
}

function stepsFromRow(row: TableRow, rowIndex: number): TestStep[] {
  if (!row.step && !row.expected) return [];
  if (row.step_no) return [{ step: row.step, expected: row.expected }];
  const steps = splitNumberedText(row.step);
  const expected = splitNumberedText(row.expected);
  if (steps.length <= 1 && expected.length <= 1) {
    return [{ step: row.step, expected: row.expected }];
  }
  const count = Math.max(steps.length, expected.length);
  return Array.from({ length: count }, (_, index) => ({
    step: steps[index] ?? "",
    expected: expected[index] ?? "",
  })).filter((entry) => {
    if (entry.step || entry.expected) return true;
    throw new Error(`第 ${rowIndex + 2} 行包含空步骤`);
  });
}

function splitNumberedText(value: string): string[] {
  const lines = value.split(/\r?\n/);
  const marker = lines
    .map((line) => line.trim().match(/^1([.、)])\s*/)?.[1])
    .find((value): value is string => Boolean(value));
  const numberedLine = marker
    ? new RegExp(`^\\d+${marker === "." ? "\\." : marker}\\s*(.*)$`)
    : /^\d+[.、)]\s*(.*)$/;
  const result: string[] = [];
  let current = "";
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(numberedLine);
    if (match) {
      if (current) result.push(current);
      current = match[1];
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) result.push(current);
  return result;
}

function normalizePriority(value: string, title: string): string {
  const fromValue = value.trim().toUpperCase();
  if (/^P[0-4]$/.test(fromValue)) return fromValue;
  if (/^[1-5]$/.test(fromValue)) return `P${Number(fromValue) - 1}`;
  return title.match(/^【(P[0-4])】/)?.[1] ?? "P1";
}

function withPriority(title: string, priority: string): string {
  return `【${priority}】${stripPriority(title)}`;
}

export function stripPriority(title: string): string {
  return title.replace(/^【P[0-4]】\s*/, "").trim();
}

function emptyTableRow(): TableRow {
  return Object.fromEntries(TABLE_COLUMNS.map((column) => [column, ""])) as TableRow;
}

function cleanCellText(value: string): string {
  return value
    .replace(/\r/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/?(?:p|div|ul|ol)[^>]*>/gi, "\n")
    .replace(/<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s[^>]*)?\/?>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseTags(value: string): string[] {
  if (!value) return [];
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((tag): tag is string => typeof tag === "string");
      }
    } catch {
      // Fall through to the human-readable delimiter form.
    }
  }
  return value
    .split(/[,，;；|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}
