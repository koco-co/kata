import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  loadPlaywrightAutomationConfig,
  PLAYWRIGHT_AUTOMATION_CONFIG_PATH,
  parsePlaywrightAutomationOverrides,
  resolveAllureDirectories,
} from "../../../runtime/automation/config/playwright";

describe("shared Playwright automation config", () => {
  test("loads the YAML defaults without dotenv", () => {
    expect(PLAYWRIGHT_AUTOMATION_CONFIG_PATH).toEndWith("config/automation/playwright.yaml");
    const config = loadPlaywrightAutomationConfig({});
    expect(config.continueOnFailure).toBe(true);
    expect(config.skipPreconditionSetup).toBe(true);
    expect(config.sortCases).toBe(false);
    expect(config.workers).toBe(4);
    expect(config.headless).toBe(true);
    expect(config.stepCapture).toBe("all");
    expect(config.allure.enabled).toBe(true);
    expect(config.allure.resultsDir).toBe("allure-results");
    expect(config.allure.reportDir).toBe("allure-report");
  });

  test("supports explicit command-line overrides", () => {
    expect(
      loadPlaywrightAutomationConfig({
        overrides: {
          continueOnFailure: false,
          skipPreconditionSetup: true,
          sortCases: true,
          workers: 8,
        },
      }).workers,
    ).toBe(1);
    expect(
      loadPlaywrightAutomationConfig({
        overrides: { continueOnFailure: false, skipPreconditionSetup: true },
      }),
    ).toMatchObject({ continueOnFailure: false, skipPreconditionSetup: true, workers: 4 });
  });

  test("rejects invalid overrides", () => {
    expect(() => loadPlaywrightAutomationConfig({ overrides: { workers: 0 } })).toThrow(
      "命令行 Playwright 配置.workers 必须是正整数",
    );
    expect(() => parsePlaywrightAutomationOverrides({ step_capture: "sometimes" })).toThrow(
      "step_capture 必须是 all、failed 或 off",
    );
    expect(parsePlaywrightAutomationOverrides({ step_capture: "failed" })).toEqual({
      stepCapture: "failed",
    });
    expect(() =>
      parsePlaywrightAutomationOverrides({ allure: { results_dir: "../outside" } }),
    ).toThrow("allure.results_dir 必须是当前 run 下的单级目录名");
    expect(() =>
      parsePlaywrightAutomationOverrides({ allure: { report_dir: "/tmp/report" } }),
    ).toThrow("allure.report_dir 必须是当前 run 下的单级目录名");
  });

  test("resolves Allure directories only inside the allocated run", () => {
    const runPath = mkdtempSync(join(tmpdir(), "kata-allure-run-"));
    const outside = mkdtempSync(join(tmpdir(), "kata-allure-outside-"));
    const config = loadPlaywrightAutomationConfig({});
    try {
      expect(resolveAllureDirectories(config, runPath)).toEqual({
        resultsDir: join(runPath, "allure-results"),
        reportDir: join(runPath, "allure-report"),
      });
      mkdirSync(join(runPath, "allure-results"));
      rmSync(join(runPath, "allure-results"), { recursive: true, force: true });
      symlinkSync(outside, join(runPath, "allure-results"));
      expect(() => resolveAllureDirectories(config, runPath)).toThrow("不得是符号链接");
    } finally {
      rmSync(runPath, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
