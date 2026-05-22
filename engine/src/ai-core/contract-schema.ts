import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { isCanonicalSourceRef } from "../source-ref/resolvers.ts";
import { loadLocalContextPolicyFromText } from "./context-audit.ts";
import {
  contractIssue,
  isPlainRecord,
  parseTopLevelFields,
  rejectUnknownFields,
  topLevelYamlIssues,
} from "./contract-schema-utils.ts";
import { parseInventoryLedgerText } from "./inventory-ledger.ts";
import { repoRoot } from "./paths.ts";
import { parseProjectionInventoryText } from "./projection-inventory.ts";
import { validatePromptCacheAndRouting } from "./prompt-cache-validator.ts";
import type { ContractFieldSpec, ContractSchemaSummary, RowListSpec } from "./specs.ts";
import {
  AMBIGUITY_CLASSES,
  AUTOMATION_STATUSES,
  agentContractSpec,
  CONFIDENCE_LEVELS,
  CONTRACT_ID_PATTERN,
  COVERAGE_EVIDENCE_STATUSES,
  COVERAGE_TYPES,
  commandSpec,
  DOC_BLOCK_ID_PATTERN,
  DOC_BLOCK_SOURCES,
  DOC_BLOCK_TARGETS,
  iterativeCaseDraftContractRoutes,
  pluginManifestSpec,
  promptContractSpec,
  REQUIREMENT_EVIDENCE_KINDS,
  RISK_LEVELS,
  rowListSpecs,
  runtimeContractFields,
  SKILL_ORCHESTRATION_FIELDS,
  SOURCE_REF_TYPES,
  SUPPORTED_DOC_BLOCK_IDS,
  skillContractSpec,
  topLevelOnlySpecs,
  workflowContractSpec,
} from "./specs.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";
import { parseYamlContract, parseYamlRows, yamlIssues } from "./yaml-contract.ts";

export async function validateAllAiCoreContracts(
  options: { root?: string; virtualFiles?: Record<string, string> } = {},
): Promise<AiCoreResult<ContractSchemaSummary>> {
  const root = options.root ?? repoRoot();
  const virtualFiles = options.virtualFiles
    ? new Map(
        Object.entries(options.virtualFiles).map(([path, text]) => [
          normalizeRelativePath(path),
          text,
        ]),
      )
    : undefined;
  const checkedFiles = virtualFiles
    ? [...virtualFiles.keys()].sort()
    : walk(join(root, ".ai/core"))
        .filter((file) => file.endsWith(".yaml"))
        .map((file) => normalizeRelativePath(relative(root, file)))
        .sort();
  const issues: AiCoreIssue[] = [];

  for (const path of checkedFiles) {
    const text = virtualFiles?.get(path) ?? readFileSync(join(root, path), "utf8");
    issues.push(...(await validateContractFile(path, text)));
  }

  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    value: { checkedFiles },
    issues,
  };
}

