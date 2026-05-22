import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { type ProjectionRuntime, skillProjectionPath } from "../../runtime/projection-targets.ts";
import { symlinkPathComponentIssue } from "../containment.ts";
import { repoRoot } from "../paths.ts";
import { parseProjectionInventory } from "../projection-inventory.ts";
import type { AiCoreIssue, ProjectionInventoryRow } from "../types.ts";
import type { VendorManifestFile } from "../vendor.ts";
import type { VendorProjectionFile } from "./runtime-docs.ts";

export function defaultVendorRoot(): string {
  return join(repoRoot(), ".ai/vendor-skills");
}

export function vendorRepoRoot(vendorRoot: string): string {
  return dirname(dirname(vendorRoot));
}

export function vendorSourcePath(file: VendorManifestFile): string {
  return `.ai/vendor-skills/playwright-cli/files/${file.path}`;
}

export function renderVendorSkill(
  runtime: ProjectionRuntime,
  vendorRoot: string,
  vendorFiles: VendorManifestFile[],
): VendorProjectionFile[] {
  const targetRoot = dirname(skillProjectionPath(runtime, "playwright-cli"));
  return vendorFiles.map((file) => ({
    path: join(targetRoot, file.path),
    content: readFileSync(join(vendorRoot, "playwright-cli/files", file.path)),
  }));
}

export function renderedCopiedVendorPaths(
  runtime: ProjectionRuntime,
  vendorFiles: VendorManifestFile[],
): string[] {
  const targetRoot = dirname(skillProjectionPath(runtime, "playwright-cli"));
  return vendorFiles.map((file) => join(targetRoot, file.path));
}

export function deletedInventoryRows(
  coreRoot: string,
  runtime: ProjectionRuntime,
): ProjectionInventoryRow[] {
  const inventory = parseProjectionInventory(
    readFileSync(join(coreRoot, "runtimes/projection-inventory.yaml"), "utf8"),
  );
  return inventory.filter((row) => row.runtime === runtime && row.disposition === "deleted");
}

export function deletedInventoryPaths(coreRoot: string, runtime: ProjectionRuntime): string[] {
  return deletedInventoryRows(coreRoot, runtime).map((row) => row.path);
}

export function walkRuntimeVendorFiles(root: string, displayRoot = root): string[] {
  const files: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(root).sort();
  } catch {
    return files;
  }
  for (const entry of entries) {
    const fullPath = join(root, entry);
    const stat = lstatSync(fullPath).isSymbolicLink() ? lstatSync(fullPath) : statSync(fullPath);
    if (stat.isDirectory()) files.push(...walkRuntimeVendorFiles(fullPath, displayRoot));
    if (stat.isFile() || stat.isSymbolicLink()) files.push(relative(displayRoot, fullPath));
  }
  return files;
}

export function copiedVendorExtraIssues(
  root: string,
  runtime: ProjectionRuntime,
  vendorFiles: VendorManifestFile[],
): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  const targetRoot = dirname(skillProjectionPath(runtime, "playwright-cli"));
  const expected = new Set(vendorFiles.map((file) => file.path));
  for (const filePath of walkRuntimeVendorFiles(join(root, targetRoot))) {
    if (expected.has(filePath)) continue;
    issues.push({
      code: "projection.drift",
      severity: "error",
      message: "Copied vendor projection contains an unmanifested file.",
      path: join(targetRoot, filePath),
    });
  }
  return issues;
}

export function copiedVendorRootIssue(
  root: string,
  runtime: ProjectionRuntime,
): AiCoreIssue | undefined {
  const targetRoot = dirname(skillProjectionPath(runtime, "playwright-cli"));
  const pathIssue = projectionVendorPathComponentIssue(root, runtime);
  if (pathIssue) return pathIssue;
  try {
    if (lstatSync(join(root, targetRoot)).isSymbolicLink()) {
      return {
        code: "projection.drift",
        severity: "error",
        message: "Copied vendor runtime skill root must not be a symlink.",
        path: targetRoot,
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function projectionVendorPathComponentIssue(
  root: string,
  runtime: ProjectionRuntime,
): AiCoreIssue | undefined {
  return symlinkPathComponentIssue({
    root,
    relativePath: dirname(skillProjectionPath(runtime, "playwright-cli")),
    code: "projection.drift",
    message: "Projection runtime vendor paths must not contain symlink components.",
  });
}

export function projectionTargetPathIssue(
  root: string,
  relativePath: string,
): AiCoreIssue | undefined {
  const absoluteRoot = resolve(root);
  const absoluteTarget = resolve(absoluteRoot, relativePath);
  const targetRelativeToRoot = relative(absoluteRoot, absoluteTarget);
  if (
    targetRelativeToRoot === "" ||
    targetRelativeToRoot.startsWith("..") ||
    isAbsolute(targetRelativeToRoot)
  ) {
    return {
      code: "projection.drift",
      severity: "error",
      message: "Projection target path must stay under output root.",
      path: relativePath,
    };
  }
  return symlinkPathComponentIssue({
    root,
    relativePath,
    code: "projection.drift",
    message: "Projection target paths must not contain symlink components.",
  });
}

export function pruneProjectionFile(root: string, relativePath: string): AiCoreIssue | undefined {
  const issue = projectionTargetPathIssue(root, relativePath);
  if (issue) return issue;
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) return undefined;
  if (lstatSync(fullPath).isDirectory()) {
    return {
      code: "projection.deleted_path_directory",
      severity: "error",
      message: "Deleted projection inventory paths must point to files, not directories.",
      path: relativePath,
    };
  }
  rmSync(fullPath, { force: true });
  return undefined;
}

export function pruneDeletedRowIssues(row: ProjectionInventoryRow): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  if (!row.source || !row.reason) {
    issues.push({
      code: "projection.deleted_missing_metadata",
      severity: "error",
      message: "Deleted rows require source and reason before pruning.",
      path: row.path,
    });
  }
  if (!isExplicitRuntimeFilePath(row.path)) {
    issues.push({
      code: "projection.deleted_not_file_path",
      severity: "error",
      message: "Deleted rows must point to explicit runtime files before pruning.",
      path: row.path,
    });
  }
  return issues;
}

export function isExplicitRuntimeFilePath(path: string): boolean {
  const fileName = path.split("/").filter(Boolean).at(-1) ?? "";
  return fileName.includes(".");
}

export function deletedFilePresentIssues(
  root: string,
  coreRoot: string,
  runtime: ProjectionRuntime,
): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  for (const path of deletedInventoryPaths(coreRoot, runtime)) {
    const pathIssue = projectionTargetPathIssue(root, path);
    if (pathIssue) {
      issues.push(pathIssue);
      continue;
    }
    if (!existsSync(join(root, path))) continue;
    issues.push({
      code: "projection.deleted_file_present",
      severity: "error",
      message: "Runtime file is present but projection inventory marks it deleted.",
      path,
    });
  }
  return issues;
}

export function writeProjectionFile(
  root: string,
  file: { path: string; content: string | Buffer },
): AiCoreIssue | undefined {
  const issue = projectionTargetPathIssue(root, file.path);
  if (issue) return issue;
  const fullPath = join(root, file.path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, file.content);
  return undefined;
}
