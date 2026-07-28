import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

import { readAutomationOverrideFile } from "./automation-overrides";

export interface PlaywrightAutomationOverrides {
  readonly requirementIdMapping?: boolean;
  readonly continueOnFailure?: boolean;
  readonly skipPreconditionSetup?: boolean;
  readonly sortCases?: boolean;
  readonly workers?: number;
  readonly browser?: string;
  readonly headless?: boolean;
  readonly timeoutMs?: number;
  readonly retries?: number;
  readonly allureEnabled?: boolean;
  readonly allureResultsDir?: string;
  readonly allureReportDir?: string;
}

export interface PlaywrightAutomationConfig {
  readonly requirementIdMapping: boolean;
  readonly continueOnFailure: boolean;
  readonly skipPreconditionSetup: boolean;
  readonly sortCases: boolean;
  readonly workers: number;
  readonly browser: string;
  readonly headless: boolean;
  readonly timeoutMs: number;
  readonly retries: number;
  readonly allure: {
    readonly enabled: boolean;
    readonly resultsDir: string;
    readonly reportDir: string;
  };
}

interface PlaywrightAutomationYaml {
  readonly playwright?: Record<string, unknown>;
}

const CONFIG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../config/automation/playwright.yaml",
);
const REPO_ROOT = path.resolve(path.dirname(CONFIG_PATH), "../..");
const DEFAULTS = {
  requirementIdMapping: true,
  continueOnFailure: true,
  skipPreconditionSetup: true,
  sortCases: false,
  workers: 4,
  browser: "chromium",
  headless: true,
  timeoutMs: 60_000,
  retries: 0,
  allureEnabled: true,
  allureResultsDir: "allure-results",
  allureReportDir: "allure-report",
} as const;

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

function booleanValue(value: unknown, key: string, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new Error(`${key} 必须是 boolean`);
  return value;
}

function positiveInteger(value: unknown, key: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${key} 必须是正整数`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, key: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${key} 必须是非负整数`);
  }
  return value;
}

