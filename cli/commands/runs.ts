import { existsSync, lstatSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Command } from "commander";
import {
  emitBusinessNotificationSafely,
  formatTaipeiTime,
  workspaceRelativePath,
} from "../integrations/notify.ts";
import {
  type FeatureDirEntry,
  featureIdentity,
  listFeatureDirs,
  RUNS_TMP,
  resolveFeatureEntry,
  runsDir,
} from "../lib/features-layout.ts";
import { generateRunId, RUN_ID_RE, RUN_TYPES, type RunType, runIdType } from "../lib/run-id.ts";
import { executeWithRunPath } from "../lib/runs-exec.ts";
import { locateProject } from "../lib/workspace-locator.ts";

// ─── 共用：按 feature 相对路径定位 ───

const findFeatureEntry = resolveFeatureEntry;

function isRealDirectory(path: string): boolean {
  try {
    const stat = lstatSync(path);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

// ─── new / path ───

/** Latest canonical run id under a feature's runs/ dir; forged or legacy names never match. */
function latestRunId(root: string, featurePath: string): string {
  if (!isRealDirectory(root)) throw new Error(`需求功能 ${featurePath} 尚无运行记录`);
  const runs = readdirSync(root)
    .filter((n) => n !== RUNS_TMP && RUN_ID_RE.test(n) && isRealDirectory(join(root, n)))
    .sort()
    .reverse();
  if (runs.length === 0) throw new Error(`需求功能 ${featurePath} 尚无运行记录`);
  return runs[0];
}

/** Allocate a new run id (and create the dir) or return the latest run dir for a feature. */
export function runRunsPath(opts: {
  project: string;
  featurePath: string;
  root?: string;
  newRun?: boolean;
  runType?: RunType;
  now?: Date;
}): { runId: string; path: string } {
  const paths = locateProject(opts.project, opts.root);
  const entry = findFeatureEntry(paths.featuresDir, opts.featurePath);
  const root = runsDir(entry.dir);

  if (opts.newRun) {
    if (existsSync(root) && !isRealDirectory(root)) {
      throw new Error(`需求功能 runs/ 不能是符号链接或非目录: ${root}`);
    }
    // generateRunId 独占创建 run 目录，直接返回
    const runId = generateRunId({ type: opts.runType ?? "run", runsDir: root, now: opts.now });
    return { runId, path: join(root, runId) };
  }
  const runId = latestRunId(root, opts.featurePath);
  return { runId, path: join(root, runId) };
}

// ─── prune ───

export interface FeaturePrunePlan {
  featureDir: string;
  remove: string[];
  keep: string[];
}

/** Compute the prune plan for one feature: keep latest N + baseline + .published runs. */
function planPruneForFeature(featureDirAbs: string, keep: number): FeaturePrunePlan {
  const dir = runsDir(featureDirAbs);
  if (!isRealDirectory(dir)) return { featureDir: featureDirAbs, remove: [], keep: [] };
  const all = readdirSync(dir)
    .filter((n) => n !== RUNS_TMP && RUN_ID_RE.test(n) && isRealDirectory(join(dir, n)))
    .sort(); // run-id 字典序即时间序

  const published = new Set(all.filter((n) => existsSync(join(dir, n, ".published"))));
  const baselines = new Set(all.filter((n) => runIdType(n) === "baseline"));
  const latest = new Set(keep > 0 ? all.slice(-keep) : []);
  const keepSet = new Set([...published, ...baselines, ...latest]);

  return {
    featureDir: featureDirAbs,
    keep: all.filter((n) => keepSet.has(n)),
    remove: all.filter((n) => !keepSet.has(n)),
  };
}

/** Prune run dirs across a project's features (or one feature); archived zone is skipped. */
export function runRunsPrune(opts: {
  project: string;
  featurePath?: string;
  root?: string;
  keep: number;
  apply?: boolean;
}): { plan: FeaturePrunePlan[]; removed: string[]; kept: string[] } {
  const paths = locateProject(opts.project, opts.root);
  const featuresRoot = paths.featuresDir;
  const apply = opts.apply ?? false;

  // 只清 active/standing zone；archived 不清
  let targets: FeatureDirEntry[];
  if (opts.featurePath) {
    targets = [findFeatureEntry(featuresRoot, opts.featurePath)];
  } else {
    targets = listFeatureDirs(featuresRoot).filter((e) => e.zone !== "archived");
  }

  const plan: FeaturePrunePlan[] = [];
  let removed: string[] = [];
  let kept: string[] = [];

  for (const entry of targets) {
    const p = planPruneForFeature(entry.dir, opts.keep);
    plan.push(p);
    const root = runsDir(entry.dir);

    if (apply) {
      for (const n of p.remove) {
        rmSync(join(root, n), { recursive: true, force: true });
      }
      // 清空每个 feature 的 runs/_tmp/*
      const tmpDir = join(root, RUNS_TMP);
      if (existsSync(tmpDir) && !isRealDirectory(tmpDir)) {
        throw new Error(`runs/_tmp 不能是符号链接或非目录: ${tmpDir}`);
      }
      if (isRealDirectory(tmpDir)) {
        for (const n of readdirSync(tmpDir)) {
          rmSync(join(tmpDir, n), { recursive: true, force: true });
        }
      }
    }

    removed = removed.concat(p.remove.map((n) => `${entry.dirName}/${n}`));
    kept = kept.concat(p.keep.map((n) => `${entry.dirName}/${n}`));
  }

  return { plan, removed, kept };
}

// ─── verify ───

export interface RunsVerifyCheck {
  name: string;
  level: "error" | "warning";
  passed: boolean;
  message: string;
}

export interface RunsVerifyResult {
  runId: string;
  runPath: string;
  ok: boolean;
  checks: RunsVerifyCheck[];
}

interface AllureResult {
  status?: string;
  name?: string;
  fullName?: string;
  statusDetails?: { message?: string };
  start?: number;
  stop?: number;
}

const ALLURE_RESULT_STATUSES = new Set(["passed", "failed", "broken", "skipped"]);

function readAllureSummary(runPath: string):
  | {
      passed: number;
      failed: number;
      broken: number;
      skipped: number;
      durationMs: number;
      failedCases: Array<{ title: string; message?: string }>;
    }
  | undefined {
  const dir = join(runPath, "allure-results");
  if (!existsSync(dir)) return undefined;
  const results: AllureResult[] = [];
  for (const name of readdirSync(dir).filter((entry) => entry.endsWith("-result.json"))) {
    try {
      results.push(JSON.parse(readFileSync(join(dir, name), "utf8")) as AllureResult);
    } catch {
      return undefined;
    }
  }
  if (results.length === 0) return undefined;
  const counters = { passed: 0, failed: 0, broken: 0, skipped: 0 };
  const failedCases: Array<{ title: string; message?: string }> = [];
  const starts: number[] = [];
  const stops: number[] = [];
  for (const result of results) {
    if (result.status === "passed") counters.passed += 1;
    else if (result.status === "failed") counters.failed += 1;
    else if (result.status === "broken") counters.broken += 1;
    else counters.skipped += 1;
    if (result.status === "failed" || result.status === "broken") {
      failedCases.push({
        title: result.fullName || result.name || "未命名用例",
        ...(result.statusDetails?.message
          ? { message: result.statusDetails.message.split("\n")[0] }
          : {}),
      });
    }
    if (typeof result.start === "number") starts.push(result.start);
    if (typeof result.stop === "number") stops.push(result.stop);
  }
  return {
    ...counters,
    durationMs:
      starts.length > 0 && stops.length > 0 ? Math.max(...stops) - Math.min(...starts) : 0,
    failedCases,
  };
}

function finishedAt(runPath: string): Date | undefined {
  try {
    const status = JSON.parse(readFileSync(join(runPath, "status.json"), "utf8")) as {
      schemaVersion?: number;
      runId?: string;
      finishedAt?: string;
    };
    if (status.schemaVersion !== 1 || typeof status.runId !== "string" || !status.finishedAt)
      return undefined;
    const date = new Date(status.finishedAt);
    return Number.isNaN(date.getTime()) ? undefined : date;
  } catch {
    return undefined;
  }
}

interface PendingInputRecord {
  schema_version: 1;
  status: "pending";
  case_title: string;
  question: string;
}

function readPendingInput(runPath: string): PendingInputRecord | undefined {
  const path = join(runPath, "pending-input.json");
  if (!existsSync(path)) return undefined;
  try {
    const value = JSON.parse(readFileSync(path, "utf8")) as Partial<PendingInputRecord>;
    if (
      value.schema_version !== 1 ||
      value.status !== "pending" ||
      typeof value.case_title !== "string" ||
      typeof value.question !== "string" ||
      !value.case_title.trim() ||
      !value.question.trim()
    ) {
      return undefined;
    }
    return value as PendingInputRecord;
  } catch {
    return undefined;
  }
}

function hasStartedRunRecord(runPath: string): boolean {
  try {
    const status = JSON.parse(readFileSync(join(runPath, "status.json"), "utf8")) as {
      schemaVersion?: number;
      runId?: string;
    };
    return status.schemaVersion === 1 && typeof status.runId === "string";
  } catch {
    return false;
  }
}

async function notifyRunsVerification(
  result: RunsVerifyResult,
  project: string,
  featurePath: string,
): Promise<void> {
  const paths = locateProject(project);
  const entry = findFeatureEntry(paths.featuresDir, featurePath);
  const root = dirname(dirname(paths.projectDir));
  const identity = featureIdentity(project, paths.featuresDir, entry);
  const pending = readPendingInput(result.runPath);
  if (pending && hasStartedRunRecord(result.runPath)) {
    const emitted = await emitBusinessNotificationSafely(
      "ui-test-needs-input",
      {
        project,
        version: identity.version,
        feature: identity.title,
        completed_at: formatTaipeiTime(),
        run_id: result.runId,
        case_title: pending.case_title,
        question: pending.question,
        pending_record_path: workspaceRelativePath(
          root,
          join(result.runPath, "pending-input.json"),
        ),
      },
      { root },
    );
    process.stderr.write(
      `[notify] ui-test-needs-input: ${emitted.state}${emitted.reason ? ` (${emitted.reason})` : ""}\n`,
    );
    return;
  }
  const completed = finishedAt(result.runPath);
  const summary = readAllureSummary(result.runPath);
  // No result record means preflight/configuration/lint failure; it must never broadcast.
  if (!completed || !summary) return;
  const base = {
    project,
    version: identity.version,
    feature: identity.title,
    completed_at: formatTaipeiTime(completed),
    run_id: result.runId,
    passed: summary.passed,
    failed: summary.failed,
    broken: summary.broken,
    skipped: summary.skipped,
    duration_ms: summary.durationMs,
    allure_path: workspaceRelativePath(root, join(result.runPath, "allure-results")),
  };
  const event = result.ok ? "ui-test-completed" : "ui-test-failed";
  const data = result.ok ? base : { ...base, failed_cases: summary.failedCases };
  const emitted = await emitBusinessNotificationSafely(event, data, { root });
  process.stderr.write(
    `[notify] ${event}: ${emitted.state}${emitted.reason ? ` (${emitted.reason})` : ""}\n`,
  );
}

function verifyStatusJson(runPath: string): RunsVerifyCheck {
  const name = "status";
  const path = join(runPath, "status.json");
  if (!existsSync(path)) {
    return { name, level: "error", passed: false, message: "status.json 缺失" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { name, level: "error", passed: false, message: "status.json 不是合法 JSON" };
  }
  const status = parsed as Record<string, unknown> | null;
  if (typeof status !== "object" || status === null || status.schemaVersion !== 1) {
    return { name, level: "error", passed: false, message: "status.json 不符合 schemaVersion=1" };
  }
  // schema 之外的值(伪造 passed、状态机外的字符串、非 0 退出码)一律判失败
  if (status.status !== "command_passed" || status.exitCode !== 0) {
    return {
      name,
      level: "error",
      passed: false,
      message: `status=${String(status.status)} exitCode=${String(status.exitCode)}，要求 command_passed/0`,
    };
  }
  return { name, level: "error", passed: true, message: "command_passed (exitCode=0)" };
}

function verifyAllureResults(runPath: string): RunsVerifyCheck {
  const name = "allure-results";
  const dir = join(runPath, "allure-results");
  if (!existsSync(dir) || !isRealDirectory(dir)) {
    return { name, level: "error", passed: false, message: "allure-results/ 缺失" };
  }
  const files = readdirSync(dir).filter((n) => n.endsWith("-result.json"));
  if (files.length === 0) {
    return { name, level: "error", passed: false, message: "allure-results/ 无 *-result.json" };
  }
  for (const file of files) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(join(dir, file), "utf8"));
    } catch {
      return { name, level: "error", passed: false, message: `${file} 不是合法 JSON` };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { name, level: "error", passed: false, message: `${file} 不是 Allure 结果对象` };
    }
    const status = (parsed as AllureResult).status;
    if (!status || !ALLURE_RESULT_STATUSES.has(status)) {
      return {
        name,
        level: "error",
        passed: false,
        message: `${file} 缺少明确的 Allure status（仅接受 passed/failed/broken/skipped）`,
      };
    }
  }
  return { name, level: "error", passed: true, message: `${files.length} 个有效 *-result.json` };
}

