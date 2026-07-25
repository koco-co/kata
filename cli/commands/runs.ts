import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import { readFeatureMeta } from "../lib/feature-meta.ts";
import {
  type FeatureDirEntry,
  listFeatureDirs,
  RUNS_TMP,
  runsDir,
} from "../lib/features-layout.ts";
import { generateRunId, RUN_TYPES, type RunType, runIdType } from "../lib/run-id.ts";
import { locateProject } from "../lib/workspace-locator.ts";

// ─── 共用：按 dirName 或 metadata.id 定位 feature ───

function findFeatureEntry(featuresRoot: string, featureId: string): FeatureDirEntry {
  const entries = listFeatureDirs(featuresRoot);
  const entry =
    entries.find((e) => e.dirName === featureId) ??
    entries.find((e) => {
      const m = readFeatureMeta(e.dir);
      return m?.id === featureId || m?.feature_id === featureId;
    });
  if (!entry) throw new Error(`未找到需求功能: ${featureId}`);
  return entry;
}

// ─── new / path ───

/** Allocate a new run id (and create the dir) or return the latest run dir for a feature. */
export function runRunsPath(opts: {
  project: string;
  featureId: string;
  root?: string;
  newRun?: boolean;
  runType?: RunType;
  now?: Date;
}): { runId: string; path: string } {
  const paths = locateProject(opts.project, opts.root);
  const entry = findFeatureEntry(paths.featuresDir, opts.featureId);
  const root = runsDir(entry.dir);

  if (opts.newRun) {
    mkdirSync(root, { recursive: true });
    const runId = generateRunId({ type: opts.runType ?? "run", runsDir: root, now: opts.now });
    const path = join(root, runId);
    mkdirSync(path, { recursive: true });
    return { runId, path };
  }
  if (!existsSync(root)) throw new Error(`需求功能 ${opts.featureId} 尚无运行记录`);
  const runs = readdirSync(root)
    .filter((n) => n !== RUNS_TMP && statSync(join(root, n)).isDirectory())
    .sort()
    .reverse();
  if (runs.length === 0) throw new Error(`需求功能 ${opts.featureId} 尚无运行记录`);
  return { runId: runs[0], path: join(root, runs[0]) };
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
  if (!existsSync(dir)) return { featureDir: featureDirAbs, remove: [], keep: [] };
  const all = readdirSync(dir)
    .filter((n) => n !== RUNS_TMP && statSync(join(dir, n)).isDirectory())
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
  featureId?: string;
  root?: string;
  keep: number;
  apply?: boolean;
}): { plan: FeaturePrunePlan[]; removed: string[]; kept: string[] } {
  const paths = locateProject(opts.project, opts.root);
  const featuresRoot = paths.featuresDir;
  const apply = opts.apply ?? false;

  // 只清 active/standing zone；archived 不清
  let targets: FeatureDirEntry[];
  if (opts.featureId) {
    targets = [findFeatureEntry(featuresRoot, opts.featureId)];
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
      if (existsSync(tmpDir)) {
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

// ─── commander 注册 ───

/** Register the runs noun (new/path/prune) on the program. */
export function registerRuns(program: Command): void {
  const runs = program.command("runs").description("运行结果目录操作");

  runs
    .command("new <feature-id>")
    .description("为需求功能分配新运行目录(等同旧 results path --new-run)")
    .requiredOption("--project <name>", "项目名")
    .option("--type <type>", `运行类型: ${RUN_TYPES.join("|")}`, "run")
    .action((featureId: string, opts: { project: string; type: string }) => {
      if (!RUN_TYPES.includes(opts.type as RunType)) {
        throw new Error(`非法运行类型 "${opts.type}"，可选: ${RUN_TYPES.join("|")}`);
      }
      const { path } = runRunsPath({
        project: opts.project,
        featureId,
        newRun: true,
        runType: opts.type as RunType,
      });
      // 契约：仅输出绝对路径，供 skill 捕获 RUN_PATH
      console.log(path);
    });

  runs
    .command("path <feature-id>")
    .description("输出需求功能最近一次运行目录")
    .requiredOption("--project <name>", "项目名")
    .action((featureId: string, opts: { project: string }) => {
      const { path } = runRunsPath({ project: opts.project, featureId });
      console.log(path);
    });

  runs
    .command("prune [feature-id]")
    .description("清理旧运行目录：保留最近 N 个 + baseline + 已发布")
    .requiredOption("--project <name>", "项目名")
    .option("--keep <n>", "保留最近 N 个运行", "5")
    .option("--apply", "真正执行删除(默认 dry-run)", false)
    .action(
      (featureId: string | undefined, opts: { project: string; keep: string; apply: boolean }) => {
        const keep = Number.parseInt(opts.keep, 10);
        if (Number.isNaN(keep) || keep < 0)
          throw new Error(`--keep 需为非负整数，收到 "${opts.keep}"`);
        const { removed, kept } = runRunsPrune({
          project: opts.project,
          featureId,
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
