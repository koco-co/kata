import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { repoRoot } from "./paths.ts";
import type {
  AiCoreIssue,
  AiCoreResult,
  ProjectionDisposition,
  ProjectionInventoryRow,
  ProjectionRuntimeName,
} from "./types.ts";
import { parseYamlRows } from "./yaml-contract.ts";

const DISPOSITIONS = new Set<ProjectionDisposition>([
  "generated",
  "copied_vendor",
  "local_exception",
  "deleted",
]);

const RUNTIMES = new Set<ProjectionRuntimeName>(["claude", "codex", "root"]);
const ROOT_RUNTIME_DOCS = ["AGENTS.md", "CLAUDE.md", "GEMINI.md"];
const LOCAL_RUNTIME_FILES = new Set([".claude/settings.local.json"]);
const PROJECTION_INVENTORY_ROW_KEYS = new Set([
  "path",
  "runtime",
  "disposition",
  "source",
  "owner",
  "expires",
  "reason",
]);

export type ValidateProjectionInventoryOptions = {
  files: string[];
  inventory: ProjectionInventoryRow[];
};

export function parseProjectionInventory(content: string): ProjectionInventoryRow[] {
  const result = parseProjectionInventoryText(content);
  if (!result.ok) throw new Error(result.issues.map(formatIssue).join("; "));
  return result.value ?? [];
}

export function parseProjectionInventoryText(
  content: string,
  path = ".ai/core/runtimes/projection-inventory.yaml",
): AiCoreResult<ProjectionInventoryRow[]> {
  const parsed = parseYamlRows(content, path, "files");
  if (!parsed.ok) return { ok: false, issues: parsed.issues };
  const rows: ProjectionInventoryRow[] = [];
  for (const [index, row] of (parsed.value ?? []).entries()) {
    const unknownKey = unknownRowKey(row, PROJECTION_INVENTORY_ROW_KEYS);
    if (unknownKey) {
      return {
        ok: false,
        issues: [
          yamlIssue(
            "yaml.unknown_row_field",
            `Projection inventory row ${index + 1} contains unknown field '${unknownKey}'.`,
            path,
          ),
        ],
      };
    }
    const current: Partial<ProjectionInventoryRow> = {};
    for (const [key, value] of Object.entries(row)) {
      assignProjectionInventoryValue(current, key, value);
    }
    if (isProjectionInventoryRow(current)) {
      rows.push(current);
      continue;
    }
    return {
      ok: false,
      issues: [
        yamlIssue(
          "yaml.missing_required_row_field",
          `Projection inventory row ${index + 1} requires path, runtime, and disposition.`,
          path,
        ),
      ],
    };
  }
  return { ok: true, value: rows, issues: [] };
}

export function scanRuntimeFiles(root = repoRoot()): string[] {
  return sorted(
    [
      ...walkRuntimeTree(root, ".agents"),
      ...walkRuntimeTree(root, ".claude"),
      ...ROOT_RUNTIME_DOCS.filter((path) => existsSync(join(root, path))),
    ].filter(isInventoryRuntimeFile),
  );
}

export function validateProjectionInventory(
  options: ValidateProjectionInventoryOptions,
): AiCoreResult<ProjectionInventoryRow[]> {
  const inventoryByPath = new Map(options.inventory.map((row) => [row.path, row]));
  const issues: AiCoreIssue[] = [];

  for (const row of options.inventory) {
    if (row.disposition === "local_exception") validateLocalException(row, issues);
    if (row.disposition === "deleted") validateDeleted(row, issues);
  }

  for (const path of sorted(options.files)) {
    const row = inventoryByPath.get(path);
    if (row?.disposition === "deleted") {
      issues.push({
        code: "projection_inventory.deleted_file_present",
        severity: "error",
        message: "Runtime file is present but projection inventory marks it deleted.",
        path,
      });
      continue;
    }
    if (row) continue;
    issues.push({
      code: "projection_inventory.unclassified_file",
      severity: "error",
      message: "Runtime file is not classified in projection inventory.",
      path,
    });
  }
  return {
    ok: issues.length === 0,
    value: options.inventory,
    issues,
  };
}

