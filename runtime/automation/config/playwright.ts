import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { readAutomationOverrideFile } from "./overrides.ts";

export interface PlaywrightAutomationOverrides {
  readonly continueOnFailure?: boolean;
  readonly skipPreconditionSetup?: boolean;
  readonly sortCases?: boolean;
  readonly workers?: number;
  readonly browser?: string;
  readonly headless?: boolean;
  readonly stepCapture?: "all" | "failed" | "off";
  readonly timeoutMs?: number;
  readonly retries?: number;
  readonly metadataSyncRequireExactTable?: boolean;
  readonly metadataTableSearchTimeoutMs?: number;
  readonly metadataSyncTimeoutMs?: number;
  readonly preconditionRequestTimeoutMs?: number;
  readonly preconditionSyncTimeoutSec?: number;
  readonly preconditionTimeoutMs?: number;
  readonly monitorTimeoutMs?: number;
  readonly scheduleJobTimeoutMs?: number;
  readonly cleanup?: boolean;
  readonly allureEnabled?: boolean;
  readonly allureResultsDir?: string;
  readonly allureReportDir?: string;
}

export interface PlaywrightAutomationConfig {
  readonly continueOnFailure: boolean;
  readonly skipPreconditionSetup: boolean;
  readonly sortCases: boolean;
  readonly workers: number;
  readonly browser: string;
  readonly headless: boolean;
  readonly stepCapture: "all" | "failed" | "off";
  readonly timeoutMs: number;
  readonly retries: number;
  readonly metadataSyncRequireExactTable: boolean;
  readonly metadataTableSearchTimeoutMs: number;
  readonly metadataSyncTimeoutMs: number;
  readonly preconditionRequestTimeoutMs: number;
  readonly preconditionSyncTimeoutSec: number;
  readonly preconditionTimeoutMs: number;
  readonly monitorTimeoutMs: number;
  readonly scheduleJobTimeoutMs: number;
  readonly cleanup: boolean;
  readonly allure: {
    readonly enabled: boolean;
    readonly resultsDir: string;
    readonly reportDir: string;
  };
}

const CONFIG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../config/automation/playwright.yaml",
);
const REPO_ROOT = path.resolve(path.dirname(CONFIG_PATH), "../..");

function record(value: unknown, key: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${key} 必须是对象`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], key: string): void {
  const unknown = Object.keys(value).filter((item) => !allowed.includes(item));
  if (unknown.length > 0) throw new Error(`${key} 包含未知配置项: ${unknown.join(", ")}`);
}

function requiredBoolean(value: unknown, key: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${key} 必须是 boolean`);
  return value;
}

function requiredPositiveInteger(value: unknown, key: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${key} 必须是正整数`);
  }
  return value;
}

function requiredNonNegativeInteger(value: unknown, key: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${key} 必须是非负整数`);
  }
  return value;
}

