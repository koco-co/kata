/**
 * Parse cases.yaml text into a typed CasesFile.
 * Throws CasesParseError on malformed yaml or illegal structure.
 */

import { parse } from "yaml";
import { type CaseItem, type CasesFile, PRIORITIES } from "./types.ts";

export { validateCases } from "./schema.ts";
export type { CaseItem, CaseMeta, CasesFile } from "./types.ts";

/** Error raised when cases.yaml text cannot be parsed into a valid CasesFile. */
export class CasesParseError extends Error {}

function fail(msg: string): never {
  throw new CasesParseError(msg);
}

function asString(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim()) fail(`字段 ${field} 缺失或不是字符串`);
  return v;
}

// 步骤单元格:允许空字符串(续行/纯验证行),但必须是字符串
function asCell(v: unknown, field: string): string {
  if (typeof v !== "string") fail(`字段 ${field} 缺失或不是字符串`);
  return v;
}

const SPEC_FILE_RE = /^t\d+-[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/;

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
    id: asString(o.id, `cases[${index}].id`),
    title: asString(o.title, `cases[${index}].title`),
    priority: priority as CaseItem["priority"],
    steps,
  };
  if (typeof o.precondition === "string" && o.precondition.trim())
    item.precondition = o.precondition;
  if (Array.isArray(o.tags) && o.tags.every((t) => typeof t === "string")) item.tags = o.tags;
  if (typeof o.source_ref === "string" && o.source_ref.trim()) item.source_ref = o.source_ref;
  if (o.automation !== undefined) {
    if (typeof o.automation !== "object" || o.automation === null) {
      fail(`cases[${index}].automation 不是对象`);
    }
    const specFile = (o.automation as Record<string, unknown>).spec_file;
    if (typeof specFile !== "string" || !SPEC_FILE_RE.test(specFile)) {
      fail(`cases[${index}].automation.spec_file 必须匹配 t<序号>-<slug>.ts`);
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
  return {
    meta: {
      title: asString(m.title, "meta.title"),
      version: asString(m.version, "meta.version"),
      feature_id: asString(m.feature_id, "meta.feature_id"),
      ...(typeof m.source === "string" && m.source.trim() ? { source: m.source } : {}),
    },
    cases: o.cases.map(asCaseItem),
  };
}
