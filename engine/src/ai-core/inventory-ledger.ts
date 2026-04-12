import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./paths.ts";
import type {
  AiCoreIssue,
  AiCoreResult,
  ProjectionDisposition,
  ProjectionInventoryRow,
  ProjectionRuntimeName,
} from "./types.ts";
import { parseYamlRows, parseYamlTopLevelScalars } from "./yaml-contract.ts";

export type InventoryLedgerFile = {
  source?: string;
  reason?: string;
  files: Array<{
    path: string;
    runtime: ProjectionRuntimeName;
    source?: string;
    reason?: string;
  }>;
};

type LedgerSpec = {
  path: string;
  disposition: ProjectionDisposition;
};

const INVENTORY_LEDGER_SPECS: LedgerSpec[] = [
  { path: "generated.yaml", disposition: "generated" },
  { path: "copied-vendor.yaml", disposition: "copied_vendor" },
  { path: "deleted.yaml", disposition: "deleted" },
  { path: "local-exceptions.yaml", disposition: "local_exception" },
];
const INVENTORY_LEDGER_ROW_KEYS = new Set(["path", "runtime", "source", "reason"]);

export function buildProjectionInventoryFromLedgers(root = repoRoot()): ProjectionInventoryRow[] {
  const ledgerRoot = join(root, ".ai/core/runtimes/inventory-ledgers");
  const rows = INVENTORY_LEDGER_SPECS.flatMap((spec) =>
    rowsFromLedger(readLedger(join(ledgerRoot, spec.path)), spec.disposition),
  );
  return sortRows(rows);
}

export function renderProjectionInventory(rows: ProjectionInventoryRow[]): string {
  const renderedRows = sortRows(rows).flatMap((row) => {
    const lines = [
      `  - path: ${renderYamlScalar(row.path)}`,
      `    runtime: ${row.runtime}`,
      `    disposition: ${row.disposition}`,
    ];
    if (row.source) lines.push(`    source: ${renderYamlScalar(row.source)}`);
    if (row.owner) lines.push(`    owner: ${renderYamlScalar(row.owner)}`);
    if (row.expires) lines.push(`    expires: ${renderYamlScalar(row.expires)}`);
    if (row.reason) lines.push(`    reason: ${renderYamlScalar(row.reason)}`);
    return lines;
  });
  return ["files:", ...renderedRows, ""].join("\n");
}

export function rewriteProjectionInventoryFromLedgers(root = repoRoot()): void {
  const rows = buildProjectionInventoryFromLedgers(root);
  writeFileSync(
    join(root, ".ai/core/runtimes/projection-inventory.yaml"),
    renderProjectionInventory(rows),
  );
}

function rowsFromLedger(
  ledger: InventoryLedgerFile,
  disposition: ProjectionDisposition,
): ProjectionInventoryRow[] {
  return ledger.files.map((file) =>
    normalizeRow({
      path: file.path,
      runtime: file.runtime,
      disposition,
      source: file.source ?? ledger.source,
      reason: file.reason ?? ledger.reason,
    }),
  );
}

function normalizeRow(row: ProjectionInventoryRow): ProjectionInventoryRow {
  return row;
}

function readLedger(path: string): InventoryLedgerFile {
  if (!existsSync(path)) return { files: [] };
  const result = parseInventoryLedgerText(readFileSync(path, "utf8"), path);
  if (!result.ok) throw new Error(result.issues.map(formatIssue).join("; "));
  return result.value!;
}

export function parseInventoryLedgerText(
  text: string,
  path: string,
): AiCoreResult<InventoryLedgerFile> {
  const rows = parseYamlRows(text, path, "files");
  const scalars = parseYamlTopLevelScalars(text, path);
  const issues = [...rows.issues, ...scalars.issues];
  if (issues.length > 0) return { ok: false, issues };

  const ledger: InventoryLedgerFile = {
    source: scalars.value?.source,
    reason: scalars.value?.reason,
    files: [],
  };
  for (const [index, row] of (rows.value ?? []).entries()) {
    const unknownKey = unknownRowKey(row, INVENTORY_LEDGER_ROW_KEYS);
    if (unknownKey) {
      return {
        ok: false,
        issues: [
          yamlIssue(
            "yaml.unknown_row_field",
            `Inventory ledger row ${index + 1} contains unknown field '${unknownKey}'.`,
            path,
          ),
        ],
      };
    }
    const file: Partial<InventoryLedgerFile["files"][number]> = {
      path: row.path,
      source: row.source,
      reason: row.reason,
    };
    if (isRuntime(row.runtime)) file.runtime = row.runtime;
    if (!file.path || !file.runtime) {
      return {
        ok: false,
        issues: [
          yamlIssue(
            "yaml.missing_required_row_field",
            `Inventory ledger row ${index + 1} requires path and runtime.`,
            path,
          ),
        ],
      };
    }
    ledger.files.push(file as InventoryLedgerFile["files"][number]);
  }
  return { ok: true, value: ledger, issues: [] };
}

function isRuntime(value: string): value is ProjectionRuntimeName {
  return value === "claude" || value === "codex" || value === "root";
}

function renderYamlScalar(value: string): string {
  return /[#:{}[\],&*?|<>=!%@`]/.test(value) ? JSON.stringify(value) : value;
}

function sortRows(rows: ProjectionInventoryRow[]): ProjectionInventoryRow[] {
  return [...rows].sort((left, right) => {
    if (left.path < right.path) return -1;
    if (left.path > right.path) return 1;
    return left.runtime.localeCompare(right.runtime);
  });
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
