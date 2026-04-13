import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export interface FeaturesShowContext {
  project: string;
  featureId: string;
  workspaceRoot: string;
}

export async function runFeaturesShow(ctx: FeaturesShowContext) {
  const dir = join(ctx.workspaceRoot, ctx.project, "features", ctx.featureId);
  if (!existsSync(dir)) throw new Error(`Feature not found: ${ctx.featureId}`);
  const metadata = parse(readFileSync(join(dir, "metadata.yaml"), "utf-8"));
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf-8"));
  const resultsDir = join(dir, "results");
  let recentRuns: string[] = [];
  if (existsSync(resultsDir)) {
    recentRuns = readdirSync(resultsDir)
      .filter((n) => statSync(join(resultsDir, n)).isDirectory())
      .sort()
      .reverse()
      .slice(0, 5);
  }
  return { metadata, manifest, recentRuns };
}
