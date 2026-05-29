import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { loadFeatureManifestValidator, loadFeatureMetadataValidator } from "@shared/schemas/loaders.ts";

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

  const metaValidator = loadFeatureMetadataValidator();
  const manifestValidator = loadFeatureManifestValidator();

  const names = ctx.featureId ? [ctx.featureId] : readdirSync(featuresDir);
  for (const name of names) {
    const dir = join(featuresDir, name);
    if (name === "INDEX.md" || !existsSync(dir) || !statSync(dir).isDirectory()) continue;

    if (!SLUG_RE.test(name)) {
      violations.push({
        feature: name,
        rule: "dir_name_invalid",
        message: `Directory name does not match ^\\d{4}-\\d{2}-[a-z0-9-]+$`,
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
    if (!existsSync(manifestPath)) {
      violations.push({
        feature: name,
        rule: "manifest_missing",
        message: "manifest.json not present",
      });
    }

    const meta = parse(readFileSync(metaPath, "utf-8"));
    const metaValid = metaValidator(meta);
    if (!metaValid) {
      violations.push({
        feature: name,
        rule: "metadata_schema_invalid",
        message: JSON.stringify(metaValidator.errors),
      });
    }

    if (meta.id !== name) {
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

    if (existsSync(manifestPath)) {
      const manifest: Record<string, unknown> = JSON.parse(readFileSync(manifestPath, "utf-8"));
      if (!manifestValidator(manifest)) {
        violations.push({
          feature: name,
          rule: "manifest_schema_invalid",
          message: JSON.stringify(manifestValidator.errors),
        });
      } else {
        if (manifest.feature_id !== name) {
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
