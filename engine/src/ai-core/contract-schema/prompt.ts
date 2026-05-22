import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { contractIssue, isPlainRecord, rejectUnknownFields } from "../contract-schema-utils.ts";
import type { AiCoreIssue } from "../types.ts";

export function validatePromptContractShape(path: string, text: string): AiCoreIssue[] {
  const bun = (globalThis as { Bun?: { YAML?: { parse: (text: string) => unknown } } }).Bun;
  if (!bun?.YAML?.parse) {
    return [
      contractIssue(
        "prompt.yaml_parser_unavailable",
        "Bun.YAML.parse is required to validate PromptContract nested fields.",
        path,
      ),
    ];
  }

  let parsed: unknown;
  try {
    parsed = bun.YAML.parse(text);
  } catch (error) {
    return [
      contractIssue(
        "prompt.yaml_parse_failed",
        error instanceof Error ? error.message : String(error),
        path,
      ),
    ];
  }
  if (!isPlainRecord(parsed)) {
    return [
      contractIssue("contract.schema_invalid", "PromptContract root must be an object.", path),
    ];
  }

  const issues: AiCoreIssue[] = [];
  validateModelLock(parsed, path, issues);
  validateSchemaRefObject(parsed, "input_schema", path, issues);
  validateSchemaRefObject(parsed, "output_schema", path, issues);
  validateRendering(parsed, path, issues);
  validatePrefill(parsed, path, issues);
  validateFallback(parsed, path, issues);
  validateHallucinationPolicy(parsed, path, issues);

  return issues;
}

function validateModelLock(
  parsed: Record<string, unknown>,
  path: string,
  issues: AiCoreIssue[],
): void {
  const modelLock = requireObject(parsed, "model_lock", path, issues);
  if (modelLock) {
    rejectUnknownFields(
      modelLock,
      "model_lock",
      ["required_capabilities", "minimum_context_tokens"],
      path,
      issues,
    );
    requireStringArray(modelLock, "required_capabilities", "model_lock", path, issues, {
      minItems: 1,
    });
    requirePositiveInteger(modelLock, "minimum_context_tokens", "model_lock", path, issues);
  }
}

function validateRendering(
  parsed: Record<string, unknown>,
  path: string,
  issues: AiCoreIssue[],
): void {
  const rendering = requireObject(parsed, "rendering", path, issues);
  if (rendering) {
    rejectUnknownFields(rendering, "rendering", ["role_sections", "boundaries"], path, issues);
    validateRenderingRoleSections(rendering, path, issues);
    validateRenderingBoundaries(rendering, path, issues);
  }
}

function validateRenderingRoleSections(
  rendering: Record<string, unknown>,
  path: string,
  issues: AiCoreIssue[],
): void {
  const roleSections = requireObject(rendering, "role_sections", path, issues, "rendering");
  if (!roleSections) return;
  rejectUnknownFields(roleSections, "rendering.role_sections", ["system", "user"], path, issues);
  requireString(roleSections, "system", "rendering.role_sections", path, issues);
  requireString(roleSections, "user", "rendering.role_sections", path, issues);
}

function validateRenderingBoundaries(
  rendering: Record<string, unknown>,
  path: string,
  issues: AiCoreIssue[],
): void {
  const boundaries = requireObject(rendering, "boundaries", path, issues, "rendering");
  if (!boundaries) return;
  rejectUnknownFields(
    boundaries,
    "rendering.boundaries",
    ["untrusted_context_tag", "source_ref_tag"],
    path,
    issues,
  );
  requireString(boundaries, "untrusted_context_tag", "rendering.boundaries", path, issues);
  requireString(boundaries, "source_ref_tag", "rendering.boundaries", path, issues);
}

function validatePrefill(
  parsed: Record<string, unknown>,
  path: string,
  issues: AiCoreIssue[],
): void {
  const prefill = requireObject(parsed, "prefill", path, issues);
  if (prefill) {
    rejectUnknownFields(prefill, "prefill", ["enabled", "text"], path, issues);
    requireBoolean(prefill, "enabled", "prefill", path, issues);
    requireString(prefill, "text", "prefill", path, issues, { allowEmpty: true });
  }
}

