/**
 * Render CasesFile to an xlsx workbook Buffer for cases/exports/需求名.xlsx.
 */

import ExcelJS from "exceljs";
import { UNCLASSIFIED } from "../xmind-render.ts";
import type { CasesFile } from "./types.ts";

function tagCount(file: CasesFile): number {
  return Math.max(1, ...file.cases.map((item) => item.tags?.length ?? 0));
}

// Excel 工作表名:去掉非法字符 * ? : \ / [ ],并截断 31 字符上限
function sheetName(title: string): string {
  const cleaned = title
    .replaceAll(/[*?:/\\[\]]/g, "")
    .trim()
    .slice(0, 31);
  return cleaned || "cases";
}

// ExcelJS 单元格只接受标量;字符串/数字原样传入,其余强转为字符串
function cellValue(v: unknown): string | number {
  if (typeof v === "string" || typeof v === "number") return v;
  if (v === null || v === undefined) return "";
  return String(v);
}

/** Render xlsx workbook bytes; one row per case, steps numbered inline. */
export async function renderXlsx(file: CasesFile): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName(file.meta.title));
  const tags = tagCount(file);
  ws.columns = [
    { header: "用例编号", key: "id", width: 10 },
    ...Array.from({ length: tags }, (_, index) => ({
      header: `所属层级${index + 1}`,
      key: `tag${index}`,
      width: 18,
    })),
    { header: "用例标题", key: "title", width: 50 },
    { header: "优先级", key: "priority", width: 8 },
    { header: "前置条件", key: "precondition", width: 30 },
    { header: "步骤", key: "steps", width: 60 },
    { header: "预期", key: "expected", width: 40 },
  ];
  for (const c of file.cases) {
    const row: Record<string, string | number> = {
      id: cellValue(c.id),
      title: cellValue(c.title),
      priority: cellValue(c.priority),
      precondition: cellValue(c.precondition ?? ""),
      steps: cellValue(c.steps.map((s, i) => `${i + 1}. ${s.action}`).join("\n")),
      expected: cellValue(c.steps.map((s, i) => `${i + 1}. ${s.expected}`).join("\n")),
    };
    for (let index = 0; index < tags; index += 1) {
      row[`tag${index}`] = cellValue(c.tags?.[index] ?? (index === 0 ? UNCLASSIFIED : ""));
    }
    ws.addRow(row);
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
