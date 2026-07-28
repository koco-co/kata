import fs from "node:fs";
import path from "node:path";

import { getEnvConfig } from "../../../../../../_shared/helpers";
import { readAutomationOverrideFile } from "../../../../../../_shared/runtime/automation-overrides";
import { parse } from "yaml";

export interface V6411AutomationSettings {
  readonly cases: string;
  readonly tableBatchSuffix?: string;
  readonly tablePartition?: string;
  readonly resultStrict: boolean;
  readonly caseTimeoutMs: number;
  readonly resultTimeoutMs: number;
  readonly tableOptionTimeoutMs: number;
  readonly ruleSetSavePromptCloseTimeoutMs: number;
  readonly taskSearchQuery: string;
  readonly taskScanMaxPages: number;
  readonly rulesetScanMaxPages: number;
  readonly spinTimeoutMs: number;
  readonly importFormTimeoutMs: number;
  readonly selectSpinTimeoutMs: number;
  readonly resourceGroup?: string;
  readonly executeSubmitWaitMs: number;
}

const DEFAULTS: V6411AutomationSettings = {
  cases: "1-72",
  resultStrict: false,
  caseTimeoutMs: 90 * 60 * 1000,
  resultTimeoutMs: 8 * 60 * 1000,
  tableOptionTimeoutMs: 5 * 60 * 1000,
  ruleSetSavePromptCloseTimeoutMs: 3 * 60 * 1000,
  taskSearchQuery: "test_info_1_",
  taskScanMaxPages: 0,
  rulesetScanMaxPages: 0,
  spinTimeoutMs: 60_000,
  importFormTimeoutMs: 3 * 60 * 1000,
  selectSpinTimeoutMs: 8_000,
  executeSubmitWaitMs: 45_000,
};

const ALLOWED_KEYS = [
  "cases",
  "table_batch_suffix",
  "table_partition",
  "result_strict",
  "case_timeout_ms",
  "result_timeout_ms",
  "table_option_timeout_ms",
  "rule_set_save_prompt_close_timeout_ms",
  "task_search_query",
  "task_scan_max_pages",
  "ruleset_scan_max_pages",
  "spin_timeout_ms",
  "import_form_timeout_ms",
  "select_spin_timeout_ms",
  "resource_group",
  "execute_submit_wait_ms",
] as const;

function record(value: unknown, key: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${key} 必须是对象`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, key: string): void {
  const unknown = Object.keys(value).filter((item) => !ALLOWED_KEYS.includes(item as (typeof ALLOWED_KEYS)[number]));
  if (unknown.length > 0) throw new Error(`${key} 包含未知配置项: ${unknown.join(", ")}`);
}

function stringValue(value: unknown, key: string, fallback?: string): string | undefined {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${key} 必须是非空字符串`);
  return value.trim();
}

function positiveInteger(value: unknown, key: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${key} 必须是正整数`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, key: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${key} 必须是非负整数`);
  }
  return value;
}

function booleanValue(value: unknown, key: string, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new Error(`${key} 必须是 boolean`);
  return value;
}