async function validateContractFile(path: string, text: string): Promise<AiCoreIssue[]> {
  if (path === ".ai/core/context/local-context.yaml") {
    return loadLocalContextPolicyFromText(text, path).issues;
  }
  if (path === ".ai/core/runtimes/projection-inventory.yaml") {
    return parseProjectionInventoryText(text, path).issues;
  }
  if (path === ".ai/core/schemas/source-ref-registry.yaml") {
    return validateSourceRefRegistryContract(path, text);
  }
  if (/^\.ai\/core\/runtimes\/inventory-ledgers\/[^/]+\.yaml$/.test(path)) {
    return parseInventoryLedgerText(text, path).issues;
  }
  if (/^\.ai\/core\/evals\/(?:p0|ga-core|ga-runtime)\/golden\.yaml$/.test(path)) {
    const { parseGoldenSuiteText } = await import("./evals.ts");
    return parseGoldenSuiteText(text, path).issues;
  }
  if (path === ".ai/core/evals/case-draft/golden.yaml") {
    const { parseCaseDraftGoldenText } = await import("./case-draft-evals.ts");
    return parseCaseDraftGoldenText(text, path).issues;
  }
  if (/^\.ai\/core\/runtimes\/(?:claude|codex)\.yaml$/.test(path)) {
    return validateSimpleRuntimeContract(path, text);
  }
  if (path === ".ai/core/docs/generated-blocks.yaml")
    return validateGeneratedBlocksContract(path, text);
  if (path === ".ai/core/docs/translation-glossary.yaml")
    return validateTranslationGlossaryContract(path, text);

  const rowListSpec = rowListSpecs.find((entry) => entry.pattern.test(path));
  if (rowListSpec) return validateRowListFile(path, text, rowListSpec.spec);

  if (/^\.ai\/core\/skills\/[^/]+\/skill\.yaml$/.test(path)) {
    return validateTopLevelContract(path, text, skillContractSpec, {
      rejectSkillOrchestration: true,
    });
  }
  if (/^\.ai\/core\/prompts\/[^/]+\.prompt\.yaml$/.test(path)) {
    const baseIssues = validateTopLevelContract(path, text, promptContractSpec);
    const shapeIssues = validatePromptContractShape(path, text);
    const cacheResult = validatePromptCacheAndRouting(text, path);
    return [...baseIssues, ...shapeIssues, ...cacheResult.issues];
  }
  if (/^\.ai\/core\/workflows\/[^/]+\.workflow\.yaml$/.test(path)) {
    return validateTopLevelContract(path, text, workflowContractSpec);
  }
  if (/^\.ai\/core\/agents\/[^/]+\.agent\.yaml$/.test(path)) {
    return validateTopLevelContract(path, text, agentContractSpec);
  }
  if (/^\.ai\/core\/plugins\/[^/]+\/plugin\.yaml$/.test(path)) {
    return validateTopLevelContract(path, text, pluginManifestSpec);
  }
  if (/^\.ai\/core\/evals\/p0\/fixtures\/[^/]+\.yaml$/.test(path)) {
    return validateTopLevelContract(path, text, pluginManifestSpec);
  }
  if (/^\.ai\/core\/commands\/[^/]+\.command\.yaml$/.test(path)) {
    return validateTopLevelContract(path, text, commandSpec, { idPattern: /^[a-z0-9][a-z0-9-]*$/ });
  }

  const iterativeCaseDraftContract = iterativeCaseDraftContractRoutes.find((entry) =>
    entry.pattern.test(path),
  );
  if (iterativeCaseDraftContract) {
    return validateIterativeCaseDraftContract(path, text, iterativeCaseDraftContract.spec);
  }

  const topLevelSpec = topLevelOnlySpecs.find((entry) => entry.pattern.test(path));
  if (topLevelSpec)
    return validateTopLevelContract(path, text, topLevelSpec.spec, { skipIdCheck: true });

  return [
    ...topLevelYamlIssues(path, text),
    contractIssue(
      "contract.unclassified_yaml",
      `AI Core yaml file is not covered by contract schema validation: ${path}`,
      path,
    ),
  ];
}

function validateSimpleRuntimeContract(path: string, text: string): AiCoreIssue[] {
  const contract = parseYamlContract(text, path);
  const issues = [...yamlIssues(contract)];
  const requiredScalars = [
    "runtime",
    "projection_root",
    "supports_startup_preflight",
    "memory_trust",
    "capability_tier",
    "projection_owner",
    "projection_stale_policy",
  ];
  const requiredLists = ["generated_files"];
  for (const field of requiredScalars) {
    if (!contract.scalars.has(field))
      issues.push(
        contractIssue("contract.schema_invalid", `Missing required contract field: ${field}`, path),
      );
  }
  for (const field of requiredLists) {
    if (!contract.lists.has(field))
      issues.push(
        contractIssue("contract.schema_invalid", `Missing required contract field: ${field}`, path),
      );
  }
  for (const field of [...contract.scalars.keys(), ...contract.lists.keys()]) {
    if (!runtimeContractFields.has(field)) {
      issues.push(
        contractIssue("contract.schema_invalid", `Unknown contract field: ${field}`, path),
      );
    }
  }
  return issues;
}

function validateRowListFile(path: string, text: string, spec: RowListSpec): AiCoreIssue[] {
  const result = parseYamlRows(text, path, spec.key);
  const issues = [...result.issues];
  const allowed = new Set(spec.allowed);
  for (const [index, row] of (result.value ?? []).entries()) {
    const rowNumber = index + 1;
    for (const field of spec.required) {
      if (row[field] === undefined || row[field].length === 0) {
        issues.push(
          contractIssue(
            "yaml.missing_required_row_field",
            `${spec.key} row ${rowNumber} is missing required field ${field}.`,
            path,
          ),
        );
      }
    }
    const unknownField = Object.keys(row).find((field) => !allowed.has(field));
    if (unknownField) {
      issues.push(
        contractIssue(
          "yaml.unknown_row_field",
          `${spec.key} row ${rowNumber} contains unknown field '${unknownField}'.`,
          path,
        ),
      );
    }
  }
  return issues;
}

