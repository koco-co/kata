import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import { stringify } from "yaml";
import { writeFileAtomic } from "../lib/atomic-writer.ts";
import { type FeatureMeta, readFeatureMeta } from "../lib/feature-meta.ts";
import {
  LABEL_DIR_RE,
  listFeatureDirs,
  resolveFeatureEntry,
  runsDir,
  STANDING_DIR,
  VERSION_DIR_RE,
} from "../lib/features-layout.ts";
import { sanitizeSlug } from "../lib/slug.ts";
import { locateProject } from "../lib/workspace-locator.ts";

// ─── resolve: 中文标签目录协议 ───

export interface FeaturesResolveResult {
  project: string;
  featureDir: string;
  featureId: string;
  dirName: string;
  zone: string;
  created: boolean;
}

/** Normalize a feature version to the two-level dir name (v6.4.11); returns undefined for standing. */
function normalizeVersionDir(version: string): string {
  const v = version.startsWith("v") ? version : `v${version}`;
  if (!VERSION_DIR_RE.test(v)) {
    throw new Error(`非法版本号 "${version}"：需匹配 vX.Y 或 vX.Y.Z（如 v6.4.11）`);
  }
  return v;
}

/** Build the CJK human label dir name: 【v{compact}】[【lanhu】][【客户】]【模块】{描述}; standing uses 【standing】. */
export function buildLabelDirName(opts: {
  featureVersion: string;
  module: string;
  description: string;
  customer?: string;
  lanhuPage?: string;
}): string {
  const first =
    opts.featureVersion === STANDING_DIR
      ? "【standing】"
      : `【v${opts.featureVersion.replace(/^v/, "").replace(/\./g, "")}】`;
  const parts = [first];
  if (opts.lanhuPage) parts.push(`【${opts.lanhuPage}】`);
  if (opts.customer) parts.push(`【${opts.customer}】`);
  parts.push(`【${opts.module}】`);
  const label = `${parts.join("")}${opts.description}`;
  if (!LABEL_DIR_RE.test(label)) {
    throw new Error(`生成的目录名不符合中文标签协议: ${label}`);
  }
  return label;
}

