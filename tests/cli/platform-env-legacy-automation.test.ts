import { describe, expect, test } from "bun:test";
import { parsePlatformAutomationConfig } from "../../cli/lib/platform-env-legacy-automation.ts";

describe("existing platform automation configuration compatibility", () => {
  test("keeps the complete established typed shape and its original storage semantics", () => {
    const parsed = parsePlatformAutomationConfig({
      cases: "C0001-C0003",
      table_batch_suffix: "abcdefgh",
      table_partition: "2026-08-09",
      result_strict: true,
      task_scan_max_pages: 0,
      ruleset_scan_max_pages: 1,
      case_timeout_ms: 30_000,
      result_timeout_ms: 30_001,
      result_query_retry_timeout_ms: 30_002,
      result_query_retry_interval_ms: 30_003,
      table_option_timeout_ms: 30_004,
      rule_set_save_prompt_close_timeout_ms: 30_005,
      spin_timeout_ms: 30_006,
      import_form_timeout_ms: 30_007,
      select_spin_timeout_ms: 30_008,
      execute_submit_wait_ms: 30_009,
      doris_connect_timeout_ms: 30_010,
      resource_group: " resource-a ",
      task_search_query: "  query-a  ",
      doris_jdbc_url: "  jdbc:mysql://private.example.invalid/database-a  ",
      doris_user: "  private-user  ",
      doris_password: "  private-password  ",
      limited_env: "  limited-a  ",
      probe_table: "  probe-a  ",
    });

    expect(parsed).toMatchObject({
      cases: "C0001-C0003",
      table_batch_suffix: "abcdefgh",
      table_partition: "2026-08-09",
      result_strict: true,
      task_scan_max_pages: 0,
      case_timeout_ms: 30_000,
      resource_group: "resource-a",
      task_search_query: "  query-a  ",
      doris_jdbc_url: "  jdbc:mysql://private.example.invalid/database-a  ",
      doris_user: "  private-user  ",
      doris_password: "  private-password  ",
      limited_env: "  limited-a  ",
      probe_table: "  probe-a  ",
    });
    expect(Object.keys(parsed ?? {})).toHaveLength(24);
  });

  test.each([
    [{ unknown: true }, "unsupported keys"],
    [{ result_strict: "yes" }, "must be boolean"],
    [{ case_timeout_ms: 0 }, "positive integer"],
    [{ task_scan_max_pages: -1 }, "non-negative integer"],
  ])("continues to reject malformed established values", (value, message) => {
    expect(() => parsePlatformAutomationConfig(value)).toThrow(message);
  });
});
