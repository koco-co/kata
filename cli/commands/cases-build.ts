/**
 * `kata cases build` — render every format declared by cases/<name>.yaml.
 * YAML is the only editable source; files under cases/exports are derived.
 */

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import type { Command } from "commander";
import {
  emitBusinessNotificationSafely,
  formatTaipeiTime,
  workspaceRelativePath,
} from "../integrations/notify.ts";
import { writeFileAtomic } from "../lib/atomic-writer.ts";
import { type CaseExportFormat, caseExports, parseCaseExportName } from "../lib/cases/formats.ts";
import { parseCasesYaml, validateCases } from "../lib/cases/parse.ts";
import { renderCsv } from "../lib/cases/render-csv.ts";
import { renderMarkdown } from "../lib/cases/render-md.ts";
import { renderXlsx } from "../lib/cases/render-xlsx.ts";
import type { CaseRenderContext, CasesFile } from "../lib/cases/types.ts";
import { renderXmindBuffer } from "../lib/cases/xmind/render.ts";
import {
  assertFeatureNoSymlink,
  assertNoSymlinkPath,
  featureIdentity,
  projectRootFromFeatureDir,
  resolveFeatureEntry,
} from "../lib/features-layout.ts";
import { assertWritable } from "../lib/path-policy.ts";
import { assertCaseDigestChain } from "../lib/prd.ts";
import type { ProjectPaths } from "../lib/types.ts";
import { locateProject } from "../lib/workspace-locator.ts";

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
  if (existsSync(feature)) {
    const resolved = resolve(feature);
    const projectRoot = projectRootFromFeatureDir(resolved);
    return assertNoSymlinkPath(join(projectRoot, "features"), resolved, "feature");
  }
  if (!project)
    throw new Error(
      `--feature 不是路径；使用相对 features/ 的完整路径时必须同时提供 --project: ${feature}`,
    );
  return resolveFeatureEntry(locateProject(project).featuresDir, feature).dir;
}

function renderContextForFeature(featureDir: string): {
  projectName: string;
  context: CaseRenderContext;
} {
  const projectDir = projectRootFromFeatureDir(featureDir);
  const projectName = projectDir.split(/[\\/]/).at(-1);
  if (!projectName) throw new Error(`无法从 feature 路径识别项目: ${featureDir}`);
  const featuresDir = join(projectDir, "features");
  const relativePath = relative(featuresDir, resolve(featureDir)).split("\\").join("/");
  const entry = resolveFeatureEntry(featuresDir, relativePath);
  const identity = featureIdentity(projectName, featuresDir, entry);
  return { projectName, context: { version: identity.version, featureKey: identity.featureKey } };
}

/** Locate the single canonical yaml under <featureDir>/cases. */
export function findCasesYaml(featureDir: string): { yamlPath: string; name: string } {
  const casesDir = join(featureDir, "cases");
  assertFeatureNoSymlink(featureDir);
  assertNoSymlinkPath(featureDir, casesDir, "cases");
  if (!existsSync(casesDir)) throw new Error(`cases 目录不存在: ${casesDir}`);
  const yamls = readdirSync(casesDir).filter((f) => f.endsWith(".yaml"));
  if (yamls.length === 0) throw new Error(`cases/ 下没有 yaml 用例源: ${casesDir}`);
  if (yamls.length > 1) throw new Error(`cases/ 下 yaml 不唯一: ${yamls.join(", ")}`);
  const yamlPath = join(casesDir, yamls[0]);
  assertNoSymlinkPath(featureDir, yamlPath, "cases YAML");
  return { yamlPath, name: yamls[0].replace(/\.yaml$/, "") };
}

