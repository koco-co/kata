/**
 * Render CasesFile to an xlsx workbook Buffer for cases/exports/需求名.xlsx.
 */

import ExcelJS from "exceljs";
import { UNCLASSIFIED } from "../xmind-render.ts";
import type { CasesFile } from "./types.ts";

/** Render xlsx workbook bytes; one row per case, steps numbered inline. */
export async function renderXlsx(file: CasesFile): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(file.meta.title.slice(0, 31) || "cases");
  ws.columns = [
    { header: "用例编号", key: "id", width: 10 },
    { header: "所属模块", key: "module", width: 18 },
    { header: "用例标题", key: "title", width: 50 },
    { header: "优先级", key: "priority", width: 8 },
    { header: "前置条件", key: "precondition", width: 30 },
    { header: "步骤", key: "steps", width: 60 },
    { header: "预期", key: "expected", width: 40 },
  ];
  for (const c of file.cases) {
    ws.addRow({
      id: c.id,
      module: c.tags?.[0] ?? UNCLASSIFIED,
      title: c.title,
      priority: c.priority,
      precondition: c.precondition ?? "",
      steps: c.steps.map((s, i) => `${i + 1}. ${s.action}`).join("\n"),
      expected: c.steps.map((s, i) => `${i + 1}. ${s.expected}`).join("\n"),
    });
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
