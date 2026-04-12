import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateAllAiCoreContracts } from "./contract-schema.ts";
import { parsePluginManifestContract } from "./plugin-manifest-contract.ts";
import { validatePromptCacheAndRouting } from "./prompt-cache-validator.ts";
import type {
  AiCoreContractRef,
  AiCoreIssue,
  AiCoreProject,
  AiCoreResult,
  AiCoreSchemaRef,
} from "./types.ts";
import {
  loadGaCoreWorkflowContractResult,
  validateGaCoreWorkflowContracts,
} from "./workflow-contracts.ts";
import { parseTopLevelYamlFields } from "./yaml-helpers.ts";

type ContractSpec = {
  schemaRef?: string;
  idPattern?: RegExp;
  required: string[];
  allowed: string[];
};

type WorkflowStep = {
  id?: string;
};

const CONTRACT_ID_PATTERN = /^[a-z0-9][a-z0-9-]*@[0-9]+$/;
const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*@[0-9]+$/;
const SAFE_PLUGIN_ROOT_PATTERN =
  /^\.ai\/core\/plugins\/[A-Za-z0-9][A-Za-z0-9_-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;
const WORKFLOW_STEP_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

const skillContractSpec: ContractSpec = {
  required: [
    "id",
    "name",
    "kind",
    "schema_version",
    "skill_version",
    "status",
    "description",
    "outputs",
    "inputs",
    "allowed_tools",
    "context_budget",
    "evidence",
    "failure_policy",
    "body",
  ],
  allowed: [
    "id",
    "name",
    "kind",
    "schema_version",
    "skill_version",
    "status",
    "command_aliases",
    "description",
    "outputs",
    "inputs",
    "allowed_tools",
    "context_budget",
    "evidence",
    "failure_policy",
    "body",
    "references",
    "few_shots",
  ],
};

const promptContractSpec: ContractSpec = {
  schemaRef: "PromptContract@1",
  required: [
    "id",
    "schema_ref",
    "locale",
    "model_lock",
    "input_schema",
    "output_schema",
    "rendering",
    "prefill",
    "fallback",
    "hallucination_policy",
  ],
  allowed: [
    "id",
    "schema_ref",
    "locale",
    "model_lock",
    "input_schema",
    "output_schema",
    "rendering",
    "prefill",
    "fallback",
    "hallucination_policy",
    "few_shots",
    "cache_breakpoints",
    "model_routing",
    "model_id",
  ],
};

const workflowContractSpec: ContractSpec = {
  schemaRef: "WorkflowContract@1",
  required: ["id", "schema_ref", "entry_skill", "inputs", "budgets", "steps", "failure_policy"],
  allowed: [
    "id",
    "schema_ref",
    "entry_skill",
    "failure_mode",
    "inputs",
    "budgets",
    "steps",
    "aggregation",
    "outputs",
    "allowed_next_actors",
    "failure_policy",
    "black_box_fixtures",
  ],
};

const agentContractSpec: ContractSpec = {
  schemaRef: "AgentContract@1",
  required: [
    "id",
    "schema_ref",
    "role",
    "runner",
    "write_capability",
    "allowed_tools",
    "read_scope",
    "forbidden_scope",
    "handoff_schema",
    "review_gates",
  ],
  allowed: [
    "id",
    "schema_ref",
    "role",
    "runner",
    "write_capability",
    "allowed_tools",
    "read_scope",
    "write_scope",
    "forbidden_scope",
    "handoff_schema",
    "review_gates",
  ],
};

const pluginManifestSpec: ContractSpec = {
  schemaRef: "PluginManifest@1",
  idPattern: PLUGIN_ID_PATTERN,
  required: [
    "id",
    "schema_ref",
    "package_root",
    "capability",
    "argv_schema",
    "output_schema",
    "timeout_ms",
    "artifact_staging",
  ],
  allowed: [
    "id",
    "schema_ref",
    "package_root",
    "capability",
    "argv_schema",
    "output_schema",
    "timeout_ms",
    "artifact_staging",
  ],
};

export function validateAiCore(core: AiCoreProject): AiCoreResult<AiCoreProject> {
  const issues: AiCoreIssue[] = [];
  for (const schema of core.schemas) {
    const schemaPath = join(core.root, schema.path);
    if (!existsSync(schemaPath)) {
      issues.push({
        code: "schema.file_missing",
        severity: "error",
        message: `Schema file does not exist: ${schema.path}`,
        path: schema.path,
        contractId: schema.id,
      });
      continue;
    }
    validateSchemaFile(schema, schemaPath, issues);
  }
  for (const root of core.runtimeRoots) {
    if (root.hidden_id_lint !== true) {
      issues.push({
        code: "implementation_root.hidden_id_lint_disabled",
        severity: "error",
        message: `Implementation root must enable hidden id lint: ${root.path}`,
        path: ".ai/core/runtimes/implementation-roots.yaml",
      });
    }
  }
  validateContractFiles(core.skills, skillContractSpec, core.root, issues);
  validateContractFiles(core.prompts, promptContractSpec, core.root, issues);
  validateContractFiles(core.workflows, workflowContractSpec, core.root, issues);
  validateContractFiles(core.agents, agentContractSpec, core.root, issues);
  validateContractFiles(core.plugins, pluginManifestSpec, core.root, issues);
  const loadedGaCoreWorkflows = loadGaCoreWorkflowContractResult(core.root);
  issues.push(...loadedGaCoreWorkflows.issues);
  issues.push(...validateGaCoreWorkflowContracts(loadedGaCoreWorkflows.value ?? []).issues);
  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    value: core,
    issues,
  };
}

