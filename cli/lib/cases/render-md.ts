/**
 * Render CasesFile to the archive-style markdown export (cases/exports/需求名.md).
 * Output carries the generated-file header; it is never hand-edited.
 */

import type { CaseItem, CaseRenderContext, CasesFile } from "./types.ts";
import { UNCLASSIFIED } from "./xmind/xmind-render.ts";

/** Header marker required on every build-derived artifact. */
export const GENERATED_HEADER =
  "<!-- 由 build 生成(kata cases build),勿手改;编辑 cases/*.yaml 后重新 build -->";

// 表格单元格转义:竖线会破坏 markdown 表;换行会破坏行结构,转 <br>(读回时还原)
function cell(text: string): string {
  return text.replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function renderCase(c: CaseItem, headingLevel: number): string {
  // case_id 注释锚点:archive → xmind 读回时据此关联稳定用例编号
  const lines: string[] = [
    `<!-- case_id: ${c.id} -->`,
    "",
    `${"#".repeat(headingLevel)} 【${c.priority}】${c.title}`,
    "",
  ];
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

interface MdGroup {
  cases: CaseItem[];
  children: Map<string, MdGroup>;
}

function newGroup(): MdGroup {
  return { cases: [], children: new Map() };
}

function renderGroup(group: MdGroup, level: number, out: string[]): void {
  for (const c of group.cases) out.push(renderCase(c, Math.max(5, level + 1)), "");
  for (const [name, child] of group.children) {
    out.push("", `${"#".repeat(level)} ${name}`, "");
    renderGroup(child, level + 1, out);
  }
}

/** Render the full markdown export for a CasesFile. */
export function renderMarkdown(file: CasesFile, context: CaseRenderContext): string {
  const out: string[] = [
    GENERATED_HEADER,
    "",
    `# ${file.meta.title} 测试用例`,
    "",
    `- 版本: ${context.version}`,
    `- feature: ${context.featureKey}`,
    `- 用例数: ${file.cases.length}`,
  ];
  if (file.meta.source) out.push(`- 来源: ${file.meta.source}`);
  // 按 tags 层级路径动态渲染为 ##/###/####/...，保持首次出现顺序
  const root = newGroup();
  for (const c of file.cases) {
    const path = c.tags ?? [];
    if (path.length === 0) path.push(UNCLASSIFIED);
    let group = root;
    for (const name of path) {
      let next = group.children.get(name);
      if (!next) {
        next = newGroup();
        group.children.set(name, next);
      }
      group = next;
    }
    group.cases.push(c);
  }
  renderGroup(root, 2, out);
  return `${out.join("\n").trimEnd()}\n`;
}
