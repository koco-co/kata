import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

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
  displayName: string;
  status: string;
  modules: string[];
  customers: string[];
  versions: string[];
  owners: string[];
  createdAt: string;
  automationStatus: string;
  lastRunStatus: string;
}

export async function runFeaturesLs(ctx: FeaturesLsContext): Promise<FeatureRow[]> {
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  if (!existsSync(featuresDir)) return [];
  const rows: FeatureRow[] = [];
  for (const name of readdirSync(featuresDir)) {
    const dir = join(featuresDir, name);
    if (!statSync(dir).isDirectory()) continue;
    if (name === "INDEX.md") continue;
    const metaPath = join(dir, "metadata.yaml");
    const manifestPath = join(dir, "manifest.json");
    if (!existsSync(metaPath) || !existsSync(manifestPath)) continue;
    const meta = parse(readFileSync(metaPath, "utf-8"));
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    rows.push({
      id: meta.id,
      displayName: meta.display_name,
      status: meta.status,
      modules: meta.modules ?? [],
      customers: meta.customers ?? [],
      versions: meta.versions ?? [],
      owners: meta.owners ?? [],
      createdAt: meta.created_at,
      automationStatus: manifest.automation?.status ?? "not-started",
      lastRunStatus: manifest.automation?.last_run_status ?? "not-run",
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
