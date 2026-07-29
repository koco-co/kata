/**
 * `kata cases build` — render every format declared by cases/<name>.yaml.
 * YAML is the only editable source; files under cases/exports are derived.
 */

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Command } from "commander";
import { writeFileAtomic } from "../lib/atomic-writer.ts";
import { type CaseExportFormat, caseExports } from "../lib/cases/formats.ts";
import { parseCasesYaml, validateCases } from "../lib/cases/parse.ts";
import { renderCsv } from "../lib/cases/render-csv.ts";
import { renderMarkdown } from "../lib/cases/render-md.ts";
import { renderXlsx } from "../lib/cases/render-xlsx.ts";
import { renderXmindBuffer } from "../lib/cases/render-xmind.ts";
import type { CasesFile } from "../lib/cases/types.ts";
import { projectRootFromFeatureDir, resolveFeatureEntry } from "../lib/features-layout.ts";
import { assertWritable } from "../lib/path-policy.ts";
import type { ProjectPaths } from "../lib/types.ts";
import { locateProject } from "../lib/workspace-locator.ts";

const FORMAT_EXTENSIONS: Record<CaseExportFormat, string> = {
  csv: "csv",
  xlsx: "xlsx",
  md: "md",
  xmind: "xmind",
};

// 写入边界:只允许写在 feature 目录内
function featurePaths(featureDir: string): ProjectPaths {
  const d = resolve(featureDir);
  return {
    root: d,
    projectDir: d,
    featuresDir: d,
    knowledgeDir: d,
    sharedDir: d,
    analysesDir: d,
    cacheDir: d,
  };
}

export function resolveFeatureInput(feature: string, project?: string): string {
  if (existsSync(feature)) return resolve(feature);
  if (!project)
    throw new Error(
      `--feature 不是路径；按目录名或 metadata.id 选择时必须同时提供 --project: ${feature}`,
    );
  return resolveFeatureEntry(locateProject(project).featuresDir, feature).dir;
}

/** Locate the single canonical yaml under <featureDir>/cases. */
export function findCasesYaml(featureDir: string): { yamlPath: string; name: string } {
  const casesDir = join(featureDir, "cases");
  if (!existsSync(casesDir)) throw new Error(`cases 目录不存在: ${casesDir}`);
  const yamls = readdirSync(casesDir).filter((f) => f.endsWith(".yaml"));
  if (yamls.length === 0) throw new Error(`cases/ 下没有 yaml 用例源: ${casesDir}`);
  if (yamls.length > 1) throw new Error(`cases/ 下 yaml 不唯一: ${yamls.join(", ")}`);
  return { yamlPath: join(casesDir, yamls[0]), name: yamls[0].replace(/\.yaml$/, "") };
}

interface DerivedArtifact {
  format: CaseExportFormat;
  path: string;
  content: Buffer;
}

export interface CasesBuildReport {
  created: string[];
  updated: string[];
  unchanged: string[];
  deleted: string[];
}

function outputPath(featureDir: string, name: string, format: CaseExportFormat): string {
  return join(featureDir, "cases", "exports", `${name}.${FORMAT_EXTENSIONS[format]}`);
}

async function renderArtifacts(
  file: CasesFile,
  featureDir: string,
  name: string,
): Promise<DerivedArtifact[]> {
  const formats = caseExports(file.meta.exports);
  const artifacts: DerivedArtifact[] = [];
  for (const format of formats) {
    let content: Buffer;
    if (format === "csv") content = Buffer.from(renderCsv(file), "utf8");
    else if (format === "xlsx") content = await renderXlsx(file);
    else if (format === "md") content = Buffer.from(renderMarkdown(file), "utf8");
    else {
      const projectName = projectRootFromFeatureDir(featureDir).split(/[\\/]/).at(-1);
      if (!projectName) throw new Error(`无法从 feature 路径识别项目: ${featureDir}`);
      content = await renderXmindBuffer(file, projectName);
    }
    artifacts.push({ format, path: outputPath(featureDir, name, format), content });
  }
  return artifacts;
}

