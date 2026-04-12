import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { repoRoot } from "./paths.ts";

export type RuntimeImportRecord = {
  source_id: string;
  target_id: string;
  status: string;
};

export class RuntimeImportRecordError extends Error {
  readonly code = "ai_core.import_record_invalid";
  readonly path: string;

  constructor(path: string, message: string) {
    super(`${path} ${message}`);
    this.name = "RuntimeImportRecordError";
    this.path = path;
  }
}

export async function buildRuntimeImportRecords(root = repoRoot()): Promise<RuntimeImportRecord[]> {
  const recordsRoot = join(root, ".ai", "core", "imports", "records");
  if (!existsSync(recordsRoot)) return [];

  return readdirSync(recordsRoot)
    .filter((entry) => entry.endsWith(".yaml"))
    .sort()
    .map((entry) => {
      const path = join(recordsRoot, entry);
      return validateRuntimeImportRecord(
        parseRuntimeImportRecord(readFileSync(path, "utf8")),
        relative(root, path),
      );
    });
}

function parseRuntimeImportRecord(content: string): Partial<RuntimeImportRecord> {
  const record: Partial<RuntimeImportRecord> = {};
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length === 0 || line.startsWith("#") || line.startsWith("- ") || !line.includes(":"))
      continue;
    const index = line.indexOf(":");
    const key = line.slice(0, index).trim();
    const value = readYamlScalar(line.slice(index + 1));
    if (key === "source_id") record.source_id = value;
    if (key === "target_id") record.target_id = value;
    if (key === "status") record.status = value;
  }
  return record;
}

export function validateRuntimeImportRecord(
  record: Partial<RuntimeImportRecord>,
  path: string,
): RuntimeImportRecord {
  const missing = (["source_id", "target_id", "status"] as const).filter((field) => !record[field]);
  if (missing.length > 0) {
    throw new RuntimeImportRecordError(path, `missing required fields: ${missing.join(", ")}`);
  }
  return record as RuntimeImportRecord;
}

function readYamlScalar(value: string): string {
  return value.trim().replace(/^"|"$/g, "");
}
