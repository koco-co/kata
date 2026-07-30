import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

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

// 需求目录名只表达需求身份；版本仅由父目录表达。
// 【需求ID】和【客户】可选，最后一个【】固定为模块。
export const LABEL_DIR_RE = /^(?:【\d+】)?(?:【[^【】]+】)?【[^【】]+】[^【】]+$/;
export const LEGACY_LABEL_DIR_RE = /^【(?:v\d+|standing)】(?:【[^【】]+】){1,3}[^【】]+$/;

export interface ParsedFeatureDirName {
  requirementId?: string;
  customer?: string;
  module: string;
  title: string;
}

/** Parse the canonical feature directory name, or return undefined when malformed. */
export function parseFeatureDirName(dirName: string): ParsedFeatureDirName | undefined {
  const match = dirName.match(/^(?:【(\d+)】)?(?:【([^【】]+)】)?【([^【】]+)】([^【】]+)$/);
  if (!match) return undefined;
  const [, requirementId, customer, module, title] = match;
  if (!module?.trim() || !title?.trim()) return undefined;
  return {
    ...(requirementId ? { requirementId } : {}),
    ...(customer ? { customer } : {}),
    module,
    title,
  };
}

/** Build a canonical feature directory name. Version is intentionally not duplicated here. */
export function buildFeatureDirName(opts: {
  module: string;
  description: string;
  customer?: string;
  requirementId?: string;
}): string {
  const parts: string[] = [];
  if (opts.requirementId) parts.push(`【${opts.requirementId}】`);
  if (opts.customer) parts.push(`【${opts.customer}】`);
  parts.push(`【${opts.module}】`);
  const name = `${parts.join("")}${opts.description}`;
  if (!parseFeatureDirName(name)) throw new Error(`生成的目录名不符合需求目录协议: ${name}`);
  return name;
}

export type FeatureZone = "active" | "standing" | "archived" | "legacy-flat";

export interface FeatureDirEntry {
  /** Group: version dir name (v6.4.10), _standing, or _archived/v6.4.6; "" for legacy flat dirs. */
  group: string;
  zone: FeatureZone;
  /** Directory name (human-readable label). */
  dirName: string;
  /** Absolute path. */
  dir: string;
}

export interface FeatureIdentity extends ParsedFeatureDirName {
  project: string;
  relativePath: string;
  featureKey: string;
  version: string;
  zone: FeatureZone;
}

function isDir(p: string): boolean {
  return existsSync(p) && statSync(p).isDirectory();
}

function listChildDirs(p: string): string[] {
  if (!isDir(p)) return [];
  return readdirSync(p).filter((n) => !n.startsWith(".") && isDir(join(p, n)));
}

/** Scan features/ two-level structure; legacy flat dirs surface for lint/reporting only. */
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
    } else if (!top.startsWith("_")) {
      entries.push({ group: "", zone: "legacy-flat", dirName: top, dir: topDir });
    }
  }
  return entries;
}

/** Current, project-scoped feature path below features/. */
export function featureRelativePath(featuresRoot: string, entry: FeatureDirEntry): string {
  const path = relative(resolve(featuresRoot), resolve(entry.dir)).split("\\").join("/");
  if (!path || path.startsWith("../") || path === "..") {
    throw new Error(`feature 不在 features/ 目录内: ${entry.dir}`);
  }
  return path;
}

/** Project + path is the only feature identity exposed outside the filesystem. */
export function featureIdentity(
  project: string,
  featuresRoot: string,
  entry: FeatureDirEntry,
): FeatureIdentity {
  const parsed = parseFeatureDirName(entry.dirName);
  if (!parsed) throw new Error(`需求目录不符合协议: ${featureRelativePath(featuresRoot, entry)}`);
  const relativePath = featureRelativePath(featuresRoot, entry);
  let version = entry.group;
  if (entry.zone === "archived") {
    const archivedVersion = entry.group.split("/").at(-1);
    if (!archivedVersion) throw new Error(`归档 feature 缺少版本目录: ${relativePath}`);
    version = archivedVersion;
  }
  return {
    project,
    relativePath,
    featureKey: `${project}:${relativePath}`,
    version,
    zone: entry.zone,
    ...parsed,
  };
}

/** Walk up from a feature dir to its project root (the parent of features/). */
export function projectRootFromFeatureDir(featureDir: string): string {
  let current = resolve(featureDir);
  for (;;) {
    if (basename(current) === "features") return dirname(current);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(`kata: feature 路径不在 features/ 项目目录下: ${featureDir}`);
}

/** Returns the cases sub-directory path for a given feature directory. */
export function casesDir(featureDir: string): string {
  return join(featureDir, AREA_CASES);
}

/** Returns the runs sub-directory path for a given feature directory. */
export function runsDir(featureDir: string): string {
  return join(featureDir, AREA_RUNS);
}

/** Resolve a feature's runs/ dir from its canonical relative path. */
export function resolveFeatureRunsDir(featuresRoot: string, featurePath: string): string {
  return runsDir(resolveFeatureEntry(featuresRoot, featurePath).dir);
}

/**
 * Resolve only by its canonical relative path below features/.
 * Bare names and retired metadata IDs intentionally do not route operations.
 */
export function resolveFeatureEntry(featuresRoot: string, selector: string): FeatureDirEntry {
  const normalized = selector.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized.includes("/") || normalized.startsWith("/") || normalized.includes("../")) {
    throw new Error(`需求功能必须使用相对 features/ 的完整路径: ${selector}`);
  }
  const matches = listFeatureDirs(featuresRoot).filter(
    (entry) => featureRelativePath(featuresRoot, entry) === normalized,
  );
  const [match] = matches;
  if (match) return match;
  throw new Error(`未找到需求功能: ${selector}`);
}
