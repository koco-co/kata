/**
 * Render CasesFile to CSV text (ZenTao-style subset) for cases/exports/需求名.csv.
 */

import type { CasesFile } from "./types.ts";
import { UNCLASSIFIED } from "./xmind/xmind-render.ts";

function tagCount(file: CasesFile): number {
  return Math.max(1, ...file.cases.map((item) => item.tags?.length ?? 0));
}

// RFC 4180:含逗号/引号/换行的字段加引号,引号转双
function field(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replaceAll('"', '""')}"`;
  return v;
}

/** Render CSV text with one row per case; steps numbered inline. */
export function renderCsv(file: CasesFile): string {
  const tags = tagCount(file);
  const header = [
    "用例编号",
    ...Array.from({ length: tags }, (_, index) => `所属层级${index + 1}`),
    "用例标题",
    "优先级",
    "前置条件",
    "步骤",
    "预期",
  ];
  const lines = [header.map(field).join(",")];
  for (const c of file.cases) {
    const steps = c.steps.map((s, i) => `${i + 1}. ${s.action}`).join("\n");
    const expected = c.steps.map((s, i) => `${i + 1}. ${s.expected}`).join("\n");
    lines.push(
      [
        c.id,
        ...Array.from(
          { length: tags },
          (_, index) => c.tags?.[index] ?? (index === 0 ? UNCLASSIFIED : ""),
        ),
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
