import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Command } from "commander";
import {
  loadPlaywrightAutomationConfig,
  type PlaywrightAutomationOverrides,
} from "../../workspace/dataAssets/_shared/runtime/playwright-config.ts";
import { generateAutomationScripts } from "../lib/automation-case-generator.ts";
import { generateAutomationRunner, inspectAutomationCoverage } from "../lib/automation-contract.ts";
import { resolveAutomationFeature } from "../lib/automation-feature-resolver.ts";
import { runAutomationLint } from "../lib/automation-lint.ts";
import { normalizeAutomation } from "../lib/automation-normalize.ts";
import { scaffoldAutomation } from "../lib/automation-scaffold.ts";
import { RUN_TYPES, type RunType } from "../lib/run-id.ts";
import { executeWithRunPath } from "../lib/runs-exec.ts";
import { runRunsPath } from "./runs.ts";

interface AutomationRunOptions {
  readonly env: string;
  readonly project: string;
  readonly runner: string;
  readonly type: string;
  readonly sortCases?: boolean;
  readonly requirementIdMapping?: boolean;
  readonly workers?: string;
  readonly browser?: string;
  readonly headless?: boolean;
  readonly headed?: boolean;
  readonly timeoutMs?: string;
  readonly retries?: string;
  readonly continueOnFailure?: boolean;
  readonly skipPreconditionSetup?: boolean;
  readonly allure?: boolean;
  readonly allureResultsDir?: string;
  readonly allureReportDir?: string;
  readonly cases?: string;
  readonly tableBatchSuffix?: string;
  readonly tablePartition?: string;
  readonly resultStrict?: boolean;
  readonly resourceGroup?: string;
  readonly taskSearchQuery?: string;
  readonly caseTimeoutMs?: string;
  readonly resultTimeoutMs?: string;
  readonly tableOptionTimeoutMs?: string;
  readonly ruleSetSavePromptCloseTimeoutMs?: string;
  readonly taskScanMaxPages?: string;
  readonly rulesetScanMaxPages?: string;
  readonly spinTimeoutMs?: string;
  readonly importFormTimeoutMs?: string;
  readonly selectSpinTimeoutMs?: string;
  readonly executeSubmitWaitMs?: string;
}

function booleanOption(
  command: Command,
  positive: string,
  negative: string,
  description: string,
): void {
  command.option(positive, description).option(negative, description);
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

function nonNegativeInteger(value: string | undefined, key: string): number | undefined {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error(`--${key} 必须是非负整数`);
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
    ...(cliValue(command, "requirementIdMapping", options.requirementIdMapping) === undefined
      ? {}
      : { requirementIdMapping: booleanValue(options.requirementIdMapping) }),
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
    ...(cliValue(command, "browser", options.browser) === undefined
      ? {}
      : { browser: options.browser }),
    ...(cliValue(command, "headless", options.headless) === undefined &&
    cliValue(command, "headed", options.headed) === undefined
      ? {}
      : { headless: options.headed === true ? false : options.headless }),
    ...(cliValue(command, "timeoutMs", options.timeoutMs) === undefined
      ? {}
      : { timeoutMs: positiveInteger(options.timeoutMs, "timeout-ms") }),
    ...(cliValue(command, "retries", options.retries) === undefined
      ? {}
      : { retries: nonNegativeInteger(options.retries, "retries") }),
    ...(cliValue(command, "allure", options.allure) === undefined
      ? {}
      : { allureEnabled: options.allure }),
    ...(cliValue(command, "allureResultsDir", options.allureResultsDir) === undefined
      ? {}
      : { allureResultsDir: options.allureResultsDir }),
    ...(cliValue(command, "allureReportDir", options.allureReportDir) === undefined
      ? {}
      : { allureReportDir: options.allureReportDir }),
  };
}

