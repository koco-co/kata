import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { isCanonicalSourceRef } from "../source-ref/resolvers.ts";
import { loadLocalContextPolicyFromText } from "./context-audit.ts";
import { parseInventoryLedgerText } from "./inventory-ledger.ts";
import { repoRoot } from "./paths.ts";
import { parseProjectionInventoryText } from "./projection-inventory.ts";
import { validatePromptCacheAndRouting } from "./prompt-cache-validator.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";
import {
  parseTopLevelYamlFieldsCompat,
  parseYamlContract,
  parseYamlRows,
  yamlIssues,
} from "./yaml-contract.ts";

export type ContractSchemaSummary = {
  checkedFiles: string[];
};

type ContractFieldSpec = {
  idPattern?: RegExp;
  required: string[];
  allowed: string[];
  schemaRef?: string;
  fieldTypes?: Record<string, ContractFieldType>;
};

type ContractFieldType =
  | "array"
  | "boolean"
  | "nonNegativeInteger"
  | "nullableString"
  | "string"
  | "stringArray";

type RowListSpec = {
  key: string;
  required: string[];
  allowed: string[];
};

type TopLevelFieldsResult =
  | { ok: true; value: Record<string, string | true>; issues: [] }
  | { ok: false; issues: AiCoreIssue[] };

const CONTRACT_ID_PATTERN = /^[a-z0-9][a-z0-9-]*@[0-9]+$/;
const ITERATIVE_CASE_DRAFT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*(@[0-9]+)?$/;
const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*@[0-9]+$/;
const DOC_BLOCK_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const SKILL_ORCHESTRATION_FIELDS = ["plugin_calls", "agent_dispatch", "workflow_steps"];
const DOC_BLOCK_SOURCES = new Set([".ai/core", ".ai/core/commands", ".ai/core/runtimes"]);
const DOC_BLOCK_TARGETS = new Set(["README.md", "README-EN.md", "CHANGELOG.md"]);
const SUPPORTED_DOC_BLOCK_IDS = new Set(["command-index", "runtime-support", "release-summary"]);
const SOURCE_REF_TYPES = new Set([
  "lanhu_url",
  "axure_url",
  "prd_md",
  "screenshot",
  "user_input",
  "repo_file",
  "knowledge_entry",
  "historical_case",
  "tester_note",
  "product_feedback",
]);
const REQUIREMENT_EVIDENCE_KINDS = new Set([
  "product_confirmed",
  "lanhu_observed",
  "history_inferred",
  "tester_assumption",
]);
const AMBIGUITY_CLASSES = new Set([
  "blocking_unknown",
  "high_risk_pending",
  "defaultable_unknown",
  "automation_deferred",
  "non_blocking_question",
]);
const CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);
const COVERAGE_TYPES = new Set([
  "positive",
  "negative",
  "boundary",
  "permission",
  "state",
  "data",
  "regression",
  "ui",
  "compatibility",
]);
const RISK_LEVELS = new Set(["P0", "P1", "P2", "P3"]);
const COVERAGE_EVIDENCE_STATUSES = new Set([
  "confirmed",
  "defaulted",
  "inferred",
  "pending",
  "blocked",
]);
const AUTOMATION_STATUSES = new Set(["ready", "deferred", "blocked"]);