function currentYyyyMm(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Collect every metadata.id in the project (corrupt metadata.yaml is ignored; lint reports it). */
function existingFeatureIds(featuresDir: string): Set<string> {
  const ids = new Set<string>();
  for (const entry of listFeatureDirs(featuresDir)) {
    try {
      const meta = readFeatureMeta(entry.dir);
      if (meta?.id) ids.add(meta.id);
    } catch {
      // 损坏的 metadata.yaml 不参与查重
    }
  }
  return ids;
}

/**
 * Resolve (and create when absent) the feature dir for a CJK-labeled requirement.
 * Dir layer comes from --feature-version (vX.Y.Z); standing requirements must opt in
 * via --standing — omitting both is an error so the caller asks the user instead of
 * silently landing in _standing.
 * The machine id (metadata.yaml#id) is {yyyymm}-{pinyin slug of description}.
 */
export function runFeaturesResolve(opts: {
  project: string;
  module: string;
  description: string;
  customer?: string;
  featureVersion?: string;
  standing?: boolean;
  lanhuPage?: string;
  root?: string;
}): FeaturesResolveResult {
  if (opts.featureVersion && opts.standing) {
    throw new Error("--feature-version 与 --standing 互斥，只传一个");
  }
  if (!opts.featureVersion && !opts.standing) {
    throw new Error(
      "缺 --feature-version：版本类需求必须显式传版本号（不知道就向用户确认，不要自己编）；确为常驻需求时传 --standing",
    );
  }
  const paths = locateProject(opts.project, opts.root);
  const versionDir = opts.featureVersion ? normalizeVersionDir(opts.featureVersion) : STANDING_DIR;
  const dirName = buildLabelDirName({
    featureVersion: versionDir,
    module: opts.module,
    description: opts.description,
    customer: opts.customer,
    lanhuPage: opts.lanhuPage,
  });
  const featureDir = join(paths.featuresDir, versionDir, dirName);

  let created = false;
  if (existsSync(featureDir)) {
    const meta = readFeatureMeta(featureDir);
    if (!meta) {
      throw new Error(`目录已存在但缺 metadata.yaml: ${featureDir}`);
    }
    return {
      project: opts.project,
      featureDir,
      featureId: meta.id,
      dirName,
      zone: versionDir === STANDING_DIR ? "standing" : "active",
      created,
    };
  }

  mkdirSync(featureDir, { recursive: true });
  const slug = sanitizeSlug(opts.description);
  // 机器主键按 id 查重：同月同 slug 的需求(不同版本/客户)自动追加 -2/-3
  const baseId = `${currentYyyyMm()}-${slug || "feature"}`;
  const taken = existingFeatureIds(paths.featuresDir);
  let featureId = baseId;
  for (let n = 2; taken.has(featureId); n++) featureId = `${baseId}-${n}`;
  const meta = {
    schema: "FeatureMetadata@2",
    id: featureId,
    display_name: opts.description,
    status: "draft",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    modules: [opts.module],
    customers: opts.customer ? [opts.customer] : [],
    versions: opts.featureVersion ? [versionDir] : [],
    owners: [],
    inputs: [],
    relates_to: [],
    emits: {},
    case_drafting: { status: "not-started", archive_path: null, xmind_path: null },
    automation: { status: "not-started", intents: [], last_run_status: "not-run" },
    files: { archive: null, xmind: null, tests_root: null, latest_results: null },
  };
  writeFileAtomic(join(featureDir, "metadata.yaml"), stringify(meta));
  created = true;
  return {
    project: opts.project,
    featureDir,
    featureId,
    dirName,
    zone: versionDir === STANDING_DIR ? "standing" : "active",
    created,
  };
}

// ─── list ───

export interface FeatureRow {
  id: string;
  dirName: string;
  group: string;
  zone: string;
  displayName: string;
  status: string;
  modules: string[];
  customers: string[];
  versions: string[];
  owners: string[];
  createdAt: string;
  automationStatus: string;
  lastRunStatus: string;
  areas: { cases: boolean; automation: boolean; runs: boolean };
}

/** List feature rows under a project, with optional equality filters. */
export function runFeaturesList(opts: {
  project: string;
  root?: string;
  module?: string;
  customer?: string;
  version?: string;
  owner?: string;
  status?: string;
  automationStatus?: string;
  lastRun?: string;
  createdAfter?: string;
}): FeatureRow[] {
  const paths = locateProject(opts.project, opts.root);
  const rows: FeatureRow[] = [];
  for (const entry of listFeatureDirs(paths.featuresDir)) {
    let meta: FeatureMeta | null;
    try {
      meta = readFeatureMeta(entry.dir);
    } catch (err) {
      // 损坏的 metadata.yaml 不拖垮列表: 告警并跳过(诊断走 stderr)
      console.warn(
        `kata features list: 跳过损坏的 metadata.yaml(${entry.dir}): ${(err as Error).message}`,
      );
      continue;
    }
    if (!meta) continue;
    rows.push({
      id: meta.id,
      dirName: entry.dirName,
      group: entry.group,
      zone: entry.zone,
      displayName: meta.display_name,
      status: meta.status,
      modules: meta.modules ?? [],
      customers: meta.customers ?? [],
      versions: meta.versions ?? [],
      owners: meta.owners ?? [],
      createdAt: meta.created_at,
      automationStatus: meta.automation?.status ?? "not-started",
      lastRunStatus: meta.automation?.last_run_status ?? "not-run",
      areas: {
        cases: existsSync(join(entry.dir, "cases")),
        automation: existsSync(join(entry.dir, "automation")),
        runs: existsSync(join(entry.dir, "runs")),
      },
    });
  }
  const filtered = rows.filter((r) => {
    if (opts.module && !r.modules.includes(opts.module)) return false;
    if (opts.customer && !r.customers.includes(opts.customer)) return false;
    if (opts.version && !r.versions.includes(opts.version)) return false;
    if (opts.owner && !r.owners.includes(opts.owner)) return false;
    if (opts.status && r.status !== opts.status) return false;
    if (opts.automationStatus && r.automationStatus !== opts.automationStatus) return false;
    if (opts.lastRun && r.lastRunStatus !== opts.lastRun) return false;
    if (opts.createdAfter && r.createdAt < opts.createdAfter) return false;
    return true;
  });
  filtered.sort((a, b) => a.id.localeCompare(b.id));
  return filtered;
}

// ─── show ───

/** Show a feature's metadata plus its 5 most recent run dirs. */
export function runFeaturesShow(opts: { project: string; featureId: string; root?: string }) {
  const paths = locateProject(opts.project, opts.root);
  const featuresRoot = paths.featuresDir;
  const entry = resolveFeatureEntry(featuresRoot, opts.featureId);
  const metadata = readFeatureMeta(entry.dir);
  if (!metadata) throw new Error(`缺 metadata.yaml: ${entry.dir}`);
  const rd = runsDir(entry.dir);
  let recentRuns: string[] = [];
  if (existsSync(rd)) {
    recentRuns = readdirSync(rd)
      .filter((n) => statSync(join(rd, n)).isDirectory())
      .sort()
      .reverse()
      .slice(0, 5);
  }
  return { dir: entry.dir, metadata, recentRuns };
}

// ─── commander 注册 ───

/** Register the features noun (resolve/list/show) on the program. */
export function registerFeatures(program: Command): void {
  const features = program.command("features").description("需求功能目录操作");

  features
    .command("resolve")
    .description("按中文标签协议定位(不存在则创建)需求功能目录")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--module <module>", "模块名(进入【模块】段)")
    .requiredOption("--description <text>", "需求名(目录尾段,机器 id 取其拼音 slug)")
    .option("--customer <customer>", "客户名(可选,【客户】段)")
    .option("--feature-version <version>", "迭代版本 vX.Y.Z（与 --standing 二选一，必传其一）")
    .option("--standing", "常驻需求（落 features/_standing/），与 --feature-version 互斥", false)
    .option("--lanhu-page <pageId>", "蓝湖 pageId(可选,【lanhu-id】段)")
    .option("--json", "以 JSON 输出结果", false)
    .action(
      (opts: {
        project: string;
        module: string;
        description: string;
        customer?: string;
        featureVersion?: string;
        standing?: boolean;
        lanhuPage?: string;
        json: boolean;
      }) => {
        const result = runFeaturesResolve({
          project: opts.project,
          module: opts.module,
          description: opts.description,
          customer: opts.customer,
          featureVersion: opts.featureVersion,
          standing: opts.standing,
          lanhuPage: opts.lanhuPage,
        });
        if (opts.json) {
          process.stdout.write(`${JSON.stringify(result)}\n`);
        } else {
          console.log(`featureDir: ${result.featureDir}`);
          console.log(`featureId:  ${result.featureId}${result.created ? "（新建）" : ""}`);
        }
      },
    );

  features
    .command("list")
    .description("列出项目下的需求功能")
    .requiredOption("--project <name>", "项目名")
    .option("--module <module>", "按模块过滤")
    .option("--customer <customer>", "按客户过滤")
    .option("--version <version>", "按版本过滤")
    .option("--owner <owner>", "按负责人过滤")
    .option("--status <status>", "按状态过滤")
    .option("--json", "以 JSON 输出结果", false)
    .action(
      (opts: {
        project: string;
        module?: string;
        customer?: string;
        version?: string;
        owner?: string;
        status?: string;
        json: boolean;
      }) => {
        const rows = runFeaturesList({
          project: opts.project,
          module: opts.module,
          customer: opts.customer,
          version: opts.version,
          owner: opts.owner,
          status: opts.status,
        });
        if (opts.json) {
          process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
          return;
        }
        for (const r of rows) {
          const group = r.group || "(legacy-flat)";
          console.log(`${r.id}\t${r.status}\t${group}/${r.dirName}`);
        }
        console.log(`\n共 ${rows.length} 个需求功能`);
      },
    );

  features
    .command("show <feature-id>")
    .description("查看单个需求功能的元数据与最近运行")
    .requiredOption("--project <name>", "项目名")
    .option("--json", "以 JSON 输出结果", false)
    .action((featureId: string, opts: { project: string; json: boolean }) => {
      const { dir, metadata, recentRuns } = runFeaturesShow({ project: opts.project, featureId });
      if (opts.json) {
        process.stdout.write(`${JSON.stringify({ dir, metadata, recentRuns }, null, 2)}\n`);
        return;
      }
      console.log(`目录: ${dir}`);
      console.log(`id: ${metadata.id}  状态: ${metadata.status}`);
      console.log(`模块: ${(metadata.modules ?? []).join(", ") || "-"}`);
      console.log(`客户: ${(metadata.customers ?? []).join(", ") || "-"}`);
      console.log(`版本: ${(metadata.versions ?? []).join(", ") || "-"}`);
      console.log(`最近运行: ${recentRuns.length > 0 ? recentRuns.join(", ") : "(无)"}`);
    });
}
