import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { writeAutomationRunOverrideFile } from "../../cli/commands/automation.ts";
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
    const runPath = mkdtempSync(join(tmpdir(), "kata-automation-run-"));
    try {
      const overridePath = join(runPath, "_tmp", "kata-automation-config-fixture.overrides.json");
      expect(
        automationOverrideFileFromArgv(["bun", "playwright", "test"], {
          KATA_RUN_PATH: runPath,
          [AUTOMATION_OVERRIDE_FILE_ENV]: overridePath,
        }),
      ).toBe(overridePath);
      expect(() =>
        automationOverrideFileFromArgv(["bun", "playwright", "test"], {
          KATA_RUN_PATH: runPath,
          [AUTOMATION_OVERRIDE_FILE_ENV]: "/tmp/kata-automation-config-fixture.overrides.json",
        }),
      ).toThrow("必须位于当前 run 的 _tmp");
    } finally {
      rmSync(runPath, { recursive: true, force: true });
    }
  });

  test("writes the temporary override below the allocated run instead of the repository root", () => {
    const runPath = mkdtempSync(join(tmpdir(), "kata-automation-run-"));
    const override = {
      playwright: { workers: 1 },
      automation: { cases: "1-2" },
    };
    try {
      const path = writeAutomationRunOverrideFile(runPath, override);
      expect(dirname(path)).toBe(join(runPath, "_tmp"));
      expect(basename(path)).toMatch(/^kata-automation-config-.+\.overrides\.json$/);
      expect(JSON.parse(readFileSync(path, "utf8"))).toEqual(override);
      expect(statSync(path).mode & 0o777).toBe(0o600);
    } finally {
      rmSync(runPath, { recursive: true, force: true });
    }
  });
});
