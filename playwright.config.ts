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
const runPath = discoveryOnly ? "test-results/discovery" : resolvePlaywrightRunPath();
const allureResultsDir = process.env.KATA_ALLURE_RESULTS_DIR ?? `${runPath}/allure-results`;

// 并发控制：默认串行（向后兼容），通过环境变量按需开启并发
// - PW_FULLY_PARALLEL=1：同文件内（含 describe 内）用例也并发
// - PW_WORKERS=N：worker 数量；未设置则走 Playwright 默认（CPU / 2）
const fullyParallel = process.env.PW_FULLY_PARALLEL === "1";
const workersEnv = process.env.PW_WORKERS;
const workers = workersEnv && /^\d+$/.test(workersEnv) ? Number(workersEnv) : undefined;

export default defineConfig({
  testMatch: [
    `workspace/${project}/tests/**/*.spec.ts`,
    `workspace/${project}/features/**/automation/tests/runners/full.spec.ts`,
    `workspace/${project}/features/**/automation/tests/runners/smoke.spec.ts`,
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
  fullyParallel,
  ...(workers !== undefined ? { workers } : {}),
  timeout: 60000,
  reporter: [
    ["line"],
    [
      "allure-playwright",
      {
        detail: true,
        // allure-playwright v3 的输出目录选项是 resultsDir（v2 的 outputFolder 已失效，
        // 写错会被忽略并退回默认 ./allure-results = 仓库根）。
        resultsDir: allureResultsDir,
        suiteTitle: true,
      },
    ],
  ],
  use: {
    headless: process.env.HEADLESS !== "false",
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