export async function validateAiCoreStrict(
  core: AiCoreProject,
): Promise<AiCoreResult<AiCoreProject>> {
  const base = validateAiCore(core);
  const contractSchemas = await validateAllAiCoreContracts({ root: core.root });
  const issues = [...base.issues, ...contractSchemas.issues];
  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    value: core,
    issues,
  };
}

function validateContractFiles(
  contracts: AiCoreContractRef[],
  spec: ContractSpec,
  root: string,
  issues: AiCoreIssue[],
): void {
  for (const contract of contracts) {
    const contractPath = join(root, contract.path);
    if (!existsSync(contractPath)) {
      pushContractIssue(issues, contract, `Contract file does not exist: ${contract.path}`);
      continue;
    }

    const text = readFileSync(contractPath, "utf8");
    if (spec.schemaRef === "PluginManifest@1") {
      validatePluginManifest(text, contract, issues);
      continue;
    }

    const fields = parseTopLevelYamlFields(text, contract.path);
    if (fields.id !== contract.id) {
      pushContractIssue(issues, contract, `Contract id must match discovered id ${contract.id}`);
    }
    if (typeof fields.id !== "string" || !(spec.idPattern ?? CONTRACT_ID_PATTERN).test(fields.id)) {
      pushContractIssue(issues, contract, `Invalid contract id: ${String(fields.id)}`);
    }
    if (spec.schemaRef && fields.schema_ref !== spec.schemaRef) {
      pushContractIssue(issues, contract, `Contract schema_ref must be ${spec.schemaRef}`);
    }
    for (const key of spec.required) {
      if (!(key in fields))
        pushContractIssue(issues, contract, `Missing required contract field: ${key}`);
    }
    const allowed = new Set(spec.allowed);
    for (const key of Object.keys(fields)) {
      if (!allowed.has(key)) pushContractIssue(issues, contract, `Unknown contract field: ${key}`);
    }
    if (spec.schemaRef === "WorkflowContract@1") {
      validateWorkflowSteps(text, contract, issues);
    }
    if (spec.schemaRef === "PromptContract@1") {
      const cacheResult = validatePromptCacheAndRouting(text, contract.path);
      issues.push(...cacheResult.issues.map((issue) => ({ ...issue, contractId: contract.id })));
    }
  }
}

