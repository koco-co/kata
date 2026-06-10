import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { AREA_AUTOMATION, AREA_CASES, AREA_RUNS } from "./layout.ts";

// ─── 类型定义 ───

/** FeatureMetadata@2: all @1 fields plus the three sections merged from legacy manifest.json */
export interface FeatureMeta {
  schema: string;
  id: string;
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

// ─── 路径改写 ───

/**
 * Rewrite a legacy feature-relative path to the three-area layout.
 * Absolute paths are returned as-is.
 */
export function rewriteLegacyPath(p: string): string {
  if (p.startsWith("/")) return p;
  // results/ → runs/
  if (p.startsWith("results/") || p === "results") return p.replace(/^results/, AREA_RUNS);
  // tests/ 或 scripts/ → automation/tests/ 等
  if (p.startsWith("tests/") || p === "tests") return `${AREA_AUTOMATION}/${p}`;
  if (p.startsWith("scripts/") || p === "scripts") return `${AREA_AUTOMATION}/${p}`;
  // 用例产物文件 → cases/
  if (/^(archive(\.draft)?\.md|cases\.xmind|test-point-checklist\.md)$/.test(p)) {
    return `${AREA_CASES}/${p}`;
  }
  // AUTOMATION-PLAN.md → automation/
  if (p === "AUTOMATION-PLAN.md") return `${AREA_AUTOMATION}/${p}`;
  return p;
}

// 递归对所有字符串值执行路径改写
function rewritePathsDeep(value: unknown): unknown {
  if (typeof value === "string") return rewriteLegacyPath(value);
  if (Array.isArray(value)) return value.map(rewritePathsDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, rewritePathsDeep(v)]),
    );
  }
  return value;
}

// ─── 公开 API ───

/** Read FeatureMeta from metadata.yaml; returns null if the file does not exist. */
export function readFeatureMeta(featureDir: string): FeatureMeta | null {
  const p = join(featureDir, "metadata.yaml");
  if (!existsSync(p)) return null;
  return parse(readFileSync(p, "utf-8")) as FeatureMeta;
}

/**
 * Merge manifest.json into metadata.yaml, upgrading schema to FeatureMetadata@2,
 * then delete manifest.json. Returns { merged: false } when already @2 or no manifest.
 */
export function mergeManifestIntoMetadata(featureDir: string): { merged: boolean } {
  const metaPath = join(featureDir, "metadata.yaml");
  const manifestPath = join(featureDir, "manifest.json");

  // 前置检查：metadata.yaml 和 manifest.json 必须都存在
  if (!existsSync(metaPath) || !existsSync(manifestPath)) return { merged: false };

  const meta = parse(readFileSync(metaPath, "utf-8"));
  // 已经是 @2，幂等返回
  if (meta.schema === "FeatureMetadata@2") return { merged: false };

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  // 合并 manifest 三段，并对路径值做旧布局 → 新三区改写
  const merged: FeatureMeta = {
    ...meta,
    schema: "FeatureMetadata@2",
    feature_id: manifest.feature_id ?? meta.id,
    case_drafting: rewritePathsDeep(manifest.case_drafting) as FeatureMeta["case_drafting"],
    automation: rewritePathsDeep(manifest.automation) as FeatureMeta["automation"],
    files: rewritePathsDeep(manifest.files) as FeatureMeta["files"],
  };

  writeFileSync(metaPath, stringify(merged), "utf-8");
  // manifest.json 做 fs 删除；migrate CLI 负责 git rm（若需 git 追踪）
  rmSync(manifestPath);
  return { merged: true };
}
