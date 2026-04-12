import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { symlinkPathComponentIssue } from "./containment.ts";
import { repoRoot } from "./paths.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";
import { parseYamlRows, parseYamlTopLevelScalars } from "./yaml-contract.ts";

type FreezeVendorOptions = {
  root?: string;
  id: string;
  sourceDir: string;
  simulateCommitFailureForTest?: boolean;
};

type CheckVendorOptions = {
  root?: string;
  coreRoot?: string;
  id: string;
};

export type VendorManifestFile = {
  path: string;
  sha256: string;
};

const VENDOR_ID = "playwright-cli";
const VENDOR_SKILL_ROOT = ".ai/vendor-skills/playwright-cli";
const VENDOR_CONTRACT_PATH = ".ai/core/external-skills/playwright-cli.yaml";
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const VENDOR_MANIFEST_ROW_KEYS = new Set(["path", "sha256"]);

function walk(root: string, issues: AiCoreIssue[] = [], displayRoot = root): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root).sort()) {
    const fullPath = join(root, entry);
    const lst = lstatSync(fullPath);
    if (lst.isSymbolicLink()) {
      issues.push({
        code: "vendor.manifest_path_invalid",
        severity: "error",
        message: "Vendor files must not contain symlinks.",
        path: `${VENDOR_SKILL_ROOT}/files/${relative(displayRoot, fullPath)}`,
      });
      continue;
    }
    const stat = statSync(fullPath);
    if (stat.isDirectory()) files.push(...walk(fullPath, issues, displayRoot));
    if (stat.isFile()) files.push(fullPath);
  }
  return files;
}

function digestFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function digestText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function validateVendorId(id: string): AiCoreIssue[] {
  if (id === VENDOR_ID) return [];
  return [
    {
      code: "vendor.unsupported_id",
      severity: "error",
      message: "Only playwright-cli is in the P0 kernel vendor scope.",
      path: `.ai/vendor-skills/${id}`,
    },
  ];
}

function sourceDirectoryIssues(sourceDir: string): AiCoreIssue[] {
  try {
    if (lstatSync(sourceDir).isSymbolicLink()) {
      return [
        {
          code: "vendor.source_path_invalid",
          severity: "error",
          message: "Vendor source path must not be a symlink.",
          path: sourceDir,
        },
      ];
    }
    if (statSync(sourceDir).isDirectory()) return [];
    return [
      {
        code: "vendor.source_not_directory",
        severity: "error",
        message: "Vendor source path is not a directory.",
        path: sourceDir,
      },
    ];
  } catch {
    return [
      {
        code: "vendor.source_missing",
        severity: "error",
        message: "Vendor source directory does not exist.",
        path: sourceDir,
      },
    ];
  }
}

function walkSource(root: string, issues: AiCoreIssue[] = []): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root).sort()) {
    const fullPath = join(root, entry);
    const lst = lstatSync(fullPath);
    if (lst.isSymbolicLink()) {
      issues.push({
        code: "vendor.source_path_invalid",
        severity: "error",
        message: "Vendor source files must not contain symlinks.",
        path: fullPath,
      });
      continue;
    }
    const stat = statSync(fullPath);
    if (stat.isDirectory()) files.push(...walkSource(fullPath, issues));
    if (stat.isFile()) files.push(fullPath);
  }
  return files;
}

function sourceShapeIssues(sourceDir: string, files: string[]): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  const relativeFiles = files.map((file) => relative(sourceDir, file));
  if (relativeFiles.length === 0) {
    issues.push({
      code: "vendor.source_shape_invalid",
      severity: "error",
      message: "Vendor source must include at least one file.",
      path: sourceDir,
    });
  }
  if (!relativeFiles.includes("SKILL.md")) {
    issues.push({
      code: "vendor.source_shape_invalid",
      severity: "error",
      message: "Vendor source must include SKILL.md.",
      path: join(sourceDir, "SKILL.md"),
    });
  }
  return issues;
}

function parseManifestText(content: string): AiCoreResult<{
  files: VendorManifestFile[];
  scalars: Record<string, string>;
}> {
  const path = `${VENDOR_SKILL_ROOT}/manifest.yaml`;
  const rows = parseYamlRows(content, path, "files");
  const scalars = parseYamlTopLevelScalars(content, path);
  const issues = [...rows.issues, ...scalars.issues];
  if (issues.length > 0) return { ok: false, issues };
  const rowIssues = vendorManifestRowIssues(rows.value ?? [], path);
  if (rowIssues.length > 0) return { ok: false, issues: rowIssues };
  return {
    ok: true,
    value: {
      files: (rows.value ?? []).map((row) => ({
        path: row.path ?? "",
        sha256: row.sha256 ?? "",
      })),
      scalars: scalars.value ?? {},
    },
    issues: [],
  };
}

