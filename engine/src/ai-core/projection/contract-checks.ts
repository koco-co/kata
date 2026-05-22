import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { type ProjectionRuntime, skillProjectionPath } from "../../runtime/projection-targets.ts";
import { parseProjectionInventoryText } from "../projection-inventory.ts";
import type { RenderedSkillFile } from "../skill-renderer.ts";
import type { AiCoreIssue, AiCoreResult } from "../types.ts";
import type { VendorManifestFile } from "../vendor.ts";
import {
  commandIndexMarkerState,
  extractCommandIndexBlock,
  isPermittedRuntimeDocSymlink,
  mergeCommandIndexBlock,
  parseYamlStringList,
  rootRuntimeDocPath,
  sameStringSet,
} from "./command-contracts.ts";
import { indexDocPath, renderSkills } from "./runtime-docs.ts";
import {
  projectionTargetPathIssue,
  renderedCopiedVendorPaths,
  vendorSourcePath,
} from "./vendor-files.ts";

export function checkProjectionContracts(
  coreRoot: string,
  selectedRuntimes: ProjectionRuntime[],
  vendorFiles?: VendorManifestFile[],
): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  const selected = new Set<ProjectionRuntime>(selectedRuntimes);
  const generated = renderGeneratedProjectionFiles(coreRoot, selectedRuntimes);
  issues.push(...generated.issues);

  const inventoryPath = join(coreRoot, "runtimes/projection-inventory.yaml");
  const inventoryResult = parseProjectionInventoryText(
    readFileSync(inventoryPath, "utf8"),
    ".ai/core/runtimes/projection-inventory.yaml",
  );
  if (!inventoryResult.ok) return [...issues, ...inventoryResult.issues];
  const inventory = inventoryResult.value ?? [];
  issues.push(...generatedInventoryIssues(inventory, selected, selectedRuntimes, generated.files));
  if (vendorFiles)
    issues.push(...copiedVendorInventoryIssues(inventory, selected, selectedRuntimes, vendorFiles));

  for (const runtime of selectedRuntimes) {
    issues.push(
      ...runtimeProjectionContractIssues(coreRoot, runtime, generated.files, vendorFiles),
    );
  }
  return issues;
}

function renderGeneratedProjectionFiles(coreRoot: string, selectedRuntimes: ProjectionRuntime[]) {
  const files = new Map<ProjectionRuntime, RenderedSkillFile[]>();
  const issues: AiCoreIssue[] = [];
  for (const runtime of selectedRuntimes) {
    const rendered = renderSkills(runtime, coreRoot);
    if (rendered.ok) files.set(runtime, rendered.value ?? []);
    else issues.push(...rendered.issues);
  }
  return { files, issues };
}

function generatedPaths(
  runtime: ProjectionRuntime,
  generatedByRuntime: Map<ProjectionRuntime, RenderedSkillFile[]>,
): string[] {
  return [
    ...(generatedByRuntime.get(runtime) ?? []).map((file) => file.path),
    rootRuntimeDocPath(runtime),
    indexDocPath(runtime),
  ];
}

function generatedInventoryIssues(
  inventory: { disposition: string; runtime: string; path: string }[],
  selected: Set<ProjectionRuntime>,
  selectedRuntimes: ProjectionRuntime[],
  generatedByRuntime: Map<ProjectionRuntime, RenderedSkillFile[]>,
): AiCoreIssue[] {
  const inventoryGeneratedPaths = inventory
    .filter(
      (row) => row.disposition === "generated" && selected.has(row.runtime as ProjectionRuntime),
    )
    .map((row) => row.path);
  const actualGeneratedPaths = selectedRuntimes.flatMap((runtime) =>
    generatedPaths(runtime, generatedByRuntime),
  );
  return sameStringSet(inventoryGeneratedPaths, actualGeneratedPaths)
    ? []
    : [
        projectionInventoryMismatch(
          "Projection inventory generated files do not match renderer output.",
        ),
      ];
}

function copiedVendorInventoryIssues(
  inventory: { disposition: string; runtime: string; path: string; source?: string }[],
  selected: Set<ProjectionRuntime>,
  selectedRuntimes: ProjectionRuntime[],
  vendorFiles: VendorManifestFile[],
): AiCoreIssue[] {
  const rows = inventory.filter(
    (row) => row.disposition === "copied_vendor" && selected.has(row.runtime as ProjectionRuntime),
  );
  const actualPaths = selectedRuntimes.flatMap((runtime) =>
    renderedCopiedVendorPaths(runtime, vendorFiles),
  );
  const issues: AiCoreIssue[] = sameStringSet(
    rows.map((row) => row.path),
    actualPaths,
  )
    ? []
    : [
        projectionInventoryMismatch(
          "Projection inventory copied vendor files do not match renderer output.",
        ),
      ];
  const expectedSources = expectedVendorSources(selectedRuntimes, vendorFiles);
  if (rows.some((row) => row.source !== expectedSources.get(row.path))) {
    issues.push(
      projectionInventoryMismatch(
        "Projection inventory copied vendor source does not match frozen vendor artifact.",
      ),
    );
  }
  return issues;
}