function stringValue(value: unknown, key: string, fallback: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${key} 必须是非空字符串`);
  return value.trim();
}

function resolveDirectory(value: string, key: string): string {
  const resolved = path.isAbsolute(value) ? path.resolve(value) : path.resolve(REPO_ROOT, value);
  if (resolved === path.parse(resolved).root) throw new Error(`${key} 不允许指向文件系统根目录`);
  return resolved;
}

function parsePlaywrightValues(
  value: Record<string, unknown>,
  source: string,
): PlaywrightAutomationConfig {
  exactKeys(
    value,
    [
      "continue_on_failure",
      "requirement_id_mapping",
      "skip_precondition_setup",
      "sort_cases",
      "workers",
      "browser",
      "headless",
      "timeout_ms",
      "retries",
      "allure",
    ],
    source,
  );
  const allure = value.allure === undefined ? {} : record(value.allure, `${source}.allure`);
  exactKeys(allure, ["enabled", "results_dir", "report_dir"], `${source}.allure`);
  const browser = stringValue(value.browser, `${source}.browser`, DEFAULTS.browser);
  if (browser !== "chromium") throw new Error(`${source}.browser 目前只支持 chromium`);
  const sortCases = booleanValue(value.sort_cases, `${source}.sort_cases`, DEFAULTS.sortCases);
  const configuredWorkers = positiveInteger(value.workers, `${source}.workers`, DEFAULTS.workers);
  return {
    requirementIdMapping: booleanValue(
      value.requirement_id_mapping,
      `${source}.requirement_id_mapping`,
      DEFAULTS.requirementIdMapping,
    ),
    continueOnFailure: booleanValue(
      value.continue_on_failure,
      `${source}.continue_on_failure`,
      DEFAULTS.continueOnFailure,
    ),
    skipPreconditionSetup: booleanValue(
      value.skip_precondition_setup,
      `${source}.skip_precondition_setup`,
      DEFAULTS.skipPreconditionSetup,
    ),
    sortCases,
    workers: sortCases ? 1 : configuredWorkers,
    browser,
    headless: booleanValue(value.headless, `${source}.headless`, DEFAULTS.headless),
    timeoutMs: positiveInteger(value.timeout_ms, `${source}.timeout_ms`, DEFAULTS.timeoutMs),
    retries: nonNegativeInteger(value.retries, `${source}.retries`, DEFAULTS.retries),
    allure: {
      enabled: booleanValue(allure.enabled, `${source}.allure.enabled`, DEFAULTS.allureEnabled),
      resultsDir: resolveDirectory(
        stringValue(allure.results_dir, `${source}.allure.results_dir`, DEFAULTS.allureResultsDir),
        `${source}.allure.results_dir`,
      ),
      reportDir: resolveDirectory(
        stringValue(allure.report_dir, `${source}.allure.report_dir`, DEFAULTS.allureReportDir),
        `${source}.allure.report_dir`,
      ),
    },
  };
}

function mergeOverrides(
  config: PlaywrightAutomationConfig,
  overrides: PlaywrightAutomationOverrides,
): PlaywrightAutomationConfig {
  const raw: Record<string, unknown> = {
    requirement_id_mapping: overrides.requirementIdMapping ?? config.requirementIdMapping,
    continue_on_failure: overrides.continueOnFailure ?? config.continueOnFailure,
    skip_precondition_setup: overrides.skipPreconditionSetup ?? config.skipPreconditionSetup,
    sort_cases: overrides.sortCases ?? config.sortCases,
    workers: overrides.workers ?? config.workers,
    browser: overrides.browser ?? config.browser,
    headless: overrides.headless ?? config.headless,
    timeout_ms: overrides.timeoutMs ?? config.timeoutMs,
    retries: overrides.retries ?? config.retries,
    allure: {
      enabled: overrides.allureEnabled ?? config.allure.enabled,
      results_dir: overrides.allureResultsDir ?? config.allure.resultsDir,
      report_dir: overrides.allureReportDir ?? config.allure.reportDir,
    },
  };
  return parsePlaywrightValues(raw, "命令行 Playwright 配置");
}

export function readPlaywrightAutomationOverrides(
  argv: readonly string[] = process.argv,
): PlaywrightAutomationOverrides {
  const root = readAutomationOverrideFile(argv);
  if (!root.playwright) return {};
  const values = root.playwright;
  exactKeys(
    values,
    [
    "continue_on_failure",
    "requirement_id_mapping",
      "skip_precondition_setup",
      "sort_cases",
      "workers",
      "browser",
      "headless",
      "timeout_ms",
      "retries",
      "allure",
    ],
    "命令行 Playwright 配置.playwright",
  );
  const allure =
    values.allure === undefined
      ? undefined
      : record(values.allure, "命令行 Playwright 配置.playwright.allure");
  if (allure) {
    exactKeys(allure, ["enabled", "results_dir", "report_dir"], "命令行 Playwright 配置.playwright.allure");
  }
  // 先以同一解析器校验 CLI 覆盖的类型和约束，再只返回显式字段；
  // 未传入的字段必须继续使用 YAML 默认值，不能被覆盖文件里的隐式默认值污染。
  parsePlaywrightValues(values, "命令行 Playwright 配置.playwright");
  return {
    ...(values.requirement_id_mapping === undefined
      ? {}
      : { requirementIdMapping: values.requirement_id_mapping as boolean }),
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
    ...(values.timeout_ms === undefined ? {} : { timeoutMs: values.timeout_ms as number }),
    ...(values.retries === undefined ? {} : { retries: values.retries as number }),
    ...(allure?.enabled === undefined ? {} : { allureEnabled: allure.enabled as boolean }),
    ...(allure?.results_dir === undefined
      ? {}
      : { allureResultsDir: allure.results_dir as string }),
    ...(allure?.report_dir === undefined ? {} : { allureReportDir: allure.report_dir as string }),
  };
}

export function loadPlaywrightAutomationConfig(options?: {
  readonly overrides?: PlaywrightAutomationOverrides;
}): PlaywrightAutomationConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`缺少公共 Playwright 配置: ${CONFIG_PATH}`);
  }
  let document: PlaywrightAutomationYaml;
  try {
    document = parse(fs.readFileSync(CONFIG_PATH, "utf8")) as PlaywrightAutomationYaml;
  } catch {
    throw new Error(`config/automation/playwright.yaml 不是合法 YAML: ${CONFIG_PATH}`);
  }
  const root = record(document, "config/automation/playwright.yaml");
  exactKeys(root, ["playwright"], "config/automation/playwright.yaml");
  const values = root.playwright === undefined ? undefined : record(root.playwright, "playwright");
  if (!values) throw new Error("config/automation/playwright.yaml 缺少 playwright 节点");
  const config = parsePlaywrightValues(values, "playwright");
  const overrides = options?.overrides ?? readPlaywrightAutomationOverrides();
  return Object.keys(overrides).length > 0 ? mergeOverrides(config, overrides) : config;
}

function allureCommand(): string {
  const local = path.join(REPO_ROOT, "node_modules", ".bin", process.platform === "win32" ? "allure.cmd" : "allure");
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

/** Prepare and lock the configured shared Allure directories for one run. */
export function prepareAllureDirectories(config: PlaywrightAutomationConfig): () => void {
  const { resultsDir, reportDir } = config.allure;
  if (resultsDir === reportDir) throw new Error("Allure results_dir 和 report_dir 不能相同");
  try {
    requireAllureCommand(allureCommand());
  } catch {
    throw new Error("Allure CLI 不可用；正式回归必须先安装并确保 allure 命令可执行");
  }
  const lockPath = path.join(path.dirname(resultsDir), ".kata-allure.lock");
  if (fs.existsSync(lockPath)) {
    try {
      const owner = JSON.parse(fs.readFileSync(lockPath, "utf8")) as { pid?: unknown };
      if (typeof owner.pid === "number" && processIsAlive(owner.pid)) {
        throw new Error(`Allure 目录正在被其他 run 使用: ${lockPath}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Allure 目录正在")) throw error;
    }
    fs.rmSync(lockPath, { force: true });
  }
  fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, resultsDir, reportDir }), {
    encoding: "utf8",
    flag: "wx",
  });
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

function requireAllureCommand(command: string): void {
  execFileSync(command, ["--version"], { stdio: "ignore" });
}

export const PLAYWRIGHT_AUTOMATION_CONFIG_PATH = CONFIG_PATH;
export const PLAYWRIGHT_AUTOMATION_REPO_ROOT = REPO_ROOT;
