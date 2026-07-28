import { defineConfig, devices, type PlaywrightTestOptions } from "@playwright/test";
import {
  resolvePlaywrightOutputDir,
  resolvePlaywrightRunPath,
} from "./cli/lib/playwright-run-path";
import {
  bridgeLegacyDataAssetsEnv,
  cookieHeaderToPlaywrightState,
  resolveDataAssetsRuntime,
} from "./workspace/dataAssets/_shared/runtime/env-profile";
import {
  loadPlaywrightAutomationConfig,
  prepareAllureDirectories,
} from "./workspace/dataAssets/_shared/runtime/playwright-config";

export function resolveOutputDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.KATA_DISCOVERY_ONLY === "1") return "test-results/discovery";
  return resolvePlaywrightOutputDir(env);
}

// 根据 dataAssets env profile 解析环境配置，桥接旧变量给 test-setup.ts 消费
const discoveryOnly = process.env.KATA_DISCOVERY_ONLY === "1";
// discovery 模式只服务用例发现（--list）；拿它跑测试一律拒绝，避免结果写进 test-results/discovery
if (discoveryOnly && !process.argv.includes("--list")) {
  throw new Error(
    "[playwright.config] KATA_DISCOVERY_ONLY=1 only supports `playwright test --list`.",
  );
}
const project = process.env.KATA_ACTIVE_PROJECT ?? "dataAssets";
const automationConfig = loadPlaywrightAutomationConfig();
// 仅当激活项目就是 dataAssets 时才解析其 env profile；未设 KATA_ACTIVE_PROJECT 时不炸，
// 真实执行仍由 resolvePlaywrightRunPath 的 KATA_RUN_PATH 硬闸拦截
const profile =
  !discoveryOnly && process.env.KATA_ACTIVE_PROJECT === "dataAssets"
    ? resolveDataAssetsRuntime()
    : undefined;
if (profile) bridgeLegacyDataAssetsEnv(profile, process.env);

// cookieHeaderToPlaywrightState 返回 readonly 形状，与 use.storageState 要求
// （playwright-core 内联定义、数组可变）不兼容；逐字段展开成可变对象，不做强转
const storageState: PlaywrightTestOptions["storageState"] = profile
  ? {
      cookies: cookieHeaderToPlaywrightState(profile.urls.baseUrl, profile.auth.cookie).cookies.map(
        (cookie) => ({ ...cookie }),
      ),
      origins: [],
    }
  : undefined;
if (!discoveryOnly) resolvePlaywrightRunPath();
if (!discoveryOnly && automationConfig.allure.enabled) prepareAllureDirectories(automationConfig);

export default defineConfig({
  testMatch: [
    `workspace/${project}/tests/**/*.spec.ts`,
    `workspace/${project}/features/**/automation/tests/runners/full.spec.ts`,
    `workspace/${project}/features/**/automation/tests/runners/smoke.spec.ts`,
    `workspace/${project}/features/**/automation/tests/runners/sort.spec.ts`,
    // .debug/ 下放调试遗物（单 case shim、复现脚本）；CI 不应跑，由 testIgnore 兜底
    `workspace/${project}/features/**/automation/tests/.debug/*.spec.ts`,
    `.kata/${project}/ui-blocks/**/*.ts`,
  ],
  // 排除 .kata/ui-blocks 里的 helpers（被 t*.ts 以相对路径 import）
  // 以及 tests/ 下同目录的 *-helpers.ts（与 spec 并列的工具文件）
  // CI（CI=true）下排除 .debug/ 调试遗物
  testIgnore: [
    `.kata/${project}/ui-blocks/**/*-helpers.ts`,
    `workspace/${project}/tests/**/*-helpers.ts`,
    `workspace/${project}/features/**/automation/tests/runners/*-helpers.ts`,
    ...(process.env.CI === "true"
      ? [`workspace/${project}/features/**/automation/tests/.debug/**`]
      : []),
  ],
  outputDir: resolveOutputDir(),
  workers: automationConfig.workers,
  timeout: automationConfig.timeoutMs,
  retries: automationConfig.retries,
  reporter: automationConfig.allure.enabled
    ? [
        ["line"],
        [
          "allure-playwright",
          {
            detail: true,
            resultsDir: automationConfig.allure.resultsDir,
            suiteTitle: true,
          },
        ],
        [
          "./cli/lib/allure-report-reporter.ts",
          {
            resultsDir: automationConfig.allure.resultsDir,
            reportDir: automationConfig.allure.reportDir,
            repoRoot: process.cwd(),
          },
        ],
      ]
    : [["line"]],
  use: {
    headless: automationConfig.headless,
    viewport: { width: 1280, height: 720 },
    storageState,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
