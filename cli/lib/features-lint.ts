import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parse } from "yaml";
import {
  type CasesLintConfig,
  lintCaseContent,
  lintCaseYamlSource,
  loadCasesLintConfig,
  resolveCaseCustomer,
} from "./cases/content-lint.ts";
import { parseCaseExportName } from "./cases/formats.ts";
import { parseCasesYaml, validateCases } from "./cases/parse.ts";
import { environmentsDir } from "./config-paths.ts";
import {
  featureRelativePath,
  LEGACY_LABEL_DIR_RE,
  listFeatureDirs,
  parseFeatureDirName,
  resolveFeatureEntry,
} from "./features-layout.ts";
import { assertCaseDigestChain, lintPrdFeature } from "./prd.ts";
import { locateProjectRoot } from "./workspace-locator.ts";

export interface FeaturesLintContext {
  project: string;
  workspaceRoot: string;
  /** Kata repository root; may differ from an externally redirected workspace. */
  repoRoot?: string;
  featurePath?: string;
}

export interface FeatureLintViolation {
  feature: string;
  rule: string;
  message: string;
  /** 可定位到具体用例时填稳定 case_id，如 C0359。 */
  case_id?: string;
  /** 与 case_id 对应的用例标题，便于 TUI/CLI 展示上下文。 */
  case_title?: string;
}

// 未确认点必须在写 yaml 前清零，产物里不允许出现「待确认」标记；
// 「等待确认弹窗关闭」等操作步骤里的「待确认」子串不算未确认点。
const PENDING_CONFIRM_RE = /(?<!等)待确认/;
const P0_MIN_CASES = 8;
const P0_RATIO_MIN = 0.2;
const P0_RATIO_MAX = 0.3;

export function p0RatioViolation(
  cases: Array<{ priority?: unknown }>,
  filename: string,
): { rule: "p0_ratio"; message: string } | undefined {
  if (cases.length < P0_MIN_CASES) return undefined;
  const p0 = cases.filter((item) => item.priority === "P0").length;
  const ratio = p0 / cases.length;
  if (ratio < P0_RATIO_MIN || ratio > P0_RATIO_MAX) {
    return {
      rule: "p0_ratio",
      message: `cases/${filename} P0 占比 ${p0}/${cases.length} (${Math.round(ratio * 100)}%) 超出 [20%,30%]`,
    };
  }
  return undefined;
}

function loadEnum(sharedRoot: string, file: string): string[] {
  const path = join(sharedRoot, "_meta", file);
  if (!existsSync(path)) return [];
  const parsed = parse(readFileSync(path, "utf-8")) as { enum?: unknown } | null;
  return Array.isArray(parsed?.enum)
    ? parsed.enum.filter((value): value is string => typeof value === "string")
    : [];
}

/** 真实环境名取自 config/private/environments/<env>.yaml 文件名（绝不读内容，0600 私密）；无配置时跳过。 */
function loadEnvNames(repoRoot: string | undefined, workspaceRoot: string): string[] {
  const envDir = environmentsDir(repoRoot ?? dirname(workspaceRoot));
  if (!existsSync(envDir)) return [];
  return readdirSync(envDir)
    .filter((f) => f.endsWith(".yaml") && f !== "example.yaml" && !f.endsWith(".example.yaml"))
    .map((f) => f.replace(/\.yaml$/, ""))
    .filter((name) => name.length >= 4);
}

interface CaseDoc {
  meta?: {
    imports?: unknown;
    feature_id?: unknown;
    version?: unknown;
    test_points_digest?: unknown;
    automation_env?: unknown;
  };
  cases?: { title?: unknown; priority?: unknown }[];
}