function expectedVendorSources(
  selectedRuntimes: ProjectionRuntime[],
  vendorFiles: VendorManifestFile[],
): Map<string, string> {
  const expectedSources = new Map<string, string>();
  for (const runtime of selectedRuntimes) {
    const targetRoot = dirname(skillProjectionPath(runtime, "playwright-cli"));
    for (const file of vendorFiles) {
      expectedSources.set(join(targetRoot, file.path), vendorSourcePath(file));
    }
  }
  return expectedSources;
}

function runtimeProjectionContractIssues(
  coreRoot: string,
  runtime: ProjectionRuntime,
  generatedByRuntime: Map<ProjectionRuntime, RenderedSkillFile[]>,
  vendorFiles?: VendorManifestFile[],
): AiCoreIssue[] {
  const runtimePath = join(coreRoot, "runtimes", `${runtime}.yaml`);
  const contractPath = `.ai/core/runtimes/${runtime}.yaml`;
  const content = readFileSync(runtimePath, "utf8");
  const issues = runtimeGeneratedFilesIssues(content, contractPath, runtime, generatedByRuntime);
  if (issues.length > 0 || !vendorFiles) return issues;
  return [
    ...issues,
    ...runtimeCopiedVendorFilesIssues(content, contractPath, runtime, vendorFiles),
  ];
}

function runtimeGeneratedFilesIssues(
  content: string,
  contractPath: string,
  runtime: ProjectionRuntime,
  generatedByRuntime: Map<ProjectionRuntime, RenderedSkillFile[]>,
): AiCoreIssue[] {
  const parsed = parseYamlStringList(content, contractPath, "generated_files");
  if (!parsed.ok) return parsed.issues;
  return sameStringSet(parsed.value ?? [], generatedPaths(runtime, generatedByRuntime))
    ? []
    : [
        projectionRuntimeMismatch(
          "Runtime generated_files do not match renderer output.",
          contractPath,
        ),
      ];
}

function runtimeCopiedVendorFilesIssues(
  content: string,
  contractPath: string,
  runtime: ProjectionRuntime,
  vendorFiles: VendorManifestFile[],
): AiCoreIssue[] {
  const parsed = parseYamlStringList(content, contractPath, "copied_vendor_files");
  if (!parsed.ok) return parsed.issues;
  return sameStringSet(parsed.value ?? [], renderedCopiedVendorPaths(runtime, vendorFiles))
    ? []
    : [
        projectionRuntimeMismatch(
          "Runtime copied_vendor_files do not match renderer output.",
          contractPath,
        ),
      ];
}

function projectionInventoryMismatch(message: string): AiCoreIssue {
  return {
    code: "projection.inventory_mismatch",
    severity: "error",
    message,
    path: ".ai/core/runtimes/projection-inventory.yaml",
  };
}

function projectionRuntimeMismatch(message: string, path: string): AiCoreIssue {
  return { code: "projection.runtime_mismatch", severity: "error", message, path };
}

export function _repoRootFromCoreRoot(coreRoot: string): string {
  return dirname(dirname(coreRoot));
}

export function writeRootRuntimeDoc(
  root: string,
  runtime: ProjectionRuntime,
  commandIndexBlock: string,
  coreRoot: string,
): AiCoreIssue | undefined {
  const path = rootRuntimeDocPath(runtime);
  if (!isPermittedRuntimeDocSymlink(root, path)) {
    const pathIssue = projectionTargetPathIssue(root, path);
    if (pathIssue) return pathIssue;
  }
  const fullPath = join(root, path);
  const current = existsSync(fullPath) ? readFileSync(fullPath, "utf8") : undefined;
  const merged = mergeCommandIndexBlock(coreRoot, current, commandIndexBlock);
  if (!merged.ok) return { ...merged.issues[0], path };
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, merged.value ?? "");
  return undefined;
}

export function checkRootRuntimeDoc(
  root: string,
  runtime: ProjectionRuntime,
  commandIndexBlock: string,
): AiCoreIssue[] {
  const path = rootRuntimeDocPath(runtime);
  if (!isPermittedRuntimeDocSymlink(root, path)) {
    const pathIssue = projectionTargetPathIssue(root, path);
    if (pathIssue) return [pathIssue];
  }
  const current = readRuntimeDoc(root, path);
  if (!current.ok) return current.issues;

  return commandIndexBlockIssues(current.value ?? "", commandIndexBlock, path);
}

function readRuntimeDoc(root: string, path: string): AiCoreResult<string> {
  try {
    return { ok: true, value: readFileSync(join(root, path), "utf8"), issues: [] };
  } catch {
    return {
      ok: false,
      issues: [projectionDrift("Generated command index block is missing.", path)],
    };
  }
}

function commandIndexBlockIssues(
  current: string,
  commandIndexBlock: string,
  path: string,
): AiCoreIssue[] {
  const markerState = commandIndexMarkerState(current);
  if (!markerState.ok) {
    return [projectionDrift(markerState.message, path)];
  }
  if (markerState.completeBlocks !== 1) {
    return [
      projectionDrift(
        "Root runtime doc must contain exactly one complete command index block.",
        path,
      ),
    ];
  }
  if (extractCommandIndexBlock(current) !== commandIndexBlock) {
    return [projectionDrift("Generated command index block is stale.", path)];
  }
  return [];
}

function projectionDrift(message: string, path: string): AiCoreIssue {
  return { code: "projection.drift", severity: "error", message, path };
}
