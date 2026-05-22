import { isCanonicalSourceRef } from "../../source-ref/resolvers.ts";
import { contractIssue, isPlainRecord } from "../contract-schema-utils.ts";
import type { ContractFieldSpec } from "../specs.ts";
import {
  AMBIGUITY_CLASSES,
  AUTOMATION_STATUSES,
  CONFIDENCE_LEVELS,
  CONTRACT_ID_PATTERN,
  COVERAGE_EVIDENCE_STATUSES,
  COVERAGE_TYPES,
  REQUIREMENT_EVIDENCE_KINDS,
  RISK_LEVELS,
  SOURCE_REF_TYPES,
} from "../specs.ts";
import type { AiCoreIssue } from "../types.ts";
import { parseYamlContract, yamlIssues } from "../yaml-contract.ts";
import { validateTopLevelContract } from "./generated-blocks.ts";

export function validateIterativeCaseDraftContract(
  path: string,
  text: string,
  spec: ContractFieldSpec,
): AiCoreIssue[] {
  const parsed = parseYamlObjectForIterativeContract(path, text);
  const issues = parsed
    ? validateTopLevelObjectContract(path, parsed, spec)
    : validateTopLevelContract(path, text, spec);
  const contract = parseYamlContract(text, path);
  issues.push(
    ...yamlIssues(contract).filter(
      (issue) =>
        issue.code !== "yaml.unsupported_indentation" &&
        issue.code !== "yaml.unsupported_inline_mapping" &&
        issue.code !== "yaml.unsupported_mapping_list_item" &&
        issue.code !== "yaml.unsupported_nested_structure",
    ),
  );

  validateEnumField(path, issues, contract.scalars, "source_type", SOURCE_REF_TYPES);
  validateEnumField(path, issues, contract.scalars, "evidence_kind", REQUIREMENT_EVIDENCE_KINDS);
  validateEnumField(path, issues, contract.scalars, "severity", AMBIGUITY_CLASSES);
  validateEnumField(path, issues, contract.scalars, "ambiguity_class", AMBIGUITY_CLASSES);
  validateEnumField(path, issues, contract.scalars, "confidence", CONFIDENCE_LEVELS);
  validateEnumField(path, issues, contract.scalars, "coverage_type", COVERAGE_TYPES);
  validateEnumField(path, issues, contract.scalars, "risk_level", RISK_LEVELS);
  validateEnumField(path, issues, contract.scalars, "evidence_status", COVERAGE_EVIDENCE_STATUSES);
  validateEnumField(path, issues, contract.scalars, "automation_status", AUTOMATION_STATUSES);
  if (parsed) validateCanonicalSourceRefFields(path, issues, parsed);

  return issues;
}

export function validateCanonicalSourceRefFields(
  path: string,
  issues: AiCoreIssue[],
  contract: Record<string, unknown>,
): void {
  const sourceRefs = contract.source_refs;
  if (sourceRefs !== undefined) {
    if (!Array.isArray(sourceRefs)) {
      issues.push(
        contractIssue(
          "contract.schema_invalid",
          "source_refs must be an array of canonical SourceRef strings.",
          path,
        ),
      );
    } else {
      for (const entry of sourceRefs) {
        if (typeof entry !== "string" || !isCanonicalSourceRef(entry)) {
          issues.push(
            contractIssue(
              "contract.schema_invalid",
              `Invalid source_refs entry: ${String(entry)}`,
              path,
            ),
          );
        }
      }
    }
  }

  const sourceRef = contract.source_ref;
  if (
    sourceRef !== undefined &&
    (typeof sourceRef !== "string" || !isCanonicalSourceRef(sourceRef))
  ) {
    issues.push(
      contractIssue("contract.schema_invalid", `Invalid source_ref: ${String(sourceRef)}`, path),
    );
  }
}

export function parseYamlObjectForIterativeContract(
  _path: string,
  text: string,
): Record<string, unknown> | undefined {
  const bun = (globalThis as { Bun?: { YAML?: { parse: (text: string) => unknown } } }).Bun;
  if (!bun?.YAML?.parse) return undefined;

  try {
    const parsed = bun.YAML.parse(text);
    return isPlainRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function validateTopLevelObjectContract(
  path: string,
  fields: Record<string, unknown>,
  spec: ContractFieldSpec,
): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  const allowed = new Set(spec.allowed);
  for (const field of spec.required) {
    if (!(field in fields)) {
      issues.push(
        contractIssue("contract.schema_invalid", `Missing required contract field: ${field}`, path),
      );
    }
  }
  for (const field of Object.keys(fields)) {
    if (!allowed.has(field)) {
      issues.push(
        contractIssue("contract.schema_invalid", `Unknown contract field: ${field}`, path),
      );
    }
  }
  validateContractFieldTypes(path, issues, fields, spec.fieldTypes ?? {});
  if ("id" in fields) {
    const idPattern = spec.idPattern ?? CONTRACT_ID_PATTERN;
    if (typeof fields.id !== "string" || !idPattern.test(fields.id)) {
      issues.push(
        contractIssue("contract.schema_invalid", `Invalid contract id: ${String(fields.id)}`, path),
      );
    }
  }
  if (spec.schemaRef && fields.schema_ref !== spec.schemaRef) {
    issues.push(
      contractIssue(
        "contract.schema_invalid",
        `Contract schema_ref must be ${spec.schemaRef}`,
        path,
      ),
    );
  }
  return issues;
}

export function validateContractFieldTypes(
  path: string,
  issues: AiCoreIssue[],
  fields: Record<string, unknown>,
  fieldTypes: Record<string, ContractFieldType>,
): void {
  for (const [field, fieldType] of Object.entries(fieldTypes)) {
    if (!(field in fields)) continue;
    const value = fields[field];
    const ok = isContractFieldType(value, fieldType);
    if (!ok) {
      issues.push(
        contractIssue(
          "contract.schema_invalid",
          `${field} must be ${describeContractFieldType(fieldType)}.`,
          path,
        ),
      );
    }
  }
}

export function isContractFieldType(value: unknown, fieldType: ContractFieldType): boolean {
  switch (fieldType) {
    case "array":
      return Array.isArray(value);
    case "boolean":
      return typeof value === "boolean";
    case "nonNegativeInteger":
      return Number.isInteger(value) && typeof value === "number" && value >= 0;
    case "nullableString":
      return value === null || typeof value === "string";
    case "string":
      return typeof value === "string";
    case "stringArray":
      return Array.isArray(value) && value.every((entry) => typeof entry === "string");
  }
}

export function describeContractFieldType(fieldType: ContractFieldType): string {
  switch (fieldType) {
    case "array":
      return "an array";
    case "boolean":
      return "a boolean";
    case "nonNegativeInteger":
      return "a non-negative integer";
    case "nullableString":
      return "a string or null";
    case "string":
      return "a string";
    case "stringArray":
      return "an array of strings";
  }
}

export function validateEnumField(
  path: string,
  issues: AiCoreIssue[],
  scalars: Map<string, string | true>,
  field: string,
  allowed: Set<string>,
): void {
  const value = scalars.get(field);
  if (value === undefined || value === true || allowed.has(value)) return;
  issues.push(contractIssue("contract.schema_invalid", `Invalid ${field}: ${value}.`, path));
}
