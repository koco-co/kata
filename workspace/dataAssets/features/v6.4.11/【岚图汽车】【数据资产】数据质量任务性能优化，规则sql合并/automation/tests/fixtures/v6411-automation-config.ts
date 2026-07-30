import { getEnvConfig } from "../../../../../../_shared/helpers";
import { readAutomationOverrideFile } from "../../../../../../../../lib/automation/overrides";

export interface V6411AutomationSettings {
  readonly cases: string;
  readonly tableBatchSuffix: string;
  readonly tablePartition: string;
  readonly resultStrict: boolean;
  readonly caseTimeoutMs: number;
  readonly resultTimeoutMs: number;
  readonly resultQueryRetryTimeoutMs: number;
  readonly resultQueryRetryIntervalMs: number;
  readonly tableOptionTimeoutMs: number;
  readonly ruleSetSavePromptCloseTimeoutMs: number;
  readonly taskSearchQuery: string;
  readonly taskScanMaxPages: number;
  readonly rulesetScanMaxPages: number;
  readonly spinTimeoutMs: number;
  readonly importFormTimeoutMs: number;
  readonly selectSpinTimeoutMs: number;
  readonly resourceGroup: string;
  readonly executeSubmitWaitMs: number;
  readonly dorisJdbcUrl?: string;
  readonly dorisUser?: string;
  readonly dorisPassword?: string;
  readonly dorisConnectTimeoutMs?: number;
  readonly limitedEnv?: string;
  readonly probeTable?: string;
}

const ALLOWED_KEYS = [
  "cases",
  "table_batch_suffix",
  "table_partition",
  "result_strict",
  "case_timeout_ms",
  "result_timeout_ms",
  "result_query_retry_timeout_ms",
  "result_query_retry_interval_ms",
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
  "doris_jdbc_url",
  "doris_user",
  "doris_password",
  "doris_connect_timeout_ms",
  "limited_env",
  "probe_table",
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

function stringValue(value: unknown, key: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${key} 必须是非空字符串`);
  return value.trim();
}

function positiveInteger(value: unknown, key: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${key} 必须是正整数`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, key: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${key} 必须是非负整数`);
  }
  return value;
}

function booleanValue(value: unknown, key: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${key} 必须是 boolean`);
  return value;
}

function parseSettings(value: unknown, source: string): V6411AutomationSettings {
  const raw = record(value, source);
  exactKeys(raw, source);
  const suffix = stringValue(raw.table_batch_suffix, `${source}.table_batch_suffix`);
  if (!/^[a-z]{8}$/.test(suffix)) {
    throw new Error(`${source}.table_batch_suffix 必须是 8 位小写英文字母`);
  }
  const partition = stringValue(raw.table_partition, `${source}.table_partition`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(partition)) {
    throw new Error(`${source}.table_partition 必须是 yyyy-MM-dd`);
  }
  const resourceGroup = stringValue(raw.resource_group, `${source}.resource_group`);
  return {
    cases: stringValue(raw.cases, `${source}.cases`),
    tableBatchSuffix: suffix,
    tablePartition: partition,
    resultStrict: booleanValue(raw.result_strict, `${source}.result_strict`),
    caseTimeoutMs: positiveInteger(raw.case_timeout_ms, `${source}.case_timeout_ms`),
    resultTimeoutMs: positiveInteger(raw.result_timeout_ms, `${source}.result_timeout_ms`),
    resultQueryRetryTimeoutMs: positiveInteger(
      raw.result_query_retry_timeout_ms,
      `${source}.result_query_retry_timeout_ms`,
    ),
    resultQueryRetryIntervalMs: positiveInteger(
      raw.result_query_retry_interval_ms,
      `${source}.result_query_retry_interval_ms`,
    ),
    tableOptionTimeoutMs: positiveInteger(raw.table_option_timeout_ms, `${source}.table_option_timeout_ms`),
    ruleSetSavePromptCloseTimeoutMs: positiveInteger(
      raw.rule_set_save_prompt_close_timeout_ms,
      `${source}.rule_set_save_prompt_close_timeout_ms`,
    ),
    taskSearchQuery: stringValue(raw.task_search_query, `${source}.task_search_query`),
    taskScanMaxPages: nonNegativeInteger(raw.task_scan_max_pages, `${source}.task_scan_max_pages`),
    rulesetScanMaxPages: nonNegativeInteger(raw.ruleset_scan_max_pages, `${source}.ruleset_scan_max_pages`),
    spinTimeoutMs: positiveInteger(raw.spin_timeout_ms, `${source}.spin_timeout_ms`),
    importFormTimeoutMs: positiveInteger(raw.import_form_timeout_ms, `${source}.import_form_timeout_ms`),
    selectSpinTimeoutMs: positiveInteger(raw.select_spin_timeout_ms, `${source}.select_spin_timeout_ms`),
    resourceGroup,
    executeSubmitWaitMs: positiveInteger(raw.execute_submit_wait_ms, `${source}.execute_submit_wait_ms`),
    ...(raw.doris_jdbc_url === undefined
      ? {}
      : { dorisJdbcUrl: stringValue(raw.doris_jdbc_url, `${source}.doris_jdbc_url`) }),
    ...(raw.doris_user === undefined
      ? {}
      : { dorisUser: stringValue(raw.doris_user, `${source}.doris_user`) }),
    ...(raw.doris_password === undefined
      ? {}
      : { dorisPassword: stringValue(raw.doris_password, `${source}.doris_password`) }),
    ...(raw.doris_connect_timeout_ms === undefined
      ? {}
      : {
          dorisConnectTimeoutMs: positiveInteger(
            raw.doris_connect_timeout_ms,
            `${source}.doris_connect_timeout_ms`,
          ),
        }),
    ...(raw.limited_env === undefined
      ? {}
      : { limitedEnv: stringValue(raw.limited_env, `${source}.limited_env`) }),
    ...(raw.probe_table === undefined
      ? {}
      : { probeTable: stringValue(raw.probe_table, `${source}.probe_table`) }),
  };
}

export function loadV6411AutomationSettings(): V6411AutomationSettings {
  const environment = getEnvConfig().automation ?? {};
  const overrides = readAutomationOverrideFile().automation;
  return parseSettings({ ...environment, ...(overrides ?? {}) }, "automation");
}