function vendorManifestRowIssues(rows: Array<Record<string, string>>, path: string): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    const unknownKey = Object.keys(row).find((key) => !VENDOR_MANIFEST_ROW_KEYS.has(key));
    if (unknownKey) {
      issues.push({
        code: "yaml.unknown_row_field",
        severity: "error",
        message: `Vendor manifest row ${rowNumber} contains unknown field '${unknownKey}'.`,
        path,
      });
    }
    for (const requiredField of VENDOR_MANIFEST_ROW_KEYS) {
      if (row[requiredField] !== undefined && row[requiredField].length > 0) continue;
      issues.push({
        code: "yaml.missing_required_row_field",
        severity: "error",
        message: `Vendor manifest row ${rowNumber} is missing required field ${requiredField}.`,
        path,
      });
    }
  }
  return issues;
}

function readExternalManifestHash(content: string): string | undefined {
  const match = content.match(/^\s+manifest_hash:\s+sha256:([a-f0-9]{64})$/m);
  return match?.[1];
}

function manifestHashIssues(manifest: string, root: string, coreRoot?: string): AiCoreIssue[] {
  const contractPath = coreRoot
    ? join(coreRoot, "external-skills/playwright-cli.yaml")
    : join(root, VENDOR_CONTRACT_PATH);
  let contract: string;
  try {
    contract = readFileSync(contractPath, "utf8");
  } catch {
    return [
      {
        code: "vendor.external_contract_missing",
        severity: "error",
        message: "External skill contract for vendor skill is missing.",
        path: VENDOR_CONTRACT_PATH,
      },
    ];
  }
  const expected = readExternalManifestHash(contract);
  if (!expected) {
    return [
      {
        code: "vendor.manifest_hash_missing",
        severity: "error",
        message: "External skill contract must pin the frozen vendor manifest hash.",
        path: VENDOR_CONTRACT_PATH,
      },
    ];
  }
  if (expected !== digestText(manifest)) {
    return [
      {
        code: "vendor.manifest_hash_mismatch",
        severity: "error",
        message: "Vendor manifest hash does not match external skill contract.",
        path: VENDOR_CONTRACT_PATH,
      },
    ];
  }
  return [];
}

function manifestIdentityIssues(scalars: Record<string, string>): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  if (scalars.id !== VENDOR_ID) {
    issues.push({
      code: "vendor.manifest_identity_invalid",
      severity: "error",
      message: "Vendor manifest id must be playwright-cli.",
      path: `${VENDOR_SKILL_ROOT}/manifest.yaml`,
    });
  }
  if (scalars.canonical_name !== VENDOR_ID) {
    issues.push({
      code: "vendor.manifest_identity_invalid",
      severity: "error",
      message: "Vendor manifest canonical_name must be playwright-cli.",
      path: `${VENDOR_SKILL_ROOT}/manifest.yaml`,
    });
  }
  return issues;
}

function manifestShapeIssues(files: VendorManifestFile[]): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  const seen = new Set<string>();
  if (files.length === 0) {
    issues.push({
      code: "vendor.manifest_shape_invalid",
      severity: "error",
      message: "Vendor manifest must list at least one file.",
      path: `${VENDOR_SKILL_ROOT}/manifest.yaml`,
    });
  }
  if (!files.some((file) => file.path === "SKILL.md")) {
    issues.push({
      code: "vendor.manifest_shape_invalid",
      severity: "error",
      message: "Vendor manifest must include SKILL.md.",
      path: `${VENDOR_SKILL_ROOT}/manifest.yaml`,
    });
  }
  for (const file of files) {
    const path = `${VENDOR_SKILL_ROOT}/files/${file.path}`;
    if (!SHA256_PATTERN.test(file.sha256)) {
      issues.push({
        code: "vendor.manifest_shape_invalid",
        severity: "error",
        message: "Vendor manifest file sha256 must be a 64-character lowercase hex digest.",
        path,
      });
    }
    if (seen.has(file.path)) {
      issues.push({
        code: "vendor.manifest_shape_invalid",
        severity: "error",
        message: "Vendor manifest contains a duplicate file path.",
        path,
      });
    }
    seen.add(file.path);
  }
  return issues;
}

function vendorRootSymlinkIssues(vendorDir: string, filesRoot: string): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  try {
    if (lstatSync(vendorDir).isSymbolicLink()) {
      issues.push({
        code: "vendor.manifest_path_invalid",
        severity: "error",
        message: "Vendor skill root must not be a symlink.",
        path: VENDOR_SKILL_ROOT,
      });
    }
  } catch {
    return issues;
  }
  try {
    if (lstatSync(filesRoot).isSymbolicLink()) {
      issues.push({
        code: "vendor.manifest_path_invalid",
        severity: "error",
        message: "Vendor files root must not be a symlink.",
        path: `${VENDOR_SKILL_ROOT}/files`,
      });
    }
  } catch {
    return issues;
  }
  return issues;
}

