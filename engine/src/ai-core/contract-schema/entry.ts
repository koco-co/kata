import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { loadLocalContextPolicyFromText } from "../context-audit.ts";
import { contractIssue, topLevelYamlIssues } from "../contract-schema-utils.ts";
import { parseInventoryLedgerText } from "../inventory-ledger.ts";
import { repoRoot } from "../paths.ts";
import { parseProjectionInventoryText } from "../projection-inventory.ts";
import { validatePromptCacheAndRouting } from "../prompt-cache-validator.ts";
import type { ContractSchemaSummary, RowListSpec } from "../specs.ts";
import {
  agentContractSpec,
  commandSpec,
  iterativeCaseDraftContractRoutes,
  pluginManifestSpec,
  promptContractSpec,
  rowListSpecs,
  runtimeContractFields,
  skillContractSpec,
  topLevelOnlySpecs,
  workflowContractSpec,
} from "../specs.ts";
import type { AiCoreIssue, AiCoreResult } from "../types.ts";
import { parseYamlContract, parseYamlRows, yamlIssues } from "../yaml-contract.ts";
import {
  validateGeneratedBlocksContract,
  validateTopLevelContract,
  validateTranslationGlossaryContract,
} from "./generated-blocks.ts";
import { validateIterativeCaseDraftContract } from "./iterative.ts";
import { normalizeRelativePath, validatePromptContractShape, walk } from "./prompt.ts";

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

export async function validateContractFile(path: string, text: string): Promise<AiCoreIssue[]> {
  const specialIssues = await validateSpecialContractFile(path, text);
  if (specialIssues) return specialIssues;

  const rowListSpec = rowListSpecs.find((entry) => entry.pattern.test(path));
  if (rowListSpec) return validateRowListFile(path, text, rowListSpec.spec);

  const patternIssues = validatePatternContractFile(path, text);
  if (patternIssues) return patternIssues;

  const iterativeCaseDraftContract = iterativeCaseDraftContractRoutes.find((entry) =>
    entry.pattern.test(path),
  );
  if (iterativeCaseDraftContract) {
    return validateIterativeCaseDraftContract(path, text, iterativeCaseDraftContract.spec);
  }

  const topLevelSpec = topLevelOnlySpecs.find((entry) => entry.pattern.test(path));
  if (topLevelSpec)
    return validateTopLevelContract(path, text, topLevelSpec.spec, { skipIdCheck: true });

  return unclassifiedContractIssues(path, text);
}

async function validateSpecialContractFile(
  path: string,
  text: string,
): Promise<AiCoreIssue[] | undefined> {
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
    const { parseGoldenSuiteText } = await import("../evals.ts");
    return parseGoldenSuiteText(text, path).issues;
  }
  if (path === ".ai/core/evals/case-draft/golden.yaml") {
    const { parseCaseDraftGoldenText } = await import("../case-draft-evals.ts");
    return parseCaseDraftGoldenText(text, path).issues;
  }
  if (/^\.ai\/core\/runtimes\/(?:claude|codex)\.yaml$/.test(path)) {
    return validateSimpleRuntimeContract(path, text);
  }
  if (path === ".ai/core/docs/generated-blocks.yaml")
    return validateGeneratedBlocksContract(path, text);
  if (path === ".ai/core/docs/translation-glossary.yaml")
    return validateTranslationGlossaryContract(path, text);
  return undefined;
}

function validatePatternContractFile(path: string, text: string): AiCoreIssue[] | undefined {
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
  return undefined;
}

function unclassifiedContractIssues(path: string, text: string): AiCoreIssue[] {
  return [
    ...topLevelYamlIssues(path, text),
    contractIssue(
      "contract.unclassified_yaml",
      `AI Core yaml file is not covered by contract schema validation: ${path}`,
      path,
    ),
  ];
}

export function validateSimpleRuntimeContract(path: string, text: string): AiCoreIssue[] {
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

export function validateRowListFile(path: string, text: string, spec: RowListSpec): AiCoreIssue[] {
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

export function validateSourceRefRegistryContract(path: string, text: string): AiCoreIssue[] {
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
