/**
 * Parse cases.yaml text into a typed CasesFile.
 * Throws CasesParseError on malformed yaml or illegal structure.
 */

import { parse } from "yaml";
import { CASE_EXPORT_FORMATS, isCaseExportFormat } from "./formats.ts";
import { SPEC_FILE_RE } from "./naming.ts";
import { normalizeStructuredText } from "./normalize.ts";
import { type CaseItem, type CasesFile, PRIORITIES } from "./types.ts";

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

export { SPEC_FILE_RE } from "./naming.ts";

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
    if (typeof o.automation !== "object" || o.automation === null) {
      fail(`cases[${index}].automation 不是对象`);
    }
    const specFile = (o.automation as Record<string, unknown>).spec_file;
    if (typeof specFile !== "string" || !SPEC_FILE_RE.test(specFile)) {
      fail(
        `cases[${index}].automation.spec_file 必须匹配 c<四位序号>-<英文slug>.spec.ts；slug 只能包含小写字母、数字和连字符`,
      );
    }
    item.automation = { spec_file: specFile };
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
  const meta: CasesFile["meta"] = {
    title: asString(m.title, "meta.title"),
    version: asString(m.version, "meta.version"),
    feature_id: asString(m.feature_id, "meta.feature_id"),
    case_module_id: "",
  };
  if (m.requirement_id !== undefined) {
    if (typeof m.requirement_id !== "string" && typeof m.requirement_id !== "number") {
      failType("meta.requirement_id", "数字字符串", m.requirement_id);
    }
    const requirementId = String(m.requirement_id).trim();
    if (!/^\d+$/.test(requirementId)) {
      fail("字段 meta.requirement_id 必须是数字字符串");
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
  if (m.source !== undefined) {
    if (typeof m.source !== "string") failType("meta.source", "字符串", m.source);
    if (m.source.trim()) meta.source = m.source;
  }
  if (m.imports !== undefined) {
    if (!Array.isArray(m.imports)) failType("meta.imports", "字符串数组", m.imports);
    meta.imports = m.imports.map((value, i) => {
      if (typeof value !== "string" || !value.trim()) {
        fail(`字段 meta.imports[${i}] 缺失或不是非空字符串`);
      }
      return value;
    });
  }
  if (m.exports !== undefined) {
    if (!Array.isArray(m.exports)) failType("meta.exports", "格式数组", m.exports);
    meta.exports = m.exports.map((value, i) => {
      if (typeof value !== "string" || !isCaseExportFormat(value)) {
        fail(
          `字段 meta.exports[${i}] 格式非法: ${String(value)}(允许 ${CASE_EXPORT_FORMATS.join("/")})`,
        );
      }
      return value;
    });
  }
  return { meta, cases: o.cases.map(asCaseItem) };
}
