import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ─── Feature 内三区 ───
export const AREA_CASES = "cases";
export const AREA_AUTOMATION = "automation";
export const AREA_RUNS = "runs";
export const RUNS_TMP = "_tmp";

// ─── features/ 顶层特殊目录 ───
export const STANDING_DIR = "_standing";
export const ARCHIVED_DIR = "_archived";

// 版本目录名：语义版本，两段或三段（v6.4 / v6.4.10）
export const VERSION_DIR_RE = /^v\d+(?:\.\d+){1,2}$/;

export type FeatureZone = "active" | "standing" | "archived" | "legacy-flat";

export interface FeatureDirEntry {
  /** Group: version dir name (v6.4.10), _standing, or _archived/v6.4.6; "" for legacy flat dirs. */
  group: string;
  zone: FeatureZone;
  /** Directory name (human-readable CJK label or slug). */
  dirName: string;
  /** Absolute path. */
  dir: string;
}

/** Converts compact version string (v6411/v647) to semantic directory name (v6.4.11/v6.4.7); returns null if input does not match compact format. */
export function compactToVersionDir(compact: string): string | null {
  const m = /^v(\d)(\d)(\d{1,2})$/.exec(compact);
  if (!m) return null;
  return `v${m[1]}.${m[2]}.${Number(m[3])}`;
}

function isDir(p: string): boolean {
  return existsSync(p) && statSync(p).isDirectory();
}

function listChildDirs(p: string): string[] {
  if (!isDir(p)) return [];
  return readdirSync(p).filter((n) => !n.startsWith(".") && isDir(join(p, n)));
}

/** Scans features/ two-level structure; pre-migration flat directories are returned with zone=legacy-flat for migrate and lint identification. */
export function listFeatureDirs(featuresRoot: string): FeatureDirEntry[] {
  const entries: FeatureDirEntry[] = [];
  for (const top of listChildDirs(featuresRoot)) {
    const topDir = join(featuresRoot, top);
    if (VERSION_DIR_RE.test(top)) {
      for (const name of listChildDirs(topDir)) {
        entries.push({ group: top, zone: "active", dirName: name, dir: join(topDir, name) });
      }
    } else if (top === STANDING_DIR) {
      for (const name of listChildDirs(topDir)) {
        entries.push({
          group: STANDING_DIR,
          zone: "standing",
          dirName: name,
          dir: join(topDir, name),
        });
      }
    } else if (top === ARCHIVED_DIR) {
      for (const version of listChildDirs(topDir)) {
        for (const name of listChildDirs(join(topDir, version))) {
          entries.push({
            group: `${ARCHIVED_DIR}/${version}`,
            zone: "archived",
            dirName: name,
            dir: join(topDir, version, name),
          });
        }
      }
    } else {
      entries.push({ group: "", zone: "legacy-flat", dirName: top, dir: topDir });
    }
  }
  return entries;
}

/** Allowed non-hidden entries at the feature root; others are treated as stray artifacts and reported by L12 lint. */
export const ALLOWED_FEATURE_ROOT_ENTRIES = new Set([
  "metadata.yaml",
  "prd.md",
  "README.md",
  AREA_CASES,
  AREA_AUTOMATION,
  AREA_RUNS,
  "inputs",
]);

/** Returns the cases sub-directory path for a given feature directory. */
export function casesDir(featureDir: string): string {
  return join(featureDir, AREA_CASES);
}

/** Returns the automation sub-directory path for a given feature directory. */
export function automationDir(featureDir: string): string {
  return join(featureDir, AREA_AUTOMATION);
}

/** Returns the runs sub-directory path for a given feature directory. */
export function runsDir(featureDir: string): string {
  return join(featureDir, AREA_RUNS);
}

/** Returns the temporary runs sub-directory path for a given feature directory. */
export function runsTmpDir(featureDir: string): string {
  return join(featureDir, AREA_RUNS, RUNS_TMP);
}

/**
 * Resolve a feature's runs/ dir by its on-disk dirName across version layers; throws when not found.
 */
export function resolveFeatureRunsDir(featuresRoot: string, featureId: string): string {
  const entry = listFeatureDirs(featuresRoot).find((e) => e.dirName === featureId);
  if (!entry) throw new Error(`feature not found: ${featureId}`);
  return runsDir(entry.dir);
}
