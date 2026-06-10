import { existsSync } from "node:fs";
import { join } from "node:path";
import { readFeatureMeta } from "@shared/lib/features/feature-meta.ts";
import { type FeatureZone, listFeatureDirs } from "@shared/lib/features/layout.ts";

export interface FeaturesLsContext {
  project: string;
  workspaceRoot: string;
  module?: string;
  customer?: string;
  version?: string;
  owner?: string;
  createdAfter?: string;
  status?: string;
  automationStatus?: string;
  lastRun?: string;
}

export interface FeatureRow {
  id: string;
  /** 实际目录名，INDEX 链接用 */
  dirName: string;
  /** 版本目录 / _standing / _archived/vX；legacy-flat 时为空串 */
  group: string;
  /** active | standing | archived | legacy-flat */
  zone: FeatureZone;
  displayName: string;
  status: string;
  modules: string[];
  customers: string[];
  versions: string[];
  owners: string[];
  createdAt: string;
  automationStatus: string;
  lastRunStatus: string;
  /** 产物区存在情况 */
  areas: { cases: boolean; automation: boolean; runs: boolean };
}

export async function runFeaturesLs(ctx: FeaturesLsContext): Promise<FeatureRow[]> {
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const rows: FeatureRow[] = [];

  for (const entry of listFeatureDirs(featuresDir)) {
    const meta = readFeatureMeta(entry.dir);
    if (!meta) continue;
    rows.push({
      id: meta.id,
      dirName: entry.dirName,
      group: entry.group,
      zone: entry.zone,
      displayName: meta.display_name,
      status: meta.status,
      modules: meta.modules ?? [],
      customers: meta.customers ?? [],
      versions: meta.versions ?? [],
      owners: meta.owners ?? [],
      createdAt: meta.created_at,
      automationStatus: meta.automation?.status ?? "not-started",
      lastRunStatus: (meta.automation?.last_run_status as string | undefined) ?? "not-run",
      areas: {
        cases: existsSync(join(entry.dir, "cases")),
        automation: existsSync(join(entry.dir, "automation")),
        runs: existsSync(join(entry.dir, "runs")),
      },
    });
  }

  const filtered = rows.filter((r) => {
    if (ctx.module && !r.modules.includes(ctx.module)) return false;
    if (ctx.customer && !r.customers.includes(ctx.customer)) return false;
    if (ctx.version && !r.versions.includes(ctx.version)) return false;
    if (ctx.owner && !r.owners.includes(ctx.owner)) return false;
    if (ctx.status && r.status !== ctx.status) return false;
    if (ctx.automationStatus && r.automationStatus !== ctx.automationStatus) return false;
    if (ctx.lastRun && r.lastRunStatus !== ctx.lastRun) return false;
    if (ctx.createdAfter && r.createdAt < ctx.createdAfter) return false;
    return true;
  });
  filtered.sort((a, b) => a.id.localeCompare(b.id));
  return filtered;
}