function parseSettings(value: unknown, source: string): V6411AutomationSettings {
  const raw = record(value, source);
  exactKeys(raw, source);
  const suffix = stringValue(raw.table_batch_suffix, `${source}.table_batch_suffix`);
  if (suffix !== undefined && !/^[a-z]{8}$/.test(suffix)) {
    throw new Error(`${source}.table_batch_suffix 必须是 8 位小写英文字母`);
  }
  const partition = stringValue(raw.table_partition, `${source}.table_partition`);
  if (partition !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(partition)) {
    throw new Error(`${source}.table_partition 必须是 yyyy-MM-dd`);
  }
  const resourceGroup = stringValue(raw.resource_group, `${source}.resource_group`);
  return {
    cases: stringValue(raw.cases, `${source}.cases`, DEFAULTS.cases) ?? DEFAULTS.cases,
    ...(suffix === undefined ? {} : { tableBatchSuffix: suffix }),
    ...(partition === undefined ? {} : { tablePartition: partition }),
    resultStrict: booleanValue(raw.result_strict, `${source}.result_strict`, DEFAULTS.resultStrict),
    caseTimeoutMs: positiveInteger(raw.case_timeout_ms, `${source}.case_timeout_ms`, DEFAULTS.caseTimeoutMs),
    resultTimeoutMs: positiveInteger(raw.result_timeout_ms, `${source}.result_timeout_ms`, DEFAULTS.resultTimeoutMs),
    tableOptionTimeoutMs: positiveInteger(raw.table_option_timeout_ms, `${source}.table_option_timeout_ms`, DEFAULTS.tableOptionTimeoutMs),
    ruleSetSavePromptCloseTimeoutMs: positiveInteger(
      raw.rule_set_save_prompt_close_timeout_ms,
      `${source}.rule_set_save_prompt_close_timeout_ms`,
      DEFAULTS.ruleSetSavePromptCloseTimeoutMs,
    ),
    taskSearchQuery: stringValue(raw.task_search_query, `${source}.task_search_query`, DEFAULTS.taskSearchQuery) ?? DEFAULTS.taskSearchQuery,
    taskScanMaxPages: nonNegativeInteger(raw.task_scan_max_pages, `${source}.task_scan_max_pages`, DEFAULTS.taskScanMaxPages),
    rulesetScanMaxPages: nonNegativeInteger(raw.ruleset_scan_max_pages, `${source}.ruleset_scan_max_pages`, DEFAULTS.rulesetScanMaxPages),
    spinTimeoutMs: positiveInteger(raw.spin_timeout_ms, `${source}.spin_timeout_ms`, DEFAULTS.spinTimeoutMs),
    importFormTimeoutMs: positiveInteger(raw.import_form_timeout_ms, `${source}.import_form_timeout_ms`, DEFAULTS.importFormTimeoutMs),
    selectSpinTimeoutMs: positiveInteger(raw.select_spin_timeout_ms, `${source}.select_spin_timeout_ms`, DEFAULTS.selectSpinTimeoutMs),
    ...(resourceGroup === undefined ? {} : { resourceGroup }),
    executeSubmitWaitMs: positiveInteger(raw.execute_submit_wait_ms, `${source}.execute_submit_wait_ms`, DEFAULTS.executeSubmitWaitMs),
  };
}

export function loadV6411AutomationSettings(): V6411AutomationSettings {
  const environment = getEnvConfig().automation ?? {};
  const overrides = readAutomationOverrideFile().automation;
  return parseSettings({ ...environment, ...(overrides ?? {}) }, "automation");
}

export function loadV6411YamlSpecOrder(featureDir: string): Map<string, number> {
  const casesDir = path.join(featureDir, "cases");
  const yamlFiles = fs.readdirSync(casesDir).filter((name) => name.endsWith(".yaml"));
  if (yamlFiles.length !== 1) throw new Error(`cases/ 下 YAML 必须唯一，当前为 ${yamlFiles.length}`);
  const parsed = parse(fs.readFileSync(path.join(casesDir, yamlFiles[0]), "utf8")) as { cases?: unknown };
  if (!Array.isArray(parsed.cases) || parsed.cases.length === 0) throw new Error("cases YAML 缺少非空 cases 数组");
  const order = new Map<string, number>();
  const specOrders = new Map<number, string>();
  for (const [index, item] of parsed.cases.entries()) {
    const row = record(item, `cases[${index}]`);
    const id = stringValue(row.id, `cases[${index}].id`);
    const automation = record(row.automation, `cases[${index}].automation`);
    const specFile = stringValue(automation.spec_file, `cases[${index}].automation.spec_file`);
    const match = specFile?.match(/^t(\d+)-[^/]+\.ts$/i);
    if (!match) throw new Error(`cases[${index}].automation.spec_file 必须包含 tNN: ${specFile}`);
    if (!id || !specFile) throw new Error(`cases[${index}] 缺少 id 或 automation.spec_file`);
    if (order.has(id)) throw new Error(`cases YAML 存在重复 id: ${id}`);
    const specOrder = Number(match[1]);
    const previousId = specOrders.get(specOrder);
    if (previousId) throw new Error(`cases YAML 存在重复 tNN 序号 t${match[1]}: ${previousId}, ${id}`);
    specOrders.set(specOrder, id);
    order.set(id, specOrder);
  }
  return order;
}