function buildAutomationOverrides(
  options: AutomationRunOptions,
  command: Command,
): Record<string, unknown> {
  return {
    ...(cliValue(command, "cases", options.cases) === undefined ? {} : { cases: options.cases }),
    ...(cliValue(command, "tableBatchSuffix", options.tableBatchSuffix) === undefined
      ? {}
      : { table_batch_suffix: options.tableBatchSuffix }),
    ...(cliValue(command, "tablePartition", options.tablePartition) === undefined
      ? {}
      : { table_partition: options.tablePartition }),
    ...(cliValue(command, "resultStrict", options.resultStrict) === undefined
      ? {}
      : { result_strict: options.resultStrict }),
    ...(cliValue(command, "resourceGroup", options.resourceGroup) === undefined
      ? {}
      : { resource_group: options.resourceGroup }),
    ...(cliValue(command, "taskSearchQuery", options.taskSearchQuery) === undefined
      ? {}
      : { task_search_query: options.taskSearchQuery }),
    ...(cliValue(command, "caseTimeoutMs", options.caseTimeoutMs) === undefined
      ? {}
      : { case_timeout_ms: positiveInteger(options.caseTimeoutMs, "case-timeout-ms") }),
    ...(cliValue(command, "resultTimeoutMs", options.resultTimeoutMs) === undefined
      ? {}
      : { result_timeout_ms: positiveInteger(options.resultTimeoutMs, "result-timeout-ms") }),
    ...(cliValue(command, "tableOptionTimeoutMs", options.tableOptionTimeoutMs) === undefined
      ? {}
      : {
          table_option_timeout_ms: positiveInteger(
            options.tableOptionTimeoutMs,
            "table-option-timeout-ms",
          ),
        }),
    ...(cliValue(
      command,
      "ruleSetSavePromptCloseTimeoutMs",
      options.ruleSetSavePromptCloseTimeoutMs,
    ) === undefined
      ? {}
      : {
          rule_set_save_prompt_close_timeout_ms: positiveInteger(
            options.ruleSetSavePromptCloseTimeoutMs,
            "rule-set-save-prompt-close-timeout-ms",
          ),
        }),
    ...(cliValue(command, "taskScanMaxPages", options.taskScanMaxPages) === undefined
      ? {}
      : {
          task_scan_max_pages: nonNegativeInteger(options.taskScanMaxPages, "task-scan-max-pages"),
        }),
    ...(cliValue(command, "rulesetScanMaxPages", options.rulesetScanMaxPages) === undefined
      ? {}
      : {
          ruleset_scan_max_pages: nonNegativeInteger(
            options.rulesetScanMaxPages,
            "ruleset-scan-max-pages",
          ),
        }),
    ...(cliValue(command, "spinTimeoutMs", options.spinTimeoutMs) === undefined
      ? {}
      : { spin_timeout_ms: positiveInteger(options.spinTimeoutMs, "spin-timeout-ms") }),
    ...(cliValue(command, "importFormTimeoutMs", options.importFormTimeoutMs) === undefined
      ? {}
      : {
          import_form_timeout_ms: positiveInteger(
            options.importFormTimeoutMs,
            "import-form-timeout-ms",
          ),
        }),
    ...(cliValue(command, "selectSpinTimeoutMs", options.selectSpinTimeoutMs) === undefined
      ? {}
      : {
          select_spin_timeout_ms: positiveInteger(
            options.selectSpinTimeoutMs,
            "select-spin-timeout-ms",
          ),
        }),
    ...(cliValue(command, "executeSubmitWaitMs", options.executeSubmitWaitMs) === undefined
      ? {}
      : {
          execute_submit_wait_ms: positiveInteger(
            options.executeSubmitWaitMs,
            "execute-submit-wait-ms",
          ),
        }),
  };
}

