import { contractIssue, parseTopLevelFields } from "../contract-schema-utils.ts";
import type { ContractFieldSpec } from "../specs.ts";
import {
  CONTRACT_ID_PATTERN,
  DOC_BLOCK_ID_PATTERN,
  DOC_BLOCK_SOURCES,
  DOC_BLOCK_TARGETS,
  SKILL_ORCHESTRATION_FIELDS,
  SUPPORTED_DOC_BLOCK_IDS,
} from "../specs.ts";
import type { AiCoreIssue } from "../types.ts";
import { parseYamlRows } from "../yaml-contract.ts";
import { validateRowListFile } from "./entry.ts";

export function validateGeneratedBlocksContract(path: string, text: string): AiCoreIssue[] {
  const issues = validateRowListFile(path, text, {
    key: "blocks",
    required: ["id", "source", "targets"],
    allowed: ["id", "source", "targets"],
  });
  const result = parseYamlRows(text, path, "blocks");
  if (!result.ok) return issues;

  const seenIds = new Set<string>();
  for (const [index, row] of (result.value ?? []).entries()) {
    const rowNumber = index + 1;
    validateDocBlockId(row, rowNumber, seenIds, path, issues);
    seenIds.add(row.id);
    validateDocBlockSource(row, rowNumber, path, issues);
    validateDocBlockTargets(row, rowNumber, path, issues);
  }
  return issues;
}

function validateDocBlockId(
  row: Record<string, string>,
  rowNumber: number,
  seenIds: Set<string>,
  path: string,
  issues: AiCoreIssue[],
): void {
  if (!DOC_BLOCK_ID_PATTERN.test(row.id ?? "")) {
    issues.push(
      contractIssue(
        "contract.schema_invalid",
        `docs blocks row ${rowNumber} has invalid id: ${row.id}.`,
        path,
      ),
    );
  } else if (!SUPPORTED_DOC_BLOCK_IDS.has(row.id)) {
    issues.push(
      contractIssue(
        "contract.schema_invalid",
        `docs blocks row ${rowNumber} has unsupported id: ${row.id}.`,
        path,
      ),
    );
  } else if (seenIds.has(row.id)) {
    issues.push(
      contractIssue(
        "contract.schema_invalid",
        `docs blocks row ${rowNumber} duplicates id: ${row.id}.`,
        path,
      ),
    );
  }
}

function validateDocBlockSource(
  row: Record<string, string>,
  rowNumber: number,
  path: string,
  issues: AiCoreIssue[],
): void {
  if (DOC_BLOCK_SOURCES.has(row.source ?? "")) return;
  issues.push(
    contractIssue(
      "contract.schema_invalid",
      `docs blocks row ${rowNumber} has invalid source: ${row.source}.`,
      path,
    ),
  );
}

function validateDocBlockTargets(
  row: Record<string, string>,
  rowNumber: number,
  path: string,
  issues: AiCoreIssue[],
): void {
  const targets = (row.targets ?? "").split("\n").filter(Boolean);
  if (targets.length === 0) {
    issues.push(
      contractIssue(
        "contract.schema_invalid",
        `docs blocks row ${rowNumber} must declare at least one target.`,
        path,
      ),
    );
  }
  for (const target of targets) {
    if (!DOC_BLOCK_TARGETS.has(target)) {
      issues.push(
        contractIssue(
          "contract.schema_invalid",
          `docs blocks row ${rowNumber} has invalid target: ${target}.`,
          path,
        ),
      );
    }
  }
}

export function validateTranslationGlossaryContract(path: string, text: string): AiCoreIssue[] {
  const issues = validateRowListFile(path, text, {
    key: "terms",
    required: ["id", "zh-CN", "en-US"],
    allowed: ["id", "zh-CN", "en-US"],
  });
  const result = parseYamlRows(text, path, "terms");
  if (!result.ok) return issues;

  const seenIds = new Set<string>();
  for (const [index, row] of (result.value ?? []).entries()) {
    const rowNumber = index + 1;
    if (!DOC_BLOCK_ID_PATTERN.test(row.id ?? "")) {
      issues.push(
        contractIssue(
          "contract.schema_invalid",
          `terms row ${rowNumber} has invalid id: ${row.id}.`,
          path,
        ),
      );
    } else if (seenIds.has(row.id)) {
      issues.push(
        contractIssue(
          "contract.schema_invalid",
          `terms row ${rowNumber} duplicates id: ${row.id}.`,
          path,
        ),
      );
    }
    seenIds.add(row.id);
  }
  return issues;
}

export function validateTopLevelContract(
  path: string,
  text: string,
  spec: ContractFieldSpec,
  options: { idPattern?: RegExp; rejectSkillOrchestration?: boolean; skipIdCheck?: boolean } = {},
): AiCoreIssue[] {
  const parsed = parseTopLevelFields(path, text);
  if (!parsed.ok) return parsed.issues;

  const fields = parsed.value;
  const issues: AiCoreIssue[] = [];
  const allowed = new Set(spec.allowed);
  validateRequiredTopLevelFields(fields, spec, path, issues);
  validateAllowedTopLevelFields(fields, allowed, path, issues);
  validateContractId(fields, spec, options, path, issues);
  validateSchemaRef(fields, spec, path, issues);
  validateSkillOrchestrationFields(fields, options, path, issues);
  return issues;
}

function validateRequiredTopLevelFields(
  fields: Record<string, unknown>,
  spec: ContractFieldSpec,
  path: string,
  issues: AiCoreIssue[],
): void {
  for (const field of spec.required) {
    if (!(field in fields))
      issues.push(
        contractIssue("contract.schema_invalid", `Missing required contract field: ${field}`, path),
      );
  }
}

function validateAllowedTopLevelFields(
  fields: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
  issues: AiCoreIssue[],
): void {
  for (const field of Object.keys(fields)) {
    if (!allowed.has(field))
      issues.push(
        contractIssue("contract.schema_invalid", `Unknown contract field: ${field}`, path),
      );
  }
}

function validateContractId(
  fields: Record<string, unknown>,
  spec: ContractFieldSpec,
  options: { idPattern?: RegExp; skipIdCheck?: boolean },
  path: string,
  issues: AiCoreIssue[],
): void {
  if (options.skipIdCheck !== true && "id" in fields) {
    const idPattern = options.idPattern ?? spec.idPattern ?? CONTRACT_ID_PATTERN;
    if (typeof fields.id !== "string" || !idPattern.test(fields.id)) {
      issues.push(
        contractIssue("contract.schema_invalid", `Invalid contract id: ${String(fields.id)}`, path),
      );
    }
  }
}

function validateSchemaRef(
  fields: Record<string, unknown>,
  spec: ContractFieldSpec,
  path: string,
  issues: AiCoreIssue[],
): void {
  if (spec.schemaRef && fields.schema_ref !== spec.schemaRef) {
    issues.push(
      contractIssue(
        "contract.schema_invalid",
        `Contract schema_ref must be ${spec.schemaRef}`,
        path,
      ),
    );
  }
}

function validateSkillOrchestrationFields(
  fields: Record<string, unknown>,
  options: { rejectSkillOrchestration?: boolean },
  path: string,
  issues: AiCoreIssue[],
): void {
  if (options.rejectSkillOrchestration === true) {
    for (const field of SKILL_ORCHESTRATION_FIELDS) {
      if (field in fields) {
        issues.push(
          contractIssue(
            "contract.skill_orchestration_field",
            `Skill contract must not contain orchestration field ${field}.`,
            path,
          ),
        );
      }
    }
  }
}
