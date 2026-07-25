/**
 * Render CasesFile to the archive-style markdown export (cases/exports/需求名.md).
 * Output carries the generated-file header; it is never hand-edited.
 */

import { UNCLASSIFIED } from "../xmind-render.ts";
import type { CaseItem, CasesFile } from "./types.ts";

/** Header marker required on every build-derived artifact. */
export const GENERATED_HEADER =
  "<!-- 由 build 生成(kata cases build),勿手改;编辑 cases/*.yaml 后重新 build -->";

// 表格单元格转义:竖线会破坏 markdown 表
function cell(text: string): string {
  return text.replaceAll("|", "\\|");
}

function renderCase(c: CaseItem): string {
  const lines: string[] = [`##### 【${c.priority}】${c.title}`, ""];
  if (c.precondition) {
    lines.push("> 前置条件", "", "```", c.precondition, "```", "");
  }
  lines.push("> 用例步骤", "", "| 编号 | 步骤 | 预期 |", "| ---- | ---- | ---- |");
  c.steps.forEach((s, i) => {
    lines.push(`| ${i + 1} | ${cell(s.action)} | ${cell(s.expected)} |`);
  });
  if (c.source_ref) {
    lines.push("", `> 证据: ${c.source_ref}`);
  }
  return lines.join("\n");
}

/** Render the full markdown export for a CasesFile. */
export function renderMarkdown(file: CasesFile): string {
  const out: string[] = [
    GENERATED_HEADER,
    "",
    `# ${file.meta.title} 测试用例`,
    "",
    `- 版本: ${file.meta.version}`,
    `- feature: ${file.meta.feature_id}`,
    `- 用例数: ${file.cases.length}`,
  ];
  if (file.meta.source) out.push(`- 来源: ${file.meta.source}`);
  // 按 tags[0] 分模块,保持首次出现顺序
  const groups = new Map<string, CaseItem[]>();
  for (const c of file.cases) {
    const mod = c.tags?.[0] ?? UNCLASSIFIED;
    const list = groups.get(mod) ?? [];
    list.push(c);
    groups.set(mod, list);
  }
  for (const [mod, cases] of groups) {
    out.push("", `## ${mod}`, "");
    for (const c of cases) out.push(renderCase(c), "");
  }
  return `${out.join("\n").trimEnd()}\n`;
}
