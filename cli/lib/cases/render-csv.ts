/**
 * Render CasesFile to ZenTao-importable CSV text for cases/exports/需求名.csv.
 */

import type { CasesFile } from "./types.ts";

// RFC 4180:含逗号/引号/换行的字段加引号,引号转双
function field(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replaceAll('"', '""')}"`;
  return v;
}

/** Render ZenTao CSV text with one row per case; steps numbered inline. */
export function renderCsv(file: CasesFile): string {
  const moduleId = file.meta.case_module_id.trim();
  if (!moduleId) {
    throw new Error("CSV 导出必须提供非空禅道模块 ID(meta.case_module_id)");
  }
  const moduleCell = `${file.meta.title}(#${moduleId})`;
  const header = [
    "所属模块",
    "用例标题",
    "前置条件",
    "步骤",
    "预期",
    "优先级",
    "用例类型",
    "适用阶段",
  ];
  const lines = [header.map(field).join(",")];
  for (const c of file.cases) {
    const steps = c.steps.map((s, i) => `${i + 1}. ${s.action}`).join("\n");
    const expected = c.steps.map((s, i) => `${i + 1}. ${s.expected}`).join("\n");
    lines.push(
      [
        moduleCell,
        c.title,
        c.precondition ?? "",
        steps,
        expected,
        c.priority,
        "功能测试",
        "功能测试阶段",
      ]
        .map(field)
        .join(","),
    );
  }
  // 带 BOM 导出,Excel 直接打开时中文不乱码
  return `\uFEFF${lines.join("\n")}\n`;
}
