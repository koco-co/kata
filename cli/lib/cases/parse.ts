/**
 * Parse cases.yaml text into a typed CasesFile.
 * Throws CasesParseError on malformed yaml or illegal structure.
 */

import { parse } from "yaml";
import { assertPlatformEnvName } from "../platform-env.ts";
import { CASE_EXPORT_FORMATS, parseCaseExportName } from "./formats.ts";
import { FEATURE_ID_RE } from "./naming.ts";
import { normalizeStructuredText } from "./normalize.ts";
import {
  type CaseAutomation,
  type CaseAutomationBusinessRecord,
  type CaseAutomationImplementation,
  type CaseItem,
  type CaseRequirement,
  type CasesFile,
  PRIORITIES,
} from "./types.ts";

export { validateCases } from "./schema.ts";
export type { CaseItem, CaseMeta, CasesFile } from "./types.ts";

/** Error raised when cases.yaml text cannot be parsed into a valid CasesFile. */
export class CasesParseError extends Error {}

function fail(msg: string): never {
  throw new CasesParseError(msg);
}

function typeName(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "数组";
  switch (typeof v) {
    case "string":
      return "字符串";
    case "number":
      return "数字";
    case "boolean":
      return "布尔";
    case "object":
      return "对象";
    default:
      return typeof v;
  }
}

// 可选字段类型不符一律报错(旧实现静默丢弃,错误配置无感知)
function failType(field: string, expect: string, v: unknown): never {
  fail(`字段 ${field} 期望${expect},实际${typeName(v)}`);
}

function asString(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim()) fail(`字段 ${field} 缺失或不是字符串`);
  return v;
}

// 步骤单元格:允许空字符串(续行/纯验证行),但必须是字符串
function asCell(v: unknown, field: string): string {
  if (typeof v !== "string") fail(`字段 ${field} 缺失或不是字符串`);
  return normalizeStructuredText(v);
}

function asRecord(v: unknown, field: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    failType(field, "对象", v);
  }
  return v as Record<string, unknown>;
}

function exactRequiredKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  field: string,
): void {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(value)
    .filter((key) => !allowedSet.has(key))
    .sort();
  if (unknown.length > 0) fail(`${field} 不允许字段 ${unknown.join(", ")}`);
  const missing = allowed.find((key) => !Object.hasOwn(value, key));
  if (missing) fail(`${field}.${missing} 缺失`);
}

function trimmedString(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim() || v !== v.trim()) {
    fail(`${field} 必须是无首尾空白的非空字符串`);
  }
  return v;
}

function parseAutomationBusinessRecord(
  value: unknown,
  field: string,
): CaseAutomationBusinessRecord {
  const record = asRecord(value, field);
  if (record.policy === "required") {
    exactRequiredKeys(record, ["policy"], field);
    return { policy: "required" };
  }
  if (record.policy === "not_applicable") {
    exactRequiredKeys(record, ["policy", "reason"], field);
    return {
      policy: "not_applicable",
      reason: trimmedString(record.reason, `${field}.reason`),
    };
  }
  fail(`${field}.policy 必须是 required 或 not_applicable`);
}

function parseAutomationImplementations(
  value: unknown,
  field: string,
): readonly CaseAutomationImplementation[] {
  if (!Array.isArray(value) || value.length === 0) fail(`${field} 必须是非空数组`);
  const executors = new Set<string>();
  return value.map((raw, implementationIndex) => {
    const itemField = `${field}[${implementationIndex}]`;
    const item = asRecord(raw, itemField);
    exactRequiredKeys(item, ["executor", "state"], itemField);
    const executor = trimmedString(item.executor, `${itemField}.executor`);
    if (!FEATURE_ID_RE.test(executor)) {
      fail(`${itemField}.executor 必须是小写英文 kebab 标识`);
    }
    if (executors.has(executor)) fail(`${field} 重复 executor: ${executor}`);
    executors.add(executor);
    if (item.state !== "active" && item.state !== "planned") {
      fail(`${itemField}.state 必须是 active 或 planned`);
    }
    return { executor, state: item.state };
  });
}

