/**
 * Render CasesFile to CSV text (ZenTao-style subset) for cases/exports/需求名.csv.
 */

import { UNCLASSIFIED } from "../xmind-render.ts";
import type { CasesFile } from "./types.ts";

const HEADER = ["用例编号", "所属模块", "用例标题", "优先级", "前置条件", "步骤", "预期"];

// RFC 4180:含逗号/引号/换行的字段加引号,引号转双
function field(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replaceAll('"', '""')}"`;
  return v;
}

/** Render CSV text with one row per case; steps numbered inline. */
export function renderCsv(file: CasesFile): string {
  const lines = [HEADER.map(field).join(",")];
  for (const c of file.cases) {
    const steps = c.steps.map((s, i) => `${i + 1}. ${s.action}`).join("\n");
    const expected = c.steps.map((s, i) => `${i + 1}. ${s.expected}`).join("\n");
    lines.push(
      [
        c.id,
        c.tags?.[0] ?? UNCLASSIFIED,
        c.title,
        c.priority,
        c.precondition ?? "",
        steps,
        expected,
      ]
        .map(field)
        .join(","),
    );
  }
  // 带 BOM 导出,Excel 直接打开时中文不乱码
  return `\uFEFF${lines.join("\n")}\n`;
}
