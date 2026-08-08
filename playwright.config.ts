import { resolve } from "node:path";
import {
  defineConfig,
  devices,
  type PlaywrightTestOptions,
  type ReporterDescription,
} from "@playwright/test";
import {
  resolvePlaywrightOutputDir,
  resolvePlaywrightRunPath,
} from "./cli/lib/automation/playwright-run-path.ts";
import {
  ACTIVE_ENV_CONFIG_ENV,
  ACTIVE_ENV_RESOLVED_ENV,
  assertPlatformEnvName,
  effectivePlatformEnvPath,
  type ResolvedPlatformEnv,
  readPlatformEnvConfig,
} from "./cli/lib/platform-env.ts";
import { validateProjectName } from "./cli/lib/workspace-locator.ts";
import {
  loadPlaywrightAutomationConfig,
  PLAYWRIGHT_AUTOMATION_REPO_ROOT,
  prepareAllureDirectories,
  resolveAllureDirectories,
} from "./runtime/automation/config/playwright";
import { cookieHeaderToPlaywrightState } from "./runtime/automation/playwright";

export function resolveOutputDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.KATA_DISCOVERY_ONLY === "1") return "test-results/discovery";
  return resolvePlaywrightOutputDir(env);
}

// 根据显式平台环境解析运行时地址；URL 和 Cookie 只进入内存中的 Playwright storageState。
const discoveryOnly = process.env.KATA_DISCOVERY_ONLY === "1";
// discovery 模式只服务用例发现（--list）；拿它跑测试一律拒绝，避免结果写进 test-results/discovery
if (discoveryOnly && !process.argv.includes("--list")) {
  throw new Error(
    "[playwright.config] KATA_DISCOVERY_ONLY=1 only supports `playwright test --list`.",
  );
}
const project = process.env.KATA_ACTIVE_PROJECT;
if (!project) {
  throw new Error(
    "[playwright.config] KATA_ACTIVE_PROJECT is required; choose a workspace project.",
  );
}
validateProjectName(project);
const automationConfig = loadPlaywrightAutomationConfig();
function resolveGenericRuntime(env: NodeJS.ProcessEnv):
  | {
      readonly resolved: ResolvedPlatformEnv;
      readonly cookie: string;
    }
  | undefined {
  if (discoveryOnly) return undefined;
  const raw = env[ACTIVE_ENV_RESOLVED_ENV];
  if (!raw) throw new Error("[playwright.config] run through `kata env run <env> -- ...` first.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("[playwright.config] KATA_ACTIVE_ENV_RESOLVED is invalid JSON");
  }
  const resolved = parsed as Partial<ResolvedPlatformEnv>;
  if (resolved.schemaVersion !== 2 || !resolved.env || !resolved.urls?.baseUrl) {
    throw new Error("[playwright.config] resolved environment is incomplete");
  }
  const selected = assertPlatformEnvName(resolved.env);
  const injectedPath = env[ACTIVE_ENV_CONFIG_ENV];
  if (!injectedPath) throw new Error("[playwright.config] KATA_ACTIVE_ENV_CONFIG is required.");
  if (resolve(injectedPath) !== resolve(effectivePlatformEnvPath(selected, process.cwd()))) {
    throw new Error(
      "[playwright.config] active environment config path does not match the selected environment",
    );
  }
  const config = readPlatformEnvConfig(selected, { repoRoot: process.cwd() });
  return { resolved: resolved as ResolvedPlatformEnv, cookie: config.auth.cookie };
}

const profile = resolveGenericRuntime(process.env);
// cookieHeaderToPlaywrightState 返回 readonly 形状，与 use.storageState 要求
// （playwright-core 内联定义、数组可变）不兼容；逐字段展开成可变对象，不做强转
const storageState: PlaywrightTestOptions["storageState"] = profile
  ? {
      cookies: cookieHeaderToPlaywrightState(
        profile.resolved.urls.baseUrl,
        profile.cookie,
      ).cookies.map((cookie) => ({ ...cookie })),
      origins: [],
    }
  : undefined;
if (!discoveryOnly) resolvePlaywrightRunPath();
if (!discoveryOnly && automationConfig.allure.enabled) prepareAllureDirectories(automationConfig);
const allureDirectories =
  !discoveryOnly && automationConfig.allure.enabled
    ? resolveAllureDirectories(automationConfig)
    : undefined;
const allureReportReporter = resolve(
  PLAYWRIGHT_AUTOMATION_REPO_ROOT,
  "cli/lib/allure-report-reporter.ts",
);
const progressReporter = resolve(
  PLAYWRIGHT_AUTOMATION_REPO_ROOT,
  "cli/lib/playwright-progress-reporter.ts",
);
const allureReporters: ReporterDescription[] =
  !discoveryOnly && automationConfig.allure.enabled
    ? [
        [
          "allure-playwright",
          {
            detail: true,
            resultsDir: allureDirectories?.resultsDir,
            suiteTitle: true,
          },
        ],
        [
          allureReportReporter,
          {
            resultsDir: allureDirectories?.resultsDir,
            reportDir: allureDirectories?.reportDir,
            repoRoot: process.cwd(),
          },
        ],
      ]
    : [];

export default defineConfig({
  testMatch: [
    `workspace/${project}/tests/**/*.spec.ts`,
    `workspace/${project}/features/**/automation/tests/runners/full.spec.ts`,
    `workspace/${project}/features/**/automation/tests/runners/smoke.spec.ts`,
    `.kata/${project}/ui-blocks/**/*.ts`,
  ],
  // 排除 .kata/ui-blocks 里的 helpers（被 t*.ts 以相对路径 import）
  // 以及 tests/ 下同目录的 *-helpers.ts（与 spec 并列的工具文件）
  testIgnore: [
    `.kata/${project}/ui-blocks/**/*-helpers.ts`,
    `workspace/${project}/tests/**/*-helpers.ts`,
    `workspace/${project}/features/**/automation/tests/runners/*-helpers.ts`,
  ],
  outputDir: resolveOutputDir(),
  workers: automationConfig.workers,
  timeout: automationConfig.timeoutMs,
  retries: automationConfig.retries,
  reporter: [["line"], [progressReporter], ...allureReporters],
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
