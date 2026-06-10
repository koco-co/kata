import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { readFeatureMeta } from "@shared/lib/features/feature-meta.ts";
import { listFeatureDirs } from "@shared/lib/features/layout.ts";

export interface FeaturesShowContext {
  project: string;
  featureId: string;
  workspaceRoot: string;
}

export async function runFeaturesShow(ctx: FeaturesShowContext) {
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");

  // 先用 listFeatureDirs 在两层结构中查找 dirName 匹配的 feature
  const entry = listFeatureDirs(featuresDir).find((e) => e.dirName === ctx.featureId);
  if (!entry) {
    throw new Error(`Feature not found: ${ctx.featureId}`);
  }

  const dir = entry.dir;
  const metadata = readFeatureMeta(dir);
  if (!metadata) {
    throw new Error(`Feature metadata not found: ${ctx.featureId}`);
  }

  // runs 优先，兜底 results（Task 5 范围；results-path.ts 在 Task 5 才迁移）
  const runsDir = existsSync(join(dir, "runs")) ? join(dir, "runs") : join(dir, "results");
  let recentRuns: string[] = [];
  if (existsSync(runsDir)) {
    recentRuns = readdirSync(runsDir)
      .filter((n) => statSync(join(runsDir, n)).isDirectory())
      .sort()
      .reverse()
      .slice(0, 5);
  }
  return { metadata, recentRuns };
}
