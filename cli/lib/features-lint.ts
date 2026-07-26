import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { listFeatureDirs, resolveFeatureEntry } from "./features-layout.ts";

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
// 人类标签命名约定: 【v{版本}】[【lanhu/客户】]【{模块}】{描述}; 常驻需求首段为【standing】。
// 目录名只是人类路由把手, 机器主键是 metadata.id(slug)。
const CJK_LABEL_RE = /^【(?:v\d+|standing)】(?:【[^【】]+】){1,3}[^【】]+$/;
// 未确认点必须在写 yaml 前清零,产物里不允许出现「待确认」标记;
// 「等待确认弹窗关闭」等操作步骤里的「待确认」子串不算未确认点
const PENDING_CONFIRM_RE = /(?<!等)待确认/;
// 用例标题：正式 feature 以「验证」开头
const REGULAR_TITLE_RE = /^验证/;
// P0 占比容差带(对应提示词「约 1/4 ~ 1/3」), 仅正式 feature 且用例数达标才查
const P0_MIN_CASES = 8;
const P0_RATIO_MIN = 0.2;
const P0_RATIO_MAX = 0.4;

function loadEnum(sharedRoot: string, file: string): string[] {
  const path = join(sharedRoot, "_meta", file);
  if (!existsSync(path)) return [];
  const parsed = parse(readFileSync(path, "utf-8"));
  return parsed?.enum ?? [];
}

/** 真实环境名取自 config/env/<env>.yaml 文件名(绝不读内容,0600 私密); 无配置时跳过该规则。 */
function loadEnvNames(workspaceRoot: string): string[] {
  const envDir = join(workspaceRoot, "..", "config", "env");
  if (!existsSync(envDir)) return [];
  return (
    readdirSync(envDir)
      .filter(
        (f) => f.endsWith(".yaml") && f !== "example.yaml" && !f.endsWith(".example.yaml"),
      )
      .map((f) => f.replace(/\.yaml$/, ""))
      // 过短的名字误报面太大(如 env 叫 test), 不参与拦截
      .filter((n) => n.length >= 4)
  );
}

interface CaseDoc {
  meta?: { source?: unknown };
  cases?: { id?: unknown; title?: unknown; priority?: unknown }[];
}

function lintMetadataReferences(
  meta: Record<string, unknown>,
  feature: string,
  featureDir: string,
  workspaceRoot: string,
  violations: FeatureLintViolation[],
): void {
  const check = (value: unknown, field: string, baseDir = featureDir): void => {
    if (typeof value !== "string" || value.length === 0) return;
    const target = value.startsWith("workspace/")
      ? join(workspaceRoot, "..", value)
      : join(baseDir, value);
    if (!existsSync(target)) {
      violations.push({
        feature,
        rule: "metadata_reference_missing",
        message: `${field} references missing path: ${value}`,
      });
    }
  };

  const drafting = (meta.case_drafting as Record<string, unknown> | undefined) ?? {};
  check(drafting.archive_path, "case_drafting.archive_path");
  check(drafting.xmind_path, "case_drafting.xmind_path");
  check(drafting.coverage_matrix_path, "case_drafting.coverage_matrix_path");
  for (const source of (drafting.source_refs as Record<string, unknown>[] | undefined) ?? []) {
    check(source.path, "case_drafting.source_refs.path");
  }

  const files = (meta.files as Record<string, unknown> | undefined) ?? {};
  check(files.archive, "files.archive");
  check(files.xmind, "files.xmind");
  check(files.tests_root, "files.tests_root");
  check(files.latest_results, "files.latest_results");

  const automation = (meta.automation as Record<string, unknown> | undefined) ?? {};
  check(automation.last_handoff_path, "automation.last_handoff_path");
  check(automation.latest_results, "automation.latest_results");
  for (const intent of (automation.intents as Record<string, unknown>[] | undefined) ?? []) {
    for (const path of (intent.case_files as unknown[] | undefined) ?? []) {
      check(path, "automation.intents.case_files");
    }
    for (const path of (intent.runner_files as unknown[] | undefined) ?? []) {
      check(path, "automation.intents.runner_files");
    }
  }
}

/** cases/*.yaml 内容规则: 「待确认」标记、文件名、标题格式、P0 占比、真实环境名 */
function lintCaseSources(
  dir: string,
  name: string,
  _zone: string,
  envNames: string[],
  violations: FeatureLintViolation[],
): void {
  const casesDir = join(dir, "cases");
  if (!existsSync(casesDir)) return;
  for (const f of readdirSync(casesDir)) {
    if (!f.endsWith(".yaml")) continue;
    const text = readFileSync(join(casesDir, f), "utf-8");

    if (PENDING_CONFIRM_RE.test(text)) {
      violations.push({
        feature: name,
        rule: "pending_confirmation",
        message: `cases/${f} contains "待确认"; confirm open points before writing cases`,
      });
    }

    if (/[【】]/.test(f)) {
      violations.push({
        feature: name,
        rule: "case_yaml_name",
        message: `cases/${f} 文件名不得含【】前缀; 文件名即需求名`,
      });
    }

    for (const envName of envNames) {
      const escaped = envName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`(^|[^\\p{L}\\p{N}_-])${escaped}([^\\p{L}\\p{N}_-]|$)`, "u").test(text)) {
        violations.push({
          feature: name,
          rule: "real_env_name",
          message: `cases/${f} 出现真实环境名 "${envName}"; 环境名一律占位(\${DataSourceA} 等)`,
        });
      }
    }

    let doc: CaseDoc;
    try {
      doc = (parse(text) as CaseDoc | null) ?? {};
    } catch {
      continue; // 结构问题由 kata cases build 校验, lint 不重复报
    }
    const cases = Array.isArray(doc.cases) ? doc.cases : [];

    for (const [i, c] of cases.entries()) {
      if (typeof c.title !== "string") continue;
      const ok = REGULAR_TITLE_RE.test(c.title);
      if (!ok) {
        violations.push({
          feature: name,
          rule: "case_title_format",
          message: `cases/${f} 第 ${i + 1} 条标题须以「验证」开头: "${c.title}"`,
        });
      }
    }

    if (cases.length >= P0_MIN_CASES) {
      const p0 = cases.filter((c) => c.priority === "P0").length;
      const ratio = p0 / cases.length;
      if (ratio < P0_RATIO_MIN || ratio > P0_RATIO_MAX) {
        violations.push({
          feature: name,
          rule: "p0_ratio",
          message: `cases/${f} P0 占比 ${p0}/${cases.length} (${Math.round(ratio * 100)}%) 超出 [20%,40%]; P0 只给主流程与核心功能`,
        });
      }
    }
  }
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
  const envNames = loadEnvNames(ctx.workspaceRoot);

  const allEntries = listFeatureDirs(featuresDir);
  const entries = ctx.featureId ? [resolveFeatureEntry(featuresDir, ctx.featureId)] : allEntries;

  for (const entry of entries) {
    const name = entry.dirName;
    const dir = entry.dir;

    lintCaseSources(dir, name, entry.zone, envNames, violations);

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

    lintMetadataReferences(meta, name, dir, ctx.workspaceRoot, violations);
  }

  return { violations };
}
