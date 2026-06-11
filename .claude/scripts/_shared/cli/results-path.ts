import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { resolveFeatureRunsDir } from "@shared/lib/features/layout.ts";
import { generateRunId, type RunType } from "@shared/lib/features/run-id.ts";

export interface ResultsPathContext {
  project: string;
  featureId: string;
  workspaceRoot: string;
  newRun: boolean;
  now?: Date;
  /** Run type for new run allocation; defaults to "run". */
  runType?: RunType;
}

export async function runResultsPath(
  ctx: ResultsPathContext,
): Promise<{ runId: string; path: string }> {
  // 在两层结构中按 dirName 查找 feature（支持版本层、_standing、legacy-flat）
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const runsRoot = resolveFeatureRunsDir(featuresDir, ctx.featureId);

  if (ctx.newRun) {
    const runId = generateRunId({ type: ctx.runType ?? "run", runsDir: runsRoot, now: ctx.now });
    return { runId, path: join(runsRoot, runId) };
  }
  if (!existsSync(runsRoot)) throw new Error(`No runs found for ${ctx.featureId}`);
  const runs = readdirSync(runsRoot)
    .filter((n) => n !== "_tmp")
    .sort()
    .reverse();
  if (runs.length === 0) throw new Error(`No runs found for ${ctx.featureId}`);
  return { runId: runs[0], path: join(runsRoot, runs[0]) };
}