function validateFallback(
  parsed: Record<string, unknown>,
  path: string,
  issues: AiCoreIssue[],
): void {
  const fallback = requireObject(parsed, "fallback", path, issues);
  if (fallback) {
    rejectUnknownFields(
      fallback,
      "fallback",
      ["deterministic_parse", "on_schema_error"],
      path,
      issues,
    );
    requireBoolean(fallback, "deterministic_parse", "fallback", path, issues);
    requireString(fallback, "on_schema_error", "fallback", path, issues);
  }
}

function validateHallucinationPolicy(
  parsed: Record<string, unknown>,
  path: string,
  issues: AiCoreIssue[],
): void {
  const hallucinationPolicy = requireObject(parsed, "hallucination_policy", path, issues);
  if (hallucinationPolicy) {
    rejectUnknownFields(
      hallucinationPolicy,
      "hallucination_policy",
      ["unknown_fact", "missing_source_ref"],
      path,
      issues,
    );
    requireString(hallucinationPolicy, "unknown_fact", "hallucination_policy", path, issues);
    requireString(hallucinationPolicy, "missing_source_ref", "hallucination_policy", path, issues);
  }
}

export function validateSchemaRefObject(
  root: Record<string, unknown>,
  key: string,
  path: string,
  issues: AiCoreIssue[],
): void {
  const value = requireObject(root, key, path, issues);
  if (!value) return;
  rejectUnknownFields(value, key, ["name", "required"], path, issues);
  requireString(value, "name", key, path, issues);
  requireStringArray(value, "required", key, path, issues);
}

export function requireObject(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: AiCoreIssue[],
  parent?: string,
): Record<string, unknown> | undefined {
  const value = record[key];
  const label = parent ? `${parent}.${key}` : key;
  if (isPlainRecord(value)) return value;
  issues.push(contractIssue("contract.schema_invalid", `${label} must be an object.`, path));
  return undefined;
}

export function requireString(
  record: Record<string, unknown>,
  key: string,
  parent: string,
  path: string,
  issues: AiCoreIssue[],
  options: { allowEmpty?: boolean } = {},
): void {
  const value = record[key];
  if (typeof value === "string" && (options.allowEmpty === true || value.length > 0)) return;
  issues.push(contractIssue("contract.schema_invalid", `${parent}.${key} must be a string.`, path));
}

export function requireBoolean(
  record: Record<string, unknown>,
  key: string,
  parent: string,
  path: string,
  issues: AiCoreIssue[],
): void {
  if (typeof record[key] === "boolean") return;
  issues.push(
    contractIssue("contract.schema_invalid", `${parent}.${key} must be a boolean.`, path),
  );
}

export function requirePositiveInteger(
  record: Record<string, unknown>,
  key: string,
  parent: string,
  path: string,
  issues: AiCoreIssue[],
): void {
  const value = record[key];
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return;
  issues.push(
    contractIssue("contract.schema_invalid", `${parent}.${key} must be a positive integer.`, path),
  );
}

export function requireStringArray(
  record: Record<string, unknown>,
  key: string,
  parent: string,
  path: string,
  issues: AiCoreIssue[],
  options: { minItems?: number } = {},
): void {
  const value = record[key];
  const minItems = options.minItems ?? 0;
  if (
    Array.isArray(value) &&
    value.length >= minItems &&
    value.every((item) => typeof item === "string" && item.length > 0)
  ) {
    return;
  }
  const prefix = minItems > 0 ? "a non-empty " : "a ";
  issues.push(
    contractIssue(
      "contract.schema_invalid",
      `${parent}.${key} must be ${prefix}string array.`,
      path,
    ),
  );
}

export function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function walk(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(root).sort()) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...walk(path));
    else if (stat.isFile() && basename(path).endsWith(".yaml")) files.push(path);
  }
  return files;
}
