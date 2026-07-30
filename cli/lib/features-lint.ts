import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import {
  featureRelativePath,
  LEGACY_LABEL_DIR_RE,
  listFeatureDirs,
  parseFeatureDirName,
  resolveFeatureEntry,
} from "./features-layout.ts";

export interface FeaturesLintContext {
  project: string;
  workspaceRoot: string;
  featurePath?: string;
}

export interface FeatureLintViolation {
  feature: string;
  rule: string;
  message: string;
}

// 未确认点必须在写 yaml 前清零，产物里不允许出现「待确认」标记；
// 「等待确认弹窗关闭」等操作步骤里的「待确认」子串不算未确认点。
const PENDING_CONFIRM_RE = /(?<!等)待确认/;
const REGULAR_TITLE_RE = /^验证/;
const P0_MIN_CASES = 8;
const P0_RATIO_MIN = 0.2;
const P0_RATIO_MAX = 0.4;

function loadEnum(sharedRoot: string, file: string): string[] {
  const path = join(sharedRoot, "_meta", file);
  if (!existsSync(path)) return [];
  const parsed = parse(readFileSync(path, "utf-8")) as { enum?: unknown } | null;
  return Array.isArray(parsed?.enum)
    ? parsed.enum.filter((value): value is string => typeof value === "string")
    : [];
}

/** 真实环境名取自 config/env/<env>.yaml 文件名（绝不读内容，0600 私密）；无配置时跳过。 */
function loadEnvNames(workspaceRoot: string): string[] {
  const envDir = join(workspaceRoot, "..", "config", "env");
  if (!existsSync(envDir)) return [];
  return readdirSync(envDir)
    .filter((f) => f.endsWith(".yaml") && f !== "example.yaml" && !f.endsWith(".example.yaml"))
    .map((f) => f.replace(/\.yaml$/, ""))
    .filter((name) => name.length >= 4);
}

interface CaseDoc {
  meta?: { imports?: unknown; feature_id?: unknown; version?: unknown };
  cases?: { title?: unknown; priority?: unknown }[];
}

/** Cases source checks independent of the retired feature metadata. */
function lintCaseSources(
  dir: string,
  feature: string,
  zone: string,
  envNames: string[],
  violations: FeatureLintViolation[],
): void {
  const casesDir = join(dir, "cases");
  if (!existsSync(casesDir)) return;
  const subjective = zone === "active";
  for (const filename of readdirSync(casesDir)) {
    if (!filename.endsWith(".yaml")) continue;
    const text = readFileSync(join(casesDir, filename), "utf-8");
    if (PENDING_CONFIRM_RE.test(text)) {
      violations.push({
        feature,
        rule: "pending_confirmation",
        message: `cases/${filename} contains "待确认"; confirm open points before writing cases`,
      });
    }
    if (/[【】]/.test(filename)) {
      violations.push({
        feature,
        rule: "case_yaml_name",
        message: `cases/${filename} 文件名不得含【】前缀; 文件名即用例集名称`,
      });
    }
    for (const envName of envNames) {
      const escaped = envName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`(^|[^\\p{L}\\p{N}_-])${escaped}([^\\p{L}\\p{N}_-]|$)`, "u").test(text)) {
        violations.push({
          feature,
          rule: "real_env_name",
          message: `cases/${filename} 出现真实环境名 "${envName}"; 环境名一律占位（\${DataSourceA} 等）`,
        });
      }
    }

    let doc: CaseDoc;
    try {
      doc = (parse(text) as CaseDoc | null) ?? {};
    } catch {
      continue; // syntax errors are reported by cases build
    }
    if (doc.meta?.feature_id !== undefined) {
      violations.push({
        feature,
        rule: "case_feature_id_retired",
        message: `cases/${filename} 不得保存 meta.feature_id；由所在 feature 路径推导`,
      });
    }
    if (doc.meta?.version !== undefined) {
      violations.push({
        feature,
        rule: "case_version_retired",
        message: `cases/${filename} 不得保存 meta.version；由父级版本目录推导`,
      });
    }
    if (!subjective) continue;
    const cases = Array.isArray(doc.cases) ? doc.cases : [];
    for (const [index, item] of cases.entries()) {
      if (typeof item.title === "string" && !REGULAR_TITLE_RE.test(item.title)) {
        violations.push({
          feature,
          rule: "case_title_format",
          message: `cases/${filename} 第 ${index + 1} 条标题须以「验证」开头: "${item.title}"`,
        });
      }
    }
    const historicalImport =
      Array.isArray(doc.meta?.imports) &&
      doc.meta.imports.some((value) => typeof value === "string");
    if (cases.length >= P0_MIN_CASES && !historicalImport) {
      const p0 = cases.filter((item) => item.priority === "P0").length;
      const ratio = p0 / cases.length;
      if (ratio < P0_RATIO_MIN || ratio > P0_RATIO_MAX) {
        violations.push({
          feature,
          rule: "p0_ratio",
          message: `cases/${filename} P0 占比 ${p0}/${cases.length} (${Math.round(ratio * 100)}%) 超出 [20%,40%]`,
        });
      }
    }
  }
}