function verifyHandoff(runPath: string): RunsVerifyCheck {
  const exists = existsSync(join(runPath, "handoff.md"));
  return {
    name: "handoff",
    level: "warning",
    passed: exists,
    message: exists ? "handoff.md 存在" : "handoff.md 缺失(仅告警，不判失败)",
  };
}

/** Verify one run dir against the delivery contract: status.json + allure results (handoff warns). */
export function runRunsVerify(opts: {
  project: string;
  featurePath: string;
  root?: string;
  runId?: string;
}): RunsVerifyResult {
  const paths = locateProject(opts.project, opts.root);
  const entry = findFeatureEntry(paths.featuresDir, opts.featurePath);
  const root = runsDir(entry.dir);
  const runId = opts.runId ?? latestRunId(root, opts.featurePath);
  if (!RUN_ID_RE.test(runId)) throw new Error(`非法 run-id "${runId}"`);
  const runPath = join(root, runId);
  if (!existsSync(runPath)) throw new Error(`运行目录不存在: ${runPath}`);
  const checks = [verifyStatusJson(runPath), verifyAllureResults(runPath), verifyHandoff(runPath)];
  const ok = checks.every((c) => c.level === "warning" || c.passed);
  return { runId, runPath, ok, checks };
}

// ─── commander 注册 ───

