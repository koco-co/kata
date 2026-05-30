import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

export interface ResultsPruneContext {
  project: string;
  featureId?: string;
  workspaceRoot: string;
  keep: number;
}

function pruneForFeature(featureRoot: string, keep: number): { removed: string[]; kept: string[] } {
  const resultsDir = join(featureRoot, "results");
  if (!existsSync(resultsDir)) return { removed: [], kept: [] };
  const all = readdirSync(resultsDir)
    .filter((n) => statSync(join(resultsDir, n)).isDirectory())
    .sort();
  const published = new Set(all.filter((n) => existsSync(join(resultsDir, n, ".published"))));
  const topN = new Set(all.slice(-keep));
  const keepSet = new Set([...published, ...topN]);
  const removed: string[] = [];
  const kept: string[] = [];
  for (const n of all) {
    if (keepSet.has(n)) {
      kept.push(n);
    } else {
      rmSync(join(resultsDir, n), { recursive: true, force: true });
      removed.push(n);
    }
  }
  return { removed, kept };
}

export async function runResultsPrune(
  ctx: ResultsPruneContext,
): Promise<{ removed: string[]; kept: string[] }> {
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const targets = ctx.featureId
    ? [ctx.featureId]
    : readdirSync(featuresDir).filter(
        (n) => statSync(join(featuresDir, n)).isDirectory() && n !== "INDEX.md",
      );

  let removed: string[] = [];
  let kept: string[] = [];
  for (const id of targets) {
    const r = pruneForFeature(join(featuresDir, id), ctx.keep);
    removed = removed.concat(r.removed.map((n) => `${id}/${n}`));
    kept = kept.concat(r.kept.map((n) => `${id}/${n}`));
  }
  return { removed, kept };
}
