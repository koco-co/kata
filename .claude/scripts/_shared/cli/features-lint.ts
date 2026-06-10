import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listFeatureDirs } from "@shared/lib/features/layout.ts";
import {
  loadFeatureManifestValidator,
  loadFeatureMetadataV2Validator,
  loadFeatureMetadataValidator,
} from "@shared/schemas/loaders.ts";
import { parse } from "yaml";

export interface FeaturesLintContext {
  project: string;
  workspaceRoot: string;
  featureId?: string;
}

export interface Violation {
  feature: string;
  rule: string;
  message: string;
}

const SLUG_RE = /^\d{4}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
// 人类标签命名约定: 【v{版本}】[【lanhu/客户】]【{模块}】{描述}。dataAssets 历史目录用此中文约定,
// 目录名只是人类路由把手, 机器主键是 manifest.feature_id(slug)。文法须与 FeatureMetadata.v1#id
// 的 CJK 分支保持一致(见 schemas/FeatureMetadata.v1.schema.json 与 rules/naming-convention.md)。
const CJK_LABEL_RE = /^【v\d+】(?:【[^【】]+】){1,3}[^【】]+$/;

function loadEnum(sharedRoot: string, file: string): string[] {
  const path = join(sharedRoot, "_meta", file);
  if (!existsSync(path)) return [];
  const parsed = parse(readFileSync(path, "utf-8"));
  return parsed?.enum ?? [];
}

export async function runFeaturesLint(
  ctx: FeaturesLintContext,
): Promise<{ violations: Violation[] }> {
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const sharedDir = join(ctx.workspaceRoot, ctx.project, "_shared");
  const violations: Violation[] = [];
  if (!existsSync(featuresDir)) return { violations };

  const modulesEnum = loadEnum(sharedDir, "modules.yaml");
  const customersEnum = loadEnum(sharedDir, "customers.yaml");
  const versionsEnum = loadEnum(sharedDir, "versions.yaml");

  const metaV1Validator = loadFeatureMetadataValidator();
  const metaV2Validator = loadFeatureMetadataV2Validator();
  const manifestValidator = loadFeatureManifestValidator();

  // listFeatureDirs 扫描两层结构；legacy-flat 也会被收录
  const allEntries = listFeatureDirs(featuresDir);

  // 如果指定了 featureId，只检查该目录名（跨所有 group 查找）
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
        message: `Directory name must be a slug (^\\d{4}-\\d{2}-[a-z0-9-]+$) or a 【v…】 human label`,
      });
      continue;
    }

    const metaPath = join(dir, "metadata.yaml");
    const manifestPath = join(dir, "manifest.json");

    if (!existsSync(metaPath)) {
      violations.push({
        feature: name,
        rule: "metadata_missing",
        message: "metadata.yaml not present",
      });
      continue;
    }

    const meta = parse(readFileSync(metaPath, "utf-8"));
    const isV2 = meta?.schema === "FeatureMetadata@2";

    if (isV2) {
      // ── FeatureMetadata@2 路径 ────────────────────────────────────────────
      const metaValid = metaV2Validator(meta);
      if (!metaValid) {
        violations.push({
          feature: name,
          rule: "metadata_schema_invalid",
          message: JSON.stringify(metaV2Validator.errors),
        });
      }

      // @2 不再要求 manifest.json；manifest.json 残留说明合并不完整
      if (existsSync(manifestPath)) {
        violations.push({
          feature: name,
          rule: "manifest_residual",
          message: "manifest.json still exists alongside FeatureMetadata@2; migration incomplete",
        });
      }
    } else {
      // ── FeatureMetadata@1 路径（含 legacy-flat）────────────────────────────
      const metaValid = metaV1Validator(meta);
      if (!metaValid) {
        violations.push({
          feature: name,
          rule: "metadata_schema_invalid",
          message: JSON.stringify(metaV1Validator.errors),
        });
      }

      // @1 仍要求 manifest.json 存在
      if (!existsSync(manifestPath)) {
        violations.push({
          feature: name,
          rule: "manifest_missing",
          message: "manifest.json not present",
        });
      }
    }

    // CJK 人类标签目录的机器主键是 manifest.feature_id(slug), 目录名不要求等于 metadata.id。
    if (!isCjkLabel && meta.id !== name) {
      violations.push({
        feature: name,
        rule: "id_dir_mismatch",
        message: `metadata.id="${meta.id}" but dir="${name}"`,
      });
    }

    for (const m of meta.modules ?? []) {
      if (modulesEnum.length && !modulesEnum.includes(m)) {
        violations.push({
          feature: name,
          rule: "module_not_in_enum",
          message: `Module "${m}" not in _shared/_meta/modules.yaml`,
        });
      }
    }
    for (const c of meta.customers ?? []) {
      if (customersEnum.length && !customersEnum.includes(c)) {
        violations.push({
          feature: name,
          rule: "customer_not_in_enum",
          message: `Customer "${c}" not in _shared/_meta/customers.yaml`,
        });
      }
    }
    for (const v of meta.versions ?? []) {
      if (versionsEnum.length && !versionsEnum.includes(v)) {
        violations.push({
          feature: name,
          rule: "version_not_in_enum",
          message: `Version "${v}" not in _shared/_meta/versions.yaml`,
        });
      }
    }

    // @1: 对 manifest.json 做进一步校验
    if (!isV2 && existsSync(manifestPath)) {
      const manifest: Record<string, unknown> = JSON.parse(readFileSync(manifestPath, "utf-8"));
      if (!manifestValidator(manifest)) {
        violations.push({
          feature: name,
          rule: "manifest_schema_invalid",
          message: JSON.stringify(manifestValidator.errors),
        });
      } else {
        if (!isCjkLabel && manifest.feature_id !== name) {
          violations.push({
            feature: name,
            rule: "manifest_id_mismatch",
            message: `manifest.feature_id="${manifest.feature_id}" but dir="${name}"`,
          });
        }
        const caseDrafting = manifest.case_drafting as
          | { status?: string; archive_path?: string | null }
          | undefined;
        if (caseDrafting?.status === "completed") {
          const archiveRel = caseDrafting.archive_path;
          if (!archiveRel) {
            violations.push({
              feature: name,
              rule: "case_drafting_archive_missing",
              message: "case_drafting.status=completed requires archive_path",
            });
          } else if (!existsSync(join(dir, archiveRel))) {
            violations.push({
              feature: name,
              rule: "case_drafting_archive_unresolved",
              message: `archive_path="${archiveRel}" does not exist on disk`,
            });
          }
        }
        const automation = manifest.automation as
          | { status?: string; intents?: Array<{ automation_status?: string }> }
          | undefined;
        if (automation?.status === "ready") {
          const ready = (automation.intents ?? []).some(
            (intent) => intent.automation_status === "ready",
          );
          if (!ready) {
            violations.push({
              feature: name,
              rule: "automation_ready_without_ready_intent",
              message:
                "automation.status=ready requires at least one intent with automation_status=ready",
            });
          }
        }
      }
    }
  }

  return { violations };
}
