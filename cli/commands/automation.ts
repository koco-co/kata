import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { type Command, Option } from "commander";
import { AUTOMATION_OVERRIDE_FILE_ENV } from "../../runtime/automation/config/overrides.ts";
import {
  loadPlaywrightAutomationConfig,
  type PlaywrightAutomationOverrides,
  parsePlaywrightAutomationOverrides,
} from "../../runtime/automation/config/playwright.ts";
import { generateAutomationScripts } from "../lib/automation/automation-case-generator.ts";
import {
  generateAutomationRunner,
  inspectAutomationCoverage,
} from "../lib/automation/automation-contract.ts";
import { resolveAutomationFeature } from "../lib/automation/automation-feature-resolver.ts";
import { runAutomationLint } from "../lib/automation/automation-lint.ts";
import { normalizeAutomation } from "../lib/automation/automation-normalize.ts";
import { migrateGeneratedPlaceholders } from "../lib/automation/automation-placeholders.ts";
import { scaffoldAutomation } from "../lib/automation/automation-scaffold.ts";
import { parseAutomationSetEntries } from "../lib/automation/cli-overrides.ts";
import { lintSqlFile, renderSql } from "../lib/automation/sql.ts";
import { RUN_TYPES, type RunType } from "../lib/run-id.ts";
import { executeWithRunPath } from "../lib/runs-exec.ts";
import { runRunsPath } from "./runs.ts";

interface AutomationRunOptions {
  readonly env: string;
  readonly project: string;
  readonly type: string;
  readonly sortCases?: boolean;
  readonly workers?: string;
  readonly headless?: boolean;
  readonly headed?: boolean;
  readonly continueOnFailure?: boolean;
  readonly skipPreconditionSetup?: boolean;
  readonly set?: string[];
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

async function runAutomation(
  featureSelector: string,
  options: AutomationRunOptions,
  command: Command,
): Promise<void> {
  if (!RUN_TYPES.includes(options.type as RunType)) {
    throw new Error(`非法运行类型 "${options.type}"，可选: ${RUN_TYPES.join("|")}`);
  }
  const overrideFile = buildAutomationOverrideFile(options, command);
  const playwrightOverrides = parsePlaywrightAutomationOverrides(
    overrideFile.playwright,
    "命令行 Playwright 配置.playwright",
  );
  const config = loadPlaywrightAutomationConfig({ overrides: playwrightOverrides });
  const feature = resolveAutomationFeature(featureSelector, options.project);
  const runnerPath = resolve(feature.dir, "automation/tests/runners/full.spec.ts");
  if (!existsSync(runnerPath)) throw new Error(`runner 不存在: ${runnerPath}`);
  if (options.type === "run" && !config.allure.enabled) {
    throw new Error("正式 automation run 不允许关闭 Allure；调试请使用 --type debug");
  }
  const automationOverrides = overrideFile.automation;
  const allocation = runRunsPath({
    project: options.project,
    featurePath: feature.relativePath,
    newRun: true,
    runType: options.type as RunType,
  });
  const repoRoot = process.cwd();
  // Keep the temporary ESM wrapper in the repository root. Playwright resolves
  // testMatch and relative reporter paths from the config file directory.
  const configPath = join(repoRoot, `kata-automation-config-${randomUUID()}.ts`);
  const overridePath = configPath.replace(/\.ts$/, ".overrides.json");
  const playwrightConfigPath = pathToFileURL(resolve(repoRoot, "playwright.config.ts")).href;
  writeFileSync(
    configPath,
    `import config from ${JSON.stringify(playwrightConfigPath)};\nexport default config;\n`,
    {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    },
  );
  writeFileSync(
    overridePath,
    JSON.stringify(
      { playwright: overrideFile.playwright, automation: automationOverrides },
      null,
      2,
    ),
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
  const runnerArg = relative(repoRoot, runnerPath);
  const commandArgs = [
    process.execPath,
    resolve(repoRoot, "cli/bin/kata.ts"),
    "env",
    "run",
    options.env,
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
    configPath,
  ];
  try {
    const exitCode = await executeWithRunPath({
      runId: allocation.runId,
      runPath: allocation.path,
      project: options.project,
      command: commandArgs,
      env: { [AUTOMATION_OVERRIDE_FILE_ENV]: overridePath },
      postProcess: (childExitCode) => {
        if (!config.allure.enabled) return childExitCode;
        const resultsDir = config.allure.resultsDir;
        const reportDir = config.allure.reportDir;
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
    rmSync(configPath, { force: true });
    rmSync(overridePath, { force: true });
  }
}

/** Build the `automation` command: scaffold + normalize a feature's automation dir. */
export function registerAutomation(program: Command): void {
  const automation = program.command("automation").description("自动化目录结构管理");
  const sql = automation.command("sql").description("校验和渲染自动化 SQL 模板；不连接数据库");
  sql
    .command("lint <sql-file>")
    .description("按全局 SQL profile 校验模板")
    .requiredOption("--profile <name>", "config/automation/sql-profiles.yaml 中的 profile")
    .action((sqlFile: string, opts: { profile: string }) => {
      const result = lintSqlFile(sqlFile, opts.profile);
      console.log(JSON.stringify(result, null, 2));
      if (result.errors.length > 0) process.exitCode = 1;
    });
  sql
    .command("render <sql-file>")
    .description("将显式 --set 值渲染到 stdout，不写入项目目录")
    .requiredOption("--profile <name>", "先按 profile 校验模板")
    .option(
      "--set <KEY=value>",
      "占位符替换值，可重复",
      (value: string, previous: string[] = []) => [...previous, value],
      [],
    )
    .action((sqlFile: string, opts: { profile: string; set: string[] }) => {
      const result = lintSqlFile(sqlFile, opts.profile);
      if (result.errors.length > 0) throw new Error(result.errors.join("；"));
      console.log(renderSql(readFileSync(sqlFile, "utf8"), opts.set));
    });

  const run = automation
    .command("run <feature-path>")
    .description(
      "按完整 feature 路径执行 Playwright，并生成 Allure 结果与报告；需求专属参数使用 --set 临时覆盖",
    )
    .requiredOption("--env <name>", "平台环境名")
    .option("--project <name>", "工作区项目名", "dataAssets")
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
    .description("检查 cases YAML 与 automation/tests/cases 的逐条映射")
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
    .description("检查缺失的 automation.spec_file；不会生成通用占位脚本")
    .option("--apply", "拒绝并明确提示，不生成占位脚本", false)
    .action((featureDir: string, opts: { apply: boolean }) => {
      const result = generateAutomationScripts(featureDir, { apply: opts.apply });
      console.log(
        JSON.stringify(
          {
            created: result.created.length,
            skipped: result.skipped.length,
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
    .description("按 automation.spec_file 生成 runner import(默认 dry-run)")
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
    .description("创建自动化骨架(tests/cases、runners、pages、fixtures、sql)")
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
    .description("检查 Playwright 自动化代码规范")
    .option("--shared", "检查 workspace 项目的 _shared/automation 共享自动化代码")
    .option("--project <name>", "--shared 模式下的项目名(默认取 KATA_ACTIVE_PROJECT)")
    .option("--exit-code", "存在 violation 时退出码为 1")
    .action(
      (
        featureDir: string | undefined,
        opts: { shared?: boolean; project?: string; exitCode?: boolean },
      ) => {
        const report = runAutomationLint({
          featureDir,
          shared: opts.shared === true,
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
