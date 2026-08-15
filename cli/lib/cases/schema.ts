/**
 * Structural validation for CasesFile.
 * validateCases returns a list of problems; empty means valid.
 */

import { parseCaseExportName } from "./formats.ts";
import { CASE_ID_RE, FEATURE_ID_RE } from "./naming.ts";
import { type CasesFile, PRIORITIES } from "./types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function reportUnknownFields(
  value: Record<string, unknown>,
  allowed: readonly string[],
  field: string,
  problems: string[],
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)
    .filter((item) => !allowedSet.has(item))
    .sort()) {
    problems.push(`${field} 不允许字段 ${key}`);
  }
}

function reportMissingFields(
  value: Record<string, unknown>,
  required: readonly string[],
  field: string,
  problems: string[],
): void {
  for (const key of required.filter((item) => !Object.hasOwn(value, item))) {
    problems.push(`${field}.${key} 缺失`);
  }
}

function validateCaseAutomation(value: unknown, caseId: string, problems: string[]): void {
  const field = `用例 ${caseId} automation`;
  if (!isRecord(value)) {
    problems.push(`${field} 必须是对象`);
    return;
  }
  const rootFields = ["effects", "business_record", "implementations"] as const;
  reportUnknownFields(value, rootFields, field, problems);
  reportMissingFields(value, rootFields, field, problems);

  const effectsField = `${field}.effects`;
  if (isRecord(value.effects)) {
    reportUnknownFields(value.effects, ["platform_write"], effectsField, problems);
    reportMissingFields(value.effects, ["platform_write"], effectsField, problems);
    if (
      Object.hasOwn(value.effects, "platform_write") &&
      typeof value.effects.platform_write !== "boolean"
    ) {
      problems.push(`${effectsField}.platform_write 必须是布尔值`);
    }
  } else if (Object.hasOwn(value, "effects")) {
    problems.push(`${effectsField} 必须是对象`);
  }

  const businessField = `${field}.business_record`;
  if (isRecord(value.business_record)) {
    const businessRecord = value.business_record;
    if (businessRecord.policy === "required") {
      reportUnknownFields(businessRecord, ["policy"], businessField, problems);
    } else if (businessRecord.policy === "not_applicable") {
      reportUnknownFields(businessRecord, ["policy", "reason"], businessField, problems);
      reportMissingFields(businessRecord, ["reason"], businessField, problems);
      if (
        Object.hasOwn(businessRecord, "reason") &&
        (typeof businessRecord.reason !== "string" ||
          !businessRecord.reason.trim() ||
          businessRecord.reason !== businessRecord.reason.trim())
      ) {
        problems.push(`${businessField}.reason 必须是无首尾空白的非空字符串`);
      }
    } else {
      reportUnknownFields(businessRecord, ["policy", "reason"], businessField, problems);
      problems.push(`${businessField}.policy 必须是 required 或 not_applicable`);
    }
  } else if (Object.hasOwn(value, "business_record")) {
    problems.push(`${businessField} 必须是对象`);
  }

  const implementationsField = `${field}.implementations`;
  if (Array.isArray(value.implementations) && value.implementations.length > 0) {
    const executors = new Set<string>();
    for (const [index, implementation] of value.implementations.entries()) {
      const implementationField = `${implementationsField}[${index}]`;
      if (!isRecord(implementation)) {
        problems.push(`${implementationField} 必须是对象`);
        continue;
      }
      reportUnknownFields(implementation, ["executor", "state"], implementationField, problems);
      reportMissingFields(implementation, ["executor", "state"], implementationField, problems);
      const executor = implementation.executor;
      if (typeof executor !== "string" || !FEATURE_ID_RE.test(executor)) {
        problems.push(`${implementationField}.executor 必须是小写英文 kebab 标识`);
      } else if (executors.has(executor)) {
        problems.push(`${implementationsField} executor 重复: ${executor}`);
      } else {
        executors.add(executor);
      }
      if (implementation.state !== "active" && implementation.state !== "planned") {
        problems.push(`${implementationField}.state 必须是 active 或 planned`);
      }
    }
  } else if (Object.hasOwn(value, "implementations")) {
    problems.push(`${implementationsField} 必须是非空数组`);
  }
}

/** Validate a parsed cases file; returns human-readable problem list. */
export function validateCases(file: CasesFile): string[] {
  const problems: string[] = [];
  if (!file.meta.title?.trim()) problems.push("meta.title 为空");
  if (file.meta.feature_id !== undefined && !FEATURE_ID_RE.test(file.meta.feature_id)) {
    problems.push("meta.feature_id 必须是小写英文 kebab 标识");
  }
  const projectId = file.meta.project_id as unknown;
  if (
    projectId !== undefined &&
    (typeof projectId !== "string" ||
      projectId !== projectId.trim() ||
      !FEATURE_ID_RE.test(projectId))
  ) {
    problems.push("meta.project_id 必须是小写英文 kebab 标识");
  }
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
  for (const [index, requirement] of requirements.entries()) {
    if (!/^\d+$/.test(requirement.requirement_id)) {
      problems.push(`requirements[${index}].requirement_id 必须是数字字符串`);
    }
    if (!requirement.title?.trim()) problems.push(`requirements[${index}].title 为空`);
    if (!requirement.source?.trim()) problems.push(`requirements[${index}].source 为空`);
    if (requirement.module_id !== undefined && !/^\d+$/.test(requirement.module_id.trim())) {
      problems.push(`requirements[${index}].module_id 必须是数字字符串`);
    }
  }
  if (file.cases.length === 0) {
    problems.push("用例数为 0");
    return problems;
  }
  const seen = new Set<string>();
  for (const c of file.cases) {
    if (!CASE_ID_RE.test(c.id)) problems.push(`用例 ${c.id || "(空)"} case_id 必须匹配 C0001 格式`);
    else if (seen.has(c.id)) problems.push(`用例 id 重复: ${c.id}`);
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
        !requirements.some((requirement) => requirement.requirement_id === c.requirement_id)
      ) {
        problems.push(`用例 ${c.id} 引用了未知需求 ${c.requirement_id}`);
      }
    } else if (file.meta.layout === "requirements") {
      problems.push(`用例 ${c.id} 缺 requirement_id`);
    }
    if (c.automation !== undefined) {
      validateCaseAutomation(c.automation, c.id, problems);
    }
    // action/expected 允许为空字符串(续行/纯验证行是合法 QA 写法)
  }
  return problems;
}

/** Validate a publishable canonical cases file while preserving draft validation separately. */
export function validateCanonicalCases(file: CasesFile): string[] {
  const problems = validateCases(file);
  if (file.meta.project_id === undefined) {
    problems.unshift("meta.project_id 缺失；canonical cases 必须声明不可变身份");
  }
  if (file.meta.feature_id === undefined) {
    problems.unshift("meta.feature_id 缺失；canonical cases 必须声明不可变身份");
  }
  return problems;
}