function parseCaseAutomation(value: unknown, index: number): CaseAutomation {
  const field = `cases[${index}].automation`;
  const automation = asRecord(value, field);
  exactRequiredKeys(automation, ["effects", "business_record", "implementations"], field);

  const effectsField = `${field}.effects`;
  const effects = asRecord(automation.effects, effectsField);
  exactRequiredKeys(effects, ["platform_write"], effectsField);
  if (typeof effects.platform_write !== "boolean") {
    fail(`${effectsField}.platform_write 必须是布尔值`);
  }

  return {
    effects: { platform_write: effects.platform_write },
    business_record: parseAutomationBusinessRecord(
      automation.business_record,
      `${field}.business_record`,
    ),
    implementations: parseAutomationImplementations(
      automation.implementations,
      `${field}.implementations`,
    ),
  };
}

function asCaseItem(v: unknown, index: number): CaseItem {
  if (typeof v !== "object" || v === null) fail(`cases[${index}] 不是对象`);
  const o = v as Record<string, unknown>;
  const priority = asString(o.priority, `cases[${index}].priority`);
  if (!PRIORITIES.includes(priority as CaseItem["priority"])) {
    fail(`cases[${index}].priority 非法: ${priority}(允许 P0/P1/P2)`);
  }
  if (!Array.isArray(o.steps)) fail(`cases[${index}].steps 缺失或不是数组`);
  const steps = o.steps.map((s, i) => {
    if (typeof s !== "object" || s === null) fail(`cases[${index}].steps[${i}] 不是对象`);
    const so = s as Record<string, unknown>;
    return {
      action: asCell(so.action, `cases[${index}].steps[${i}].action`),
      expected: asCell(so.expected, `cases[${index}].steps[${i}].expected`),
    };
  });
  const item: CaseItem = {
    id: asString(o.case_id, `cases[${index}].case_id`),
    title: asString(o.title, `cases[${index}].title`),
    priority: priority as CaseItem["priority"],
    steps,
  };
  if (o.requirement_id !== undefined) {
    if (typeof o.requirement_id !== "string" && typeof o.requirement_id !== "number") {
      failType(`cases[${index}].requirement_id`, "数字字符串", o.requirement_id);
    }
    const requirementId = String(o.requirement_id).trim();
    if (!/^(?:\d+|none)$/.test(requirementId)) {
      fail(`字段 cases[${index}].requirement_id 必须是数字字符串或 "none"`);
    }
    item.requirement_id = requirementId;
  }
  if (o.precondition !== undefined) {
    if (typeof o.precondition !== "string")
      failType(`cases[${index}].precondition`, "字符串", o.precondition);
    if (o.precondition.trim()) item.precondition = normalizeStructuredText(o.precondition);
  }
  if (o.tags !== undefined) {
    if (!Array.isArray(o.tags)) failType(`cases[${index}].tags`, "数组", o.tags);
    item.tags = o.tags.map((t, i) => {
      if (typeof t !== "string") failType(`cases[${index}].tags[${i}]`, "字符串", t);
      return t;
    });
  }
  if (o.source_ref !== undefined) {
    if (typeof o.source_ref !== "string")
      failType(`cases[${index}].source_ref`, "字符串", o.source_ref);
    if (o.source_ref.trim()) item.source_ref = o.source_ref;
  }
  if (o.automation !== undefined) {
    item.automation = parseCaseAutomation(o.automation, index);
  }
  return item;
}

