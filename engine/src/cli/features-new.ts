import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildFeatureId, isValidSlug } from "@shared/lib/features/slug.ts";
import { parse, stringify } from "yaml";
import { runFeaturesIndex } from "./features-index.ts";

export interface FeaturesNewContext {
  project: string;
  slug: string;
  displayName: string;
  modules: string[];
  customers: string[];
  versions: string[];
  owners: string[];
  inputs: ("prd" | "lanhu" | "axure" | "manual" | "bug-hotfix")[];
  workspaceRoot: string;
  now?: Date;
}

function splitEnumFile(path: string): string[] {
  if (!existsSync(path)) return [];
  const parsed = parse(readFileSync(path, "utf-8"));
  return Array.isArray(parsed?.enum) ? parsed.enum : [];
}

function assertDeclared(label: string, values: string[], declared: string[]): void {
  if (declared.length === 0) return;
  for (const value of values) {
    if (!declared.includes(value)) {
      throw new Error(`${label} "${value}" is not declared in _shared/_meta`);
    }
  }
}

export async function runFeaturesNew(
  ctx: FeaturesNewContext,
): Promise<{ featureId: string; featureDir: string }> {
  if (!isValidSlug(ctx.slug)) {
    throw new Error(`Invalid slug: ${ctx.slug}. Must match ^[a-z0-9]+(?:-[a-z0-9]+)*$`);
  }
  const now = ctx.now ?? new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const yyyyMm = `${yyyy}-${mm}`;
  const featureId = buildFeatureId(yyyyMm, ctx.slug);
  const featureDir = join(ctx.workspaceRoot, ctx.project, "features", featureId);
  const metaDir = join(ctx.workspaceRoot, ctx.project, "_shared", "_meta");

  assertDeclared("module", ctx.modules, splitEnumFile(join(metaDir, "modules.yaml")));
  assertDeclared("customer", ctx.customers, splitEnumFile(join(metaDir, "customers.yaml")));
  assertDeclared("version", ctx.versions, splitEnumFile(join(metaDir, "versions.yaml")));

  if (existsSync(featureDir)) {
    throw new Error(`Feature already exists: ${featureDir}`);
  }
  mkdirSync(featureDir, { recursive: true });

  const today = now.toISOString().slice(0, 10);
  const metadata = {
    schema: "FeatureMetadata@1",
    id: featureId,
    display_name: ctx.displayName,
    status: "active",
    created_at: today,
    updated_at: today,
    modules: ctx.modules,
    customers: ctx.customers,
    versions: ctx.versions,
    owners: ctx.owners,
    inputs: ctx.inputs.map((kind) => ({ kind, ref: `manual.pending:${kind}` })),
    relates_to: [],
    emits: { cases_xmind: true, archive: true, playwright_tests: true },
  };
  writeFileSync(join(featureDir, "metadata.yaml"), stringify(metadata), "utf-8");

  const manifest = {
    schema: "FeatureManifest@2",
    feature_id: featureId,
    case_drafting: {
      status: "not-started",
      archive_path: null,
      xmind_path: null,
      requirement_atoms: [],
      coverage_matrix_path: null,
    },
    automation: {
      status: "not-started",
      intents: [],
      last_handoff_path: null,
      last_run_status: "not-run",
    },
    files: {
      archive: null,
      xmind: null,
      tests_root: null,
      latest_results: null,
    },
  };
  writeFileSync(join(featureDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");

  for (const kind of ctx.inputs) {
    const subdir =
      kind === "prd" ? "prd-attachments" : kind === "lanhu" ? "lanhu-snapshots" : "reference-docs";
    const path = join(featureDir, "inputs", subdir);
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, ".gitkeep"), "", "utf-8");
  }

  await runFeaturesIndex({ project: ctx.project, workspaceRoot: ctx.workspaceRoot, now });

  return { featureId, featureDir };
}
