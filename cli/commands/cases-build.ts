/**
 * `kata cases build` — render every format declared by cases/<name>.yaml.
 * YAML is the only editable source; files under cases/exports are derived.
 */

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import type { Command } from "commander";
import {
  emitBusinessNotificationSafely,
  formatTaipeiTime,
  workspaceRelativePath,
} from "../integrations/notify/index.ts";
import { writeFileAtomic } from "../lib/atomic-writer.ts";
import {
  exportLabels,
  type ModuleIdChoice,
  printFeatureSummary,
  resolveModuleIdInteractively,
  selectBuildFormats,
} from "../lib/cases/build-interactive.ts";
import {
  lintCaseContent,
  loadCasesLintConfig,
  resolveCaseCustomer,
} from "../lib/cases/content-lint.ts";
import {
  CASE_EXPORT_FORMATS,
  type CaseExportFormat,
  caseExports,
  isCaseExportFormat,
  parseCaseExportName,
} from "../lib/cases/formats.ts";
import { parseCasesYaml, validateCases } from "../lib/cases/parse.ts";
import { renderCsv } from "../lib/cases/render-csv.ts";
import { renderMarkdown } from "../lib/cases/render-md.ts";
import { renderXlsx } from "../lib/cases/render-xlsx.ts";
import { locateFeaturesByRequirementId } from "../lib/cases/requirement-locate.ts";
import { setCaseModuleId } from "../lib/cases/serialize.ts";
import type { CaseRenderContext, CasesFile } from "../lib/cases/types.ts";
import { renderXmindBuffer } from "../lib/cases/xmind/render.ts";
import {
  assertFeatureNoSymlink,
  assertNoSymlinkPath,
  featureIdentity,
  projectRootFromFeatureDir,
  resolveFeatureEntry,
} from "../lib/features-layout.ts";
import { p0RatioViolation } from "../lib/features-lint.ts";
import { assertWritable } from "../lib/path-policy.ts";
import { assertCaseDigestChain } from "../lib/prd.ts";
import type { ProjectPaths } from "../lib/types.ts";
import { locateProject, locateProjectRoot } from "../lib/workspace-locator.ts";

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

/** 解析 build 目标:--feature 路径或按需求 id 定位(二选一)。 */
function resolveBuildTargets(
  requirementId: string | undefined,
  opts: { feature?: string; project?: string },
): string[] {
  if (opts.feature && requirementId) {
    throw new Error("--feature 与 <requirementId> 只能指定一个");
  }
  if (opts.feature) return [resolveFeatureInput(opts.feature, opts.project)];
  if (!requirementId) throw new Error("必须指定 <requirementId> 或 --feature");
  if (!/^\d+$/.test(requirementId)) throw new Error(`需求 id 必须是数字: ${requirementId}`);
  const matches = locateFeaturesByRequirementId(requirementId, { project: opts.project });
  if (matches.length === 0) {
    throw new Error(`未找到 requirement_id=${requirementId} 的用例(${opts.project ?? "全部项目"})`);
  }
  return matches.map((match) => match.featureDir);
}

function parseBuildFormats(raw: string | undefined): CaseExportFormat[] | undefined {
  if (raw === undefined) return undefined;
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const invalid = values.filter((value) => !isCaseExportFormat(value));
  if (invalid.length > 0) {
    throw new Error(
      `--format 含不支持的导出格式: ${invalid.join(", ")}; 支持 ${CASE_EXPORT_FORMATS.join("/")}`,
    );
  }
  if (values.length === 0) throw new Error("--format 不能为空");
  return [...new Set(values)] as CaseExportFormat[];
}

function formatOutputName(format: CaseExportFormat, defaultName: string): string {
  return `${defaultName}.${format}`;
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
  /** 内容实际发生变化的导出文件；用于通知，避免每次覆盖都重复上报。 */
  contentChanged?: string[];
}

function outputPath(featureDir: string, name: string): string {
  return join(featureDir, "cases", "exports", name);
}

