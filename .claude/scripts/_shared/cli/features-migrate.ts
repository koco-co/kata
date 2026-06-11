import { mkdirSync, readdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { mergeManifestIntoMetadata, readFeatureMeta } from "@shared/lib/features/feature-meta.ts";
import {
  AREA_AUTOMATION,
  AREA_CASES,
  AREA_RUNS,
  compactToVersionDir,
  listFeatureDirs,
  RUNS_TMP,
  STANDING_DIR,
  VERSION_DIR_RE,
} from "@shared/lib/features/layout.ts";
import { runFeaturesIndex } from "./features-index.ts";

// ─── feature 根条目 → 三区目标（相对 feature 根）───
// 不在表内且非保留条目 → warns
const ZONE_MAP: [RegExp, (name: string) => string][] = [
  [
    /^(archive(\.draft)?\.md|cases\.xmind|test-point-checklist\.md|confirmation-package\.md|unresolved-summary\.md|.*\.csv)$/,
    (n) => join(AREA_CASES, n),
  ],
  [/^(AUTOMATION-PLAN\.md|tests|scripts)$/, (n) => join(AREA_AUTOMATION, n)],
  [/^results$/, () => AREA_RUNS],
  [/^tmp$/, () => join(AREA_RUNS, RUNS_TMP)],
];

// 允许留在 feature 根的已知条目
const KEEP_AT_ROOT = new Set([
  "metadata.yaml",
  "manifest.json",
  "prd.md",
  "README.md",
  "inputs",
  "cases",
  "automation",
  "runs",
]);

// ─── 类型定义 ───

/** A single move planned for a legacy feature entry. */
export interface MigrateMoveEntry {
  from: string;
  to: string;
}

/** Plan row for one legacy-flat feature directory. */
export interface MigratePlanRow {
  /** Directory name (human-readable CJK label or slug). */
  dirName: string;
  /** Absolute path of the current feature root. */
  from: string;
  /** Target group directory (version or _standing); null = unresolved. */
  targetGroup: string | null;
  /** Intra-feature moves (relative from = entry name; relative to = new path inside feature). */
  moves: MigrateMoveEntry[];
  /** Warnings about unknown root entries that will stay in place. */
  warns: string[];
}

/** Context for planMigrate / runFeaturesMigrate. */
export interface FeaturesMigrateContext {
  /** Project name under workspace/. */
  project: string;
  /** Absolute path to the workspace root. */
  workspaceRoot: string;
  /** When true, actually perform moves and metadata merge; false = dry-run only. */
  apply: boolean;
  /** Skip unresolved directories instead of throwing when applying. */
  allowUnresolved?: boolean;
  /** Fallback group when resolveGroup returns null (e.g. "_standing"). If passed and invalid, throws on apply. */
  fallbackGroup?: string;
  /** Custom move function; defaults to renameSync. Inject a git mv wrapper in real runs. */
  move?: (from: string, to: string) => void;
}

// ─── 版本解析 ───

// 从目录名、2099 前缀或 metadata 推断目标 group
function resolveGroup(dirName: string, featureDir: string, fallbackGroup?: string): string | null {
  // 优先从目录名中的 【vXXXX】 提取
  const m = /【(v\d{2,4})】/.exec(dirName);
  if (m) {
    const v = compactToVersionDir(m[1]);
    if (v) return v;
  }
  // 2099- 前缀 → _standing
  if (/^2099-/.test(dirName)) return STANDING_DIR;
  // 从 metadata.versions 取最新
  const meta = readFeatureMeta(featureDir);
  const fromMeta = meta?.versions?.at(-1);
  if (fromMeta && /^v\d+(\.\d+){1,2}$/.test(fromMeta)) return fromMeta;
  // 兜底
  return fallbackGroup ?? null;
}

// 校验 fallbackGroup 的合法值
function validateFallbackGroup(value: string): void {
  if (VERSION_DIR_RE.test(value) || value === STANDING_DIR) return;
  throw new Error(
    `invalid fallbackGroup "${value}": must match VERSION_DIR_RE (e.g. v6.4.11) or be "_standing"`,
  );
}

// ─── 核心函数 ───

/**
 * Build migration plan without touching disk (dry-run).
 * Only legacy-flat directories are included; already-migrated entries are skipped.
 */
export function planMigrate(ctx: FeaturesMigrateContext): MigratePlanRow[] {
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const rows: MigratePlanRow[] = [];

  for (const entry of listFeatureDirs(featuresDir)) {
    if (entry.zone !== "legacy-flat") continue;

    const row: MigratePlanRow = {
      dirName: entry.dirName,
      from: entry.dir,
      targetGroup: resolveGroup(entry.dirName, entry.dir, ctx.fallbackGroup),
      moves: [],
      warns: [],
    };

    // 扫描 feature 根，分配每个条目到目标区
    for (const name of readdirSync(entry.dir)) {
      // 隐藏条目（.process/.debug 等）留在根，不参与移动
      if (name.startsWith(".")) continue;

      const hit = ZONE_MAP.find(([re]) => re.test(name));
      if (hit) {
        row.moves.push({ from: name, to: hit[1](name) });
      } else if (!KEEP_AT_ROOT.has(name)) {
        row.warns.push(`未知根级条目 "${name}"，保持原位，请人工归类`);
      }
    }

    rows.push(row);
  }

  return rows;
}

/**
 * Execute feature migration: moves legacy-flat features into the versioned/standing layout,
 * merges manifest.json into metadata.yaml (upgrading to FeatureMetadata@2), and regenerates INDEX.md.
 * Returns the migration plan (same as planMigrate but with apply=true actions performed).
 */
export async function runFeaturesMigrate(ctx: FeaturesMigrateContext): Promise<MigratePlanRow[]> {
  // 校验 fallbackGroup（在 apply 前拦截非法值）
  if (ctx.apply && ctx.fallbackGroup !== undefined) {
    validateFallbackGroup(ctx.fallbackGroup);
  }

  const rows = planMigrate(ctx);
  if (!ctx.apply) return rows;

  // 检查 unresolved 目录
  const unresolved = rows.filter((r) => r.targetGroup === null);
  if (unresolved.length > 0 && !ctx.allowUnresolved) {
    throw new Error(
      `无法推断版本的目录（请补 metadata.versions、传 --fallback-group 或人工归位）：\n${unresolved.map((r) => r.dirName).join("\n")}`,
    );
  }

  const move = ctx.move ?? renameSync;
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");

  for (const row of rows) {
    // 跳过 unresolved（allowUnresolved=true 时）
    if (row.targetGroup === null) continue;

    // 步骤 1：在 feature 根内做区内移动（cases/automation/runs）
    for (const mv of row.moves) {
      const fromAbs = join(row.from, mv.from);
      const toAbs = join(row.from, mv.to);
      mkdirSync(dirname(toAbs), { recursive: true });
      move(fromAbs, toAbs);
    }

    // 步骤 2：合并 manifest.json → metadata.yaml（升级至 @2）
    mergeManifestIntoMetadata(row.from);

    // 步骤 3：将 feature 目录整体移动至目标 group 目录下
    const groupDir = join(featuresDir, row.targetGroup);
    mkdirSync(groupDir, { recursive: true });
    move(row.from, join(groupDir, row.dirName));
  }

  // 步骤 4：重新生成 INDEX.md
  await runFeaturesIndex({ project: ctx.project, workspaceRoot: ctx.workspaceRoot });

  return rows;
}
