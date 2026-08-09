import { existsSync, lstatSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import {
  type AutomationVerifyResult,
  verifyAutomationRun,
} from "../lib/automation/automation-verifier.ts";
import {
  type FeatureDirEntry,
  listFeatureDirs,
  RUNS_TMP,
  resolveFeatureEntry,
  runsDir,
} from "../lib/features-layout.ts";
import { generateRunId, RUN_ID_RE, RUN_TYPES, type RunType, runIdType } from "../lib/run-id.ts";
import { executeWithRunPath } from "../lib/runs-exec.ts";
import { locateProject, locateProjectRoot } from "../lib/workspace-locator.ts";

const findFeatureEntry = resolveFeatureEntry;

function isRealDirectory(path: string): boolean {
  try {
    const stat = lstatSync(path);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function latestRunId(root: string, featurePath: string): string {
  if (!isRealDirectory(root)) throw new Error(`需求功能 ${featurePath} 尚无运行记录`);
  const runs = readdirSync(root)
    .filter(
      (name) => name !== RUNS_TMP && RUN_ID_RE.test(name) && isRealDirectory(join(root, name)),
    )
    .sort()
    .reverse();
  if (runs.length === 0) throw new Error(`需求功能 ${featurePath} 尚无运行记录`);
  return runs[0] as string;
}

/** Allocate a feature-local generic run or return its latest canonical directory. */
export function runRunsPath(options: {
  project: string;
  featurePath: string;
  root?: string;
  newRun?: boolean;
  runType?: RunType;
  now?: Date;
}): { runId: string; path: string } {
  const paths = locateProject(options.project, options.root);
  const entry = findFeatureEntry(paths.featuresDir, options.featurePath);
  const root = runsDir(entry.dir);
  if (options.newRun) {
    if (existsSync(root) && !isRealDirectory(root)) {
      throw new Error(`需求功能 runs/ 不能是符号链接或非目录: ${root}`);
    }
    const runId = generateRunId({
      type: options.runType ?? "run",
      runsDir: root,
      ...(options.now === undefined ? {} : { now: options.now }),
    });
    return { runId, path: join(root, runId) };
  }
  const runId = latestRunId(root, options.featurePath);
  return { runId, path: join(root, runId) };
}

export interface FeaturePrunePlan {
  featureDir: string;
  remove: string[];
  keep: string[];
}

export function parseKeepCount(raw: string): number {
  if (!/^\d+$/.test(raw)) throw new Error(`--keep 需为非负整数，收到 "${raw}"`);
  const keep = Number(raw);
  if (!Number.isSafeInteger(keep)) throw new Error(`--keep 需为非负整数，收到 "${raw}"`);
  return keep;
}

function planPruneForFeature(featureDir: string, keep: number): FeaturePrunePlan {
  const dir = runsDir(featureDir);
  if (!isRealDirectory(dir)) return { featureDir, remove: [], keep: [] };
  const all = readdirSync(dir)
    .filter((name) => name !== RUNS_TMP && RUN_ID_RE.test(name) && isRealDirectory(join(dir, name)))
    .sort();
  const published = new Set(all.filter((name) => existsSync(join(dir, name, ".published"))));
  const baselines = new Set(all.filter((name) => runIdType(name) === "baseline"));
  const latest = new Set(keep > 0 ? all.slice(-keep) : []);
  const keepSet = new Set([...published, ...baselines, ...latest]);
  return {
    featureDir,
    keep: all.filter((name) => keepSet.has(name)),
    remove: all.filter((name) => !keepSet.has(name)),
  };
}

/** Prune active feature-local generic runs; global automation artifacts remain immutable. */
export function runRunsPrune(options: {
  project: string;
  featurePath?: string;
  root?: string;
  keep: number;
  apply?: boolean;
}): { plan: FeaturePrunePlan[]; removed: string[]; kept: string[] } {
  const paths = locateProject(options.project, options.root);
  const apply = options.apply ?? false;
  let targets: FeatureDirEntry[];
  if (options.featurePath) {
    const entry = findFeatureEntry(paths.featuresDir, options.featurePath);
    if (entry.zone === "archived") {
      throw new Error(`归档 feature 不参与 runs prune: ${options.featurePath}`);
    }
    targets = [entry];
  } else {
    targets = listFeatureDirs(paths.featuresDir).filter((entry) => entry.zone !== "archived");
  }

  const plan: FeaturePrunePlan[] = [];
  let removed: string[] = [];
  let kept: string[] = [];
  for (const entry of targets) {
    const item = planPruneForFeature(entry.dir, options.keep);
    plan.push(item);
    const root = runsDir(entry.dir);
    if (apply) {
      for (const name of item.remove) rmSync(join(root, name), { recursive: true, force: true });
      const tempDir = join(root, RUNS_TMP);
      if (existsSync(tempDir) && !isRealDirectory(tempDir)) {
        throw new Error(`runs/_tmp 不能是符号链接或非目录: ${tempDir}`);
      }
      if (isRealDirectory(tempDir)) {
        for (const name of readdirSync(tempDir)) {
          rmSync(join(tempDir, name), { recursive: true, force: true });
        }
      }
    }
    removed = removed.concat(item.remove.map((name) => `${entry.dirName}/${name}`));
    kept = kept.concat(item.keep.map((name) => `${entry.dirName}/${name}`));
  }
  return { plan, removed, kept };
}

function parseRunType(value: string): RunType {
  if (!RUN_TYPES.includes(value as RunType)) {
    throw new Error(`非法运行类型 "${value}"，可选: ${RUN_TYPES.join("|")}`);
  }
  return value as RunType;
}

function parseAttempt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^[1-9][0-9]*$/.test(value)) throw new Error("--attempt 必须是正整数");
  const attempt = Number(value);
  if (!Number.isSafeInteger(attempt)) throw new Error("--attempt 必须是正整数");
  return attempt;
}

/** Format one verify result without mixing human diagnostics into JSON mode. */
export function formatAutomationVerifyOutput(
  result: AutomationVerifyResult,
  json: boolean,
): string {
  if (json) return `${JSON.stringify(result, null, 2)}\n`;
  return [
    `run:       ${result.logicalRunId}`,
    `execution: ${result.executorId}/${result.executionId}`,
    `attempt:   ${String(result.attempt).padStart(3, "0")}`,
    `path:      ${result.attemptPath}`,
    `handoff:   ${result.handoffPath}`,
    ...result.checks.map(
      (check) => `  ${check.passed ? "✓" : "✗"} ${check.name}: ${check.message}`,
    ),
    `[runs verify] ${result.ok ? "通过" : "未通过"}`,
    "",
  ].join("\n");
}

/** Register generic feature runs plus immutable automation verification. */
export function registerRuns(program: Command): void {
  const runs = program.command("runs").description("运行结果目录操作");

  runs
    .command("exec <feature-path>")
    .description("创建 feature-local run 并在受控环境中执行命令")
    .requiredOption("--project <name>", "workspace 项目名")
    .option("--type <type>", `运行类型: ${RUN_TYPES.join("|")}`, "run")
    .argument("<command...>", "要运行的命令；必须放在 -- 之后")
    .allowUnknownOption(true)
    .action(
      async (
        featurePath: string,
        command: string[],
        options: { project: string; type: string },
      ) => {
        const args = command[0] === "--" ? command.slice(1) : command;
        if (args.length === 0) throw new Error("kata runs exec requires a command after --");
        const allocation = runRunsPath({
          project: options.project,
          featurePath,
          newRun: true,
          runType: parseRunType(options.type),
        });
        process.exitCode = await executeWithRunPath({
          runId: allocation.runId,
          runPath: allocation.path,
          project: options.project,
          command: args,
        });
      },
    );

  runs
    .command("new <feature-path>")
    .description("为需求功能分配新的 feature-local 运行目录")
    .requiredOption("--project <name>", "workspace 项目名")
    .option("--type <type>", `运行类型: ${RUN_TYPES.join("|")}`, "run")
    .action((featurePath: string, options: { project: string; type: string }) => {
      const { path } = runRunsPath({
        project: options.project,
        featurePath,
        newRun: true,
        runType: parseRunType(options.type),
      });
      process.stdout.write(`${path}\n`);
    });

  runs
    .command("path <feature-path>")
    .description("输出需求功能最近一次 feature-local 运行目录")
    .requiredOption("--project <name>", "workspace 项目名")
    .action((featurePath: string, options: { project: string }) => {
      process.stdout.write(`${runRunsPath({ project: options.project, featurePath }).path}\n`);
    });

  runs
    .command("verify")
    .description("核验同一 immutable automation execution/attempt 的完整证据链")
    .requiredOption("--project <id>", "canonical project_id")
    .requiredOption("--run <logical-run-id>", "logical run ID")
    .option("--executor <id>", "executor ID；logical run 内唯一时可省略")
    .option("--execution <id>", "execution ID；缺省选择该 executor 的最新 execution")
    .option("--attempt <number>", "attempt 序号；缺省选择最新 attempt")
    .option("--json", "以 JSON 输出结果", false)
    .action(
      (options: {
        project: string;
        run: string;
        executor?: string;
        execution?: string;
        attempt?: string;
        json: boolean;
      }) => {
        const result = verifyAutomationRun({
          repoRoot: locateProjectRoot(),
          projectId: options.project,
          logicalRunId: options.run,
          ...(options.executor === undefined ? {} : { executorId: options.executor }),
          ...(options.execution === undefined ? {} : { executionId: options.execution }),
          ...(options.attempt === undefined ? {} : { attempt: parseAttempt(options.attempt) }),
        });
        process.stdout.write(formatAutomationVerifyOutput(result, options.json));
        if (!result.ok) process.exitCode = 1;
      },
    );

  runs
    .command("prune [feature-path]")
    .description("清理旧 feature-local runs：保留最近 N 个 + baseline + 已发布")
    .requiredOption("--project <name>", "workspace 项目名")
    .option("--keep <n>", "保留最近 N 个运行", "5")
    .option("--apply", "真正执行删除（默认 dry-run）", false)
    .action(
      (
        featurePath: string | undefined,
        options: { project: string; keep: string; apply: boolean },
      ) => {
        const { removed, kept } = runRunsPrune({
          project: options.project,
          ...(featurePath === undefined ? {} : { featurePath }),
          keep: parseKeepCount(options.keep),
          apply: options.apply,
        });
        for (const name of kept) console.log(`保留: ${name}`);
        for (const name of removed) console.log(`${options.apply ? "已删" : "将删"}: ${name}`);
        console.log(
          `\n[runs prune] ${options.apply ? "已删除" : "dry-run，待删"} ${removed.length} 个运行目录，保留 ${kept.length} 个`,
        );
      },
    );
}
