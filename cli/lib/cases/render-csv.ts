/**
 * Render CasesFile to ZenTao-importable CSV text for cases/exports/需求名.csv.
 */

import type { CasesFile } from "./types.ts";

const ZENTAO_PRIORITIES: Record<"P0" | "P1" | "P2", string> = {
  P0: "1",
  P1: "2",
  P2: "3",
};

// RFC 4180:含逗号/引号/换行的字段加引号,引号转双
function field(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replaceAll('"', '""')}"`;
  return v;
}

/** 用例所属子需求的禅道模块 ID；子需求未填时回退 meta 级模块 ID。 */
function moduleIdForCase(file: CasesFile, requirementId: string | undefined): string {
  if (requirementId && file.requirements) {
    const requirement = file.requirements.find((item) => item.requirement_id === requirementId);
    const moduleId = requirement?.module_id?.trim();
    if (moduleId) return moduleId;
  }
  return file.meta.case_module_id.trim();
}

/** Render ZenTao CSV text with one row per case; steps numbered inline. */
export function renderCsv(file: CasesFile): string {
  const fallbackModuleId = file.meta.case_module_id.trim();
  if (!fallbackModuleId) {
    throw new Error("CSV 导出必须提供非空禅道模块 ID(meta.case_module_id)");
  }
  const requirementCell = file.meta.requirement_id?.trim()
    ? `(#${file.meta.requirement_id.trim()})`
    : "";
  const header = [
    "所属模块",
    "相关需求",
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
    const precondition = (c.precondition ?? "").replace(/\r?\n/g, "<br>");
    // 禅道按 ID 定位模块，名称不进 CSV；括号一律英文，中文括号会导致禅道导入失败
    const moduleCell = `(#${moduleIdForCase(file, c.requirement_id)})`;
    lines.push(
      [
        moduleCell,
        requirementCell,
        c.title,
        precondition,
        steps,
        expected,
        ZENTAO_PRIORITIES[c.priority],
        "功能测试",
        "功能测试阶段",
      ]
        .map(field)
        .join(","),
    );
  }
  // 无 BOM：ZenTao 按列头解析时会把 BOM 混入首个列名，导致列错位。
  return `${lines.join("\n")}\n`;
}