function validatePluginManifest(
  text: string,
  contract: AiCoreContractRef,
  issues: AiCoreIssue[],
): void {
  const parsed = parsePluginManifestContract(text, contract.path);
  if (!parsed.ok) {
    issues.push(...parsed.issues.map((issue) => ({ ...issue, contractId: contract.id })));
    return;
  }
  const manifest = parsed.value;
  if (!manifest) return;

  if (manifest.id !== contract.id) {
    pushContractIssue(issues, contract, `Contract id must match discovered id ${contract.id}`);
  }
  if (!PLUGIN_ID_PATTERN.test(manifest.id)) {
    pushContractIssue(issues, contract, `Invalid contract id: ${manifest.id}`);
  }
  if (manifest.schemaRef !== "PluginManifest@1") {
    pushContractIssue(issues, contract, "Contract schema_ref must be PluginManifest@1");
  }
  if (!isSafePluginPackageRoot(manifest.packageRoot)) {
    pushContractIssue(
      issues,
      contract,
      "PluginManifest package_root must stay under .ai/core/plugins without dot segments.",
    );
  }
  const VALID_CAPABILITY_KINDS = new Set([
    "fixture_reader",
    "source_provider",
    "notification_sink",
  ]);
  if (!VALID_CAPABILITY_KINDS.has(manifest.capability.kind)) {
    pushContractIssue(
      issues,
      contract,
      `PluginManifest capability.kind must be one of: ${[...VALID_CAPABILITY_KINDS].join(", ")}.`,
    );
  }
  if (manifest.capability.secrets === "true" && manifest.capability.isolation !== "os_sandbox") {
    pushContractIssue(
      issues,
      contract,
      "PluginManifest capability.secrets=true requires os_sandbox isolation (P1).",
      "warning",
    );
  }
  if (manifest.outputSchema !== "SourceSnapshot@1") {
    pushContractIssue(issues, contract, "PluginManifest output_schema must be SourceSnapshot@1.");
  }
  if (manifest.argvRequired.length === 0) {
    pushContractIssue(
      issues,
      contract,
      "PluginManifest argv_schema.required must contain at least one item.",
    );
  }
  if (manifest.artifactStaging.root !== ".ai/runs/staging") {
    pushContractIssue(
      issues,
      contract,
      "PluginManifest artifact_staging.root must be .ai/runs/staging.",
    );
  }
}

function isSafePluginPackageRoot(value: string): boolean {
  return SAFE_PLUGIN_ROOT_PATTERN.test(value);
}

function validateWorkflowSteps(
  text: string,
  contract: AiCoreContractRef,
  issues: AiCoreIssue[],
): void {
  for (const step of parseWorkflowSteps(text)) {
    if (!step.id) {
      pushWorkflowStepIdMissingIssue(issues, contract);
      continue;
    }
    if (!WORKFLOW_STEP_ID_PATTERN.test(step.id)) {
      pushContractIssue(issues, contract, `Invalid workflow step id: ${step.id}`);
    }
  }
}

function parseWorkflowSteps(text: string): WorkflowStep[] {
  const steps: WorkflowStep[] = [];
  let insideSteps = false;
  let currentStep: WorkflowStep | undefined;
  for (const raw of text.split(/\r?\n/)) {
    if (raw === "steps:") {
      insideSteps = true;
      continue;
    }
    if (!insideSteps) continue;
    if (/^[A-Za-z_][A-Za-z0-9_]*:/.test(raw)) {
      if (currentStep) steps.push(currentStep);
      break;
    }
    const itemMatch = raw.match(/^ {2}-\s*(.*)$/);
    if (itemMatch) {
      if (currentStep) steps.push(currentStep);
      currentStep = {};
      const inlineId = itemMatch[1].match(/^id:\s*(.+?)\s*$/);
      if (inlineId) currentStep.id = unquoteYamlScalar(inlineId[1]);
      continue;
    }
    if (!currentStep) continue;
    const nestedId = raw.match(/^ {4}id:\s*(.+?)\s*$/);
    if (nestedId) currentStep.id = unquoteYamlScalar(nestedId[1]);
  }
  if (currentStep) steps.push(currentStep);
  return steps;
}

function unquoteYamlScalar(value: string): string {
  return value.replace(/^"|"$/g, "");
}

function pushContractIssue(
  issues: AiCoreIssue[],
  contract: AiCoreContractRef,
  message: string,
  severity: "error" | "warning" = "error",
): void {
  issues.push({
    code: "contract.schema_invalid",
    severity,
    message,
    path: contract.path,
    contractId: contract.id,
  });
}

function pushWorkflowStepIdMissingIssue(issues: AiCoreIssue[], contract: AiCoreContractRef): void {
  issues.push({
    code: "contract.workflow_step_id_missing",
    severity: "error",
    message: "Workflow step is missing required id",
    path: contract.path,
    contractId: contract.id,
  });
}