async function renderArtifacts(
  file: CasesFile,
  featureDir: string,
  name: string,
  formats?: CaseExportFormat[],
): Promise<DerivedArtifact[]> {
  const exports = formats
    ? formats.map((format) => ({ name: formatOutputName(format, name), format }))
    : caseExports(file.meta.exports, name);
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

function commitArtifacts(
  artifacts: DerivedArtifact[],
  featureDir: string,
  pruneStale = true,
): CasesBuildReport {
  const outputDir = join(featureDir, "cases", "exports");
  mkdirSync(outputDir, { recursive: true });
  const desired = new Set(artifacts.map((artifact) => artifact.path));
  const stale = pruneStale
    ? readdirSync(outputDir)
        .filter((entry) => Boolean(parseCaseExportName(entry)))
        .map((entry) => join(outputDir, entry))
        .filter((path) => !desired.has(path))
    : [];
  const contentChanged = artifacts
    .filter(
      (artifact) =>
        !existsSync(artifact.path) || !readFileSync(artifact.path).equals(artifact.content),
    )
    .map((artifact) => artifact.path);
  if (artifacts.length === 0 && stale.length === 0) {
    return {
      created: [],
      updated: [],
      unchanged: [],
      deleted: [],
      contentChanged,
    };
  }

  const transaction = join(outputDir, `.kata-build-${randomBytes(8).toString("hex")}`);
  mkdirSync(transaction, { recursive: true });
  const backups: Array<{ target: string; backup: string }> = [];
  const installed: string[] = [];
  try {
    for (const artifact of artifacts) {
      const target = artifact.path;
      if (!existsSync(target)) continue;
      const backup = join(transaction, `${backups.length}.bak`);
      renameSync(target, backup);
      backups.push({ target, backup });
    }
    for (const target of stale) {
      if (!existsSync(target)) continue;
      const backup = join(transaction, `${backups.length}.bak`);
      renameSync(target, backup);
      backups.push({ target, backup });
    }
    for (const [index, artifact] of artifacts.entries()) {
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

  const created = artifacts
    .filter((artifact) => !backups.some((backup) => backup.target === artifact.path))
    .map((artifact) => artifact.path);
  const updated = artifacts
    .filter((artifact) => backups.some((backup) => backup.target === artifact.path))
    .map((artifact) => artifact.path);
  return { created, updated, unchanged: [], deleted: stale, contentChanged };
}

/** 预检一个 feature：parse/validate/digest/content lint 全部通过后返回可渲染输入。 */
function preflightFeature(featureDir: string): {
  yamlPath: string;
  name: string;
  file: CasesFile;
} {
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
  const contentProblems = lintCaseContent(
    file,
    loadCasesLintConfig(locateProjectRoot()),
    resolveCaseCustomer(featureDir),
  );
  if (contentProblems.length > 0) {
    throw new Error(
      `用例内容 lint 未通过:\n${contentProblems
        .map((problem) => `  - [${problem.rule}] ${problem.message}`)
        .join("\n")}`,
    );
  }
  const p0Problem = p0RatioViolation(file.cases, basename(yamlPath));
  if (p0Problem) {
    throw new Error(`用例硬校验未通过:\n  - [${p0Problem.rule}] ${p0Problem.message}`);
  }
  return { yamlPath, name, file };
}

export interface RunCasesBuildOptions {
  formats?: CaseExportFormat[];
  caseModuleId?: string;
}

/** Build all declared derived artifacts for one feature directory. */
export async function runCasesBuild(
  featureDir: string,
  opts: RunCasesBuildOptions = {},
): Promise<CasesBuildReport> {
  const { file, name, yamlPath } = preflightFeature(featureDir);
  const formats =
    opts.formats ?? caseExports(file.meta.exports, name).map((output) => output.format);
  const originalYaml = readFileSync(yamlPath, "utf8");
  let shouldPersistModuleId = false;
  if (formats.includes("csv")) {
    const moduleId = opts.caseModuleId?.trim() || file.meta.case_module_id.trim();
    if (!moduleId) {
      throw new Error("CSV 导出需要禅道模块 ID；请提供 --case-module-id <id>");
    }
    if (!/^\d+$/.test(moduleId)) {
      throw new Error("禅道模块 ID 必须为数字");
    }
    shouldPersistModuleId =
      opts.caseModuleId !== undefined && file.meta.case_module_id !== moduleId;
    file.meta.case_module_id = moduleId;
  }
  if (shouldPersistModuleId) {
    writeFileAtomic(yamlPath, setCaseModuleId(originalYaml, file.meta.case_module_id));
  }
  try {
    const artifacts = await renderArtifacts(file, featureDir, name, formats);
    for (const artifact of artifacts) assertWritable(featurePaths(featureDir), artifact.path);
    return commitArtifacts(artifacts, featureDir, opts.formats === undefined);
  } catch (error) {
    if (shouldPersistModuleId) writeFileAtomic(yamlPath, originalYaml);
    throw error;
  }
}

interface TargetPlan {
  featureDir: string;
  yamlPath: string;
  name: string;
  file: CasesFile;
  formats?: CaseExportFormat[];
  moduleIdChoice?: ModuleIdChoice;
}

function summaryForFeature(featureDir: string, file: CasesFile, formats?: CaseExportFormat[]) {
  const projectDir = projectRootFromFeatureDir(featureDir);
  const projectName = projectDir.split(/[\\/]/).at(-1) ?? "unknown";
  const { context } = renderContextForFeature(featureDir);
  const outputDir = join(featureDir, "cases", "exports");
  const relativePath = relative(projectDir, outputDir);
  const labels = formats
    ? exportLabels(formats.map((format) => `case.${format}`))
    : exportLabels(file.meta.exports ?? []);
  return {
    project: projectName,
    version: context.version,
    title: file.meta.title,
    caseCount: file.cases.length,
    exportsLabel: labels,
    exportDir: `${projectName}/${relativePath}`.split("\\").join("/"),
  };
}

async function resolveModuleIdChoice(
  file: CasesFile,
  explicitId: string | undefined,
  interactive: boolean,
): Promise<ModuleIdChoice | null> {
  if (explicitId !== undefined) {
    const id = explicitId.trim();
    if (!/^\d+$/.test(id)) throw new Error("--case-module-id 必须为数字");
    return {
      id,
      persist: file.meta.case_module_id !== id,
      ...(file.meta.case_module_id ? { changedFrom: file.meta.case_module_id } : {}),
    };
  }
  const existing = file.meta.case_module_id.trim();
  if (existing) {
    if (interactive) return resolveModuleIdInteractively(existing);
    return { id: existing, persist: false };
  }
  if (interactive) return resolveModuleIdInteractively("");
  throw new Error("CSV 导出需要禅道模块 ID；请提供 --case-module-id <id>");
}

/** Register the metadata-driven build verb. */
export function registerCasesBuild(cases: Command): void {
  cases
    .command("build")
    .description(
      "用例内容 lint 与 P0 占比硬校验通过后生成派生产物；TTY 下可交互选择 XMind/CSV，CSV 需禅道模块 ID；传需求 id 简写定位 feature",
    )
    .argument("[requirementId]", "需求 id；按 cases YAML 中 requirement_id 字段定位 feature")
    .option("--feature <dir>", "feature 目录路径；与 <requirementId> 二选一")
    .option(
      "--project <name>",
      "项目名；feature 传相对 features/ 的完整路径时必填；按需求 id 定位时可限定项目",
    )
    .option("--format <formats>", "逗号分隔的导出格式，如 xmind,csv；显式传入时跳过交互")
    .option("--no-interactive", "跳过 TUI 深链，强制 CLI 输出")
    .option("--case-module-id <id>", "禅道模块 ID；CSV 且 YAML 为空时必填")
    .action(
      async (
        requirementId: string | undefined,
        opts: {
          feature?: string;
          project?: string;
          format?: string;
          caseModuleId?: string;
          interactive?: boolean;
        },
      ) => {
        const targets = resolveBuildTargets(requirementId, opts);
        // 先对全部目标完成校验预检：任一目标失败时任何目标都不写入、不通知，
        // 避免跨项目同 id 一半新一半旧的派生状态。
        const preflighted = targets.map((featureDir) => ({
          featureDir,
          input: preflightFeature(featureDir),
        }));
        const explicitFormats = parseBuildFormats(opts.format);
        const interactive =
          process.stdin.isTTY &&
          explicitFormats === undefined &&
          opts.interactive !== false &&
          process.env.KATA_NO_INTERACTIVE !== "1";
        let selectedFormats: CaseExportFormat[] | null | undefined;
        if (interactive) {
          for (const { featureDir, input } of preflighted) {
            printFeatureSummary(summaryForFeature(featureDir, input.file, explicitFormats));
            console.log("");
          }
          selectedFormats = await selectBuildFormats();
          if (!selectedFormats || selectedFormats.length === 0) {
            console.log("未选择导出文件，已取消");
            return;
          }
        }

        const plans: TargetPlan[] = [];
        for (const { featureDir, input } of preflighted) {
          const selected = selectedFormats ?? explicitFormats;
          const effectiveFormats =
            selected ??
            caseExports(input.file.meta.exports, input.name).map((output) => output.format);
          const plan: TargetPlan = {
            featureDir,
            yamlPath: input.yamlPath,
            name: input.name,
            file: input.file,
            ...(selected ? { formats: selected } : {}),
          };
          if (effectiveFormats.includes("csv")) {
            const moduleIdChoice = await resolveModuleIdChoice(
              input.file,
              opts.caseModuleId,
              interactive,
            );
            if (!moduleIdChoice) {
              console.log("已取消");
              return;
            }
            plan.moduleIdChoice = moduleIdChoice;
            input.file.meta.case_module_id = moduleIdChoice.id;
            if (moduleIdChoice.changedFrom && moduleIdChoice.changedFrom !== moduleIdChoice.id) {
              console.log(`禅道模块 ID: ${moduleIdChoice.changedFrom} -> ${moduleIdChoice.id}`);
            }
          }
          plans.push(plan);
        }

        const yamlBackups: Array<{ path: string; original: string }> = [];
        try {
          for (const plan of plans) {
            if (plan.moduleIdChoice?.persist) {
              const original = readFileSync(plan.yamlPath, "utf8");
              yamlBackups.push({ path: plan.yamlPath, original });
              writeFileAtomic(plan.yamlPath, setCaseModuleId(original, plan.moduleIdChoice.id));
            }
          }
          for (const plan of plans) {
            const { featureDir, file, name } = plan;
            const startedAt = new Date();
            const artifacts = await renderArtifacts(file, featureDir, name, plan.formats);
            for (const artifact of artifacts) {
              assertWritable(featurePaths(featureDir), artifact.path);
            }
            const report = commitArtifacts(artifacts, featureDir, plan.formats === undefined);
            for (const path of report.created) console.log(`created ${path}`);
            for (const path of report.updated) console.log(`updated ${path}`);
            for (const path of report.unchanged) console.log(`unchanged ${path}`);
            for (const path of report.deleted) console.log(`deleted ${path}`);
            if ((report.contentChanged?.length ?? 0) > 0) {
              const changed = report.contentChanged ?? [];
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
                  updated_count: Math.max(0, changed.length - report.created.length),
                  artifact_paths: changed.map((path) => workspaceRelativePath(root, path)),
                  duration_ms: Date.now() - startedAt.getTime(),
                },
                { root },
              );
              process.stderr.write(
                `[notify] cases-built: ${result.state}${result.reason ? ` (${result.reason})` : ""}\n`,
              );
            }
          }
        } catch (error) {
          for (const backup of yamlBackups) writeFileAtomic(backup.path, backup.original);
          throw error;
        }
      },
    );
}