/** Lint every current feature directory under a project. */
export function runFeaturesLint(ctx: FeaturesLintContext): { violations: FeatureLintViolation[] } {
  const featuresDir = join(ctx.workspaceRoot, ctx.project, "features");
  const sharedDir = join(ctx.workspaceRoot, ctx.project, "_shared");
  const violations: FeatureLintViolation[] = [];
  if (!existsSync(featuresDir)) return { violations };

  const modulesEnum = loadEnum(sharedDir, "modules.yaml");
  const customersEnum = loadEnum(sharedDir, "customers.yaml");
  const envNames = loadEnvNames(ctx.workspaceRoot);
  const allEntries = listFeatureDirs(featuresDir);
  const entries = ctx.featurePath
    ? [resolveFeatureEntry(featuresDir, ctx.featurePath)]
    : allEntries;

  for (const entry of entries) {
    const feature = featureRelativePath(featuresDir, entry);
    lintCaseSources(entry.dir, feature, entry.zone, envNames, violations);
    const parsed = parseFeatureDirName(entry.dirName);
    if (!parsed) {
      violations.push({
        feature,
        rule: LEGACY_LABEL_DIR_RE.test(entry.dirName) ? "legacy_version_label" : "dir_name_invalid",
        message: LEGACY_LABEL_DIR_RE.test(entry.dirName)
          ? "需求目录不得重复保存【vXXX】；版本只由父目录表达"
          : "需求目录必须匹配 [【顶层需求ID】][【客户】]【模块】需求名称",
      });
      continue;
    }
    if (entry.zone === "legacy-flat") {
      violations.push({
        feature,
        rule: "legacy_flat_feature",
        message: "需求必须位于版本目录、_standing 或 _archived/<version> 下",
      });
    }
    if (existsSync(join(entry.dir, "metadata.yaml"))) {
      violations.push({
        feature,
        rule: "feature_metadata_retired",
        message: "metadata.yaml 已退役；feature 身份完全由目录路径表达",
      });
    }
    if (existsSync(join(entry.dir, "manifest.json"))) {
      violations.push({
        feature,
        rule: "manifest_residual",
        message: "manifest.json 已退役；不得保留 feature 身份副本",
      });
    }
    if (modulesEnum.length > 0 && !modulesEnum.includes(parsed.module)) {
      violations.push({
        feature,
        rule: "module_not_in_enum",
        message: `模块 "${parsed.module}" 不在 _shared/_meta/modules.yaml`,
      });
    }
    if (parsed.customer && customersEnum.length > 0 && !customersEnum.includes(parsed.customer)) {
      violations.push({
        feature,
        rule: "customer_not_in_enum",
        message: `客户 "${parsed.customer}" 不在 _shared/_meta/customers.yaml`,
      });
    }
  }
  return { violations };
}
