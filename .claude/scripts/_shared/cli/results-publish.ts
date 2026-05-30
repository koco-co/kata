import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface ResultsPublishContext {
  project: string;
  featureId: string;
  runId: string;
  workspaceRoot: string;
}

export async function runResultsPublish(
  ctx: ResultsPublishContext,
): Promise<{ publishedPath: string }> {
  const runDir = join(
    ctx.workspaceRoot,
    ctx.project,
    "features",
    ctx.featureId,
    "results",
    ctx.runId,
  );
  if (!existsSync(runDir)) throw new Error(`Run not found: ${runDir}`);

  const shortRun = ctx.runId.split("-").pop() ?? ctx.runId;
  const yyyymm = ctx.runId.slice(0, 6);
  const ymFolder = `${yyyymm.slice(0, 4)}-${yyyymm.slice(4)}`;
  const publishedPath = join(
    ctx.workspaceRoot,
    ctx.project,
    "_shared/published-reports",
    ymFolder,
    `${ctx.featureId}-${shortRun}`,
  );
  mkdirSync(publishedPath, { recursive: true });

  for (const entry of ["handoff.md", "handoff.json", "allure-results", "playwright"]) {
    const src = join(runDir, entry);
    if (existsSync(src)) cpSync(src, join(publishedPath, entry), { recursive: true });
  }

  writeFileSync(
    join(runDir, ".published"),
    JSON.stringify(
      { published_at: new Date().toISOString(), published_to: publishedPath },
      null,
      2,
    ),
    "utf-8",
  );

  return { publishedPath };
}