/** Cases source checks independent of the retired feature metadata. */
function lintCaseSources(
  dir: string,
  feature: string,
  zone: string,
  envNames: string[],
  contentConfig: CasesLintConfig,
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

    let doc: CaseDoc;
    try {
      doc = (parse(text) as CaseDoc | null) ?? {};
    } catch (error) {
      violations.push({
        feature,
        rule: "case_yaml_parse",
        message: `cases/${filename} 不是合法 YAML: ${(error as Error).message.split("\n")[0]}; 修复源文件后重新 lint`,
      });
      continue;
    }
    for (const envName of envNames) {
      const escaped = envName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      let scanText = text;
      if (doc.meta?.automation_env === envName) {
        scanText = scanText.replace(
          new RegExp(`(^|\\s)automation_env:\\s*["']?${escaped}["']?`, "u"),
          " ",
        );
      }
      if (new RegExp(`(^|[^\\p{L}\\p{N}_-])${escaped}([^\\p{L}\\p{N}_-]|$)`, "u").test(scanText)) {
        violations.push({
          feature,
          rule: "real_env_name",
          message: `cases/${filename} 出现真实环境名 "${envName}"; 环境名一律占位（\${DataSourceA} 等）`,
        });
      }
    }
    if (doc.meta?.version !== undefined) {
      violations.push({
        feature,
        rule: "case_version_retired",
        message: `cases/${filename} 不得保存 meta.version；由父级版本目录推导`,
      });
    }
    if (Array.isArray(doc.meta?.imports)) {
      for (const value of doc.meta.imports) {
        if (typeof value !== "string") continue;
        const parsedImport = parseCaseExportName(value);
        if (!parsedImport) continue;
        if (!existsSync(join(casesDir, "imports", parsedImport.name))) {
          violations.push({
            feature,
            rule: "case_import_missing",
            message: `cases/${filename} 声明的历史输入不存在: cases/imports/${parsedImport.name}`,
          });
        }
      }
    }
    if (!subjective) continue;
    try {
      for (const violation of lintCaseYamlSource(text)) {
        violations.push({
          feature,
          rule: violation.rule,
          message: violation.message,
          ...(violation.case_id ? { case_id: violation.case_id } : {}),
          ...(violation.case_title ? { case_title: violation.case_title } : {}),
        });
      }
      const authored = parseCasesYaml(text);
      for (const problem of validateCases(authored)) {
        const caseId = problem.match(/^用例\s+(C\d+)\s/)?.[1];
        violations.push({
          feature,
          rule: "case_validate",
          message: problem,
          ...(caseId ? { case_id: caseId } : {}),
        });
      }
      for (const violation of lintCaseContent(authored, contentConfig, resolveCaseCustomer(dir))) {
        violations.push({
          feature,
          rule: violation.rule,
          message: violation.message,
          ...(violation.case_id ? { case_id: violation.case_id } : {}),
          ...(violation.case_title ? { case_title: violation.case_title } : {}),
        });
      }
    } catch (error) {
      // parseCasesYaml 已确认合法；此处的异常是 parse 与 lint 的内部缺陷，不应静默吞掉
      violations.push({
        feature,
        rule: "case_parse_internal",
        message: `cases/${filename} 解析内部错误: ${(error as Error).message}`,
      });
    }
    const cases = Array.isArray(doc.cases) ? doc.cases : [];
    const historicalImport =
      Array.isArray(doc.meta?.imports) &&
      doc.meta.imports.some((value) => typeof value === "string");
    if (!historicalImport) {
      const p0 = p0RatioViolation(cases, filename);
      if (p0) violations.push({ feature, ...p0 });
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
  const envNames = loadEnvNames(ctx.repoRoot, ctx.workspaceRoot);
  const contentConfig = loadCasesLintConfig(ctx.repoRoot ?? locateProjectRoot());
  const allEntries = listFeatureDirs(featuresDir);
  const entries = ctx.featurePath
    ? [resolveFeatureEntry(featuresDir, ctx.featurePath)]
    : allEntries;

  for (const entry of entries) {
    const feature = featureRelativePath(featuresDir, entry);
    lintCaseSources(entry.dir, feature, entry.zone, envNames, contentConfig, violations);
    for (const legacy of ["prd.md", "requirement-notes.md", "test-points.md"]) {
      if (existsSync(join(entry.dir, legacy))) {
        violations.push({
          feature,
          rule: "legacy_requirement_authority",
          message: `${legacy} 不得位于 feature 根；运行 kata prd migrate`,
        });
      }
    }
    if (existsSync(join(entry.dir, "prd", "prd.md"))) {
      const prdReport = lintPrdFeature(entry.dir);
      for (const item of prdReport.errors) {
        violations.push({
          feature,
          rule: `prd_${item.rule}`,
          message: item.message,
        });
      }
      const casesDir = join(entry.dir, "cases");
      const yamlName = existsSync(casesDir)
        ? readdirSync(casesDir).find((name) => name.endsWith(".yaml"))
        : undefined;
      let testPointsDigest: string | undefined;
      if (yamlName) {
        try {
          const doc = parse(readFileSync(join(casesDir, yamlName), "utf8")) as CaseDoc | null;
          if (typeof doc?.meta?.test_points_digest === "string") {
            testPointsDigest = doc.meta.test_points_digest;
          }
        } catch {
          // YAML syntax is reported by cases build; digest chain will still be stale.
        }
      }
      try {
        let sourceRefs: Array<string | undefined> = [];
        if (yamlName) {
          try {
            const doc = parse(readFileSync(join(casesDir, yamlName), "utf8")) as {
              cases?: Array<{ source_ref?: unknown }>;
            };
            sourceRefs = (doc.cases ?? []).map((item) =>
              typeof item.source_ref === "string" ? item.source_ref : undefined,
            );
          } catch {
            // Build reports malformed YAML.
          }
        }
        assertCaseDigestChain(entry.dir, testPointsDigest, sourceRefs);
      } catch (error) {
        violations.push({
          feature,
          rule: "case_digest_chain",
          message: (error as Error).message,
        });
      }
    }
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