/** Register the runs noun (new/path/prune) on the program. */
export function registerRuns(program: Command): void {
  const runs = program.command("runs").description("运行结果目录操作");

  runs
    .command("exec <feature-path>")
    .description("创建 run 并在该 run 环境中执行命令")
    .requiredOption("--project <name>", "项目名")
    .option("--type <type>", `运行类型: ${RUN_TYPES.join("|")}`, "run")
    .argument("<command...>", "要运行的命令；必须放在 -- 之后")
    .allowUnknownOption(true)
    .action(
      async (featurePath: string, command: string[], opts: { project: string; type: string }) => {
        if (!RUN_TYPES.includes(opts.type as RunType)) {
          throw new Error(`非法运行类型 "${opts.type}"，可选: ${RUN_TYPES.join("|")}`);
        }
        const args = command[0] === "--" ? command.slice(1) : command;
        if (args.length === 0) throw new Error("kata runs exec requires a command after --");
        const allocation = runRunsPath({
          project: opts.project,
          featurePath,
          newRun: true,
          runType: opts.type as RunType,
        });
        process.exitCode = await executeWithRunPath({
          runId: allocation.runId,
          runPath: allocation.path,
          project: opts.project,
          command: args,
        });
      },
    );

  runs
    .command("new <feature-path>")
    .description("为需求功能分配新运行目录(等同旧 results path --new-run)")
    .requiredOption("--project <name>", "项目名")
    .option("--type <type>", `运行类型: ${RUN_TYPES.join("|")}`, "run")
    .action((featurePath: string, opts: { project: string; type: string }) => {
      if (!RUN_TYPES.includes(opts.type as RunType)) {
        throw new Error(`非法运行类型 "${opts.type}"，可选: ${RUN_TYPES.join("|")}`);
      }
      const { path } = runRunsPath({
        project: opts.project,
        featurePath,
        newRun: true,
        runType: opts.type as RunType,
      });
      // 契约：仅输出绝对路径，供 skill 捕获 RUN_PATH
      console.log(path);
    });

  runs
    .command("path <feature-path>")
    .description("输出需求功能最近一次运行目录")
    .requiredOption("--project <name>", "项目名")
    .action((featurePath: string, opts: { project: string }) => {
      const { path } = runRunsPath({ project: opts.project, featurePath });
      console.log(path);
    });

  runs
    .command("verify")
    .description("校验运行目录交付契约(status.json/allure-results/handoff.md)，失败退出码 1")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--feature <feature-path>", "需求功能（相对 features/ 的完整路径）")
    .option("--run <run-id>", "指定 run-id(默认最近一次)")
    .option("--json", "以 JSON 输出结果", false)
    .action(async (opts: { project: string; feature: string; run?: string; json: boolean }) => {
      const result = runRunsVerify({
        project: opts.project,
        featurePath: opts.feature,
        runId: opts.run,
      });
      if (opts.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        console.log(`run:  ${result.runId}`);
        console.log(`path: ${result.runPath}`);
        for (const c of result.checks) {
          const mark = c.passed ? "✓" : c.level === "warning" ? "!" : "✗";
          console.log(`  ${mark} ${c.name}: ${c.message}`);
        }
        console.log(`[runs verify] ${result.ok ? "通过" : "未通过"}`);
      }
      if (!result.ok) process.exitCode = 1;
      await notifyRunsVerification(result, opts.project, opts.feature);
    });

  runs
    .command("prune [feature-path]")
    .description("清理旧运行目录：保留最近 N 个 + baseline + 已发布")
    .requiredOption("--project <name>", "项目名")
    .option("--keep <n>", "保留最近 N 个运行", "5")
    .option("--apply", "真正执行删除(默认 dry-run)", false)
    .action(
      (
        featurePath: string | undefined,
        opts: { project: string; keep: string; apply: boolean },
      ) => {
        const keep = Number.parseInt(opts.keep, 10);
        if (Number.isNaN(keep) || keep < 0)
          throw new Error(`--keep 需为非负整数，收到 "${opts.keep}"`);
        const { removed, kept } = runRunsPrune({
          project: opts.project,
          featurePath,
          keep,
          apply: opts.apply,
        });
        for (const n of kept) console.log(`保留: ${n}`);
        for (const n of removed) console.log(`${opts.apply ? "已删" : "将删"}: ${n}`);
        console.log(
          `\n[runs prune] ${opts.apply ? "已删除" : "dry-run，待删"} ${removed.length} 个运行目录，保留 ${kept.length} 个`,
        );
      },
    );
}
