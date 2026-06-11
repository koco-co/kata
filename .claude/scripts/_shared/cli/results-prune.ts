import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  type FeatureDirEntry,
  listFeatureDirs,
  RUNS_TMP,
  runsDir,
} from "@shared/lib/features/layout.ts";
import { runIdType } from "@shared/lib/features/run-id.ts";

export interface FeaturePrunePlan {
  featureDir: string;
  remove: string[];
  keep: string[];
}

export interface ResultsPruneContext {
  project: string;
  featureId?: string;
  workspaceRoot: string;
  keep: number;
  /** Whether to actually delete; defaults to false (dry-run). */
  apply?: boolean;
}

/** 计算单个 feature 的保留计划（不执行删除）。 */
function planPruneForFeature(featureDirAbs: string, keep: number): FeaturePrunePlan {
  const dir = runsDir(featureDirAbs);
  if (!existsSync(dir)) return { featureDir: featureDirAbs, remove: [], keep: [] };
  const all = readdirSync(dir).filter(
    (n) => n !== RUNS_TMP && statSync(join(dir, n)).isDirectory(),
  );
  all.sort(); // run-id 字典序即时间序

  const published = new Set(all.filter((n) => existsSync(join(dir, n, ".published"))));
  const baselines = new Set(all.filter((n) => runIdType(n) === "baseline"));
  const latest = new Set(all.slice(-keep));
  const keepSet = new Set([...published, ...baselines, ...latest]);

  return {
    featureDir: featureDirAbs,
    keep: all.filter((n) => keepSet.has(n)),
    remove: all.filter((n) => !keepSet.has(n)),
  };
}

export async function runResultsPrune(
  ctx: ResultsPruneContext,
): Promise<{ plan: FeaturePrunePlan[]; removed: string[]; kept: string[] }> {
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const apply = ctx.apply ?? false;

  // 只清 active/standing zone；archived 不清
  let targets: FeatureDirEntry[];
  if (ctx.featureId) {
    const entry = listFeatureDirs(featuresDir).find((e) => e.dirName === ctx.featureId);
    if (!entry) throw new Error(`feature not found: ${ctx.featureId}`);
    targets = [entry];
  } else {
    targets = listFeatureDirs(featuresDir).filter((e) => e.zone !== "archived");
  }

  const plan: FeaturePrunePlan[] = [];
  let removed: string[] = [];
  let kept: string[] = [];

  for (const entry of targets) {
    const p = planPruneForFeature(entry.dir, ctx.keep);
    plan.push(p);
    const runsRoot = runsDir(entry.dir);

    if (apply) {
      // 删除 remove 清单
      for (const n of p.remove) {
        rmSync(join(runsRoot, n), { recursive: true, force: true });
      }
      // 清空每个 feature 的 runs/_tmp/*
      const tmpDir = join(runsRoot, RUNS_TMP);
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