function validateSchemaFile(
  schema: AiCoreSchemaRef,
  schemaPath: string,
  issues: AiCoreIssue[],
): void {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(schemaPath, "utf8"));
  } catch (_error) {
    issues.push({
      code: "schema.parse_failed",
      severity: "error",
      message: `Schema file is not valid JSON: ${schema.path}`,
      path: schema.path,
      contractId: schema.id,
    });
    return;
  }

  if (!isRecord(value)) {
    issues.push({
      code: "schema.invalid_root",
      severity: "error",
      message: `Schema root must be an object: ${schema.path}`,
      path: schema.path,
      contractId: schema.id,
    });
    return;
  }

  if (value.$id !== schema.id) {
    issues.push({
      code: "schema.id_mismatch",
      severity: "error",
      message: `Schema $id must match registry id ${schema.id}: ${schema.path}`,
      path: schema.path,
      contractId: schema.id,
    });
  }

  validateStrictObjectBoundaries(value, schema, "#", issues);
}

function validateStrictObjectBoundaries(
  node: unknown,
  schema: AiCoreSchemaRef,
  nodePath: string,
  issues: AiCoreIssue[],
): void {
  if (!isRecord(node)) return;

  if (
    node.type === "object" &&
    node.additionalProperties !== false &&
    !isRecord(node.additionalProperties)
  ) {
    issues.push({
      code: "schema.additional_properties_required",
      severity: "error",
      message: `Object schema must set additionalProperties: false at ${nodePath}`,
      path: `${schema.path}${nodePath}`,
      contractId: schema.id,
    });
  }

  if (isRecord(node.properties)) {
    for (const [key, value] of Object.entries(node.properties)) {
      validateStrictObjectBoundaries(value, schema, `${nodePath}/properties/${key}`, issues);
    }
  }

  visitSchemaMap(node.$defs, schema, `${nodePath}/$defs`, issues);
  visitSchemaMap(node.definitions, schema, `${nodePath}/definitions`, issues);
  visitSchemaMap(node.dependentSchemas, schema, `${nodePath}/dependentSchemas`, issues);
  visitSchemaMap(node.patternProperties, schema, `${nodePath}/patternProperties`, issues);

  visitSchemaArray(node.allOf, schema, `${nodePath}/allOf`, issues);
  visitSchemaArray(node.anyOf, schema, `${nodePath}/anyOf`, issues);
  visitSchemaArray(node.oneOf, schema, `${nodePath}/oneOf`, issues);
  visitSchemaArray(node.prefixItems, schema, `${nodePath}/prefixItems`, issues);

  visitSchemaValue(node.if, schema, `${nodePath}/if`, issues);
  visitSchemaValue(node.then, schema, `${nodePath}/then`, issues);
  visitSchemaValue(node.else, schema, `${nodePath}/else`, issues);
  visitSchemaValue(node.not, schema, `${nodePath}/not`, issues);
  visitSchemaValue(node.items, schema, `${nodePath}/items`, issues);
  visitSchemaValue(node.contains, schema, `${nodePath}/contains`, issues);
  visitSchemaValue(node.propertyNames, schema, `${nodePath}/propertyNames`, issues);
  visitSchemaValue(node.additionalProperties, schema, `${nodePath}/additionalProperties`, issues);
}

function visitSchemaMap(
  value: unknown,
  schema: AiCoreSchemaRef,
  nodePath: string,
  issues: AiCoreIssue[],
): void {
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    validateStrictObjectBoundaries(child, schema, `${nodePath}/${key}`, issues);
  }
}

function visitSchemaArray(
  value: unknown,
  schema: AiCoreSchemaRef,
  nodePath: string,
  issues: AiCoreIssue[],
): void {
  if (!Array.isArray(value)) return;
  for (const [index, child] of value.entries()) {
    validateStrictObjectBoundaries(child, schema, `${nodePath}/${index}`, issues);
  }
}

function visitSchemaValue(
  value: unknown,
  schema: AiCoreSchemaRef,
  nodePath: string,
  issues: AiCoreIssue[],
): void {
  if (isRecord(value)) {
    validateStrictObjectBoundaries(value, schema, nodePath, issues);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
