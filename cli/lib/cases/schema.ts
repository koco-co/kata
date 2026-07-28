/**
 * Structural validation for CasesFile.
 * validateCases returns a list of problems; empty means valid.
 */

import { CASE_ID_RE, caseIdForIndex, caseSpecFileForIndex, SPEC_FILE_RE } from "./naming.ts";
import { type CasesFile, PRIORITIES } from "./types.ts";

/** Validate a parsed cases file; returns human-readable problem list. */
export function validateCases(file: CasesFile): string[] {
  const problems: string[] = [];
  if (!file.meta.title?.trim()) problems.push("meta.title 为空");
  if (!file.meta.version?.trim()) problems.push("meta.version 为空");
  if (!file.meta.feature_id?.trim()) problems.push("meta.feature_id 为空");
  if (file.meta.requirement_id !== undefined && !/^\d+$/.test(file.meta.requirement_id)) {
    problems.push("meta.requirement_id 必须是数字字符串");
  }
  if (file.cases.length === 0) {
    problems.push("用例数为 0");
    return problems;
  }
  const seen = new Set<string>();
  for (const [index, c] of file.cases.entries()) {
    if (!CASE_ID_RE.test(c.id)) problems.push(`用例 ${c.id || "(空)"} case_id 必须匹配 C0001 格式`);
    else if (c.id !== caseIdForIndex(index)) {
      problems.push(`用例 ${c.id} 必须按 YAML 顺序使用 ${caseIdForIndex(index)}`);
    } else if (seen.has(c.id)) problems.push(`用例 id 重复: ${c.id}`);
    else seen.add(c.id);
    if (!c.title?.trim()) problems.push(`用例 ${c.id} 标题为空`);
    if (!PRIORITIES.includes(c.priority)) problems.push(`用例 ${c.id} 优先级非法: ${c.priority}`);
    if (!c.steps || c.steps.length === 0) problems.push(`用例 ${c.id} 没有步骤`);
    if (c.automation && !SPEC_FILE_RE.test(c.automation.spec_file)) {
      problems.push(`用例 ${c.id} automation.spec_file 必须匹配 c<四位序号>-<slug>.ts`);
    } else if (c.automation && c.automation.spec_file !== caseSpecFileForIndex(index, c.title)) {
      problems.push(`用例 ${c.id} automation.spec_file 必须由 case_id 和标题按规则生成`);
    }
    // action/expected 允许为空字符串(续行/纯验证行是合法 QA 写法)
  }
  return problems;
}
