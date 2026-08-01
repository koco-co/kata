import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import {
  buildFeatureDirName,
  featureIdentity,
  listFeatureDirs,
  parseFeatureDirName,
  resolveFeatureEntry,
  runsDir,
  STANDING_DIR,
  VERSION_DIR_RE,
} from "../lib/features-layout.ts";
import { assertWritable } from "../lib/path-policy.ts";
import { RUN_ID_RE } from "../lib/run-id.ts";
import { locateProject } from "../lib/workspace-locator.ts";

export interface FeaturesResolveResult {
  project: string;
  featureDir: string;
  feature_key: string;
  relative_path: string;
  dirName: string;
  zone: "active" | "standing";
  created: boolean;
}

/** Normalize a feature version to the two-level directory name (v6.4.11). */
function normalizeVersionDir(version: string): string {
  const value = version.startsWith("v") ? version : `v${version}`;
  if (!VERSION_DIR_RE.test(value)) {
    throw new Error(`非法版本号 "${version}"：需匹配 vX.Y 或 vX.Y.Z（如 v6.4.11）`);
  }
  return value;
}

function normalizeRequirementId(requirementId?: string): string | undefined {
  if (requirementId === undefined) return undefined;
  const normalized = requirementId.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`非法需求 ID "${requirementId}"：必须是数字编号`);
  }
  return normalized;
}

/** Resolve (and create when absent) a canonical, metadata-free feature directory. */
export function runFeaturesResolve(opts: {
  project: string;
  module: string;
  description: string;
  customer?: string;
  featureVersion?: string;
  standing?: boolean;
  requirementId?: string;
  root?: string;
}): FeaturesResolveResult {
  if (opts.featureVersion && opts.standing) {
    throw new Error("--feature-version 与 --standing 互斥，只传一个");
  }
  if (!opts.featureVersion && !opts.standing) {
    throw new Error(
      "缺 --feature-version：版本类需求必须显式传版本号；确为常驻需求时传 --standing",
    );
  }
  const paths = locateProject(opts.project, opts.root);
  const versionDir = opts.featureVersion ? normalizeVersionDir(opts.featureVersion) : STANDING_DIR;
  const dirName = buildFeatureDirName({
    module: opts.module,
    description: opts.description,
    customer: opts.customer,
    requirementId: normalizeRequirementId(opts.requirementId),
  });
  const featureDir = join(paths.featuresDir, versionDir, dirName);
  assertWritable(paths, featureDir);
  const created = !existsSync(featureDir);
  if (created) mkdirSync(featureDir, { recursive: true });

  const entry = resolveFeatureEntry(paths.featuresDir, `${versionDir}/${dirName}`);
  const identity = featureIdentity(opts.project, paths.featuresDir, entry);
  return {
    project: opts.project,
    featureDir,
    feature_key: identity.featureKey,
    relative_path: identity.relativePath,
    dirName,
    zone: versionDir === STANDING_DIR ? "standing" : "active",
    created,
  };
}

export interface FeatureRow {
  feature_key: string;
  relative_path: string;
  dir_name: string;
  zone: string;
  version: string;
  requirement_id?: string;
  customer?: string;
  module: string;
  title: string;
  last_run_status: string;
  areas: { cases: boolean; automation: boolean; runs: boolean };
}

/** Read the latest canonical run status directly from runs/<run-id>/status.json. */
function latestRunStatus(featureDir: string): string {
  const dir = runsDir(featureDir);
  if (!existsSync(dir)) return "not-run";
  const latest = readdirSync(dir)
    .filter((name) => RUN_ID_RE.test(name) && lstatSync(join(dir, name)).isDirectory())
    .sort()
    .at(-1);
  if (!latest) return "not-run";
  const statusPath = join(dir, latest, "status.json");
  if (!existsSync(statusPath)) return "missing";
  try {
    const status = JSON.parse(readFileSync(statusPath, "utf8")) as { status?: unknown };
    return typeof status.status === "string" ? status.status : "invalid";
  } catch {
    return "invalid";
  }
}

/** List feature rows under a project, deriving every identity field from its path. */
export function runFeaturesList(opts: {
  project: string;
  root?: string;
  module?: string;
  customer?: string;
  version?: string;
  lastRun?: string;
}): FeatureRow[] {
  const paths = locateProject(opts.project, opts.root);
  const rows = listFeatureDirs(paths.featuresDir).flatMap((entry) => {
    const parsed = parseFeatureDirName(entry.dirName);
    if (!parsed) return [];
    const identity = featureIdentity(opts.project, paths.featuresDir, entry);
    return [
      {
        feature_key: identity.featureKey,
        relative_path: identity.relativePath,
        dir_name: entry.dirName,
        zone: entry.zone,
        version: identity.version,
        ...(identity.requirementId ? { requirement_id: identity.requirementId } : {}),
        ...(identity.customer ? { customer: identity.customer } : {}),
        module: identity.module,
        title: identity.title,
        last_run_status: latestRunStatus(entry.dir),
        areas: {
          cases: existsSync(join(entry.dir, "cases")),
          automation: existsSync(join(entry.dir, "automation")),
          runs: existsSync(join(entry.dir, "runs")),
        },
      },
    ];
  });
  const filtered = rows.filter((row) => {
    if (opts.module && row.module !== opts.module) return false;
    if (opts.customer && row.customer !== opts.customer) return false;
    if (opts.version && row.version !== opts.version) return false;
    if (opts.lastRun && row.last_run_status !== opts.lastRun) return false;
    return true;
  });
  filtered.sort((a, b) => a.feature_key.localeCompare(b.feature_key));
  return filtered;
}