async function runAutomation(
  featureSelector: string,
  options: AutomationRunOptions,
  command: Command,
): Promise<void> {
  if (!RUN_TYPES.includes(options.type as RunType)) {
    throw new Error(`非法运行类型 "${options.type}"，可选: ${RUN_TYPES.join("|")}`);
  }
  const playwrightOverrides = buildPlaywrightOverrides(options, command);
  const config = loadPlaywrightAutomationConfig({ overrides: playwrightOverrides });
  const feature = resolveAutomationFeature(featureSelector, options.project, undefined, {
    requirementIdMapping: config.requirementIdMapping,
  });
  const runnerPath = resolve(feature.dir, options.runner);
  if (!existsSync(runnerPath)) throw new Error(`runner 不存在: ${runnerPath}`);
  if (options.type === "run" && !config.allure.enabled) {
    throw new Error("正式 automation run 不允许关闭 Allure；调试请使用 --type debug");
  }
  const automationOverrides = buildAutomationOverrides(options, command);
  const allocation = runRunsPath({
    project: options.project,
    featureId: feature.dirName,
    newRun: true,
    runType: options.type as RunType,
  });
  const tempRoot = mkdtempSync(join(tmpdir(), "kata-automation-"));
  const configPath = join(tempRoot, `kata-automation-config-${randomUUID()}.ts`);
  const overridePath = configPath.replace(/\.ts$/, ".overrides.json");
  const repoRoot = process.cwd();
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
    JSON.stringify({ playwright: playwrightOverrides, automation: automationOverrides }, null, 2),
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
  const runnerArg = relative(repoRoot, runnerPath);
  const commandArgs = [
    process.execPath,
    resolve(repoRoot, "cli/bin/kata.ts"),
    "env",
    "run",
    options.env,
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
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/** Build the `automation` command: scaffold + normalize a feature's automation dir. */
export function registerAutomation(program: Command): void {
  const automation = program.command("automation").description("自动化目录结构管理");

  const run = automation
    .command("run <feature-dir-or-requirement-id>")
    .description(
      "按 feature 目录或 prd.md.requirement_id 执行 Playwright，并生成 Allure 结果与报告",
    )
    .requiredOption("--env <name>", "平台环境名")
    .option("--project <name>", "工作区项目名", "dataAssets")
    .option(
      "--runner <path>",
      "相对 feature 的 runner 路径",
      "automation/tests/runners/full.spec.ts",
    )
    .option("--type <type>", `运行类型: ${RUN_TYPES.join("|")}`, "run")
    .option("--workers <number>", "临时覆盖 Playwright worker 数")
    .option("--browser <name>", "临时覆盖浏览器项目")
    .option("--timeout-ms <number>", "临时覆盖 Playwright 超时")
    .option("--retries <number>", "临时覆盖 Playwright 重试次数")
    .option("--allure-results-dir <path>", "临时覆盖 Allure 原始结果目录")
    .option("--allure-report-dir <path>", "临时覆盖 Allure HTML 报告目录")
    .option("--cases <range>", "临时覆盖用例范围")
    .option("--table-batch-suffix <suffix>", "临时覆盖表名批次后缀")
    .option("--table-partition <date>", "临时覆盖表分区日期")
    .option("--resource-group <name>", "临时覆盖规则任务资源组")
    .option("--task-search-query <query>", "临时覆盖规则任务搜索词")
    .option("--case-timeout-ms <number>", "临时覆盖单用例超时")
    .option("--result-timeout-ms <number>", "临时覆盖结果等待超时")
    .option("--table-option-timeout-ms <number>", "临时覆盖表选项加载超时")
    .option("--rule-set-save-prompt-close-timeout-ms <number>", "临时覆盖规则集保存提示关闭超时")
    .option("--task-scan-max-pages <number>", "临时覆盖规则任务最大扫描页数，0 表示不限制")
    .option("--ruleset-scan-max-pages <number>", "临时覆盖规则集最大扫描页数，0 表示不限制")
    .option("--spin-timeout-ms <number>", "临时覆盖通用等待超时")
    .option("--import-form-timeout-ms <number>", "临时覆盖规则导入表单超时")
    .option("--select-spin-timeout-ms <number>", "临时覆盖选择下拉框等待超时")
    .option("--execute-submit-wait-ms <number>", "临时覆盖立即执行提交等待时间");
  booleanOption(
    run,
    "--sort-cases",
    "--no-sort-cases",
    "按 cases YAML 中 cNNNN spec_file 降序执行",
  );
  booleanOption(
    run,
    "--requirement-id-mapping",
    "--no-requirement-id-mapping",
    "是否允许用数字 requirement_id 自动发现 feature",
  );
  booleanOption(run, "--headless", "--headed", "使用无头/有头浏览器");
  booleanOption(run, "--continue-on-failure", "--no-continue-on-failure", "失败后是否继续后续用例");
  booleanOption(
    run,
    "--skip-precondition-setup",
    "--no-skip-precondition-setup",
    "是否跳过前置建表和元数据同步",
  );
  booleanOption(run, "--result-strict", "--no-result-strict", "严格断言校验结果");
  booleanOption(run, "--allure", "--no-allure", "是否生成 Allure 结果和报告");
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
    .description("为缺失的 automation.spec_file 生成逐条 Playwright 脚本(默认 dry-run)")
    .option("--apply", "写入缺失脚本并更新 generated.ts", false)
    .action((featureDir: string, opts: { apply: boolean }) => {
      const result = generateAutomationScripts(featureDir, { apply: opts.apply });
      console.log(
        JSON.stringify(
          {
            created: result.created.length,
            skipped: result.skipped.length,
            orphanScripts: result.orphanScripts,
            runner: result.runner,
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
    .description("修复自动化目录违规(stray 文件移入备份)")
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
    .option("--shared", "检查 workspace 项目的 _shared 页面、helper 与 fixture")
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
