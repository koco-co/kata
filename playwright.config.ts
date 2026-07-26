import { defineConfig, devices } from "@playwright/test";
import { initEnv } from "./cli/lib/env";
import {
  resolvePlaywrightOutputDir,
  resolvePlaywrightRunPath,
} from "./cli/lib/playwright-run-path";
import {
  bridgeLegacyDataAssetsEnv,
  cookieHeaderToPlaywrightState,
  resolveDataAssetsRuntime,
} from "./workspace/dataAssets/_shared/runtime/env-profile";

// 根 .env 是唯一 dotenv；DataAssets 环境必须由 `kata env run` 注入已解析上下文。
initEnv({ cwd: process.cwd() });

export function resolveOutputDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.KATA_DISCOVERY_ONLY === "1") return "test-results/discovery";
  return resolvePlaywrightOutputDir(env);
}

// 根据 dataAssets env profile 解析环境配置，桥接旧变量给 test-setup.ts 消费
const discoveryOnly = process.env.KATA_DISCOVERY_ONLY === "1";
const profile = discoveryOnly ? undefined : resolveDataAssetsRuntime();
if (profile) bridgeLegacyDataAssetsEnv(profile, process.env);

const storageState = profile
  ? cookieHeaderToPlaywrightState(profile.urls.baseUrl, profile.auth.cookie)
  : undefined;
const project = process.env.KATA_ACTIVE_PROJECT ?? "dataAssets";
const runPath = discoveryOnly ? "test-results/discovery" : resolvePlaywrightRunPath();
const allureResultsDir = `${runPath}/allure-results`;

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