function validateLocalException(row: ProjectionInventoryRow, issues: AiCoreIssue[]): void {
  if (!row.owner || !row.expires || !row.reason) {
    issues.push({
      code: "projection_inventory.local_exception_missing_metadata",
      severity: "error",
      message: "Local exception rows require owner, expires, and reason.",
      path: row.path,
    });
    return;
  }
  if (!isIsoDate(row.expires)) {
    issues.push({
      code: "projection_inventory.local_exception_invalid_expiry",
      severity: "error",
      message: "Local exception expires must use YYYY-MM-DD format.",
      path: row.path,
    });
    return;
  }
  if (row.expires < todayIsoDate()) {
    issues.push({
      code: "projection_inventory.local_exception_expired",
      severity: "error",
      message: "Local exception expiry has passed.",
      path: row.path,
    });
  }
}

function validateDeleted(row: ProjectionInventoryRow, issues: AiCoreIssue[]): void {
  if (!row.source || !row.reason) {
    issues.push({
      code: "projection_inventory.deleted_missing_metadata",
      severity: "error",
      message: "Deleted rows require source and reason.",
      path: row.path,
    });
  }
  if (!isExplicitRuntimeFilePath(row.path)) {
    issues.push({
      code: "projection_inventory.deleted_not_file_path",
      severity: "error",
      message: "Deleted rows must point to explicit runtime files.",
      path: row.path,
    });
  }
}

function isExplicitRuntimeFilePath(path: string): boolean {
  const fileName = path.split("/").filter(Boolean).at(-1) ?? "";
  return fileName.includes(".");
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function assignProjectionInventoryValue(
  row: Partial<ProjectionInventoryRow>,
  key: string,
  value: string,
): void {
  if (key === "path") row.path = value;
  if (key === "runtime" && RUNTIMES.has(value as ProjectionRuntimeName)) {
    row.runtime = value as ProjectionRuntimeName;
  }
  if (key === "disposition" && DISPOSITIONS.has(value as ProjectionDisposition)) {
    row.disposition = value as ProjectionDisposition;
  }
  if (key === "source") row.source = value;
  if (key === "owner") row.owner = value;
  if (key === "expires") row.expires = value;
  if (key === "reason") row.reason = value;
}

function isProjectionInventoryRow(
  row: Partial<ProjectionInventoryRow> | undefined,
): row is ProjectionInventoryRow {
  return Boolean(row?.path && row.runtime && row.disposition);
}

function walkRuntimeTree(root: string, runtimeRoot: string): string[] {
  const absoluteRoot = join(root, runtimeRoot);
  if (!existsSync(absoluteRoot)) return [];
  return walkFiles(absoluteRoot).map((path) => relative(root, path));
}

function walkFiles(root: string): string[] {
  const entries = readdirSync(root).sort();
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) files.push(...walkFiles(fullPath));
    if (stat.isFile()) files.push(fullPath);
  }
  return files;
}

function sorted(values: string[]): string[] {
  return [...values].sort();
}

function isInventoryRuntimeFile(path: string): boolean {
  const fileName = path.split("/").filter(Boolean).at(-1) ?? "";
  if (fileName === ".DS_Store") return false;
  if (path.startsWith(".claude/worktrees/") || path.startsWith(".agents/worktrees/")) return false;
  if (path.startsWith(".claude/") && fileName.endsWith(".lock")) return false;
  return !LOCAL_RUNTIME_FILES.has(path);
}

function formatIssue(issue: AiCoreIssue): string {
  return `${issue.code}: ${issue.message} (${issue.path})`;
}

function unknownRowKey(row: Record<string, string>, allowedKeys: Set<string>): string | undefined {
  return Object.keys(row).find((key) => !allowedKeys.has(key));
}

function yamlIssue(code: string, message: string, path: string): AiCoreIssue {
  return { code, severity: "error", message, path };
}