const skillContractSpec: ContractFieldSpec = {
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

const promptContractSpec: ContractFieldSpec = {
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

const workflowContractSpec: ContractFieldSpec = {
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

const agentContractSpec: ContractFieldSpec = {
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

const pluginManifestSpec: ContractFieldSpec = {
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
    "capability_required",
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
    "capability_required",
  ],
};

const commandSpec: ContractFieldSpec = {
  required: ["id", "skill", "user_invocable", "summary"],
  allowed: ["id", "skill", "user_invocable", "summary"],
};

const importRecordSpec: ContractFieldSpec = {
  required: [
    "source_id",
    "source_runtime_paths",
    "target_id",
    "target_path",
    "status",
    "semantic_equivalence",
  ],
  allowed: [
    "source_id",
    "source_runtime_paths",
    "target_id",
    "target_path",
    "status",
    "semantic_equivalence",
  ],
};

const requirementAtomSpec: ContractFieldSpec = {
  idPattern: ITERATIVE_CASE_DRAFT_ID_PATTERN,
  schemaRef: "RequirementAtom@1",
  required: [
    "schema_ref",
    "id",
    "title",
    "source_refs",
    "subject",
    "evidence_kind",
    "ambiguity_class",
    "confidence",
  ],
  allowed: [
    "schema_ref",
    "id",
    "title",
    "source_refs",
    "subject",
    "condition",
    "action",
    "expected_result",
    "field_rules",
    "state_rules",
    "permissions",
    "data_dependencies",
    "evidence_kind",
    "ambiguity_class",
    "confidence",
    "accepted_by",
  ],
  fieldTypes: {
    schema_ref: "string",
    id: "string",
    title: "string",
    source_refs: "stringArray",
    subject: "string",
    condition: "string",
    action: "string",
    expected_result: "string",
    field_rules: "stringArray",
    state_rules: "stringArray",
    permissions: "stringArray",
    data_dependencies: "stringArray",
    evidence_kind: "string",
    ambiguity_class: "string",
    confidence: "string",
    accepted_by: "string",
  },
};

const confirmationQuestionSpec: ContractFieldSpec = {
  idPattern: ITERATIVE_CASE_DRAFT_ID_PATTERN,
  schemaRef: "ConfirmationQuestion@1",
  required: [
    "schema_ref",
    "id",
    "severity",
    "location",
    "question",
    "recommended_answer",
    "basis",
    "impact_if_unanswered",
    "options",
    "affected_atoms",
  ],
  allowed: [
    "schema_ref",
    "id",
    "severity",
    "location",
    "question",
    "recommended_answer",
    "basis",
    "impact_if_unanswered",
    "options",
    "affected_atoms",
  ],
  fieldTypes: {
    schema_ref: "string",
    id: "string",
    severity: "string",
    location: "string",
    question: "string",
    recommended_answer: "string",
    basis: "array",
    impact_if_unanswered: "string",
    options: "stringArray",
    affected_atoms: "stringArray",
  },
};

const confirmationPackageSpec: ContractFieldSpec = {
  idPattern: ITERATIVE_CASE_DRAFT_ID_PATTERN,
  schemaRef: "ConfirmationPackage@1",
  required: ["schema_ref", "id", "questions", "blocking_count"],
  allowed: [
    "schema_ref",
    "id",
    "module",
    "project",
    "prd_slug",
    "round",
    "generated_at",
    "questions",
    "blocking_count",
    "defaultable_count",
    "non_blocking_count",
    "source_refs",
  ],
  fieldTypes: {
    schema_ref: "string",
    id: "string",
    module: "string",
    project: "string",
    prd_slug: "string",
    round: "nonNegativeInteger",
    generated_at: "string",
    questions: "stringArray",
    blocking_count: "nonNegativeInteger",
    defaultable_count: "nonNegativeInteger",
    non_blocking_count: "nonNegativeInteger",
    source_refs: "stringArray",
  },
};

const coverageMatrixSpec: ContractFieldSpec = {
  idPattern: ITERATIVE_CASE_DRAFT_ID_PATTERN,
  schemaRef: "CoverageMatrix@1",
  required: [
    "schema_ref",
    "id",
    "title",
    "coverage_type",
    "requirement_atom_ids",
    "risk_level",
    "evidence_status",
    "manual_case_allowed",
    "automation_allowed",
  ],
  allowed: [
    "schema_ref",
    "id",
    "title",
    "coverage_type",
    "requirement_atom_ids",
    "risk_level",
    "evidence_status",
    "manual_case_allowed",
    "automation_allowed",
  ],
  fieldTypes: {
    schema_ref: "string",
    id: "string",
    title: "string",
    coverage_type: "string",
    requirement_atom_ids: "stringArray",
    risk_level: "string",
    evidence_status: "string",
    manual_case_allowed: "boolean",
    automation_allowed: "boolean",
  },
};

const caseEvidenceMapSpec: ContractFieldSpec = {
  idPattern: ITERATIVE_CASE_DRAFT_ID_PATTERN,
  schemaRef: "CaseEvidenceMap@1",
  required: ["schema_ref", "case_id", "source_refs"],
  allowed: [
    "schema_ref",
    "id",
    "case_id",
    "coverage_matrix_ids",
    "requirement_atom_ids",
    "atom_ids",
    "assertions",
    "source_refs",
    "pending_items_in_case",
    "automation_status",
  ],
  fieldTypes: {
    schema_ref: "string",
    id: "string",
    case_id: "string",
    coverage_matrix_ids: "stringArray",
    requirement_atom_ids: "stringArray",
    atom_ids: "stringArray",
    assertions: "stringArray",
    source_refs: "stringArray",
    pending_items_in_case: "stringArray",
    automation_status: "string",
  },
};

const automationIntentSpec: ContractFieldSpec = {
  idPattern: ITERATIVE_CASE_DRAFT_ID_PATTERN,
  schemaRef: "AutomationIntent@1",
  required: [
    "schema_ref",
    "case_id",
    "title",
    "automation_status",
    "entry_page_hint",
    "data_setup",
    "visible_assertions",
    "stable_text_anchors",
    "pending_blockers",
    "source_refs",
  ],
  allowed: [
    "schema_ref",
    "id",
    "case_id",
    "title",
    "automation_status",
    "entry_page_hint",
    "data_setup",
    "visible_assertions",
    "stable_text_anchors",
    "pending_blockers",
    "source_refs",
  ],
  fieldTypes: {
    schema_ref: "string",
    id: "string",
    case_id: "string",
    title: "string",
    automation_status: "string",
    entry_page_hint: "nullableString",
    data_setup: "stringArray",
    visible_assertions: "stringArray",
    stable_text_anchors: "stringArray",
    pending_blockers: "stringArray",
    source_refs: "stringArray",
  },
};

const lanhuAxureSnapshotSpec: ContractFieldSpec = {
  idPattern: ITERATIVE_CASE_DRAFT_ID_PATTERN,
  schemaRef: "LanhuAxureSnapshot@1",
  required: ["schema_ref", "id", "pages"],
  allowed: [
    "schema_ref",
    "id",
    "title",
    "source_ref",
    "source_url",
    "fetched_at",
    "pages",
    "observed_text",
    "interaction_hints",
    "content_hash",
  ],
  fieldTypes: {
    schema_ref: "string",
    id: "string",
    title: "string",
    source_ref: "string",
    source_url: "string",
    fetched_at: "string",
    pages: "stringArray",
    observed_text: "stringArray",
    interaction_hints: "stringArray",
    content_hash: "string",
  },
};

const historicalContextPackSpec: ContractFieldSpec = {
  idPattern: ITERATIVE_CASE_DRAFT_ID_PATTERN,
  schemaRef: "HistoricalContextPack@1",
  required: ["schema_ref", "id", "candidate_modules"],
  allowed: [
    "schema_ref",
    "id",
    "module",
    "project",
    "generated_at",
    "candidate_modules",
    "old_behavior",
    "old_behavior_summary",
    "old_cases",
    "likely_data_dependencies",
    "known_pitfalls",
    "repo_files_read",
    "source_refs",
  ],
  fieldTypes: {
    schema_ref: "string",
    id: "string",
    module: "string",
    project: "string",
    generated_at: "string",
    candidate_modules: "stringArray",
    old_behavior: "stringArray",
    old_behavior_summary: "string",
    old_cases: "stringArray",
    likely_data_dependencies: "stringArray",
    known_pitfalls: "stringArray",
    repo_files_read: "stringArray",
    source_refs: "stringArray",
  },
};

const iterativeCaseDraftContractRoutes: Array<{ pattern: RegExp; spec: ContractFieldSpec }> = [
  { pattern: /^\.ai\/core\/contracts\/requirement-atom\/[^/]+\.yaml$/, spec: requirementAtomSpec },
  {
    pattern: /^\.ai\/core\/contracts\/confirmation-question\/[^/]+\.yaml$/,
    spec: confirmationQuestionSpec,
  },
  {
    pattern: /^\.ai\/core\/contracts\/confirmation-package\/[^/]+\.yaml$/,
    spec: confirmationPackageSpec,
  },
  { pattern: /^\.ai\/core\/contracts\/coverage-matrix\/[^/]+\.yaml$/, spec: coverageMatrixSpec },
  { pattern: /^\.ai\/core\/contracts\/case-evidence-map\/[^/]+\.yaml$/, spec: caseEvidenceMapSpec },
  {
    pattern: /^\.ai\/core\/contracts\/automation-intent\/[^/]+\.yaml$/,
    spec: automationIntentSpec,
  },
  { pattern: /^\.ai\/core\/contracts\/lanhu-snapshot\/[^/]+\.yaml$/, spec: lanhuAxureSnapshotSpec },
  {
    pattern: /^\.ai\/core\/contracts\/historical-context\/[^/]+\.yaml$/,
    spec: historicalContextPackSpec,
  },
];
const runtimeContractFields = new Set([
  "runtime",
  "projection_root",
  "supports_startup_preflight",
  "memory_trust",
  "capability_tier",
  "projection_owner",
  "projection_stale_policy",
  "capabilities",
  "loss_model",
  "admitted_limitations",
  "generated_files",
  "copied_vendor_files",
]);

const topLevelOnlySpecs: Array<{ pattern: RegExp; spec: ContractFieldSpec }> = [
  {
    pattern: /^\.ai\/core\/config\/defaults\.yaml$/,
    spec: {
      required: [
        "config_version",
        "environment_prefix",
        "target_env",
        "workspace_root",
        "secret_ref_prefix",
        "alpha",
      ],
      allowed: [
        "config_version",
        "environment_prefix",
        "target_env",
        "workspace_root",
        "secret_ref_prefix",
        "alpha",
        "p1_scope_items",
      ],
    },
  },
  {
    pattern: /^\.ai\/core\/config\/model-rates\.yaml$/,
    spec: {
      required: ["schema_version", "last_updated"],
      allowed: ["schema_version", "last_updated", "rates"],
    },
  },
  {
    pattern: /^\.ai\/core\/external-skills\/[^/]+\.yaml$/,
    spec: requiredTopLevel(["id", "canonical_name", "kind", "source", "freeze", "projection"]),
  },
  { pattern: /^\.ai\/core\/imports\/records\/[^/]+\.yaml$/, spec: importRecordSpec },
  { pattern: /^\.ai\/core\/imports\/runtime-scan\.yaml$/, spec: requiredTopLevel(["scan"]) },
  { pattern: /^\.ai\/core\/runtimes\/preflight\.yaml$/, spec: requiredTopLevel(["preflight"]) },
  {
    pattern: /^\.ai\/core\/runtimes\/run-retention\.yaml$/,
    spec: {
      required: [
        "schema_version",
        "default_retention_days",
        "default_max_bytes",
        "preserve_on_failure_days",
        "gc_command",
      ],
      allowed: [
        "schema_version",
        "default_retention_days",
        "default_max_bytes",
        "preserve_on_failure_days",
        "gc_command",
        "preserve_tags",
      ],
    },
  },
  {
    pattern: /^\.ai\/core\/references\/registry\.yaml$/,
    spec: { required: ["schema_version"], allowed: ["schema_version", "shared_references"] },
  },
  {
    pattern: /^\.ai\/core\/exceptions\/registry\.yaml$/,
    spec: { required: ["schema_version"], allowed: ["schema_version", "exceptions"] },
  },
  {
    pattern: /^\.ai\/core\/runtimes\/(?:claude|codex)\/tool-allowlist\.yaml$/,
    spec: {
      required: ["schema_version", "runtime"],
      allowed: ["schema_version", "runtime", "tools"],
    },
  },
  {
    pattern: /^\.ai\/core\/runtimes\/(?:claude|codex)\/mcp-allowlist\.yaml$/,
    spec: {
      required: ["schema_version", "runtime"],
      allowed: ["schema_version", "runtime", "servers"],
    },
  },
  {
    pattern: /^\.ai\/core\/evals\/p0\/model-capabilities\.lock\.yaml$/,
    spec: {
      required: ["schema_version"],
      allowed: ["schema_version", "primary_runtimes", "models"],
    },
  },
  {
    pattern: /^\.ai\/core\/threat-model\.yaml$/,
    spec: {
      required: ["schema_version", "created_at", "reviewed_at", "assets", "risks"],
      allowed: [
        "schema_version",
        "created_at",
        "reviewed_at",
        "assets",
        "trust_boundaries",
        "risks",
        "accepted_residual_risks",
      ],
    },
  },
  {
    pattern: /^\.ai\/core\/runners\/agent-runner\.yaml$/,
    spec: {
      required: ["schema_version", "id", "description", "runner_kinds", "apply_policy"],
      allowed: [
        "schema_version",
        "id",
        "description",
        "runner_kinds",
        "required_audit_fields",
        "apply_policy",
        "cancel_policy",
        "rollback_policy",
      ],
    },
  },
  {
    pattern: /^\.ai\/core\/runners\/plugin-runner\.yaml$/,
    spec: {
      required: ["schema_version", "id", "description", "isolation_levels"],
      allowed: [
        "schema_version",
        "id",
        "description",
        "isolation_levels",
        "required_audit_fields",
        "strict_p0_policy",
      ],
    },
  },
  {
    pattern: /^\.ai\/core\/runtimes\/project-context\.yaml$/,
    spec: {
      required: ["schema_version", "description", "channels"],
      allowed: ["schema_version", "description", "channels"],
    },
  },
];

const rowListSpecs: Array<{ pattern: RegExp; spec: RowListSpec }> = [
  {
    pattern: /^\.ai\/core\/guards\/registry\.yaml$/,
    spec: {
      key: "guards",
      required: ["id", "kind", "implementation"],
      allowed: ["id", "kind", "implementation"],
    },
  },

  {
    pattern: /^\.ai\/core\/runtimes\/implementation-roots\.yaml$/,
    spec: {
      key: "implementation_roots",
      required: ["path", "status", "hidden_id_lint"],
      allowed: ["path", "status", "hidden_id_lint"],
    },
  },
  {
    pattern: /^\.ai\/core\/runtimes\/secret-sources\.yaml$/,
    spec: {
      key: "secret_sources",
      required: ["id", "env_prefix", "value_pattern", "raw_secret_allowed"],
      allowed: ["id", "env_prefix", "value_pattern", "raw_secret_allowed"],
    },
  },
  {
    pattern: /^\.ai\/core\/schemas\/registry\.yaml$/,
    spec: {
      key: "schemas",
      required: ["id", "version", "path"],
      allowed: ["id", "version", "path"],
    },
  },
  {
    pattern: /^\.ai\/core\/source-refs\/resolvers\.yaml$/,
    spec: {
      key: "resolvers",
      required: ["id", "implementation", "mutable_source", "stale_hash_policy"],
      allowed: ["id", "implementation", "mutable_source", "stale_hash_policy"],
    },
  },
];

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

function rejectUnknownFields(
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseTopLevelFields(path: string, text: string): TopLevelFieldsResult {
  try {
    return { ok: true, value: parseTopLevelYamlFieldsCompat(text, path), issues: [] };
  } catch (error) {
    return { ok: false, issues: [yamlErrorToIssue(error, path)] };
  }
}

function topLevelYamlIssues(path: string, text: string): AiCoreIssue[] {
  return parseTopLevelFields(path, text).issues;
}

function yamlErrorToIssue(error: unknown, path: string): AiCoreIssue {
  const message = error instanceof Error ? error.message : String(error);
  const code = message.match(/^(yaml\.[A-Za-z0-9_.-]+):/)?.[1] ?? "yaml.parse_failed";
  return { code, severity: "error", message, path };
}

function requiredTopLevel(fields: string[]): ContractFieldSpec {
  return { required: fields, allowed: fields };
}

function contractIssue(code: string, message: string, path: string): AiCoreIssue {
  return { code, severity: "error", message, path };
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
