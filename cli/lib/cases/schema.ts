/**
 * Structural validation for CasesFile.
 * validateCases returns a list of problems; empty means valid.
 */

import { isCaseExportFormat } from "./formats.ts";
import { CASE_ID_RE, caseIdForIndex, SPEC_FILE_RE } from "./naming.ts";
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
  if (file.meta.case_module_id === undefined) {
    problems.push('meta.case_module_id 缺失；未知时写空字符串 ""');
  } else if (!/^(?:\d+)?$/.test(file.meta.case_module_id)) {
    problems.push("meta.case_module_id 必须是空字符串或数字字符串");
  }
  if (file.meta.imports) {
    if (file.meta.imports.some((value) => !value.trim())) {
      problems.push("meta.imports 不能包含空文件名");
    }
  }
  if (file.meta.exports) {
    if (file.meta.exports.length === 0) problems.push("meta.exports 不能是空数组");
    const duplicates = file.meta.exports.filter(
      (value, index, all) => all.indexOf(value) !== index,
    );
    if (duplicates.length > 0) problems.push(`meta.exports 存在重复格式: ${duplicates.join(", ")}`);
    if (file.meta.exports.some((value) => !isCaseExportFormat(value))) {
      problems.push("meta.exports 包含不支持的格式");
    }
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
      problems.push(
        `用例 ${c.id} automation.spec_file 必须匹配 c<四位序号>-<英文slug>.spec.ts；slug 只能包含小写字母、数字和连字符`,
      );
    }
    // action/expected 允许为空字符串(续行/纯验证行是合法 QA 写法)
  }
  return problems;
}
