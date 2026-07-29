import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  unlinkSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import type { Command } from "commander";
import { stringify } from "yaml";
import { writeFileAtomic } from "../lib/atomic-writer.ts";
import {
  importCases,
  type SplitXmindEntry,
  splitXmindCases,
} from "../lib/cases/importers.ts";
import { validateCases } from "../lib/cases/parse.ts";
import { serializeCasesYaml } from "../lib/cases/serialize.ts";
import { readFeatureMeta } from "../lib/feature-meta.ts";
import { casesDir, listFeatureDirs } from "../lib/features-layout.ts";
import { sanitizeSlug } from "../lib/slug.ts";
import { locateProject } from "../lib/workspace-locator.ts";
import { resolveFeatureInput } from "./cases-build.ts";

export interface CasesImportOptions {
  feature?: string;
  project?: string;
  version?: string;
  from: string;
  name?: string;
  requirementId?: string;
  caseModuleId?: string;
  split?: boolean;
  apply?: boolean;
}

export async function runCasesImport(
  featureDir: string,
  opts: Omit<CasesImportOptions, "feature" | "project">,
): Promise<void> {
  const sourcePath = resolve(opts.from);
  if (!existsSync(sourcePath)) throw new Error(`导入文件不存在: ${sourcePath}`);
  const sourceName = basename(sourcePath);
  const name = opts.name?.trim() || sourceName.replace(/\.[^.]+$/, "");
  if (!name || name.includes("/") || name.includes("\\"))
    throw new Error(`非法用例集名称: ${name}`);
  const dir = casesDir(featureDir);
  const yamlPath = join(dir, `${name}.yaml`);
  if (existsSync(yamlPath)) {
    throw new Error(`目标 YAML 已存在，import 不覆盖: ${yamlPath}`);
  }
  const importsDir = join(dir, "imports");
  const archivedPath = join(importsDir, sourceName);
  const preview = await importCases({
    featureDir,
    sourcePath,
    name,
    importName: sourceName,
    requirementId: opts.requirementId,
    caseModuleId: opts.caseModuleId,
  });
  const problems = validateCases(preview.file);
  if (problems.length > 0)
    throw new Error(`导入生成的 YAML 校验未通过:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  const report = {
    applied: Boolean(opts.apply),
    format: preview.format,
    profile: preview.profile,
    source: sourcePath,
    archive: archivedPath,
    yaml: yamlPath,
    cases: preview.file.cases.length,
    exports: preview.file.meta.exports,
    warnings: preview.warnings,
  };
  if (!opts.apply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  let copied = false;
  try {
    const sourceBytes = readFileSync(sourcePath);
    if (existsSync(archivedPath)) {
      const archivedBytes = readFileSync(archivedPath);
      if (!sourceBytes.equals(archivedBytes)) {
        throw new Error(`imports 中已存在同名但内容不同的文件，请先重命名: ${archivedPath}`);
      }
    } else {
      writeFileAtomic(archivedPath, sourceBytes);
      copied = true;
    }
    writeFileAtomic(yamlPath, serializeCasesYaml(preview.file));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    if (copied && existsSync(archivedPath)) unlinkSync(archivedPath);
    throw error;
  }
}

interface SplitConflict {
  source_l1: string;
  target: string;
  reason: string;
}

export interface CasesSplitImportReport {
  applied: boolean;
  project: string;
  version: string;
  source: string;
  features: number;
  skipped: number;
  cases: number;
  mappings: Array<{
    source_l1: string;
    target_feature: string;
    target_dir: string;
    yaml: string;
    archive: string;
    requirement_id?: string;
    case_module_id: string;
    metadata_id?: string;
    cases: number;
    skipped?: "no cases";
    warnings: string[];
  }>;
  conflicts: SplitConflict[];
}

function currentYyyyMm(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function existingFeatureIds(featuresDir: string): Set<string> {
  const ids = new Set<string>();
  for (const entry of listFeatureDirs(featuresDir)) {
    const meta = readFeatureMeta(entry.dir);
    if (meta?.id) ids.add(meta.id);
  }
  return ids;
}

function assignFeatureIds(entries: SplitXmindEntry[], featuresDir: string): Map<string, string> {
  const taken = existingFeatureIds(featuresDir);
  const assigned = new Map<string, string>();
  for (const entry of entries) {
    if (entry.skipped) continue;
    const slug = sanitizeSlug(entry.yaml_name) || "feature";
    const base = `${currentYyyyMm()}-${slug}`;
    let id = base;
    for (let suffix = 2; taken.has(id); suffix += 1) id = `${base}-${suffix}`;
    taken.add(id);
    assigned.set(entry.target_feature, id);
  }
  return assigned;
}

function customerFromTarget(targetFeature: string): string | undefined {
  const dirName = targetFeature.split("/").at(-1) ?? "";
  const match = dirName.match(/^【v[^】]+】(?:【([^】]+)】)?【离线开发】/);
  return match?.[1];
}

function featureMetadata(entry: SplitXmindEntry, metadataId: string, version: string) {
  const now = new Date().toISOString();
  const xmindPath = `cases/exports/${entry.yaml_name}.xmind`;
  const customer = customerFromTarget(entry.target_feature);
  return {
    schema: "FeatureMetadata@2",
    id: metadataId,
    display_name: entry.title,
    status: "active",
    created_at: now,
    updated_at: now,
    modules: ["离线开发"],
    customers: customer ? [customer] : [],
    versions: [version],
    owners: [],
    inputs: [],
    relates_to: [],
    emits: {
      cases_xmind: true,
      archive: false,
    },
    feature_id: entry.target_feature,
    case_drafting: {
      status: "completed",
      archive_path: null,
      xmind_path: xmindPath,
      requirement_atoms: [],
      coverage_matrix_path: null,
    },
    automation: {
      status: "not-started",
      intents: [],
      last_handoff_path: null,
      last_run_status: "not-run",
    },
    files: {
      archive: null,
      xmind: xmindPath,
      tests_root: null,
      latest_results: null,
    },
  };
}

/** Preview or atomically apply an XMind-L1 split import across a project. */
export async function runCasesSplitImport(opts: {
  project: string;
  version: string;
  from: string;
  apply?: boolean;
  root?: string;
}): Promise<CasesSplitImportReport> {
  const sourcePath = resolve(opts.from);
  if (!existsSync(sourcePath)) throw new Error(`导入文件不存在: ${sourcePath}`);
  const paths = locateProject(opts.project, opts.root);
  const preview = await splitXmindCases({
    sourcePath,
    project: opts.project,
    version: opts.version,
    importName: basename(sourcePath),
  });
  for (const entry of preview.entries) {
    if (!entry.file) continue;
    const problems = validateCases(entry.file);
    if (problems.length > 0) {
      throw new Error(
        `${entry.source_l1} 导入生成的 YAML 校验未通过:\n${problems.map((p) => `  - ${p}`).join("\n")}`,
      );
    }
  }

  const metadataIds = assignFeatureIds(preview.entries, paths.featuresDir);
  const seenTargets = new Set<string>();
  const conflicts: SplitConflict[] = [];
  for (const entry of preview.entries) {
    if (entry.skipped) continue;
    const target = join(paths.featuresDir, entry.target_feature);
    if (seenTargets.has(target)) {
      conflicts.push({ source_l1: entry.source_l1, target, reason: "输入内目标 feature 重复" });
    }
    seenTargets.add(target);
    if (existsSync(target)) {
      conflicts.push({ source_l1: entry.source_l1, target, reason: "目标 feature 目录已存在" });
    }
  }

  const sourceName = basename(sourcePath);
  const mappings = preview.entries.map((entry) => {
    const targetDir = join(paths.featuresDir, entry.target_feature);
    return {
      source_l1: entry.source_l1,
      target_feature: entry.target_feature,
      target_dir: targetDir,
      yaml: join(targetDir, "cases", `${entry.yaml_name}.yaml`),
      archive: join(targetDir, "cases", "imports", sourceName),
      ...(entry.requirement_id ? { requirement_id: entry.requirement_id } : {}),
      case_module_id: entry.case_module_id,
      ...(metadataIds.get(entry.target_feature)
        ? { metadata_id: metadataIds.get(entry.target_feature) }
        : {}),
      cases: entry.cases,
      ...(entry.skipped ? { skipped: entry.skipped } : {}),
      warnings: entry.warnings,
    };
  });
  const report: CasesSplitImportReport = {
    applied: false,
    project: opts.project,
    version: preview.version,
    source: sourcePath,
    features: preview.feature_count,
    skipped: preview.skipped_count,
    cases: preview.case_count,
    mappings,
    conflicts,
  };
  if (!opts.apply) {
    console.log(JSON.stringify(report, null, 2));
    return report;
  }
  if (conflicts.length > 0) {
    console.log(JSON.stringify(report, null, 2));
    throw new Error(`split import 存在 ${conflicts.length} 个冲突，未写入任何文件`);
  }

  const transaction = join(
    paths.featuresDir,
    `.kata-import-${randomBytes(8).toString("hex")}`,
  );
  const installed: Array<{ final: string; staged: string }> = [];
  const createdVersionDirs: string[] = [];
  try {
    mkdirSync(transaction, { recursive: true });
    const sourceBytes = readFileSync(sourcePath);
    for (const entry of preview.entries) {
      if (!entry.file || entry.skipped) continue;
      const stagedFeature = join(transaction, entry.target_feature);
      const importsDir = join(stagedFeature, "cases", "imports");
      mkdirSync(importsDir, { recursive: true });
      writeFileAtomic(join(importsDir, sourceName), sourceBytes);
      writeFileAtomic(
        join(stagedFeature, "cases", `${entry.yaml_name}.yaml`),
        serializeCasesYaml(entry.file),
      );
      const metadataId = metadataIds.get(entry.target_feature);
      if (!metadataId) throw new Error(`缺 metadata.id: ${entry.target_feature}`);
      writeFileAtomic(
        join(stagedFeature, "metadata.yaml"),
        stringify(featureMetadata(entry, metadataId, preview.version), { lineWidth: 0 }),
      );
    }

    for (const entry of preview.entries) {
      if (!entry.file || entry.skipped) continue;
      const final = join(paths.featuresDir, entry.target_feature);
      if (existsSync(final)) {
        throw new Error(`应用前检测到目标 feature 冲突: ${final}`);
      }
    }
    for (const entry of preview.entries) {
      if (!entry.file || entry.skipped) continue;
      const staged = join(transaction, entry.target_feature);
      const final = join(paths.featuresDir, entry.target_feature);
      const versionDir = join(paths.featuresDir, preview.version);
      if (!existsSync(versionDir)) {
        mkdirSync(versionDir, { recursive: true });
        createdVersionDirs.push(versionDir);
      }
      renameSync(staged, final);
      installed.push({ final, staged });
    }
    rmSync(transaction, { recursive: true, force: true });
  } catch (error) {
    for (const item of [...installed].reverse()) {
      if (existsSync(item.final)) {
        mkdirSync(join(item.staged, ".."), { recursive: true });
        renameSync(item.final, item.staged);
      }
    }
    for (const versionDir of [...createdVersionDirs].reverse()) {
      if (existsSync(versionDir) && readdirSync(versionDir).length === 0) rmdirSync(versionDir);
    }
    rmSync(transaction, { recursive: true, force: true });
    throw error;
  }

  report.applied = true;
  console.log(JSON.stringify(report, null, 2));
  return report;
}

export function registerCasesImport(cases: Command): void {
  cases
    .command("import")
    .description("将 CSV/XLSX/MD/XMind 转为 YAML；XMind 可按 L1 拆分(默认 dry-run)")
    .option("--feature <dir>", "单 feature 导入的 feature 目录路径")
    .option(
      "--project <name>",
      "项目名；--split 时必填，或 feature 传目录名/metadata.id 时必填",
    )
    .option("--version <version>", "--split 的目标版本 vX.Y.Z")
    .requiredOption("--from <file>", "历史输入文件路径")
    .option("--name <name>", "用例集名称；默认取输入文件名")
    .option("--requirement-id <id>", "多需求历史表格的需求编号")
    .option("--case-module-id <id>", "禅道用例模块编号；未知时 YAML 写空字符串")
    .option("--split", "按 XMind L1 拆为多个 feature/YAML；仅支持 .xmind", false)
    .option("--apply", "归档原始文件并写入 YAML", false)
    .action(async (opts: CasesImportOptions) => {
      if (opts.split) {
        if (!opts.project) throw new Error("--split 必须提供 --project");
        if (!opts.version) throw new Error("--split 必须提供 --version");
        if (opts.feature || opts.name || opts.requirementId || opts.caseModuleId) {
          throw new Error(
            "--split 不接受 --feature/--name/--requirement-id/--case-module-id；这些值从各 L1 读取",
          );
        }
        await runCasesSplitImport({
          project: opts.project,
          version: opts.version,
          from: opts.from,
          apply: opts.apply,
        });
        return;
      }
      if (!opts.feature) throw new Error("单 feature 导入必须提供 --feature");
      if (opts.version) throw new Error("--version 仅与 --split 一起使用");
      await runCasesImport(resolveFeatureInput(opts.feature, opts.project), opts);
    });
}
