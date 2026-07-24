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

// 中文标签目录：【vXXX】[【lanhu-id】][【客户】]【模块】需求名（见 case-draft naming-convention）
export const LABEL_DIR_RE = /^【v\d+】(?:【[^】]+】)*[^【]/;

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

function isDir(p: string): boolean {
  return existsSync(p) && statSync(p).isDirectory();
}

function listChildDirs(p: string): string[] {
  if (!isDir(p)) return [];
  return readdirSync(p).filter((n) => !n.startsWith(".") && isDir(join(p, n)));
}

/** Scan features/ two-level structure; legacy flat dirs surface with zone=legacy-flat for lint/reporting. */
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

/** Returns the cases sub-directory path for a given feature directory. */
export function casesDir(featureDir: string): string {
  return join(featureDir, AREA_CASES);
}

/** Returns the runs sub-directory path for a given feature directory. */
export function runsDir(featureDir: string): string {
  return join(featureDir, AREA_RUNS);
}

/** Resolve a feature's runs/ dir by its on-disk dirName across version layers; throws when not found. */
export function resolveFeatureRunsDir(featuresRoot: string, featureId: string): string {
  const entry = listFeatureDirs(featuresRoot).find((e) => e.dirName === featureId);
  if (!entry) throw new Error(`feature not found: ${featureId}`);
  return runsDir(entry.dir);
}