/** Parse cases.yaml text; throws CasesParseError on any structural problem. */
export function parseCasesYaml(yamlText: string): CasesFile {
  let doc: unknown;
  try {
    doc = parse(yamlText);
  } catch (e) {
    fail(`yaml 解析失败: ${(e as Error).message}`);
  }
  if (typeof doc !== "object" || doc === null) fail("顶层不是对象");
  const o = doc as Record<string, unknown>;
  if (typeof o.meta !== "object" || o.meta === null) fail("缺 meta 对象");
  const m = o.meta as Record<string, unknown>;
  if (!Array.isArray(o.cases)) fail("缺 cases 数组");
  if (m.version !== undefined) {
    fail("字段 meta.version 已退役；版本由父级 feature 目录推导");
  }
  const meta: CasesFile["meta"] = {
    title: asString(m.title, "meta.title"),
    case_module_id: "",
  };
  if (m.feature_id !== undefined) {
    if (
      typeof m.feature_id !== "string" ||
      m.feature_id !== m.feature_id.trim() ||
      !FEATURE_ID_RE.test(m.feature_id)
    ) {
      fail("字段 meta.feature_id 必须是小写英文 kebab 标识");
    }
    meta.feature_id = m.feature_id;
  }
  if (m.project_id !== undefined) {
    if (
      typeof m.project_id !== "string" ||
      m.project_id !== m.project_id.trim() ||
      !FEATURE_ID_RE.test(m.project_id)
    ) {
      fail("字段 meta.project_id 必须是小写英文 kebab 标识");
    }
    meta.project_id = m.project_id;
  }
  if (m.layout !== undefined) {
    if (m.layout !== "flat" && m.layout !== "requirements") {
      fail(`字段 meta.layout 非法: ${String(m.layout)}(允许 flat/requirements)`);
    }
    meta.layout = m.layout;
  }
  if (m.l1_title !== undefined) {
    if (typeof m.l1_title !== "string" || !m.l1_title.trim()) {
      fail("字段 meta.l1_title 必须是非空字符串");
    }
    meta.l1_title = m.l1_title.trim();
  }
  if (m.requirement_id !== undefined) {
    if (typeof m.requirement_id !== "string" && typeof m.requirement_id !== "number") {
      failType("meta.requirement_id", "数字字符串", m.requirement_id);
    }
    const requirementId = String(m.requirement_id).trim();
    if (!/^(?:\d+|none)$/.test(requirementId)) {
      fail(`字段 meta.requirement_id 必须是数字字符串或 "none"`);
    }
    meta.requirement_id = requirementId;
  }
  if (m.case_module_id === undefined) {
    fail('字段 meta.case_module_id 缺失；未知时写空字符串 ""');
  }
  if (typeof m.case_module_id !== "string" && typeof m.case_module_id !== "number") {
    failType("meta.case_module_id", "空字符串或数字字符串", m.case_module_id);
  }
  const caseModuleId = String(m.case_module_id).trim();
  if (caseModuleId && !/^\d+$/.test(caseModuleId)) {
    fail("字段 meta.case_module_id 必须是空字符串或数字字符串");
  }
  meta.case_module_id = caseModuleId;
  if (m.automation_env !== undefined) {
    if (typeof m.automation_env !== "string") {
      failType("meta.automation_env", "环境文件名", m.automation_env);
    }
    meta.automation_env = assertPlatformEnvName(m.automation_env);
  }
  if (m.source !== undefined) {
    if (typeof m.source !== "string") failType("meta.source", "字符串", m.source);
    if (m.source.trim()) meta.source = m.source;
  }
  if (m.test_points_digest !== undefined) {
    if (
      typeof m.test_points_digest !== "string" ||
      !/^sha256:[a-f0-9]{64}$/.test(m.test_points_digest)
    ) {
      fail("字段 meta.test_points_digest 必须是 sha256 摘要");
    }
    meta.test_points_digest = m.test_points_digest;
  }
  if (m.imports !== undefined) {
    if (!Array.isArray(m.imports)) failType("meta.imports", "字符串数组", m.imports);
    meta.imports = m.imports.map((value, i) => {
      if (typeof value !== "string" || !parseCaseExportName(value)) {
        fail(
          `字段 meta.imports[${i}] 文件名非法: ${String(value)}(允许 .${CASE_EXPORT_FORMATS.join("/.")})`,
        );
      }
      return value;
    });
  }
  if (m.exports !== undefined) {
    if (!Array.isArray(m.exports)) failType("meta.exports", "文件名数组", m.exports);
    meta.exports = m.exports.map((value, i) => {
      if (typeof value !== "string" || !parseCaseExportName(value)) {
        fail(
          `字段 meta.exports[${i}] 文件名非法: ${String(value)}(允许 .${CASE_EXPORT_FORMATS.join("/.")})`,
        );
      }
      return value;
    });
  }
  let requirements: CaseRequirement[] | undefined;
  if (o.requirements !== undefined) {
    if (!Array.isArray(o.requirements)) failType("requirements", "需求数组", o.requirements);
    requirements = o.requirements.map((value, index) => {
      if (typeof value !== "object" || value === null) {
        fail(`requirements[${index}] 不是对象`);
      }
      const r = value as Record<string, unknown>;
      const id = r.requirement_id;
      if (typeof id !== "string" && typeof id !== "number") {
        failType(`requirements[${index}].requirement_id`, "数字字符串", id);
      }
      const requirementId = String(id).trim();
      if (!/^\d+$/.test(requirementId)) {
        fail(`字段 requirements[${index}].requirement_id 必须是数字字符串`);
      }
      return {
        requirement_id: requirementId,
        title: asString(r.title, `requirements[${index}].title`),
        source: asString(r.source, `requirements[${index}].source`),
      };
    });
  }
  return { meta, ...(requirements ? { requirements } : {}), cases: o.cases.map(asCaseItem) };
}
