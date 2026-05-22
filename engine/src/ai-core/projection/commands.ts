import { lstatSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { type ProjectionRuntime, skillProjectionPath } from "../../runtime/projection-targets.ts";
import { repoRoot } from "../paths.ts";
import type { RenderedSkillFile } from "../skill-renderer.ts";
import type { AiCoreIssue, AiCoreResult } from "../types.ts";
import { readVendorSkillManifestFiles } from "../vendor.ts";
import { loadCommandContracts, renderCommandIndexBlock } from "./command-contracts.ts";
import {
  checkProjectionContracts,
  checkRootRuntimeDoc,
  writeRootRuntimeDoc,
} from "./contract-checks.ts";
import type { ProjectionOptions } from "./runtime-docs.ts";
import { defaultCoreRoot, renderRuntimeIndex, renderSkills, runtimes } from "./runtime-docs.ts";
import {
  copiedVendorExtraIssues,
  copiedVendorRootIssue,
  defaultVendorRoot,
  deletedFilePresentIssues,
  deletedInventoryRows,
  projectionTargetPathIssue,
  projectionVendorPathComponentIssue,
  pruneDeletedRowIssues,
  pruneProjectionFile,
  renderVendorSkill,
  vendorRepoRoot,
  writeProjectionFile,
} from "./vendor-files.ts";

export async function renderProjection(options: ProjectionOptions): Promise<AiCoreResult<null>> {
  const root = options.outputRoot ?? repoRoot();
  const coreRoot = options.coreRoot ?? defaultCoreRoot();
  const vendorRoot = options.vendorRoot ?? defaultVendorRoot();
  const vendorFiles = await loadProjectionVendorFiles(vendorRoot, coreRoot);
  if (!vendorFiles.ok) return { ok: false, issues: vendorFiles.issues };

  const commandIndexBlock = loadProjectionCommandIndexBlock(coreRoot);
  if (!commandIndexBlock.ok) return { ok: false, issues: commandIndexBlock.issues };

  const generated = renderProjectionSkills(options, coreRoot);
  if (generated.issues.length > 0) return { ok: false, issues: generated.issues };

  const pathIssues = runtimes(options.runtime).flatMap((runtime) => {
    const issue = projectionVendorPathComponentIssue(root, runtime);
    return issue ? [issue] : [];
  });
  if (pathIssues.length > 0) return { ok: false, issues: pathIssues };

  for (const runtime of runtimes(options.runtime)) {
    const issue = writeProjectionRuntime(
      root,
      runtime,
      coreRoot,
      vendorRoot,
      commandIndexBlock.value,
      generated.byRuntime,
      vendorFiles.value ?? [],
    );
    if (issue) return { ok: false, issues: [issue] };

    const pruneIssues = pruneProjectionRuntime(root, coreRoot, runtime, options);
    if (pruneIssues.length > 0) return { ok: false, issues: pruneIssues };
  }
  return { ok: true, value: null, issues: [] };
}

async function loadProjectionVendorFiles(vendorRoot: string, coreRoot: string) {
  const vendorFiles = await readVendorSkillManifestFiles({
    id: "playwright-cli",
    root: vendorRepoRoot(vendorRoot),
    coreRoot,
  });
  return vendorFiles;
}

function loadProjectionCommandIndexBlock(coreRoot: string): AiCoreResult<string> {
  const commands = loadCommandContracts(coreRoot);
  if (!commands.ok) return { ok: false, issues: commands.issues };
  return { ok: true, value: renderCommandIndexBlock(commands.value ?? []), issues: [] };
}

function renderProjectionSkills(
  options: ProjectionOptions,
  coreRoot: string,
): {
  byRuntime: Map<ProjectionRuntime, RenderedSkillFile[]>;
  issues: AiCoreIssue[];
} {
  const generatedByRuntime = new Map<ProjectionRuntime, RenderedSkillFile[]>();
  const generatedIssues: AiCoreIssue[] = [];
  for (const runtime of runtimes(options.runtime)) {
    const rendered = renderSkills(runtime, coreRoot);
    if (rendered.ok) generatedByRuntime.set(runtime, rendered.value ?? []);
    else generatedIssues.push(...rendered.issues);
  }
  return { byRuntime: generatedByRuntime, issues: generatedIssues };
}

function writeProjectionRuntime(
  root: string,
  runtime: ProjectionRuntime,
  coreRoot: string,
  vendorRoot: string,
  commandIndexBlock: string,
  generatedByRuntime: Map<ProjectionRuntime, RenderedSkillFile[]>,
  vendorFiles: Awaited<ReturnType<typeof readVendorSkillManifestFiles>>["value"],
): AiCoreIssue | undefined {
  for (const file of generatedByRuntime.get(runtime) ?? []) {
    const issue = writeProjectionFile(root, file);
    if (issue) return issue;
  }
  const rootDocIssue = writeRootRuntimeDoc(root, runtime, commandIndexBlock, coreRoot);
  if (rootDocIssue) return rootDocIssue;

  const indexIssue = writeRuntimeIndexProjection(root, runtime, coreRoot);
  if (indexIssue) return indexIssue;

  return writeVendorRuntimeProjection(root, runtime, vendorRoot, vendorFiles ?? []);
}

function writeRuntimeIndexProjection(
  root: string,
  runtime: ProjectionRuntime,
  coreRoot: string,
): AiCoreIssue | undefined {
  const indexFile = renderRuntimeIndex(runtime, coreRoot);
  if (!indexFile) return undefined;
  return writeProjectionFile(root, indexFile);
}

function writeVendorRuntimeProjection(
  root: string,
  runtime: ProjectionRuntime,
  vendorRoot: string,
  vendorFiles: Awaited<ReturnType<typeof readVendorSkillManifestFiles>>["value"],
): AiCoreIssue | undefined {
  const vendorRootPath = dirname(skillProjectionPath(runtime, "playwright-cli"));
  const vendorRootPathIssue = projectionTargetPathIssue(root, vendorRootPath);
  if (vendorRootPathIssue) return vendorRootPathIssue;

  rmSync(join(root, vendorRootPath), { recursive: true, force: true });
  for (const file of renderVendorSkill(runtime, vendorRoot, vendorFiles ?? [])) {
    const issue = writeProjectionFile(root, file);
    if (issue) return issue;
  }
  return undefined;
}

function pruneProjectionRuntime(
  root: string,
  coreRoot: string,
  runtime: ProjectionRuntime,
  options: ProjectionOptions,
): AiCoreIssue[] {
  if (options.prune !== true) return [];
  const deletedRows = deletedInventoryRows(coreRoot, runtime);
  const deletedRowIssues = deletedRows.flatMap((row) => pruneDeletedRowIssues(row));
  if (deletedRowIssues.length > 0) return deletedRowIssues;
  return deletedRows.flatMap((row) => {
    const issue = pruneProjectionFile(root, row.path);
    return issue ? [issue] : [];
  });
}

export async function checkProjection(options: ProjectionOptions): Promise<AiCoreResult<null>> {
  const root = options.outputRoot ?? repoRoot();
  const coreRoot = options.coreRoot ?? defaultCoreRoot();
  const selectedRuntimes = runtimes(options.runtime);
  const vendorRoot = options.vendorRoot ?? defaultVendorRoot();
  const vendorFiles = await loadProjectionVendorFiles(vendorRoot, coreRoot);
  const issues = checkProjectionSetupIssues(coreRoot, selectedRuntimes, vendorFiles);
  const commandIndexBlock = loadProjectionCommandIndexBlock(coreRoot);
  if (!commandIndexBlock.ok) issues.push(...commandIndexBlock.issues);

  const generated = renderProjectionSkills(options, coreRoot);
  issues.push(...generated.issues);
  for (const runtime of selectedRuntimes) {
    issues.push(...deletedFilePresentIssues(root, coreRoot, runtime));
    const runtimePathIssue = projectionVendorPathComponentIssue(root, runtime);
    if (runtimePathIssue) {
      issues.push(runtimePathIssue);
      continue;
    }
    issues.push(...checkGeneratedRuntimeProjection(root, runtime, generated.byRuntime));
    if (commandIndexBlock.ok) {
      issues.push(...checkRootRuntimeDoc(root, runtime, commandIndexBlock.value ?? ""));
    }
    issues.push(...checkRuntimeIndexProjection(root, runtime, coreRoot));
    if (!vendorFiles.ok) continue;
    issues.push(
      ...checkVendorRuntimeProjection(root, runtime, vendorRoot, vendorFiles.value ?? []),
    );
  }
  return { ok: issues.length === 0, value: null, issues };
}

function checkProjectionSetupIssues(
  coreRoot: string,
  selectedRuntimes: ProjectionRuntime[],
  vendorFiles: Awaited<ReturnType<typeof readVendorSkillManifestFiles>>,
): AiCoreIssue[] {
  const issues = checkProjectionContracts(
    coreRoot,
    selectedRuntimes,
    vendorFiles.ok ? vendorFiles.value : undefined,
  );
  if (!vendorFiles.ok) issues.push(...vendorFiles.issues);
  return issues;
}

function checkGeneratedRuntimeProjection(
  root: string,
  runtime: ProjectionRuntime,
  generatedByRuntime: Map<ProjectionRuntime, RenderedSkillFile[]>,
): AiCoreIssue[] {
  return (generatedByRuntime.get(runtime) ?? []).flatMap((file) =>
    checkGeneratedProjectionFile(root, file),
  );
}

function checkGeneratedProjectionFile(root: string, file: RenderedSkillFile): AiCoreIssue[] {
  const pathIssue = projectionTargetPathIssue(root, file.path);
  if (pathIssue) return [pathIssue];
  try {
    const current = readFileSync(join(root, file.path), "utf8");
    return current === file.content
      ? []
      : [projectionDriftIssue(file.path, "Generated projection content is stale.")];
  } catch {
    return [projectionDriftIssue(file.path, "Generated projection content is missing.")];
  }
}

function checkRuntimeIndexProjection(
  root: string,
  runtime: ProjectionRuntime,
  coreRoot: string,
): AiCoreIssue[] {
  const indexFile = renderRuntimeIndex(runtime, coreRoot);
  if (!indexFile) return [];
  return checkGeneratedProjectionFile(root, indexFile);
}

function checkVendorRuntimeProjection(
  root: string,
  runtime: ProjectionRuntime,
  vendorRoot: string,
  vendorFiles: Awaited<ReturnType<typeof readVendorSkillManifestFiles>>["value"],
): AiCoreIssue[] {
  const copiedVendorRoot = copiedVendorRootIssue(root, runtime);
  if (copiedVendorRoot) return [copiedVendorRoot];

  const issues = copiedVendorExtraIssues(root, runtime, vendorFiles ?? []);
  for (const file of renderVendorSkill(runtime, vendorRoot, vendorFiles ?? [])) {
    issues.push(...checkCopiedVendorProjectionFile(root, file));
  }
  return issues;
}

function checkCopiedVendorProjectionFile(root: string, file: RenderedSkillFile): AiCoreIssue[] {
  const fullPath = join(root, file.path);
  try {
    if (lstatSync(fullPath).isSymbolicLink()) {
      return [
        projectionDriftIssue(file.path, "Copied vendor projection content must not be a symlink."),
      ];
    }
    const pathIssue = projectionTargetPathIssue(root, file.path);
    if (pathIssue) return [pathIssue];
    const current = readFileSync(fullPath);
    return current.equals(file.content)
      ? []
      : [projectionDriftIssue(file.path, "Copied vendor projection content is stale.")];
  } catch {
    return [projectionDriftIssue(file.path, "Copied vendor projection content is missing.")];
  }
}

function projectionDriftIssue(path: string, message: string): AiCoreIssue {
  return {
    code: "projection.drift",
    severity: "error",
    message,
    path,
  };
}
