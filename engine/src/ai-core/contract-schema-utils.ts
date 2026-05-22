import type { ContractFieldSpec, TopLevelFieldsResult } from "./specs.ts";
import type { AiCoreIssue } from "./types.ts";
import { parseTopLevelYamlFieldsCompat } from "./yaml-contract.ts";

export function requiredTopLevel(fields: string[]): ContractFieldSpec {
  return { required: fields, allowed: fields };
}

export function contractIssue(code: string, message: string, path: string): AiCoreIssue {
  return { code, severity: "error", message, path };
}

export function rejectUnknownFields(
  record: Record<string, unknown>,
  label: string,
  allowed: string[],
  path: string,
  issues: AiCoreIssue[],
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(record)) {
    if (!allowedSet.has(key)) {
      issues.push(
        contractIssue("contract.schema_invalid", `${label}.${key} is not an allowed field.`, path),
      );
    }
  }
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function yamlErrorToIssue(error: unknown, path: string): AiCoreIssue {
  const message = error instanceof Error ? error.message : String(error);
  const code = message.match(/^(yaml\.[A-Za-z0-9_.-]+):/)?.[1] ?? "yaml.parse_failed";
  return { code, severity: "error", message, path };
}

export function parseTopLevelFields(path: string, text: string): TopLevelFieldsResult {
  try {
    return { ok: true, value: parseTopLevelYamlFieldsCompat(text, path), issues: [] };
  } catch (error) {
    return { ok: false, issues: [yamlErrorToIssue(error, path)] };
  }
}

export function topLevelYamlIssues(path: string, text: string): AiCoreIssue[] {
  return parseTopLevelFields(path, text).issues;
}
