/**
 * Structural validation for CasesFile.
 * validateCases returns a list of problems; empty means valid.
 */

import { parseCaseExportName } from "./formats.ts";
import { CASE_ID_RE, caseIdForIndex, SPEC_FILE_RE } from "./naming.ts";
import { type CasesFile, PRIORITIES } from "./types.ts";

/** Validate a parsed cases file; returns human-readable problem list. */
export function validateCases(file: CasesFile): string[] {
  const problems: string[] = [];
  if (!file.meta.title?.trim()) problems.push("meta.title 为空");
  if (file.meta.requirement_id !== undefined && !/^(?:\d+|none)$/.test(file.meta.requirement_id)) {
    problems.push('meta.requirement_id 必须是数字字符串或 "none"');
  }
  if (file.meta.case_module_id === undefined) {
    problems.push('meta.case_module_id 缺失；未知时写空字符串 ""');
  } else if (!/^(?:\d+)?$/.test(file.meta.case_module_id)) {
    problems.push("meta.case_module_id 必须是空字符串或数字字符串");
  }
  if (
    file.meta.automation_env !== undefined &&
    !/^[a-z0-9][a-z0-9-]*$/.test(file.meta.automation_env)
  ) {
    problems.push("meta.automation_env 必须是环境文件名(小写字母/数字/连字符)");
  }
  if (
    file.meta.test_points_digest !== undefined &&
    !/^sha256:[a-f0-9]{64}$/.test(file.meta.test_points_digest)
  ) {
    problems.push("meta.test_points_digest 必须是 sha256 摘要");
  }
  if (file.meta.imports) {
    const duplicates = file.meta.imports.filter(
      (value, index, all) => all.indexOf(value) !== index,
    );
    if (duplicates.length > 0)
      problems.push(`meta.imports 存在重复文件名: ${duplicates.join(", ")}`);
    if (file.meta.imports.some((value) => !parseCaseExportName(value))) {
      problems.push("meta.imports 包含不支持的文件名");
    }
  }
  if (file.meta.exports) {
    if (file.meta.exports.length === 0) problems.push("meta.exports 不能是空数组");
    const duplicates = file.meta.exports.filter(
      (value, index, all) => all.indexOf(value) !== index,
    );
    if (duplicates.length > 0)
      problems.push(`meta.exports 存在重复文件名: ${duplicates.join(", ")}`);
    if (file.meta.exports.some((value) => !parseCaseExportName(value))) {
      problems.push("meta.exports 包含不支持的文件名");
    }
  }
  if (file.meta.layout && !["flat", "requirements"].includes(file.meta.layout)) {
    problems.push(`meta.layout 非法: ${file.meta.layout}`);
  }
  if (file.meta.l1_title !== undefined) {
    if (!file.meta.l1_title.trim()) problems.push("meta.l1_title 不能为空");
    if (file.meta.layout !== "requirements") {
      problems.push("meta.l1_title 仅支持 meta.layout: requirements");
    }
  }
  if (file.meta.layout === "requirements" && !file.requirements) {
    problems.push("requirements 布局缺 requirements 数组");
  }
  if (file.requirements && file.meta.layout !== "requirements") {
    problems.push("requirements 数组必须配合 meta.layout: requirements");
  }
  if (file.meta.layout === "requirements" && (file.requirements?.length ?? 0) === 0) {
    problems.push("requirements 布局至少需要一个需求");
  }
  const requirements = file.requirements ?? [];
  const requirementIds = new Set<string>();
  for (const [index, requirement] of requirements.entries()) {
    if (!/^\d+$/.test(requirement.requirement_id)) {
      problems.push(`requirements[${index}].requirement_id 必须是数字字符串`);
    }
    if (!requirement.title?.trim()) problems.push(`requirements[${index}].title 为空`);
    if (!requirement.source?.trim()) problems.push(`requirements[${index}].source 为空`);
    if (requirementIds.has(requirement.requirement_id)) {
      problems.push(`需求 id 重复: ${requirement.requirement_id}`);
    }
    requirementIds.add(requirement.requirement_id);
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
    if (c.requirement_id !== undefined) {
      if (!/^(?:\d+|none)$/.test(c.requirement_id)) {
        problems.push(`用例 ${c.id} requirement_id 必须是数字字符串或 "none"`);
      } else if (
        file.meta.layout === "requirements" &&
        c.requirement_id !== "none" &&
        !requirementIds.has(c.requirement_id)
      ) {
        problems.push(`用例 ${c.id} 引用了未知需求 ${c.requirement_id}`);
      }
    } else if (file.meta.layout === "requirements") {
      problems.push(`用例 ${c.id} 缺 requirement_id`);
    }
    if (c.automation) {
      const { executor, spec_file: specFile } = c.automation;
      if (executor !== undefined && executor !== "api" && executor !== "playwright") {
        problems.push(`用例 ${c.id} automation.executor 非法: ${executor}`);
      }
      if (specFile !== undefined && !SPEC_FILE_RE.test(specFile)) {
        problems.push(
          `用例 ${c.id} automation.spec_file 必须匹配 c<四位序号>-<英文slug>.spec.ts；slug 只能包含小写字母、数字和连字符`,
        );
      }
      if (executor === "api" && specFile !== undefined) {
        problems.push(`用例 ${c.id} automation.executor 为 api 时不得声明 spec_file`);
      }
      if (executor === undefined && specFile === undefined) {
        problems.push(`用例 ${c.id} automation 至少声明 executor 或 spec_file`);
      }
    }
    // action/expected 允许为空字符串(续行/纯验证行是合法 QA 写法)
  }
  return problems;
}