function vendorPathComponentIssue(root: string): AiCoreIssue | undefined {
  return symlinkPathComponentIssue({
    root,
    relativePath: `${VENDOR_SKILL_ROOT}/files`,
    code: "vendor.manifest_path_invalid",
    message: "Vendor paths must not contain symlink components.",
  });
}

function invalidManifestPathIssue(filePath: string, filesRoot: string): AiCoreIssue | undefined {
  if (isAbsolute(filePath)) {
    return {
      code: "vendor.manifest_path_invalid",
      severity: "error",
      message: "Vendor manifest file path must be relative.",
      path: filePath,
    };
  }
  if (filePath.split(/[\\/]+/).includes("..")) {
    return {
      code: "vendor.manifest_path_invalid",
      severity: "error",
      message: "Vendor manifest file path must stay inside the vendor files root.",
      path: `${VENDOR_SKILL_ROOT}/files/${filePath}`,
    };
  }
  const resolvedFilesRoot = resolve(filesRoot);
  const resolvedFile = resolve(filesRoot, filePath);
  const relativePath = relative(resolvedFilesRoot, resolvedFile);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return {
      code: "vendor.manifest_path_invalid",
      severity: "error",
      message: "Vendor manifest file path must stay inside the vendor files root.",
      path: `${VENDOR_SKILL_ROOT}/files/${filePath}`,
    };
  }
  try {
    if (lstatSync(resolvedFile).isSymbolicLink()) {
      return {
        code: "vendor.manifest_path_invalid",
        severity: "error",
        message: "Vendor manifest file path must not be a symlink.",
        path: `${VENDOR_SKILL_ROOT}/files/${filePath}`,
      };
    }
  } catch {
    return undefined;
  }
  let current = resolvedFilesRoot;
  for (const part of filePath.split(/[\\/]+/)) {
    current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) {
        return {
          code: "vendor.manifest_path_invalid",
          severity: "error",
          message: "Vendor manifest file path must not contain symlinks.",
          path: `${VENDOR_SKILL_ROOT}/files/${filePath}`,
        };
      }
    } catch {
      break;
    }
  }
  return undefined;
}

export async function freezeVendorSkill(options: FreezeVendorOptions): Promise<AiCoreResult<null>> {
  const idIssues = validateVendorId(options.id);
  if (idIssues.length > 0) return { ok: false, issues: idIssues };
  const sourceIssues = sourceDirectoryIssues(options.sourceDir);
  if (sourceIssues.length > 0) return { ok: false, issues: sourceIssues };
  const root = options.root ?? repoRoot();
  const sourceWalkIssues: AiCoreIssue[] = [];
  const sourceFiles = walkSource(options.sourceDir, sourceWalkIssues);
  const sourceValidationIssues = [
    ...sourceWalkIssues,
    ...sourceShapeIssues(options.sourceDir, sourceFiles),
  ];
  if (sourceValidationIssues.length > 0) return { ok: false, issues: sourceValidationIssues };

  const pathIssue = vendorPathComponentIssue(root);
  if (pathIssue) return { ok: false, issues: [pathIssue] };

  const vendorParent = join(root, ".ai/vendor-skills");
  const vendorDir = join(vendorParent, VENDOR_ID);
  const unique = `${process.pid}-${Date.now()}`;
  const stageDir = join(vendorParent, `.playwright-cli.stage-${unique}`);
  const backupDir = join(vendorParent, `.playwright-cli.backup-${unique}`);
  mkdirSync(vendorParent, { recursive: true });
  rmSync(stageDir, { recursive: true, force: true });
  rmSync(backupDir, { recursive: true, force: true });
  try {
    const stageFiles = join(stageDir, "files");
    mkdirSync(stageFiles, { recursive: true });
    cpSync(options.sourceDir, stageFiles, { recursive: true });
    const walkIssues: AiCoreIssue[] = [];
    const files = walk(stageFiles, walkIssues, stageFiles).map((file) => ({
      path: relative(stageFiles, file),
      sha256: digestFile(file),
    }));
    if (walkIssues.length > 0) return { ok: false, issues: walkIssues };
    const manifest = [
      `id: ${VENDOR_ID}`,
      `canonical_name: ${VENDOR_ID}`,
      "files:",
      ...files.map((file) => `  - path: ${file.path}\n    sha256: ${file.sha256}`),
      "",
    ].join("\n");
    writeFileSync(join(stageDir, "manifest.yaml"), manifest);

    const hadVendor = existsSync(vendorDir);
    try {
      if (hadVendor) renameSync(vendorDir, backupDir);
      if (options.simulateCommitFailureForTest) {
        throw new Error("simulated vendor freeze failure");
      }
      renameSync(stageDir, vendorDir);
      rmSync(backupDir, { recursive: true, force: true });
    } catch {
      rmSync(vendorDir, { recursive: true, force: true });
      if (hadVendor && existsSync(backupDir)) renameSync(backupDir, vendorDir);
      return {
        ok: false,
        issues: [
          {
            code: "vendor.freeze_failed",
            severity: "error",
            message: "Vendor freeze failed while replacing the frozen artifact.",
            path: VENDOR_SKILL_ROOT,
          },
        ],
      };
    }
    return { ok: true, value: null, issues: [] };
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
    rmSync(backupDir, { recursive: true, force: true });
  }
}

