#!/usr/bin/env bun
/**
 * run-tests-notify.ts — 跑 Playwright，自动刷新 Allure HTML 报告并推送 IM 通知。
 *
 * 用法：
 *   KATA_DATAASSETS_ENV=ltqc-local KATA_SUITE_NAME="【通用配置】json格式配置-15696" \
 *     kata run-tests-notify \
 *     "workspace/<project>/features/<version>/<feature>/automation/tests/runners/full.spec.ts" \
 *     --project=chromium
 *
 * 所有位置参数/flag 会原样透传给 `bunx playwright test`。
 *
 * 环境变量（与 playwright.config.ts 保持一致）：
 *   - KATA_DATAASSETS_ENV          DataAssets profile 名称
 *   - KATA_TARGET_ENV              非 DataAssets 项目的环境标识
 *   - KATA_ACTIVE_PROJECT         kata 内部项目名（必填）
 *   - KATA_SUITE_NAME             套件名（需求名），默认 report
 *
 * 通知卡片展示（按优先级取值）：
 *   - 环境 URL：`{ENV}_BASE_URL` → `UI_AUTOTEST_BASE_URL`
 *   - 租户：`KATA_TENANT` → 从 `{ENV}_COOKIE` 解析 `dt_tenant_name=`
 *   - 项目：`KATA_PROJECT_LABEL` → 租户值兜底 → `KATA_ACTIVE_PROJECT`
 *
 * 可选开关：
 *   - SKIP_NOTIFY=1           跳过通知发送
 *   - SKIP_ALLURE_GEN=1       跳过 HTML 报告生成
 *   - ALLURE_REPORT_BASE_URL  若配置，将生成在线链接 `${base}/YYYYMM/{suite}/{env}/`
 *   - ALLURE_BIN              allure 可执行路径，默认 `allure`
 *   - KATA_RUN_PATH           本次 feature run 目录；设置后 stdout/stderr/exit-code、
 *                             Allure results/report 全部收敛到该目录
 *
 * 两阶段执行（并发 + 串行回退）：
 *   - PW_TWO_PHASE=1          启用两阶段：
 *       阶段 1：`--grep-invert=@serial`（默认 PW_FULLY_PARALLEL=1，并发跑通用用例）
 *       阶段 2：`--grep=@serial`（强制 PW_WORKERS=1，串行跑并发不安全用例）
 *     两阶段共享同一 allure-results 目录，最终只生成一次报告 + 发一次通知。
 *     用户自定义 --grep / --grep-invert 与 PW_TWO_PHASE 冲突，会报错退出。
 *     推荐搭配：PW_TWO_PHASE=1 PW_WORKERS=4（阶段 1 并发度，阶段 2 自动降 1）。
 */

import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  type AllureStats,
  collectAllureStats,
  snapshotResultFiles,
} from "@shared/lib/allure-stats.ts";
import { createCli } from "@shared/lib/cli-runner.ts";
import { getEnv, getEnvOrThrow, initEnv } from "@shared/lib/env.ts";
import { projectPath, repoRoot } from "@shared/lib/paths.ts";

interface Paths {
  env: string;
  project: string;
  suiteName: string;
  yyyymm: string;
  reportDir: string;
  allureResultsDir: string;
  allureReportDir: string;
  runArtifacts?: RunArtifactPaths;
}

export interface RunArtifactPaths {
  runPath: string;
  evidenceDir: string;
  stdoutPath: string;
  stderrPath: string;
  exitCodePath: string;
  allureResultsDir: string;
  allureReportDir: string;
}

export function resolveRunArtifactPaths(runPath: string): RunArtifactPaths {
  const absoluteRunPath = resolve(runPath);
  const evidenceDir = resolve(absoluteRunPath, "playwright/full");
  return {
    runPath: absoluteRunPath,
    evidenceDir,
    stdoutPath: resolve(evidenceDir, "stdout.log"),
    stderrPath: resolve(evidenceDir, "stderr.log"),
    exitCodePath: resolve(evidenceDir, "exit-code"),
    allureResultsDir: resolve(absoluteRunPath, "allure-results"),
    allureReportDir: resolve(evidenceDir, "allure-report"),
  };
}

/** Extract `dt_tenant_name` value from a DTStack cookie string (URL-decoded). */
export function extractTenantFromCookie(cookie: string | undefined): string | undefined {
  if (!cookie) return undefined;
  const match = cookie.match(/(?:^|[;\s])dt_tenant_name=([^;]+)/);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]).trim();
  } catch {
    return match[1].trim();
  }
}

