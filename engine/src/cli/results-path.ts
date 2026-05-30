import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { generateRunId } from "@shared/lib/features/run-id.ts";

export interface ResultsPathContext {
  project: string;
  featureId: string;
  workspaceRoot: string;
  newRun: boolean;
  now?: Date;
}

export async function runResultsPath(
  ctx: ResultsPathContext,
): Promise<{ runId: string; path: string }> {
  const featureRoot = join(ctx.workspaceRoot, ctx.project, "features", ctx.featureId);
  const resultsRoot = join(featureRoot, "results");
  if (ctx.newRun) {
    const runId = generateRunId(ctx.now);
    return { runId, path: join(resultsRoot, runId) };
  }
  if (!existsSync(resultsRoot)) throw new Error(`No results found for ${ctx.featureId}`);
  const runs = readdirSync(resultsRoot).sort().reverse();
  if (runs.length === 0) throw new Error(`No runs found for ${ctx.featureId}`);
  return { runId: runs[0], path: join(resultsRoot, runs[0]) };
}
