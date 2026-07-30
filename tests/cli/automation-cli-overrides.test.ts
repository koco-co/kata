import { describe, expect, test } from "bun:test";
import { parseAutomationSetEntries } from "../../cli/lib/automation/cli-overrides.ts";
import {
  AUTOMATION_OVERRIDE_FILE_ENV,
  automationOverrideFileFromArgv,
} from "../../runtime/automation/config/overrides.ts";

describe("automation CLI overrides", () => {
  test("supports nested public and environment-specific paths", () => {
    expect(
      parseAutomationSetEntries([
        "playwright.step_capture=failed",
        "playwright.allure.results_dir=tmp/allure-results",
        "automation.cases=72-1",
      ]),
    ).toEqual({
      playwright: {
        step_capture: "failed",
        allure: { results_dir: "tmp/allure-results" },
      },
      automation: { cases: "72-1" },
    });
  });

  test("rejects unsupported roots, invalid paths, and duplicates", () => {
    expect(() => parseAutomationSetEntries(["env.name=ltqc-local"])).toThrow(
      "只允许 playwright.* 或 automation.*",
    );
    expect(() => parseAutomationSetEntries(["automation.table-partition=2026-07-19"])).toThrow(
      "配置路径非法",
    );
    expect(() =>
      parseAutomationSetEntries(["playwright.workers=4", "playwright.workers=1"]),
    ).toThrow("配置重复");
  });

  test("allows Playwright workers to resolve the temporary override through the inherited path", () => {
    expect(
      automationOverrideFileFromArgv(["bun", "playwright", "test"], {
        [AUTOMATION_OVERRIDE_FILE_ENV]: "/tmp/kata-automation-config-fixture.overrides.json",
      }),
    ).toBe("/tmp/kata-automation-config-fixture.overrides.json");
  });
});
