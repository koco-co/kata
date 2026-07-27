import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

/** FeatureMetadata@2: case_drafting/automation/files sections merged from legacy manifest.json. */
export interface FeatureMeta {
  schema: string;
  id: string;
  /** Alternate routing key; when present must be `{group}/{dirName}` (enforced by features lint). */
  feature_id?: string;
  display_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  modules: string[];
  customers: string[];
  versions: string[];
  owners: string[];
  inputs: unknown[];
  relates_to: unknown[];
  emits: Record<string, boolean>;
  case_drafting?: Record<string, unknown>;
  automation?: Record<string, unknown> & { status?: string; last_run_status?: string };
  files?: Record<string, string | null>;
}

/** Read FeatureMeta from metadata.yaml; returns null if the file does not exist. Content is not validated. */
export function readFeatureMeta(featureDir: string): FeatureMeta | null {
  const p = join(featureDir, "metadata.yaml");
  if (!existsSync(p)) return null;
  return parse(readFileSync(p, "utf-8")) as FeatureMeta;
}
