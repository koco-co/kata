/** Existing environment-level automation values retained at the control-plane boundary only. */
export interface PlatformAutomationConfig {
  readonly cases?: string;
  readonly table_batch_suffix?: string;
  readonly table_partition?: string;
  readonly result_strict?: boolean;
  readonly case_timeout_ms?: number;
  readonly result_timeout_ms?: number;
  readonly result_query_retry_timeout_ms?: number;
  readonly result_query_retry_interval_ms?: number;
  readonly table_option_timeout_ms?: number;
  readonly rule_set_save_prompt_close_timeout_ms?: number;
  readonly task_search_query?: string;
  readonly task_scan_max_pages?: number;
  readonly ruleset_scan_max_pages?: number;
  readonly spin_timeout_ms?: number;
  readonly import_form_timeout_ms?: number;
  readonly select_spin_timeout_ms?: number;
  readonly resource_group?: string;
  readonly execute_submit_wait_ms?: number;
  readonly doris_jdbc_url?: string;
  readonly doris_user?: string;
  readonly doris_password?: string;
  readonly doris_connect_timeout_ms?: number;
  readonly limited_env?: string;
  readonly probe_table?: string;
}

const NORMALIZED_STRING_FIELDS = [
  "cases",
  "table_batch_suffix",
  "table_partition",
  "resource_group",
] as const;
const RAW_STRING_FIELDS = [
  "task_search_query",
  "doris_jdbc_url",
  "doris_user",
  "doris_password",
  "limited_env",
  "probe_table",
] as const;
const POSITIVE_INTEGER_FIELDS = [
  "case_timeout_ms",
  "result_timeout_ms",
  "result_query_retry_timeout_ms",
  "result_query_retry_interval_ms",
  "table_option_timeout_ms",
  "rule_set_save_prompt_close_timeout_ms",
  "spin_timeout_ms",
  "import_form_timeout_ms",
  "select_spin_timeout_ms",
  "execute_submit_wait_ms",
  "doris_connect_timeout_ms",
] as const;
const NON_NEGATIVE_INTEGER_FIELDS = ["task_scan_max_pages", "ruleset_scan_max_pages"] as const;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("automation must be an object");
  }
  return value as Record<string, unknown>;
}

function optionalString(value: unknown, path: string, preserveRaw = false): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${path} is required`);
  return preserveRaw ? value : value.trim();
}

function optionalInteger(value: unknown, path: string, minimum: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) {
    const boundary = minimum === 0 ? "a non-negative" : "a positive";
    throw new Error(`${path} must be ${boundary} integer`);
  }
  return value;
}

/** Parse and preserve the bounded compatibility shape used by existing private environments. */
export function parsePlatformAutomationConfig(
  value: unknown,
): PlatformAutomationConfig | undefined {
  if (value === undefined) return undefined;
  const automation = record(value);
  const allowed = [
    ...NORMALIZED_STRING_FIELDS,
    ...RAW_STRING_FIELDS,
    ...POSITIVE_INTEGER_FIELDS,
    ...NON_NEGATIVE_INTEGER_FIELDS,
    "result_strict",
  ];
  const extra = Object.keys(automation).filter((key) => !allowed.includes(key));
  if (extra.length > 0)
    throw new Error(`automation contains unsupported keys: ${extra.join(", ")}`);

  const parsed: Record<string, string | number | boolean> = {};
  for (const field of NORMALIZED_STRING_FIELDS) {
    const item = optionalString(automation[field], `automation.${field}`);
    if (item !== undefined) parsed[field] = item;
  }
  for (const field of RAW_STRING_FIELDS) {
    const item = optionalString(automation[field], `automation.${field}`, true);
    if (item !== undefined) parsed[field] = item;
  }
  for (const field of POSITIVE_INTEGER_FIELDS) {
    const item = optionalInteger(automation[field], `automation.${field}`, 1);
    if (item !== undefined) parsed[field] = item;
  }
  for (const field of NON_NEGATIVE_INTEGER_FIELDS) {
    const item = optionalInteger(automation[field], `automation.${field}`, 0);
    if (item !== undefined) parsed[field] = item;
  }
  if (automation.result_strict !== undefined) {
    if (typeof automation.result_strict !== "boolean") {
      throw new Error("automation.result_strict must be boolean");
    }
    parsed.result_strict = automation.result_strict;
  }
  if (
    typeof parsed.table_batch_suffix === "string" &&
    !/^[a-z]{8}$/.test(parsed.table_batch_suffix)
  ) {
    throw new Error("automation.table_batch_suffix must be 8 lowercase letters");
  }
  if (
    typeof parsed.table_partition === "string" &&
    !/^\d{4}-\d{2}-\d{2}$/.test(parsed.table_partition)
  ) {
    throw new Error("automation.table_partition must be yyyy-MM-dd");
  }
  return parsed as PlatformAutomationConfig;
}