interface DerivedArtifact {
  name: string;
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

function outputPath(featureDir: string, name: string): string {
  return join(featureDir, "cases", "exports", name);
}

async function renderArtifacts(
  file: CasesFile,
  featureDir: string,
  name: string,
): Promise<DerivedArtifact[]> {
  const exports = caseExports(file.meta.exports, name);
  const renderContext = renderContextForFeature(featureDir);
  const artifacts: DerivedArtifact[] = [];
  for (const output of exports) {
    const { format } = output;
    let content: Buffer;
    if (format === "csv") content = Buffer.from(renderCsv(file), "utf8");
    else if (format === "xlsx") content = await renderXlsx(file);
    else if (format === "md")
      content = Buffer.from(renderMarkdown(file, renderContext.context), "utf8");
    else {
      content = await renderXmindBuffer(file, renderContext.projectName, renderContext.context);
    }
    artifacts.push({
      name: output.name,
      format,
      path: outputPath(featureDir, output.name),
      content,
    });
  }
  return artifacts;
}

function commitArtifacts(artifacts: DerivedArtifact[], featureDir: string): CasesBuildReport {
  const outputDir = join(featureDir, "cases", "exports");
  mkdirSync(outputDir, { recursive: true });
  const desired = new Set(artifacts.map((artifact) => artifact.path));
  const stale = readdirSync(outputDir)
    .filter((entry) => Boolean(parseCaseExportName(entry)))
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
    for (const [index, artifact] of changed.entries()) {
      const staged = join(transaction, `${index}.artifact`);
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
  assertFeatureNoSymlink(featureDir);
  const { yamlPath, name } = findCasesYaml(featureDir);
  const file = parseCasesYaml(readFileSync(yamlPath, "utf8"));
  assertCaseDigestChain(
    featureDir,
    file.meta.test_points_digest,
    file.cases.map((item) => item.source_ref),
  );
  const problems = validateCases(file);
  if (problems.length > 0) {
    throw new Error(`用例校验未通过:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }
  const artifacts = await renderArtifacts(file, featureDir, name);
  for (const artifact of artifacts) assertWritable(featurePaths(featureDir), artifact.path);
  return commitArtifacts(artifacts, featureDir);
}

/** Register the metadata-driven build verb. */
export function registerCasesBuild(cases: Command): void {
  cases
    .command("build")
    .description(
      "按 YAML meta.exports 中的文件名生成派生产物；缺省仅生成同名 XMind；requirements 布局按需求生成多个 L1",
    )
    .requiredOption("--feature <dir>", "feature 目录路径")
    .option("--project <name>", "项目名；feature 传相对 features/ 的完整路径时必填")
    .action(async (opts: { feature: string; project?: string }) => {
      const featureDir = resolveFeatureInput(opts.feature, opts.project);
      const startedAt = new Date();
      const report = await runCasesBuild(featureDir);
      for (const path of report.created) console.log(`created ${path}`);
      for (const path of report.updated) console.log(`updated ${path}`);
      for (const path of report.unchanged) console.log(`unchanged ${path}`);
      for (const path of report.deleted) console.log(`deleted ${path}`);
      if (report.created.length + report.updated.length > 0) {
        const { yamlPath } = findCasesYaml(featureDir);
        const file = parseCasesYaml(readFileSync(yamlPath, "utf8"));
        const projectDir = projectRootFromFeatureDir(featureDir);
        const { context } = renderContextForFeature(featureDir);
        const root = dirname(dirname(projectDir));
        const result = await emitBusinessNotificationSafely(
          "cases-built",
          {
            project: projectDir.split(/[\\/]/).at(-1) ?? "",
            version: context.version,
            feature: file.meta.title,
            completed_at: formatTaipeiTime(),
            case_count: file.cases.length,
            created_count: report.created.length,
            updated_count: report.updated.length,
            artifact_paths: [...report.created, ...report.updated].map((path) =>
              workspaceRelativePath(root, path),
            ),
            duration_ms: Date.now() - startedAt.getTime(),
          },
          { root },
        );
        process.stderr.write(
          `[notify] cases-built: ${result.state}${result.reason ? ` (${result.reason})` : ""}\n`,
        );
      }
    });
}