export async function checkVendorSkill(options: CheckVendorOptions): Promise<AiCoreResult<null>> {
  const idIssues = validateVendorId(options.id);
  if (idIssues.length > 0) return { ok: false, issues: idIssues };
  const root = options.root ?? repoRoot();
  const manifestPath = join(root, VENDOR_SKILL_ROOT, "manifest.yaml");
  const filesRoot = join(root, VENDOR_SKILL_ROOT, "files");
  const vendorDir = join(root, VENDOR_SKILL_ROOT);
  const pathIssue = vendorPathComponentIssue(root);
  if (pathIssue) return { ok: false, issues: [pathIssue] };
  let manifest: string;
  try {
    manifest = readFileSync(manifestPath, "utf8");
  } catch {
    return {
      ok: false,
      issues: [
        {
          code: "vendor.manifest_missing",
          severity: "error",
          message: "Vendor manifest is missing.",
          path: `${VENDOR_SKILL_ROOT}/manifest.yaml`,
        },
      ],
    };
  }

  const issues: AiCoreIssue[] = [];
  const parsedManifest = parseManifestText(manifest);
  const manifestFiles = parsedManifest.ok ? (parsedManifest.value?.files ?? []) : [];
  const manifestScalars = parsedManifest.ok ? (parsedManifest.value?.scalars ?? {}) : {};
  issues.push(...vendorRootSymlinkIssues(vendorDir, filesRoot));
  issues.push(...parsedManifest.issues);
  if (!parsedManifest.ok) {
    try {
      walk(filesRoot, issues, filesRoot);
    } catch {
      // Missing files root is handled by manifest-dependent reconciliation for valid manifests.
    }
    return { ok: false, issues };
  }
  issues.push(...manifestHashIssues(manifest, root, options.coreRoot));
  issues.push(...manifestIdentityIssues(manifestScalars));
  issues.push(...manifestShapeIssues(manifestFiles));
  const manifestByPath = new Map(manifestFiles.map((file) => [file.path, file.sha256]));
  let actualFiles: string[];
  try {
    actualFiles = walk(filesRoot, issues, filesRoot).map((file) => relative(filesRoot, file));
  } catch {
    actualFiles = [];
  }

  for (const file of manifestFiles) {
    const invalidPath = invalidManifestPathIssue(file.path, filesRoot);
    if (invalidPath) {
      issues.push(invalidPath);
      continue;
    }
    const fullPath = join(filesRoot, file.path);
    let currentHash: string;
    try {
      currentHash = digestFile(fullPath);
    } catch {
      issues.push({
        code: "vendor.manifest_mismatch",
        severity: "error",
        message: "Frozen manifest references a missing vendored file.",
        path: `${VENDOR_SKILL_ROOT}/files/${file.path}`,
      });
      continue;
    }
    if (currentHash !== file.sha256) {
      issues.push({
        code: "vendor.manifest_mismatch",
        severity: "error",
        message: "Vendored file hash does not match frozen manifest.",
        path: `${VENDOR_SKILL_ROOT}/files/${file.path}`,
      });
    }
  }

  for (const file of actualFiles) {
    if (manifestByPath.has(file)) continue;
    issues.push({
      code: "vendor.manifest_mismatch",
      severity: "error",
      message: "Vendored file is not recorded in frozen manifest.",
      path: `${VENDOR_SKILL_ROOT}/files/${file}`,
    });
  }

  return { ok: issues.length === 0, value: null, issues };
}

export async function readVendorSkillManifestFiles(
  options: CheckVendorOptions,
): Promise<AiCoreResult<VendorManifestFile[]>> {
  const check = await checkVendorSkill(options);
  if (!check.ok) return { ok: false, issues: check.issues };
  const root = options.root ?? repoRoot();
  const manifest = readFileSync(join(root, VENDOR_SKILL_ROOT, "manifest.yaml"), "utf8");
  const parsed = parseManifestText(manifest);
  if (!parsed.ok) return { ok: false, issues: parsed.issues };
  return { ok: true, value: parsed.value?.files ?? [], issues: [] };
}