function commitArtifacts(
  artifacts: DerivedArtifact[],
  featureDir: string,
  name: string,
): CasesBuildReport {
  const outputDir = join(featureDir, "cases", "exports");
  mkdirSync(outputDir, { recursive: true });
  const desired = new Set(artifacts.map((artifact) => artifact.path));
  const recognized = new Set(Object.values(FORMAT_EXTENSIONS).map((ext) => `${name}.${ext}`));
  const stale = readdirSync(outputDir)
    .filter((entry) => recognized.has(entry))
    .map((entry) => join(outputDir, entry))
    .filter((path) => !desired.has(path));
  const changed = artifacts.filter((artifact) => {
    if (!existsSync(artifact.path)) return true;
    return !readFileSync(artifact.path).equals(artifact.content);
  });
  if (changed.length === 0 && stale.length === 0) {
    return {
      created: [],
      updated: [],
      unchanged: artifacts.map((artifact) => artifact.path),
      deleted: [],
    };
  }

  const transaction = join(outputDir, `.kata-build-${randomBytes(8).toString("hex")}`);
  mkdirSync(transaction, { recursive: true });
  const backups: Array<{ target: string; backup: string }> = [];
  const installed: string[] = [];
  try {
    for (const target of [...changed.map((artifact) => artifact.path), ...stale]) {
      if (!existsSync(target)) continue;
      const backup = join(transaction, `${backups.length}.bak`);
      renameSync(target, backup);
      backups.push({ target, backup });
    }
    for (const artifact of changed) {
      const staged = join(transaction, `${artifact.format}.${FORMAT_EXTENSIONS[artifact.format]}`);
      writeFileAtomic(staged, artifact.content);
      renameSync(staged, artifact.path);
      installed.push(artifact.path);
    }
    for (const backup of backups) rmSync(backup.backup, { force: true });
    rmSync(transaction, { recursive: true, force: true });
  } catch (error) {
    for (const path of installed) rmSync(path, { force: true });
    for (const backup of [...backups].reverse()) {
      if (existsSync(backup.backup)) renameSync(backup.backup, backup.target);
    }
    rmSync(transaction, { recursive: true, force: true });
    throw error;
  }

  const created = changed
    .filter((artifact) => !backups.some((backup) => backup.target === artifact.path))
    .map((artifact) => artifact.path);
  const updated = changed
    .filter((artifact) => backups.some((backup) => backup.target === artifact.path))
    .map((artifact) => artifact.path);
  const unchanged = artifacts
    .filter((artifact) => !changed.includes(artifact))
    .map((artifact) => artifact.path);
  return { created, updated, unchanged, deleted: stale };
}

/** Build all declared derived artifacts for one feature directory. */
export async function runCasesBuild(featureDir: string): Promise<CasesBuildReport> {
  const { yamlPath, name } = findCasesYaml(featureDir);
  const file = parseCasesYaml(readFileSync(yamlPath, "utf8"));
  const problems = validateCases(file);
  if (problems.length > 0) {
    throw new Error(`用例校验未通过:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }
  const artifacts = await renderArtifacts(file, featureDir, name);
  for (const artifact of artifacts) assertWritable(featurePaths(featureDir), artifact.path);
  return commitArtifacts(artifacts, featureDir, name);
}

/** Register the metadata-driven build verb. */
export function registerCasesBuild(cases: Command): void {
  cases
    .command("build")
    .description("按 YAML meta.exports 生成派生文件；缺省仅生成 XMind")
    .requiredOption("--feature <dir>", "feature 目录路径")
    .option("--project <name>", "项目名；feature 传目录名或 metadata.id 时必填")
    .action(async (opts: { feature: string; project?: string }) => {
      try {
        const report = await runCasesBuild(resolveFeatureInput(opts.feature, opts.project));
        for (const path of report.created) console.log(`created ${path}`);
        for (const path of report.updated) console.log(`updated ${path}`);
        for (const path of report.unchanged) console.log(`unchanged ${path}`);
        for (const path of report.deleted) console.log(`deleted ${path}`);
      } catch (e) {
        console.error((e as Error).message);
        process.exit(1);
      }
    });
}
