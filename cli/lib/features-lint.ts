import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { listFeatureDirs } from "./features-layout.ts";

export interface FeaturesLintContext {
  project: string;
  workspaceRoot: string;
  featureId?: string;
}

export interface FeatureLintViolation {
  feature: string;
  rule: string;
  message: string;
}

const SLUG_RE = /^\d{4}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
// 人类标签命名约定: 【v{版本}】[【lanhu/客户】]【{模块}】{描述}。
// 目录名只是人类路由把手, 机器主键是 metadata.id(slug)。
const CJK_LABEL_RE = /^【v\d+】(?:【[^【】]+】){1,3}[^【】]+$/;

function loadEnum(sharedRoot: string, file: string): string[] {
  const path = join(sharedRoot, "_meta", file);
  if (!existsSync(path)) return [];
  const parsed = parse(readFileSync(path, "utf-8"));
  return parsed?.enum ?? [];
}

/** Lint every feature dir under a project's features/ for real structural errors. */
export function runFeaturesLint(ctx: FeaturesLintContext): { violations: FeatureLintViolation[] } {
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const sharedDir = join(ctx.workspaceRoot, ctx.project, "_shared");
  const violations: FeatureLintViolation[] = [];
  if (!existsSync(featuresDir)) return { violations };

  const modulesEnum = loadEnum(sharedDir, "modules.yaml");
  const customersEnum = loadEnum(sharedDir, "customers.yaml");
  const versionsEnum = loadEnum(sharedDir, "versions.yaml");

  const allEntries = listFeatureDirs(featuresDir);
  const entries = ctx.featureId
    ? allEntries.filter((e) => e.dirName === ctx.featureId)
    : allEntries;

  for (const entry of entries) {
    const name = entry.dirName;
    const dir = entry.dir;
    const isCjkLabel = CJK_LABEL_RE.test(name);

    if (!SLUG_RE.test(name) && !isCjkLabel) {
      violations.push({
        feature: name,
        rule: "dir_name_invalid",
        message: "Directory name must be a slug or a 【v…】 human label",
      });
      continue;
    }

    const metaPath = join(dir, "metadata.yaml");
    if (!existsSync(metaPath)) {
      violations.push({
        feature: name,
        rule: "metadata_missing",
        message: "metadata.yaml not present",
      });
      continue;
    }

    let meta: Record<string, unknown>;
    try {
      meta = parse(readFileSync(metaPath, "utf-8")) ?? {};
    } catch (err) {
      violations.push({ feature: name, rule: "metadata_unparseable", message: String(err) });
      continue;
    }

    if (!meta.id || typeof meta.id !== "string") {
      violations.push({
        feature: name,
        rule: "metadata_id_missing",
        message: "metadata.yaml has no string id",
      });
    }

    // 迁移完成后不再保留 manifest.json; 残留说明 metadata 未收敛为单版本
    if (existsSync(join(dir, "manifest.json"))) {
      violations.push({
        feature: name,
        rule: "manifest_residual",
        message: "manifest.json still exists; merge it into metadata.yaml",
      });
    }

    // CJK 人类标签目录的机器主键是 metadata.id, 目录名不要求等于 id; slug 目录则要求一致
    if (!isCjkLabel && typeof meta.id === "string" && meta.id !== name) {
      violations.push({
        feature: name,
        rule: "id_dir_mismatch",
        message: `metadata.id="${meta.id}" but dir="${name}"`,
      });
    }

    for (const m of (meta.modules as string[] | undefined) ?? []) {
      if (modulesEnum.length && !modulesEnum.includes(m)) {
        violations.push({
          feature: name,
          rule: "module_not_in_enum",
          message: `Module "${m}" not in _shared/_meta/modules.yaml`,
        });
      }
    }
    for (const c of (meta.customers as string[] | undefined) ?? []) {
      if (customersEnum.length && !customersEnum.includes(c)) {
        violations.push({
          feature: name,
          rule: "customer_not_in_enum",
          message: `Customer "${c}" not in _shared/_meta/customers.yaml`,
        });
      }
    }
    for (const v of (meta.versions as string[] | undefined) ?? []) {
      if (versionsEnum.length && !versionsEnum.includes(v)) {
        violations.push({
          feature: name,
          rule: "version_not_in_enum",
          message: `Version "${v}" not in _shared/_meta/versions.yaml`,
        });
      }
    }
  }

  return { violations };
}
