import { existsSync, readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import {
  bridgeLegacyDataAssetsEnv,
  resolveDataAssetsRuntime,
} from "./workspace/dataAssets/_shared/runtime/env-profile";

// 手动解析 .env / .env.envs / .env.local，确保 worker 继承时变量已就绪
// 加载顺序（低 → 高）：.env → .env.envs → .env.local，后加载的不覆盖已有 process.env 值
function loadDotEnvFile(filename: string) {
  try {
    const content = readFileSync(`${process.cwd()}/${filename}`, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1);
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // 文件不存在时静默跳过
  }
}

function loadDotEnv() {
  loadDotEnvFile(".env");
  loadDotEnvFile(".env.envs");
  loadDotEnvFile(".env.local");
}

loadDotEnv();

// §3.4 F7（项目级隔离）扩展：当同时设置 KATA_ACTIVE_FEATURE 时，
// outputDir 进一步收敛到 feature 级，避免多 feature 共用项目根 `.runs/` 互相覆盖。
// KATA_ACTIVE_FEATURE 由调用方按需显式传入（如 self-run 手动命令）；未传时项目级
// tests/（非 feature 内）仍走旧的项目级路径。
//
// 解析顺序（高 → 低）：
// 1. KATA_ACTIVE_FEATURE + KATA_ACTIVE_PROJECT → feature 级
// 2. KATA_ACTIVE_PROJECT                       → 项目级（无 feature 时）
// 3. 都未设置                                   → fallback 至仓库根（仅本地兼容期）
// CLAUDE.md §Feature Directory Naming: enforce lowercase ASCII feature ids so
// a stale .env.local can't redirect Playwright outputDir into Chinese / 【】
// directories created from raw archive CSV titles.
const FEATURE_ID_RE = /^\d{4}-?(?:\d{2}|XX)(?:-[a-z][a-z0-9-]*)+$/;

export function resolveOutputDir(env: NodeJS.ProcessEnv = process.env): string {
  const project = env.KATA_ACTIVE_PROJECT;
  const feature = env.KATA_ACTIVE_FEATURE;
  if (!project) {
    throw new Error("[playwright.config] KATA_ACTIVE_PROJECT is required.");
  }
  if (feature) {
    if (!FEATURE_ID_RE.test(feature)) {
      throw new Error(
        `[playwright.config] invalid KATA_ACTIVE_FEATURE '${feature}': must match YYYY[-]MM-{slug-segments} (lowercase ASCII). Check .env.local for stale value.`,
      );
    }
    return `workspace/${project}/features/${feature}/tests/.runs/test-results`;
  }
  return `workspace/${project}/.runs/test-results`;
}

// 根据 dataAssets env profile 解析环境配置，桥接旧变量给 test-setup.ts 消费
const profile = resolveDataAssetsRuntime();
bridgeLegacyDataAssetsEnv(profile, process.env);

const envLower = profile.env.toLowerCase();
const sessionPath = profile.auth.sessionPath;
const isListOnly = process.argv.includes("--list");

if (!existsSync(sessionPath) && !isListOnly) {
  throw new Error(`[playwright.config] storageState not found: ${sessionPath}`);
}

// 报告路径：workspace/{project}/_shared/published-reports/YYYYMM/{suiteName}/{env}/
// 通过环境变量 KATA_SUITE_NAME 传入需求名称，默认 report
const yyyymm = new Date().toISOString().slice(0, 7).replace(/-/g, ""); // YYYYMM
const suiteName = process.env.KATA_SUITE_NAME ?? "report";
const project = process.env.KATA_ACTIVE_PROJECT ?? "dataAssets";
const reportDir = `workspace/${project}/_shared/published-reports/${yyyymm}/${suiteName}/${envLower}`;
// KATA_ALLURE_RESULTS_DIR：显式指定本次 run 的 allure 落点（self-run 据此把 allure
// 收敛到 features/<id>/results/<run-id>/allure-results），未设时维持 _shared 发布目录。
// 注意：self-run 必须靠 config 这份带 outputFolder 的 reporter 生成 allure，不能在 CLI 用
// --reporter 覆盖，否则 allure-playwright 会退回默认 ./allure-results（落到仓库根）。
const allureResultsDir = process.env.KATA_ALLURE_RESULTS_DIR ?? `${reportDir}/allure-results`;

// 并发控制：默认串行（向后兼容），通过环境变量按需开启并发
// - PW_FULLY_PARALLEL=1：同文件内（含 describe 内）用例也并发
// - PW_WORKERS=N：worker 数量；未设置则走 Playwright 默认（CPU / 2）
const fullyParallel = process.env.PW_FULLY_PARALLEL === "1";
const workersEnv = process.env.PW_WORKERS;
const workers = workersEnv && /^\d+$/.test(workersEnv) ? Number(workersEnv) : undefined;

export default defineConfig({
  testMatch: [
    `workspace/${project}/tests/**/*.spec.ts`,
    `workspace/${project}/features/**/tests/*.spec.ts`,
    `workspace/${project}/features/**/tests/runners/*.spec.ts`,
    // .debug/ 下放调试遗物（单 case shim、复现脚本）；CI 不应跑，由 testIgnore 兜底
    `workspace/${project}/features/**/tests/.debug/*.spec.ts`,
    `.kata/${project}/ui-blocks/**/*.ts`,
  ],
  // 排除 .kata/ui-blocks 里的 helpers（被 t*.ts 以相对路径 import）
  // 以及 tests/ 下同目录的 *-helpers.ts（与 spec 并列的工具文件）
  // CI（CI=true）下排除 .debug/ 调试遗物
  testIgnore: [
    `.kata/${project}/ui-blocks/**/*-helpers.ts`,
    `workspace/${project}/tests/**/*-helpers.ts`,
    `workspace/${project}/features/**/tests/runners/*-helpers.ts`,
    ...(process.env.CI === "true" ? [`workspace/${project}/features/**/tests/.debug/**`] : []),
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
    ...(existsSync(sessionPath) ? { storageState: sessionPath } : {}),
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
