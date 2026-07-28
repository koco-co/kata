import { describe, expect, test } from "bun:test";

import {
  loadPlaywrightAutomationConfig,
  PLAYWRIGHT_AUTOMATION_CONFIG_PATH,
} from "./playwright-config";

describe("shared Playwright automation config", () => {
  test("loads the YAML defaults without dotenv", () => {
    expect(PLAYWRIGHT_AUTOMATION_CONFIG_PATH).toEndWith("config/automation/playwright.yaml");
    const config = loadPlaywrightAutomationConfig({});
    expect(config.requirementIdMapping).toBe(true);
    expect(config.continueOnFailure).toBe(true);
    expect(config.skipPreconditionSetup).toBe(true);
    expect(config.sortCases).toBe(false);
    expect(config.workers).toBe(4);
    expect(config.headless).toBe(true);
    expect(config.allure.enabled).toBe(true);
    expect(config.allure.resultsDir).toEndWith("/allure-results");
  });

  test("supports explicit command-line overrides", () => {
    expect(
      loadPlaywrightAutomationConfig({
        overrides: { continueOnFailure: false, skipPreconditionSetup: true, sortCases: true, workers: 8 },
      }).workers,
    ).toBe(1);
    expect(
      loadPlaywrightAutomationConfig({
        overrides: { continueOnFailure: false, skipPreconditionSetup: true },
      }),
    ).toMatchObject({ continueOnFailure: false, skipPreconditionSetup: true, workers: 4 });
  });

  test("rejects invalid overrides", () => {
    expect(() =>
      loadPlaywrightAutomationConfig({ overrides: { workers: 0 } }),
    ).toThrow("命令行 Playwright 配置.workers 必须是正整数");
  });
});