function resolvePaths(): Paths {
  const project = getEnvOrThrow("KATA_ACTIVE_PROJECT");
  const env = (
    (project === "dataAssets" ? process.env.KATA_DATAASSETS_ENV : undefined) ??
    process.env.KATA_TARGET_ENV ??
    process.env.ACTIVE_ENV ??
    "ltqc"
  ).toLowerCase();
  const suiteName = process.env.KATA_SUITE_NAME ?? "report";
  const yyyymm = new Date().toISOString().slice(0, 7).replace(/-/g, "");
  const reportDir = projectPath(project, "_shared", "published-reports", yyyymm, suiteName, env);
  const runArtifacts = process.env.KATA_RUN_PATH
    ? resolveRunArtifactPaths(process.env.KATA_RUN_PATH)
    : undefined;
  return {
    env,
    project,
    suiteName,
    yyyymm,
    reportDir: runArtifacts?.runPath ?? reportDir,
    allureResultsDir: runArtifacts?.allureResultsDir ?? resolve(reportDir, "allure-results"),
    allureReportDir: runArtifacts?.allureReportDir ?? resolve(reportDir, "allure-report"),
    runArtifacts,
  };
}

function runCommand(
  cmd: string,
  args: string[],
  opts: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    stdoutPath?: string;
    stderrPath?: string;
  } = {},
): Promise<number> {
  return new Promise((resolvePromise) => {
    const capture = Boolean(opts.stdoutPath || opts.stderrPath);
    const child = spawn(cmd, args, {
      stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit",
      cwd: opts.cwd ?? repoRoot(),
      env: opts.env ?? process.env,
    });
    child.stdout?.on("data", (chunk: Buffer) => {
      process.stdout.write(chunk);
      if (opts.stdoutPath) appendFileSync(opts.stdoutPath, chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
      if (opts.stderrPath) appendFileSync(opts.stderrPath, chunk);
    });
    child.on("close", (code) => resolvePromise(code ?? 1));
    child.on("error", (err) => {
      process.stderr.write(`[run-tests-notify] spawn error: ${err}\n`);
      resolvePromise(1);
    });
  });
}

export type PhaseName = "single" | "parallel" | "serial";

export interface PhasePlan {
  name: PhaseName;
  args: string[];
  envOverrides: Record<string, string>;
}

/**
 * 将用户透传的 Playwright 参数转为执行计划。
 *
 * - 未启用 two-phase：返回单个 `single` 计划，原样透传 args。
 * - 启用 two-phase：返回 `parallel` + `serial` 两阶段，分别注入 grep 过滤和并发 env。
 *   若用户已自带 `--grep` / `--grep-invert`，抛错以避免静默覆盖用户意图。
 */
export function buildPhasePlans(userArgs: readonly string[], twoPhase: boolean): PhasePlan[] {
  if (!twoPhase) {
    return [{ name: "single", args: [...userArgs], envOverrides: {} }];
  }

  const hasUserGrep = userArgs.some(
    (a) =>
      a === "--grep" ||
      a === "--grep-invert" ||
      a.startsWith("--grep=") ||
      a.startsWith("--grep-invert="),
  );
  if (hasUserGrep) {
    throw new Error("PW_TWO_PHASE=1 与用户自带的 --grep / --grep-invert 冲突；请二选一");
  }

  return [
    {
      name: "parallel",
      args: [...userArgs, "--grep-invert=@serial", "--pass-with-no-tests"],
      envOverrides: { PW_FULLY_PARALLEL: "1" },
    },
    {
      name: "serial",
      args: [...userArgs, "--grep=@serial", "--pass-with-no-tests"],
      envOverrides: { PW_FULLY_PARALLEL: "", PW_WORKERS: "1" },
    },
  ];
}

function buildReportUrl(paths: Paths): string | undefined {
  const base = process.env.ALLURE_REPORT_BASE_URL?.replace(/\/+$/, "");
  if (!base) return undefined;
  const segments = [paths.yyyymm, paths.suiteName, paths.env, "allure-report"].map(
    encodeURIComponent,
  );
  return `${base}/${segments.join("/")}/`;
}

async function main(pwArgs: readonly string[]): Promise<void> {
  initEnv({ cwd: repoRoot() });

  if (pwArgs.length === 0) {
    process.stderr.write(
      "[run-tests-notify] 缺少 Playwright 参数。示例：\n" +
        '  kata run-tests-notify "workspace/.../full.spec.ts" --project=chromium\n',
    );
    process.exit(2);
  }

  const paths = resolvePaths();
  mkdirSync(paths.allureResultsDir, { recursive: true });
  if (paths.runArtifacts) {
    mkdirSync(paths.runArtifacts.evidenceDir, { recursive: true });
    writeFileSync(paths.runArtifacts.stdoutPath, "");
    writeFileSync(paths.runArtifacts.stderrPath, "");
  }

  // Snapshot existing result files so we can filter to only this run's output
  const priorResults = snapshotResultFiles(paths.allureResultsDir);

  process.stderr.write(
    `[run-tests-notify] env=${paths.env} project=${paths.project} suite=${paths.suiteName}\n`,
  );

  // 1. Run Playwright（支持两阶段）
  const twoPhase = process.env.PW_TWO_PHASE === "1";
  let plans: PhasePlan[];
  try {
    plans = buildPhasePlans(pwArgs, twoPhase);
  } catch (err) {
    process.stderr.write(`[run-tests-notify] ${(err as Error).message}\n`);
    process.exit(2);
  }
  if (twoPhase) {
    process.stderr.write(
      `[run-tests-notify] PW_TWO_PHASE=1：先跑 --grep-invert=@serial 并发，再跑 --grep=@serial workers=1\n`,
    );
  }

  const runStart = Date.now();
  let pwExitCode = 0;
  for (const plan of plans) {
    process.stderr.write(`[run-tests-notify] phase=${plan.name} args=${plan.args.join(" ")}\n`);
    const phaseEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ...plan.envOverrides,
    };
    const code = await runCommand("bunx", ["playwright", "test", ...plan.args], {
      env: phaseEnv,
      stdoutPath: paths.runArtifacts?.stdoutPath,
      stderrPath: paths.runArtifacts?.stderrPath,
    });
    process.stderr.write(`[run-tests-notify] phase=${plan.name} exit code: ${code}\n`);
    if (code !== 0) pwExitCode = code;
  }
  if (paths.runArtifacts) {
    writeFileSync(paths.runArtifacts.exitCodePath, `${pwExitCode}\n`);
  }
  const runEnd = Date.now();
  process.stderr.write(`[run-tests-notify] playwright overall exit code: ${pwExitCode}\n`);

  // 2. Collect stats
  const stats = collectAllureStats(paths.allureResultsDir, {
    excludeFiles: priorResults,
  });

  // Fall back to whole-directory stats if nothing new was recorded (edge case: fresh suite)
  const effectiveStats: AllureStats =
    stats.total === 0 && priorResults.size === 0
      ? collectAllureStats(paths.allureResultsDir)
      : stats;

  // 3. Generate allure HTML
  if (process.env.SKIP_ALLURE_GEN !== "1") {
    const allureBin = process.env.ALLURE_BIN ?? "allure";
    const genCode = await runCommand(allureBin, [
      "generate",
      "--clean",
      "-o",
      paths.allureReportDir,
      paths.allureResultsDir,
    ]);
    if (genCode !== 0) {
      process.stderr.write(
        `[run-tests-notify] allure generate 失败 (exit ${genCode})，继续发送通知\n`,
      );
    }
  }

  // 4. Send notification
  if (process.env.SKIP_NOTIFY === "1") {
    process.stderr.write(`[run-tests-notify] SKIP_NOTIFY=1，跳过通知\n`);
    process.exit(pwExitCode);
  }

  const reportPath = existsSync(paths.allureReportDir)
    ? paths.allureReportDir
    : paths.allureResultsDir;
  const reportUrl = buildReportUrl(paths);

  const envKey = paths.env.toUpperCase();
  const envLabel = getEnv(`${envKey}_BASE_URL`) ?? getEnv("UI_AUTOTEST_BASE_URL") ?? "";
  const tenant = getEnv("KATA_TENANT") ?? extractTenantFromCookie(getEnv(`${envKey}_COOKIE`)) ?? "";
  const projectLabel = getEnv("KATA_PROJECT_LABEL") || tenant || paths.project;

  const durationMs = effectiveStats.durationMs > 0 ? effectiveStats.durationMs : runEnd - runStart;

  const payload = {
    env: paths.env,
    ...(envLabel ? { envLabel } : {}),
    ...(tenant ? { tenant } : {}),
    project: projectLabel,
    suite: paths.suiteName,
    total: effectiveStats.total,
    passed: effectiveStats.passed,
    failed: effectiveStats.failed,
    broken: effectiveStats.broken,
    skipped: effectiveStats.skipped,
    durationMs,
    reportPath,
    ...(reportUrl ? { reportUrl } : {}),
    failedCases: effectiveStats.failedCases,
  };

  const notifyScript = resolve(repoRoot(), ".claude/plugins/notify/send.ts");
  const notifyCode = await runCommand("bun", [
    "run",
    notifyScript,
    "--event",
    "ui-test-completed",
    "--data",
    JSON.stringify(payload),
  ]);
  if (notifyCode !== 0) {
    process.stderr.write(`[run-tests-notify] notify 失败 (exit ${notifyCode})\n`);
  }

  // Preserve playwright's exit code so CI sees test failures
  process.exit(pwExitCode);
}

export const program = createCli({
  name: "run-tests-notify",
  description: "Run Playwright, auto-refresh Allure HTML report and push IM notification",
  rootAction: {
    arguments: [
      {
        name: "playwrightArgs",
        description: "Playwright arguments (passthrough)",
        required: false,
        variadic: true,
      },
    ],
    action: async (opts) => {
      const pwArgs = Array.isArray(opts.playwrightArgs) ? (opts.playwrightArgs as string[]) : [];
      await main(pwArgs);
    },
  },
});