function requiredString(value: unknown, key: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} 必须是非空字符串`);
  }
  return value.trim();
}

function requiredStepCapture(value: unknown, key: string): "all" | "failed" | "off" {
  const result = requiredString(value, key);
  if (result !== "all" && result !== "failed" && result !== "off") {
    throw new Error(`${key} 必须是 all、failed 或 off`);
  }
  return result;
}

const ALLURE_DIRECTORY_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function requiredAllureDirectoryName(value: string, key: string): string {
  if (
    !ALLURE_DIRECTORY_NAME_RE.test(value) ||
    value === "." ||
    value === ".." ||
    value.includes("..") ||
    value.includes("/") ||
    value.includes("\\")
  ) {
    throw new Error(`${key} 必须是当前 run 下的单级目录名`);
  }
  return value;
}

const PLAYWRIGHT_KEYS = [
  "continue_on_failure",
  "skip_precondition_setup",
  "sort_cases",
  "workers",
  "browser",
  "headless",
  "step_capture",
  "timeout_ms",
  "retries",
  "metadata_sync_require_exact_table",
  "metadata_table_search_timeout_ms",
  "metadata_sync_timeout_ms",
  "precondition_request_timeout_ms",
  "precondition_sync_timeout_sec",
  "precondition_timeout_ms",
  "monitor_timeout_ms",
  "schedule_job_timeout_ms",
  "cleanup",
  "allure",
] as const;
const ALLURE_KEYS = ["enabled", "results_dir", "report_dir"] as const;

function parseCompleteValues(
  value: Record<string, unknown>,
  source: string,
): PlaywrightAutomationConfig {
  exactKeys(value, PLAYWRIGHT_KEYS, source);
  const allure = record(value.allure, `${source}.allure`);
  exactKeys(allure, ALLURE_KEYS, `${source}.allure`);
  const browser = requiredString(value.browser, `${source}.browser`);
  if (browser !== "chromium") throw new Error(`${source}.browser 目前只支持 chromium`);
  const sortCases = requiredBoolean(value.sort_cases, `${source}.sort_cases`);
  const configuredWorkers = requiredPositiveInteger(value.workers, `${source}.workers`);
  return {
    continueOnFailure: requiredBoolean(value.continue_on_failure, `${source}.continue_on_failure`),
    skipPreconditionSetup: requiredBoolean(
      value.skip_precondition_setup,
      `${source}.skip_precondition_setup`,
    ),
    sortCases,
    workers: sortCases ? 1 : configuredWorkers,
    browser,
    headless: requiredBoolean(value.headless, `${source}.headless`),
    stepCapture: requiredStepCapture(value.step_capture, `${source}.step_capture`),
    timeoutMs: requiredPositiveInteger(value.timeout_ms, `${source}.timeout_ms`),
    retries: requiredNonNegativeInteger(value.retries, `${source}.retries`),
    metadataSyncRequireExactTable: requiredBoolean(
      value.metadata_sync_require_exact_table,
      `${source}.metadata_sync_require_exact_table`,
    ),
    metadataTableSearchTimeoutMs: requiredPositiveInteger(
      value.metadata_table_search_timeout_ms,
      `${source}.metadata_table_search_timeout_ms`,
    ),
    metadataSyncTimeoutMs: requiredPositiveInteger(
      value.metadata_sync_timeout_ms,
      `${source}.metadata_sync_timeout_ms`,
    ),
    preconditionRequestTimeoutMs: requiredPositiveInteger(
      value.precondition_request_timeout_ms,
      `${source}.precondition_request_timeout_ms`,
    ),
    preconditionSyncTimeoutSec: requiredPositiveInteger(
      value.precondition_sync_timeout_sec,
      `${source}.precondition_sync_timeout_sec`,
    ),
    preconditionTimeoutMs: requiredPositiveInteger(
      value.precondition_timeout_ms,
      `${source}.precondition_timeout_ms`,
    ),
    monitorTimeoutMs: requiredPositiveInteger(
      value.monitor_timeout_ms,
      `${source}.monitor_timeout_ms`,
    ),
    scheduleJobTimeoutMs: requiredPositiveInteger(
      value.schedule_job_timeout_ms,
      `${source}.schedule_job_timeout_ms`,
    ),
    cleanup: requiredBoolean(value.cleanup, `${source}.cleanup`),
    allure: {
      enabled: requiredBoolean(allure.enabled, `${source}.allure.enabled`),
      resultsDir: requiredAllureDirectoryName(
        requiredString(allure.results_dir, `${source}.allure.results_dir`),
        `${source}.allure.results_dir`,
      ),
      reportDir: requiredAllureDirectoryName(
        requiredString(allure.report_dir, `${source}.allure.report_dir`),
        `${source}.allure.report_dir`,
      ),
    },
  };
}

function validatePartialValues(value: Record<string, unknown>, source: string): void {
  exactKeys(value, PLAYWRIGHT_KEYS, source);
  if (value.continue_on_failure !== undefined)
    requiredBoolean(value.continue_on_failure, `${source}.continue_on_failure`);
  if (value.skip_precondition_setup !== undefined)
    requiredBoolean(value.skip_precondition_setup, `${source}.skip_precondition_setup`);
  if (value.sort_cases !== undefined) requiredBoolean(value.sort_cases, `${source}.sort_cases`);
  if (value.workers !== undefined) requiredPositiveInteger(value.workers, `${source}.workers`);
  if (value.browser !== undefined) {
    const browser = requiredString(value.browser, `${source}.browser`);
    if (browser !== "chromium") throw new Error(`${source}.browser 目前只支持 chromium`);
  }
  if (value.headless !== undefined) requiredBoolean(value.headless, `${source}.headless`);
  if (value.step_capture !== undefined)
    requiredStepCapture(value.step_capture, `${source}.step_capture`);
  if (value.timeout_ms !== undefined)
    requiredPositiveInteger(value.timeout_ms, `${source}.timeout_ms`);
  if (value.retries !== undefined) requiredNonNegativeInteger(value.retries, `${source}.retries`);
  if (value.metadata_sync_require_exact_table !== undefined)
    requiredBoolean(
      value.metadata_sync_require_exact_table,
      `${source}.metadata_sync_require_exact_table`,
    );
  if (value.metadata_table_search_timeout_ms !== undefined)
    requiredPositiveInteger(
      value.metadata_table_search_timeout_ms,
      `${source}.metadata_table_search_timeout_ms`,
    );
  if (value.metadata_sync_timeout_ms !== undefined)
    requiredPositiveInteger(value.metadata_sync_timeout_ms, `${source}.metadata_sync_timeout_ms`);
  if (value.precondition_request_timeout_ms !== undefined)
    requiredPositiveInteger(
      value.precondition_request_timeout_ms,
      `${source}.precondition_request_timeout_ms`,
    );
  if (value.precondition_sync_timeout_sec !== undefined)
    requiredPositiveInteger(
      value.precondition_sync_timeout_sec,
      `${source}.precondition_sync_timeout_sec`,
    );
  if (value.precondition_timeout_ms !== undefined)
    requiredPositiveInteger(value.precondition_timeout_ms, `${source}.precondition_timeout_ms`);
  if (value.monitor_timeout_ms !== undefined)
    requiredPositiveInteger(value.monitor_timeout_ms, `${source}.monitor_timeout_ms`);
  if (value.schedule_job_timeout_ms !== undefined)
    requiredPositiveInteger(value.schedule_job_timeout_ms, `${source}.schedule_job_timeout_ms`);
  if (value.cleanup !== undefined) requiredBoolean(value.cleanup, `${source}.cleanup`);
  if (value.allure !== undefined) {
    const allure = record(value.allure, `${source}.allure`);
    exactKeys(allure, ALLURE_KEYS, `${source}.allure`);
    if (allure.enabled !== undefined) requiredBoolean(allure.enabled, `${source}.allure.enabled`);
    if (allure.results_dir !== undefined)
      requiredAllureDirectoryName(
        requiredString(allure.results_dir, `${source}.allure.results_dir`),
        `${source}.allure.results_dir`,
      );
    if (allure.report_dir !== undefined)
      requiredAllureDirectoryName(
        requiredString(allure.report_dir, `${source}.allure.report_dir`),
        `${source}.allure.report_dir`,
      );
  }
}

function rawConfig(config: PlaywrightAutomationConfig): Record<string, unknown> {
  return {
    continue_on_failure: config.continueOnFailure,
    skip_precondition_setup: config.skipPreconditionSetup,
    sort_cases: config.sortCases,
    workers: config.workers,
    browser: config.browser,
    headless: config.headless,
    step_capture: config.stepCapture,
    timeout_ms: config.timeoutMs,
    retries: config.retries,
    metadata_sync_require_exact_table: config.metadataSyncRequireExactTable,
    metadata_table_search_timeout_ms: config.metadataTableSearchTimeoutMs,
    metadata_sync_timeout_ms: config.metadataSyncTimeoutMs,
    precondition_request_timeout_ms: config.preconditionRequestTimeoutMs,
    precondition_sync_timeout_sec: config.preconditionSyncTimeoutSec,
    precondition_timeout_ms: config.preconditionTimeoutMs,
    monitor_timeout_ms: config.monitorTimeoutMs,
    schedule_job_timeout_ms: config.scheduleJobTimeoutMs,
    cleanup: config.cleanup,
    allure: {
      enabled: config.allure.enabled,
      results_dir: config.allure.resultsDir,
      report_dir: config.allure.reportDir,
    },
  };
}

function mergeOverrides(
  config: PlaywrightAutomationConfig,
  overrides: PlaywrightAutomationOverrides,
): PlaywrightAutomationConfig {
  const raw = rawConfig(config);
  const allure = raw.allure as Record<string, unknown>;
  return parseCompleteValues(
    {
      ...raw,
      ...(overrides.continueOnFailure === undefined
        ? {}
        : { continue_on_failure: overrides.continueOnFailure }),
      ...(overrides.skipPreconditionSetup === undefined
        ? {}
        : { skip_precondition_setup: overrides.skipPreconditionSetup }),
      ...(overrides.sortCases === undefined ? {} : { sort_cases: overrides.sortCases }),
      ...(overrides.workers === undefined ? {} : { workers: overrides.workers }),
      ...(overrides.browser === undefined ? {} : { browser: overrides.browser }),
      ...(overrides.headless === undefined ? {} : { headless: overrides.headless }),
      ...(overrides.stepCapture === undefined ? {} : { step_capture: overrides.stepCapture }),
      ...(overrides.timeoutMs === undefined ? {} : { timeout_ms: overrides.timeoutMs }),
      ...(overrides.retries === undefined ? {} : { retries: overrides.retries }),
      ...(overrides.metadataSyncRequireExactTable === undefined
        ? {}
        : { metadata_sync_require_exact_table: overrides.metadataSyncRequireExactTable }),
      ...(overrides.metadataTableSearchTimeoutMs === undefined
        ? {}
        : { metadata_table_search_timeout_ms: overrides.metadataTableSearchTimeoutMs }),
      ...(overrides.metadataSyncTimeoutMs === undefined
        ? {}
        : { metadata_sync_timeout_ms: overrides.metadataSyncTimeoutMs }),
      ...(overrides.preconditionRequestTimeoutMs === undefined
        ? {}
        : { precondition_request_timeout_ms: overrides.preconditionRequestTimeoutMs }),
      ...(overrides.preconditionSyncTimeoutSec === undefined
        ? {}
        : { precondition_sync_timeout_sec: overrides.preconditionSyncTimeoutSec }),
      ...(overrides.preconditionTimeoutMs === undefined
        ? {}
        : { precondition_timeout_ms: overrides.preconditionTimeoutMs }),
      ...(overrides.monitorTimeoutMs === undefined
        ? {}
        : { monitor_timeout_ms: overrides.monitorTimeoutMs }),
      ...(overrides.scheduleJobTimeoutMs === undefined
        ? {}
        : { schedule_job_timeout_ms: overrides.scheduleJobTimeoutMs }),
      ...(overrides.cleanup === undefined ? {} : { cleanup: overrides.cleanup }),
      allure: {
        ...allure,
        ...(overrides.allureEnabled === undefined ? {} : { enabled: overrides.allureEnabled }),
        ...(overrides.allureResultsDir === undefined
          ? {}
          : { results_dir: overrides.allureResultsDir }),
        ...(overrides.allureReportDir === undefined
          ? {}
          : { report_dir: overrides.allureReportDir }),
      },
    },
    "命令行 Playwright 配置",
  );
}

/** 解析并完整校验一份 Playwright 自动化 YAML 文档。 */
export function parsePlaywrightAutomationConfigDocument(
  document: unknown,
  source: string,
): PlaywrightAutomationConfig {
  const root = record(document, source);
  exactKeys(root, ["playwright"], source);
  const values = record(root.playwright, `${source}.playwright`);
  return parseCompleteValues(values, `${source}.playwright`);
}

/** 从任意显式路径加载配置，供 CLI 注册表与运行时共享同一校验器。 */
export function loadPlaywrightAutomationConfigFile(
  configPath: string,
  source = configPath,
): PlaywrightAutomationConfig {
  if (!fs.existsSync(configPath)) throw new Error(`缺少公共 Playwright 配置: ${configPath}`);
  let document: unknown;
  try {
    document = parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    throw new Error(`${source} 不是合法 YAML: ${configPath}`);
  }
  return parsePlaywrightAutomationConfigDocument(document, source);
}

export function parsePlaywrightAutomationOverrides(
  values: Record<string, unknown>,
  source = "命令行 Playwright 配置.playwright",
): PlaywrightAutomationOverrides {
  validatePartialValues(values, source);
  const allure = values.allure as Record<string, unknown> | undefined;
  return {
    ...(values.continue_on_failure === undefined
      ? {}
      : { continueOnFailure: values.continue_on_failure as boolean }),
    ...(values.skip_precondition_setup === undefined
      ? {}
      : { skipPreconditionSetup: values.skip_precondition_setup as boolean }),
    ...(values.sort_cases === undefined ? {} : { sortCases: values.sort_cases as boolean }),
    ...(values.workers === undefined ? {} : { workers: values.workers as number }),
    ...(values.browser === undefined ? {} : { browser: values.browser as string }),
    ...(values.headless === undefined ? {} : { headless: values.headless as boolean }),
    ...(values.step_capture === undefined
      ? {}
      : { stepCapture: values.step_capture as "all" | "failed" | "off" }),
    ...(values.timeout_ms === undefined ? {} : { timeoutMs: values.timeout_ms as number }),
    ...(values.retries === undefined ? {} : { retries: values.retries as number }),
    ...(values.metadata_sync_require_exact_table === undefined
      ? {}
      : { metadataSyncRequireExactTable: values.metadata_sync_require_exact_table as boolean }),
    ...(values.metadata_table_search_timeout_ms === undefined
      ? {}
      : { metadataTableSearchTimeoutMs: values.metadata_table_search_timeout_ms as number }),
    ...(values.metadata_sync_timeout_ms === undefined
      ? {}
      : { metadataSyncTimeoutMs: values.metadata_sync_timeout_ms as number }),
    ...(values.precondition_request_timeout_ms === undefined
      ? {}
      : { preconditionRequestTimeoutMs: values.precondition_request_timeout_ms as number }),
    ...(values.precondition_sync_timeout_sec === undefined
      ? {}
      : { preconditionSyncTimeoutSec: values.precondition_sync_timeout_sec as number }),
    ...(values.precondition_timeout_ms === undefined
      ? {}
      : { preconditionTimeoutMs: values.precondition_timeout_ms as number }),
    ...(values.monitor_timeout_ms === undefined
      ? {}
      : { monitorTimeoutMs: values.monitor_timeout_ms as number }),
    ...(values.schedule_job_timeout_ms === undefined
      ? {}
      : { scheduleJobTimeoutMs: values.schedule_job_timeout_ms as number }),
    ...(values.cleanup === undefined ? {} : { cleanup: values.cleanup as boolean }),
    ...(allure?.enabled === undefined ? {} : { allureEnabled: allure.enabled as boolean }),
    ...(allure?.results_dir === undefined
      ? {}
      : { allureResultsDir: allure.results_dir as string }),
    ...(allure?.report_dir === undefined ? {} : { allureReportDir: allure.report_dir as string }),
  };
}

export function readPlaywrightAutomationOverrides(
  argv: readonly string[] = process.argv,
): PlaywrightAutomationOverrides {
  const root = readAutomationOverrideFile(argv);
  return root.playwright ? parsePlaywrightAutomationOverrides(root.playwright) : {};
}

export function loadPlaywrightAutomationConfig(options?: {
  readonly overrides?: PlaywrightAutomationOverrides;
}): PlaywrightAutomationConfig {
  const config = loadPlaywrightAutomationConfigFile(
    CONFIG_PATH,
    "config/automation/playwright.yaml",
  );
  const overrides = options?.overrides ?? readPlaywrightAutomationOverrides();
  return Object.keys(overrides).length > 0 ? mergeOverrides(config, overrides) : config;
}

function allureCommand(): string {
  const local = path.join(
    REPO_ROOT,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "allure.cmd" : "allure",
  );
  return fs.existsSync(local) ? local : "allure";
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function assertRunDirectory(runPath: string): string {
  const resolved = path.resolve(runPath);
  if (resolved === path.parse(resolved).root) {
    throw new Error("KATA_RUN_PATH 不允许指向文件系统根目录");
  }
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(resolved);
  } catch {
    throw new Error(`KATA_RUN_PATH 不存在: ${resolved}`);
  }
  if (stat.isSymbolicLink()) throw new Error("KATA_RUN_PATH 不得是符号链接");
  if (!stat.isDirectory()) throw new Error("KATA_RUN_PATH 必须是目录");
  return resolved;
}

function assertAllureChild(runPath: string, childPath: string): void {
  const relative = path.relative(runPath, childPath);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("Allure 目录必须位于当前 run 内");
  }
  if (!fs.existsSync(childPath)) return;
  const stat = fs.lstatSync(childPath);
  if (stat.isSymbolicLink()) throw new Error("Allure 目录不得是符号链接");
  if (!stat.isDirectory()) throw new Error("Allure 目录必须是目录");
}

export function resolveAllureDirectories(
  config: PlaywrightAutomationConfig,
  runPath = process.env.KATA_RUN_PATH,
): { resultsDir: string; reportDir: string } {
  if (!runPath) throw new Error("KATA_RUN_PATH 是 Allure 目录的唯一运行根目录");
  const resolvedRunPath = assertRunDirectory(runPath);
  const resultsDir = path.join(resolvedRunPath, config.allure.resultsDir);
  const reportDir = path.join(resolvedRunPath, config.allure.reportDir);
  if (resultsDir === reportDir) throw new Error("Allure results_dir 和 report_dir 不能相同");
  assertAllureChild(resolvedRunPath, resultsDir);
  assertAllureChild(resolvedRunPath, reportDir);
  return { resultsDir, reportDir };
}

export function prepareAllureDirectories(config: PlaywrightAutomationConfig): () => void {
  const { resultsDir, reportDir } = resolveAllureDirectories(config);
  try {
    execFileSync(allureCommand(), ["--version"], { stdio: "ignore" });
  } catch {
    throw new Error("Allure CLI 不可用；正式回归必须先安装并确保 allure 命令可执行");
  }
  const lockPath = path.join(path.dirname(resultsDir), ".kata-allure.lock");
  const currentRunPath = process.env.KATA_RUN_PATH;
  if (fs.existsSync(lockPath)) {
    try {
      const owner = JSON.parse(fs.readFileSync(lockPath, "utf8")) as {
        pid?: unknown;
        runPath?: unknown;
      };
      if (
        owner.pid === process.pid ||
        (typeof currentRunPath === "string" && owner.runPath === currentRunPath)
      ) {
        return () => undefined;
      }
      if (typeof owner.pid === "number" && processIsAlive(owner.pid)) {
        throw new Error(`Allure 目录正在被其他 run 使用: ${lockPath}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Allure 目录正在")) throw error;
    }
    fs.rmSync(lockPath, { force: true });
  }
  fs.writeFileSync(
    lockPath,
    JSON.stringify({ pid: process.pid, resultsDir, reportDir, runPath: currentRunPath }),
    {
      encoding: "utf8",
      flag: "wx",
    },
  );
  fs.rmSync(resultsDir, { recursive: true, force: true });
  fs.rmSync(reportDir, { recursive: true, force: true });
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.mkdirSync(reportDir, { recursive: true });
  const release = (): void => {
    try {
      if (fs.existsSync(lockPath)) {
        const owner = JSON.parse(fs.readFileSync(lockPath, "utf8")) as { pid?: unknown };
        if (owner.pid === process.pid) fs.rmSync(lockPath, { force: true });
      }
    } catch {
      // Process exit must not be blocked by cleanup diagnostics.
    }
  };
  process.once("exit", release);
  return release;
}

export const PLAYWRIGHT_AUTOMATION_CONFIG_PATH = CONFIG_PATH;
export const PLAYWRIGHT_AUTOMATION_REPO_ROOT = REPO_ROOT;
