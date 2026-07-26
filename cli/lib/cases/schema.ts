/**
 * Structural validation for CasesFile.
 * validateCases returns a list of problems; empty means valid.
 */

import { type CasesFile, PRIORITIES } from "./types.ts";

/** Validate a parsed cases file; returns human-readable problem list. */
export function validateCases(file: CasesFile): string[] {
  const problems: string[] = [];
  if (!file.meta.title?.trim()) problems.push("meta.title 为空");
  if (!file.meta.version?.trim()) problems.push("meta.version 为空");
  if (!file.meta.feature_id?.trim()) problems.push("meta.feature_id 为空");
  if (file.cases.length === 0) {
    problems.push("用例数为 0");
    return problems;
  }
  const seen = new Set<string>();
  for (const c of file.cases) {
    if (!c.id?.trim()) problems.push(`用例「${c.title}」缺 id`);
    else if (seen.has(c.id)) problems.push(`用例 id 重复: ${c.id}`);
    else seen.add(c.id);
    if (!c.title?.trim()) problems.push(`用例 ${c.id} 标题为空`);
    if (!PRIORITIES.includes(c.priority)) problems.push(`用例 ${c.id} 优先级非法: ${c.priority}`);
    if (!c.steps || c.steps.length === 0) problems.push(`用例 ${c.id} 没有步骤`);
    if (c.automation && !/^t\d+-[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/.test(c.automation.spec_file)) {
      problems.push(`用例 ${c.id} automation.spec_file 必须匹配 t<序号>-<slug>.ts`);
    }
    // action/expected 允许为空字符串(续行/纯验证行是合法 QA 写法)
  }
  return problems;
}
