import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listFeatureDirs, runsDir } from "@shared/lib/features/layout.ts";

export interface ResultsPublishContext {
  project: string;
  featureId: string;
  runId: string;
  workspaceRoot: string;
}

export async function runResultsPublish(
  ctx: ResultsPublishContext,
): Promise<{ publishedPath: string }> {
  // 在两层结构中按 dirName 查找 feature
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const entry = listFeatureDirs(featuresDir).find((e) => e.dirName === ctx.featureId);
  if (!entry) throw new Error(`feature not found: ${ctx.featureId}`);

  const runDir = join(runsDir(entry.dir), ctx.runId);
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
