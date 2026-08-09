import { readFileSync } from "node:fs";
import type { Command } from "commander";
import {
  collectAutomationExecution,
  runAutomationExecution,
} from "../lib/automation/automation-execution.ts";
import { resolveAutomationRunTarget } from "../lib/automation/automation-feature-resolver.ts";
import {
  type ExecutorEnvironmentLifecycle,
  isLifecycleExecutorId,
  runExecutorLifecycle,
} from "../lib/automation/executor-lifecycle.ts";
import { lintSqlFile, renderSql } from "../lib/automation/sql.ts";
import { locateProjectRoot } from "../lib/workspace-locator.ts";

interface AutomationLifecycleOptions {
  readonly executor?: string;
}

interface AutomationSelectionOptions {
  readonly executor?: string;
  readonly project?: string;
}

interface AutomationRunOptions extends AutomationSelectionOptions {
  readonly env?: string;
  readonly workers?: string;
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

function workspaceProject(options: AutomationSelectionOptions): string | undefined {
  return options.project ?? process.env.KATA_ACTIVE_PROJECT;
}

function parseWorkers(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^[1-9][0-9]*$/.test(value)) throw new Error("--workers 必须是正整数");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error("--workers 必须是正整数");
  return parsed;
}

function printExecution(result: Awaited<ReturnType<typeof collectAutomationExecution>>): void {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.exitCode !== 0) process.exitCode = result.exitCode;
}

async function collectAutomation(
  selector: string,
  options: AutomationSelectionOptions,
): Promise<void> {
  const repoRoot = locateProjectRoot();
  const feature = resolveAutomationRunTarget(selector, workspaceProject(options), repoRoot);
  const result = await collectAutomationExecution({
    repoRoot,
    featureDir: feature.dir,
    ...(options.executor === undefined ? {} : { executorId: options.executor }),
  });
  printExecution(result);
}

async function runAutomation(selector: string, options: AutomationRunOptions): Promise<void> {
  const repoRoot = locateProjectRoot();
  const feature = resolveAutomationRunTarget(selector, workspaceProject(options), repoRoot);
  const result = await runAutomationExecution({
    repoRoot,
    featureDir: feature.dir,
    ...(options.executor === undefined ? {} : { executorId: options.executor }),
    ...(options.env === undefined ? {} : { environmentName: options.env }),
    ...(options.workers === undefined ? {} : { workers: parseWorkers(options.workers) }),
  });
  printExecution(result);
}

/** Register descriptor-driven automation lifecycle and executor-neutral utilities. */
export function registerAutomation(program: Command): void {
  const automation = program
    .command("automation")
    .description("发现并运行可扩展 automation executor");

  automation
    .command("setup")
    .description("显式准备一个已发现 executor 的依赖或运行时")
    .option("--executor <id>", "executor ID；仅发现一个时可省略")
    .action((options: AutomationLifecycleOptions) => runAutomationLifecycle("setup", options));

  automation
    .command("doctor")
    .description("只读检查一个已发现 executor；不会隐式执行 setup")
    .option("--executor <id>", "executor ID；仅发现一个时可省略")
    .action((options: AutomationLifecycleOptions) => runAutomationLifecycle("doctor", options));

  automation
    .command("collect <feature-or-requirement-id>")
    .description("按 canonical active implementation 精确收集用例，不读取平台凭据")
    .option("--project <name>", "workspace 项目名（或使用 KATA_ACTIVE_PROJECT）")
    .option("--executor <id>", "executor ID；active executor 唯一时可省略")
    .action((selector: string, options: AutomationSelectionOptions) =>
      collectAutomation(selector, options),
    );

  automation
    .command("run <feature-or-requirement-id>")
    .description("精确收集后运行同一 immutable manifest，并保留独立 attempt 证据")
    .option("--project <name>", "workspace 项目名（或使用 KATA_ACTIVE_PROJECT）")
    .option("--executor <id>", "executor ID；active executor 唯一时可省略")
    .option("--env <name>", "平台环境名；缺省使用 meta.automation_env")
    .option("--workers <number>", "executor worker 数，必须为正整数")
    .action((selector: string, options: AutomationRunOptions) => runAutomation(selector, options));

  const sql = automation.command("sql").description("校验和渲染自动化 SQL 模板；不连接数据库");
  sql
    .command("lint <sql-file>")
    .description("按全局 SQL profile 校验模板")
    .requiredOption("--profile <name>", "SQL 方言 profile 名称或已注册数据源类型")
    .action((sqlFile: string, options: { profile: string }) => {
      const result = lintSqlFile(sqlFile, options.profile);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (result.errors.length > 0) process.exitCode = 1;
    });
  sql
    .command("render <sql-file>")
    .description("将显式 --set 值渲染到 stdout，不写入项目目录")
    .requiredOption("--profile <name>", "先按 SQL 方言 profile 校验模板")
    .option(
      "--set <KEY=value>",
      "语义占位符替换值，可重复",
      (value: string, previous: string[] = []) => [...previous, value],
      [],
    )
    .action((sqlFile: string, options: { profile: string; set: string[] }) => {
      const result = lintSqlFile(sqlFile, options.profile);
      if (result.errors.length > 0) throw new Error(result.errors.join("；"));
      process.stdout.write(renderSql(readFileSync(sqlFile, "utf8"), options.set));
    });
}
