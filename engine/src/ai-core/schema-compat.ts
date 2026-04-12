import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadAiCore } from "./load.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";

type SchemaCompatOptions = {
  root?: string;
  coreRoot?: string;
};

export async function runSchemaCompatCheck(
  options: SchemaCompatOptions = {},
): Promise<AiCoreResult<null>> {
  const core = await loadAiCore(options);
  const issues: AiCoreIssue[] = [];
  for (const schema of core.schemas) {
    if (!Number.isInteger(schema.version) || schema.version < 1) {
      issues.push({
        code: "schema_compat.invalid_version",
        severity: "error",
        message: "Schema version must be a positive integer.",
        path: schema.path,
        contractId: schema.id,
      });
    }
    if (!existsSync(join(core.root, schema.path))) {
      issues.push({
        code: "schema_compat.missing_file",
        severity: "error",
        message: "Schema file is missing.",
        path: schema.path,
        contractId: schema.id,
      });
    }
  }
  return { ok: issues.length === 0, value: null, issues };
}