function validateSourceRefRegistryContract(path: string, text: string): AiCoreIssue[] {
  const contract = parseYamlContract(text, path);
  const issues = yamlIssues(contract).filter(
    (issue) =>
      issue.code !== "yaml.unsupported_indentation" &&
      issue.code !== "yaml.unsupported_mapping_list_item" &&
      issue.code !== "yaml.unsupported_nested_structure",
  );
  if (contract.scalars.get("schema") !== "SourceRefRegistry@1") {
    issues.push(
      contractIssue(
        "contract.schema_invalid",
        "SourceRefRegistry contract must declare schema: SourceRefRegistry@1.",
        path,
      ),
    );
  }
  issues.push(
    ...validateRowListFile(path, text, {
      key: "prefixes",
      required: ["prefix", "description", "generated_by", "generated_at_step", "pattern"],
      allowed: [
        "prefix",
        "description",
        "generated_by",
        "generated_at_step",
        "pattern",
        "consumed_by",
      ],
    }),
  );
  return issues;
}

function validateGeneratedBlocksContract(path: string, text: string): AiCoreIssue[] {
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
    seenIds.add(row.id);

    if (!DOC_BLOCK_SOURCES.has(row.source ?? "")) {
      issues.push(
        contractIssue(
          "contract.schema_invalid",
          `docs blocks row ${rowNumber} has invalid source: ${row.source}.`,
          path,
        ),
      );
    }

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
  return issues;
}

function validateTranslationGlossaryContract(path: string, text: string): AiCoreIssue[] {
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

function validateTopLevelContract(
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
  for (const field of spec.required) {
    if (!(field in fields))
      issues.push(
        contractIssue("contract.schema_invalid", `Missing required contract field: ${field}`, path),
      );
  }
  for (const field of Object.keys(fields)) {
    if (!allowed.has(field))
      issues.push(
        contractIssue("contract.schema_invalid", `Unknown contract field: ${field}`, path),
      );
  }
  if (options.skipIdCheck !== true && "id" in fields) {
    const idPattern = options.idPattern ?? spec.idPattern ?? CONTRACT_ID_PATTERN;
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
  return issues;
}

function validateIterativeCaseDraftContract(
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

function validateCanonicalSourceRefFields(
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

function parseYamlObjectForIterativeContract(
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

function validateTopLevelObjectContract(
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

function validateContractFieldTypes(
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

function isContractFieldType(value: unknown, fieldType: ContractFieldType): boolean {
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

function describeContractFieldType(fieldType: ContractFieldType): string {
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

function validateEnumField(
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

function validatePromptContractShape(path: string, text: string): AiCoreIssue[] {
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

  validateSchemaRefObject(parsed, "input_schema", path, issues);
  validateSchemaRefObject(parsed, "output_schema", path, issues);

  const rendering = requireObject(parsed, "rendering", path, issues);
  if (rendering) {
    rejectUnknownFields(rendering, "rendering", ["role_sections", "boundaries"], path, issues);
    const roleSections = requireObject(rendering, "role_sections", path, issues, "rendering");
    if (roleSections) {
      rejectUnknownFields(
        roleSections,
        "rendering.role_sections",
        ["system", "user"],
        path,
        issues,
      );
      requireString(roleSections, "system", "rendering.role_sections", path, issues);
      requireString(roleSections, "user", "rendering.role_sections", path, issues);
    }
    const boundaries = requireObject(rendering, "boundaries", path, issues, "rendering");
    if (boundaries) {
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
  }

  const prefill = requireObject(parsed, "prefill", path, issues);
  if (prefill) {
    rejectUnknownFields(prefill, "prefill", ["enabled", "text"], path, issues);
    requireBoolean(prefill, "enabled", "prefill", path, issues);
    requireString(prefill, "text", "prefill", path, issues, { allowEmpty: true });
  }

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

  return issues;
}

function validateSchemaRefObject(
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

function requireObject(
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

function requireString(
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

function requireBoolean(
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

function requirePositiveInteger(
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

function requireStringArray(
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

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function walk(root: string): string[] {
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
