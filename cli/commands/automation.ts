import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { type Command, Option } from "commander";
import {
  AUTOMATION_OVERRIDE_FILE_ENV,
  automationOverrideTempDir,
} from "../../runtime/automation/config/overrides.ts";
import {
  loadPlaywrightAutomationConfig,
  type PlaywrightAutomationOverrides,
  parsePlaywrightAutomationOverrides,
  resolveAllureDirectories,
} from "../../runtime/automation/config/playwright.ts";
import { generateAutomationScripts } from "../lib/automation/automation-case-generator.ts";
import {
  generateAutomationRunner,
  inspectAutomationCoverage,
} from "../lib/automation/automation-contract.ts";
import { resolveAutomationEnv } from "../lib/automation/automation-env.ts";
import { resolveAutomationRunTarget } from "../lib/automation/automation-feature-resolver.ts";
import { runAutomationLint } from "../lib/automation/automation-lint.ts";
import { normalizeAutomation } from "../lib/automation/automation-normalize.ts";
import { migrateGeneratedPlaceholders } from "../lib/automation/automation-placeholders.ts";
import { scaffoldAutomation } from "../lib/automation/automation-scaffold.ts";
import { parseAutomationSetEntries } from "../lib/automation/cli-overrides.ts";
import {
  type ExecutorEnvironmentLifecycle,
  isLifecycleExecutorId,
  runExecutorLifecycle,
} from "../lib/automation/executor-lifecycle.ts";
import { lintSqlFile, renderSql } from "../lib/automation/sql.ts";
import { RUN_TYPES, type RunType } from "../lib/run-id.ts";
import { executeWithRunPath } from "../lib/runs-exec.ts";
import { locateProjectRoot, validateProjectName } from "../lib/workspace-locator.ts";
import { runRunsPath } from "./runs.ts";

interface AutomationRunOptions {
  readonly env?: string;
  readonly project?: string;
  readonly type: string;
  readonly sortCases?: boolean;
  readonly workers?: string;
  readonly headless?: boolean;
  readonly headed?: boolean;
  readonly continueOnFailure?: boolean;
  readonly skipPreconditionSetup?: boolean;
  readonly set?: string[];
}

interface AutomationLifecycleOptions {
  readonly executor?: string;
}

function booleanOption(
  command: Command,
  positive: string,
  negative: string,
  description: string,
  negativeDescription = description,
): void {
  command.option(positive, description).option(negative, negativeDescription);
}

function lifecycleErrorExitCode(error: unknown): number {
  if (error instanceof Error && "exitCode" in error) {
    const exitCode = Number(error.exitCode);
    if (Number.isInteger(exitCode) && exitCode > 0) return exitCode;
  }
  return 1;
}