/** Show one feature's path-derived identity and five most recent canonical run dirs. */
export function runFeaturesShow(opts: { project: string; featurePath: string; root?: string }) {
  const paths = locateProject(opts.project, opts.root);
  const entry = resolveFeatureEntry(paths.featuresDir, opts.featurePath);
  const identity = featureIdentity(opts.project, paths.featuresDir, entry);
  const rd = runsDir(entry.dir);
  const recentRuns = existsSync(rd)
    ? readdirSync(rd)
        .filter((name) => RUN_ID_RE.test(name) && lstatSync(join(rd, name)).isDirectory())
        .sort()
        .reverse()
        .slice(0, 5)
    : [];
  return {
    dir: entry.dir,
    feature_key: identity.featureKey,
    relative_path: identity.relativePath,
    version: identity.version,
    ...(identity.requirementId ? { requirement_id: identity.requirementId } : {}),
    ...(identity.customer ? { customer: identity.customer } : {}),
    module: identity.module,
    title: identity.title,
    last_run_status: latestRunStatus(entry.dir),
    recent_runs: recentRuns,
  };
}

/** Register the features noun (resolve/list/show) on the program. */
export function registerFeatures(program: Command): void {
  const features = program.command("features").description("需求功能目录操作");

  features
    .command("resolve")
    .description("按路径标签协议定位（不存在则创建）需求功能目录")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--module <module>", "模块名（进入【模块】段）")
    .requiredOption("--description <text>", "需求名（目录尾段）")
    .option("--customer <customer>", "客户名（可选，【客户】段）")
    .option("--feature-version <version>", "迭代版本 vX.Y.Z（与 --standing 二选一，必传其一）")
    .option("--standing", "常驻需求（落 features/_standing/），与 --feature-version 互斥", false)
    .option("--requirement-id <id>", "确认属于顶层需求的真实编号（可选）")
    .option("--json", "以 JSON 输出结果", false)
    .action(
      (opts: {
        project: string;
        module: string;
        description: string;
        customer?: string;
        featureVersion?: string;
        standing?: boolean;
        requirementId?: string;
        json: boolean;
      }) => {
        const result = runFeaturesResolve({
          project: opts.project,
          module: opts.module,
          description: opts.description,
          customer: opts.customer,
          featureVersion: opts.featureVersion,
          standing: opts.standing,
          requirementId: opts.requirementId,
        });
        if (opts.json) {
          process.stdout.write(`${JSON.stringify(result)}\n`);
          return;
        }
        console.log(`featureDir: ${result.featureDir}`);
        console.log(`feature_key: ${result.feature_key}${result.created ? "（新建）" : ""}`);
      },
    );

  features
    .command("list")
    .description("列出项目下的需求功能")
    .requiredOption("--project <name>", "项目名")
    .option("--module <module>", "按模块过滤")
    .option("--customer <customer>", "按客户过滤")
    .option("--version <version>", "按版本过滤")
    .option("--json", "以 JSON 输出结果", false)
    .action(
      (opts: {
        project: string;
        module?: string;
        customer?: string;
        version?: string;
        json: boolean;
      }) => {
        const rows = runFeaturesList(opts);
        if (opts.json) {
          process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
          return;
        }
        for (const row of rows) console.log(`${row.feature_key}\t${row.last_run_status}`);
        console.log(`\n共 ${rows.length} 个需求功能`);
      },
    );

  features
    .command("show <feature-path>")
    .description("查看单个需求功能的路径身份与最近运行")
    .requiredOption("--project <name>", "项目名")
    .option("--json", "以 JSON 输出结果", false)
    .action((featurePath: string, opts: { project: string; json: boolean }) => {
      const result = runFeaturesShow({ project: opts.project, featurePath });
      if (opts.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      console.log(`目录: ${result.dir}`);
      console.log(`feature_key: ${result.feature_key}`);
      console.log(`模块: ${result.module}`);
      console.log(`客户: ${result.customer ?? "-"}`);
      console.log(`顶层需求: ${result.requirement_id ?? "-"}`);
      console.log(`版本: ${result.version}`);
      console.log(`最近运行状态: ${result.last_run_status}`);
      console.log(
        `最近运行: ${result.recent_runs.length > 0 ? result.recent_runs.join(", ") : "(无)"}`,
      );
    });
}