async function runAutomationLifecycle(
  lifecycle: ExecutorEnvironmentLifecycle,
  options: AutomationLifecycleOptions,
): Promise<void> {
  let executorId = isLifecycleExecutorId(options.executor) ? options.executor : "unresolved";
  let exitCode = 1;
  try {
    const result = await runExecutorLifecycle(lifecycle, { executorId: options.executor });
    executorId = result.executorId;
    exitCode = result.exitCode;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "executor lifecycle 失败"}\n`);
    exitCode = lifecycleErrorExitCode(error);
  }
  process.stdout.write(
    `[automation lifecycle] executor=${executorId} lifecycle=${lifecycle} exitCode=${exitCode}\n`,
  );
  process.exitCode = exitCode;
}

function cliValue(command: Command, key: string, value: unknown): unknown {
  return command.getOptionValueSource(key) === "cli" ? value : undefined;
}

function positiveInteger(value: string | undefined, key: string): number | undefined {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`--${key} 必须是正整数`);
  return number;
}

function booleanValue(value: boolean | undefined): boolean | undefined {
  return value === undefined ? undefined : value;
}

function buildPlaywrightOverrides(
  options: AutomationRunOptions,
  command: Command,
): PlaywrightAutomationOverrides {
  return {
    ...(cliValue(command, "continueOnFailure", options.continueOnFailure) === undefined
      ? {}
      : { continueOnFailure: booleanValue(options.continueOnFailure) }),
    ...(cliValue(command, "skipPreconditionSetup", options.skipPreconditionSetup) === undefined
      ? {}
      : { skipPreconditionSetup: booleanValue(options.skipPreconditionSetup) }),
    ...(cliValue(command, "sortCases", options.sortCases) === undefined
      ? {}
      : { sortCases: booleanValue(options.sortCases) }),
    ...(cliValue(command, "workers", options.workers) === undefined
      ? {}
      : { workers: positiveInteger(options.workers, "workers") }),
    ...(cliValue(command, "headless", options.headless) === undefined &&
    cliValue(command, "headed", options.headed) === undefined
      ? {}
      : { headless: options.headed === true ? false : options.headless }),
  };
}

function mergeExplicitPlaywrightOverrides(
  target: Record<string, unknown>,
  explicit: PlaywrightAutomationOverrides,
): void {
  const values: Record<string, unknown> = {
    ...(explicit.continueOnFailure === undefined
      ? {}
      : { continue_on_failure: explicit.continueOnFailure }),
    ...(explicit.skipPreconditionSetup === undefined
      ? {}
      : { skip_precondition_setup: explicit.skipPreconditionSetup }),
    ...(explicit.sortCases === undefined ? {} : { sort_cases: explicit.sortCases }),
    ...(explicit.workers === undefined ? {} : { workers: explicit.workers }),
    ...(explicit.headless === undefined ? {} : { headless: explicit.headless }),
  };
  for (const [key, value] of Object.entries(values)) {
    if (Object.hasOwn(target, key)) {
      throw new Error(`命令行配置重复: playwright.${key}`);
    }
    target[key] = value;
  }
}

function buildAutomationOverrideFile(
  options: AutomationRunOptions,
  command: Command,
): { playwright: Record<string, unknown>; automation: Record<string, unknown> } {
  const result = parseAutomationSetEntries(options.set ?? []) as {
    playwright: Record<string, unknown>;
    automation: Record<string, unknown>;
  };
  mergeExplicitPlaywrightOverrides(result.playwright, buildPlaywrightOverrides(options, command));
  return result;
}

/** Persist a private, single-run override only under the allocated run's ignored temporary area. */
export function writeAutomationRunOverrideFile(
  runPath: string,
  override: { playwright: Record<string, unknown>; automation: Record<string, unknown> },
): string {
  const tempDir = automationOverrideTempDir(runPath);
  mkdirSync(tempDir, { recursive: true, mode: 0o700 });
  const path = join(tempDir, `kata-automation-config-${randomUUID()}.overrides.json`);
  writeFileSync(path, JSON.stringify(override, null, 2), {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  return path;
}

async function runAutomation(
  featureSelector: string,
  options: AutomationRunOptions,
  command: Command,
): Promise<void> {
  const resolved = resolveAutomationRunTarget(
    featureSelector,
    options.project ?? process.env.KATA_ACTIVE_PROJECT,
  );
  const project = resolved.project;
  validateProjectName(project);
  if (!RUN_TYPES.includes(options.type as RunType)) {
    throw new Error(`非法运行类型 "${options.type}"，可选: ${RUN_TYPES.join("|")}`);
  }
  const env = resolveAutomationEnv(resolved.dir, options.env);
  const overrideFile = buildAutomationOverrideFile(options, command);
  const playwrightOverrides = parsePlaywrightAutomationOverrides(
    overrideFile.playwright,
    "命令行 Playwright 配置.playwright",
  );
  const config = loadPlaywrightAutomationConfig({ overrides: playwrightOverrides });
  const runnerPath = resolve(resolved.dir, "automation/tests/runners/full.spec.ts");
  if (!existsSync(runnerPath)) throw new Error(`runner 不存在: ${runnerPath}`);
  if (options.type === "run" && !config.allure.enabled) {
    throw new Error("正式 automation run 不允许关闭 Allure；调试请使用 --type debug");
  }
  const automationOverrides = overrideFile.automation;
  const allocation = runRunsPath({
    project,
    featurePath: resolved.relativePath,
    newRun: true,
    runType: options.type as RunType,
  });
  const repoRoot = locateProjectRoot();
  const overridePath = writeAutomationRunOverrideFile(allocation.path, {
    playwright: overrideFile.playwright,
    automation: automationOverrides,
  });
  const runnerArg = relative(repoRoot, runnerPath);
  const commandArgs = [
    process.execPath,
    resolve(repoRoot, "cli/bin/kata.ts"),
    "env",
    "run",
    env,
    "--project",
    project,
    "--inherit-env",
    AUTOMATION_OVERRIDE_FILE_ENV,
    "--",
    process.execPath,
    "x",
    "playwright",
    "test",
    runnerArg,
    "--project",
    config.browser,
    "--config",
    resolve(repoRoot, "playwright.config.ts"),
  ];
  try {
    const exitCode = await executeWithRunPath({
      runId: allocation.runId,
      runPath: allocation.path,
      project,
      command: commandArgs,
      cwd: repoRoot,
      env: { [AUTOMATION_OVERRIDE_FILE_ENV]: overridePath },
      postProcess: (childExitCode) => {
        if (!config.allure.enabled) return childExitCode;
        const { resultsDir, reportDir } = resolveAllureDirectories(config, allocation.path);
        const resultCount = existsSync(resultsDir)
          ? readdirSync(resultsDir).filter((name) => name.endsWith("-result.json")).length
          : 0;
        if (resultCount === 0 || !existsSync(join(reportDir, "index.html"))) {
          process.stderr.write("[automation run] Allure 结果或 HTML 报告缺失\n");
          return 1;
        }
        return childExitCode;
      },
    });
    console.log(
      JSON.stringify({ runId: allocation.runId, runPath: allocation.path, exitCode }, null, 2),
    );
    if (exitCode !== 0) process.exitCode = exitCode;
  } finally {
    rmSync(overridePath, { force: true });
  }
}

/** Build the `automation` command: scaffold + normalize a feature's automation dir. */
export function registerAutomation(program: Command): void {
  const automation = program
    .command("automation")
    .description("自动化 executor 生命周期与目录管理");
  automation
    .command("setup")
    .description("显式准备一个已发现 executor 的运行环境；可能安装依赖或浏览器")
    .option("--executor <id>", "executor ID；仅发现一个时可省略")
    .action((options: AutomationLifecycleOptions) => runAutomationLifecycle("setup", options));
  automation
    .command("doctor")
    .description("只读检查一个已发现 executor 的运行环境；不会隐式执行 setup")
    .option("--executor <id>", "executor ID；仅发现一个时可省略")
    .action((options: AutomationLifecycleOptions) => runAutomationLifecycle("doctor", options));
  const sql = automation.command("sql").description("校验和渲染自动化 SQL 模板；不连接数据库");
  sql
    .command("lint <sql-file>")
    .description("按全局 SQL profile 校验模板")
    .requiredOption("--profile <name>", "SQL 方言 profile 名称或已注册数据源类型")
    .action((sqlFile: string, opts: { profile: string }) => {
      const result = lintSqlFile(sqlFile, opts.profile);
      console.log(JSON.stringify(result, null, 2));
      if (result.errors.length > 0) process.exitCode = 1;
    });
  sql
    .command("render <sql-file>")
    .description("将显式 --set 值渲染到 stdout，不写入项目目录")
    .requiredOption("--profile <name>", "先按 SQL 方言 profile 校验模板")
    .option(
      "--set <KEY=value>",
      "语义占位符替换值，例如 SchemaA=dq、RunSuffix=run01，可重复",
      (value: string, previous: string[] = []) => [...previous, value],
      [],
    )
    .action((sqlFile: string, opts: { profile: string; set: string[] }) => {
      const result = lintSqlFile(sqlFile, opts.profile);
      if (result.errors.length > 0) throw new Error(result.errors.join("；"));
      console.log(renderSql(readFileSync(sqlFile, "utf8"), opts.set));
    });

  const run = automation
    .command("run <feature-or-requirement-id>")
    .description(
      "按 feature 路径或需求 ID 执行 Playwright，并生成 Allure 结果与报告；需求专属参数使用 --set 临时覆盖",
    )
    .option("--env <name>", "平台环境名；缺省使用 meta.automation_env")
    .option("--project <name>", "工作区项目名（或使用 KATA_ACTIVE_PROJECT）")
    .option("--no-interactive", "跳过 TUI 深链，强制 CLI 输出")
    .option("--type <type>", `运行类型: ${RUN_TYPES.join("|")}`, "run")
    .addOption(
      new Option("--set <path=value>", "临时覆盖 YAML 配置，例如 automation.cases=1-72")
        .argParser((value: string, previous: string[] = []) => [...previous, value])
        .default([]),
    )
    .option("--workers <number>", "临时覆盖 Playwright worker 数");
  booleanOption(
    run,
    "--sort-cases",
    "--no-sort-cases",
    "按 cases YAML 中 case_id 降序执行",
    "按 cases YAML 原顺序执行",
  );
  booleanOption(run, "--headless", "--headed", "使用无头/有头浏览器");
  booleanOption(run, "--continue-on-failure", "--no-continue-on-failure", "失败后是否继续后续用例");
  booleanOption(
    run,
    "--skip-precondition-setup",
    "--no-skip-precondition-setup",
    "是否跳过前置准备",
  );
  run.action((featureSelector: string, opts: AutomationRunOptions, command: Command) =>
    runAutomation(featureSelector, opts, command),
  );

  automation
    .command("coverage <feature-dir>")
    .description(
      "检查 cases YAML 自动化覆盖；API executor 单独报告，Playwright 校验映射、标题和实现状态",
    )
    .action((featureDir: string) => {
      const coverage = inspectAutomationCoverage(featureDir);
      console.log(JSON.stringify(coverage, null, 2));
      if (
        coverage.unmapped.length ||
        coverage.mappedNotImplemented.length ||
        coverage.missingScript.length ||
        coverage.orphanScripts.length ||
        coverage.duplicateSpecFile.length
      ) {
        process.exitCode = 1;
      }
    });

  automation
    .command("generate-cases <feature-dir>")
    .description(
      "检查缺失的 Playwright automation.spec_file；API executor 单独报告，不生成通用占位脚本",
    )
    .option("--apply", "拒绝并明确提示，不生成占位脚本", false)
    .action((featureDir: string, opts: { apply: boolean }) => {
      const result = generateAutomationScripts(featureDir, { apply: opts.apply });
      console.log(
        JSON.stringify(
          {
            created: result.created.length,
            skipped: result.skipped.length,
            api: result.api,
            unmapped: result.unmapped,
            orphanScripts: result.orphanScripts,
            applied: opts.apply,
          },
          null,
          2,
        ),
      );
      if (result.orphanScripts.length > 0) process.exitCode = 1;
    });

  automation
    .command("generate <feature-dir>")
    .description(
      "按 Playwright automation.spec_file 生成 runner import；忽略 API executor(默认 dry-run)",
    )
    .option("--apply", "写入 generated.ts", false)
    .action((featureDir: string, opts: { apply: boolean }) => {
      const result = generateAutomationRunner(featureDir, { apply: opts.apply });
      console.log(
        JSON.stringify(
          { path: result.path, imports: result.imports, applied: opts.apply },
          null,
          2,
        ),
      );
    });

  automation
    .command("migrate-placeholders <feature-dir>")
    .description("移除由自然语言通用 runner 生成的占位脚本和映射(默认 dry-run)")
    .option("--apply", "执行移除并重建 generated runner", false)
    .action((featureDir: string, opts: { apply: boolean }) => {
      const report = migrateGeneratedPlaceholders(featureDir, { apply: opts.apply });
      console.log(
        JSON.stringify(
          {
            featureDir: report.featureDir,
            placeholderScripts: report.placeholderScripts.length,
            removedMappings: report.removedMappings.length,
            runner: report.runner,
            applied: report.applied,
          },
          null,
          2,
        ),
      );
    });

  automation
    .command("scaffold <feature-dir>")
    .description(
      "创建自动化骨架(tests/cases、runners、pages、fixtures、sql)；用例映射以 YAML 为准，不生成重复索引",
    )
    .option("--force", "覆盖已存在文件", false)
    .action((featureDir: string, opts: { force: boolean }) => {
      const r = scaffoldAutomation(featureDir, { force: opts.force });
      console.log(
        `[scaffold] created=${r.created.length} skipped=${r.skipped.length} overwritten=${r.overwritten.length}`,
      );
    });

  automation
    .command("normalize <feature-dir>")
    .description("检查自动化目录违规；仅迁移有明确受控目标的旧文件")
    .option("--apply", "执行修复(默认 dry-run)", false)
    .option("--exit-code", "存在违规时退出码为 1")
    .action((featureDir: string, opts: { apply: boolean; exitCode?: boolean }) => {
      const report = normalizeAutomation(featureDir, { dryRun: !opts.apply, apply: opts.apply });
      if (!opts.apply && report.moved.length > 0) {
        console.log("[dry-run] 将移动以下文件到备份:");
        for (const m of report.moved) console.log(`  ${m.from} -> ${m.to}`);
      }
      console.log(`[normalize] violations=${report.violations} moved=${report.moved.length}`);
      if (opts.exitCode && report.violations > 0) process.exitCode = 1;
    });

  automation
    .command("lint [feature-dir]")
    .description("检查 Playwright 自动化代码、用例文件名、页面元数据与共享路径")
    .option("--shared", "检查 workspace 项目的 _shared/automation 共享自动化代码")
    .option("--all-features", "检查指定项目下全部 feature 的自动化代码")
    .option(
      "--project <name>",
      "--shared 或 --all-features 模式下的项目名(默认取 KATA_ACTIVE_PROJECT)",
    )
    .option("--exit-code", "存在 violation 时退出码为 1")
    .action(
      (
        featureDir: string | undefined,
        opts: { shared?: boolean; allFeatures?: boolean; project?: string; exitCode?: boolean },
      ) => {
        const report = runAutomationLint({
          featureDir,
          shared: opts.shared === true,
          allFeatures: opts.allFeatures === true,
          project: opts.project,
        });
        for (const v of report.violations) {
          console.log(`${v.path}:${v.line}:${v.rule}:${v.message}`);
        }
        for (const ignored of report.ignored) {
          console.log(`ignored ${ignored.path}:${ignored.line}: ${ignored.reason}`);
        }
        console.log(
          `[automation lint] files=${report.scannedFiles} violations=${report.violations.length} ignored=${report.ignored.length}`,
        );
        if (opts.exitCode && report.violations.length > 0) process.exitCode = 1;
      },
    );
}
