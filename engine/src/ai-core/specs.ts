import { requiredTopLevel } from "./contract-schema-utils.ts";
import type { AiCoreIssue } from "./types.ts";

export type ContractSchemaSummary = {
  checkedFiles: string[];
};

export type ContractFieldSpec = {
  idPattern?: RegExp;
  required: string[];
  allowed: string[];
  schemaRef?: string;
  fieldTypes?: Record<string, ContractFieldType>;
};

export type ContractFieldType =
  | "array"
  | "boolean"
  | "nonNegativeInteger"
  | "nullableString"
  | "string"
  | "stringArray";

export type RowListSpec = {
  key: string;
  required: string[];
  allowed: string[];
};

export type TopLevelFieldsResult =
  | { ok: true; value: Record<string, string | true>; issues: [] }
  | { ok: false; issues: AiCoreIssue[] };

export const CONTRACT_ID_PATTERN = /^[a-z0-9][a-z0-9-]*@[0-9]+$/;
export const ITERATIVE_CASE_DRAFT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*(@[0-9]+)?$/;
export const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*@[0-9]+$/;
export const DOC_BLOCK_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
export const SKILL_ORCHESTRATION_FIELDS = ["plugin_calls", "agent_dispatch", "workflow_steps"];
export const DOC_BLOCK_SOURCES = new Set([".ai/core", ".ai/core/commands", ".ai/core/runtimes"]);
export const DOC_BLOCK_TARGETS = new Set(["README.md", "README-EN.md", "CHANGELOG.md"]);
export const SUPPORTED_DOC_BLOCK_IDS = new Set([
  "command-index",
  "runtime-support",
  "release-summary",
]);
export const SOURCE_REF_TYPES = new Set([
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
export const REQUIREMENT_EVIDENCE_KINDS = new Set([
  "product_confirmed",
  "lanhu_observed",
  "history_inferred",
  "tester_assumption",
]);
export const AMBIGUITY_CLASSES = new Set([
  "blocking_unknown",
  "high_risk_pending",
  "defaultable_unknown",
  "automation_deferred",
  "non_blocking_question",
]);
export const CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);
export const COVERAGE_TYPES = new Set([
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
export const RISK_LEVELS = new Set(["P0", "P1", "P2", "P3"]);
export const COVERAGE_EVIDENCE_STATUSES = new Set([
  "confirmed",
  "defaulted",
  "inferred",
  "pending",
  "blocked",
]);
export const AUTOMATION_STATUSES = new Set(["ready", "deferred", "blocked"]);

export const skillContractSpec: ContractFieldSpec = {
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

export const promptContractSpec: ContractFieldSpec = {
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

export const workflowContractSpec: ContractFieldSpec = {
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

export const agentContractSpec: ContractFieldSpec = {
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

export const pluginManifestSpec: ContractFieldSpec = {
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

export const commandSpec: ContractFieldSpec = {
  required: ["id", "skill", "user_invocable", "summary"],
  allowed: ["id", "skill", "user_invocable", "summary"],
};

export const importRecordSpec: ContractFieldSpec = {
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

export const requirementAtomSpec: ContractFieldSpec = {
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

export const confirmationQuestionSpec: ContractFieldSpec = {
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

export const confirmationPackageSpec: ContractFieldSpec = {
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

export const coverageMatrixSpec: ContractFieldSpec = {
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

export const caseEvidenceMapSpec: ContractFieldSpec = {
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

export const automationIntentSpec: ContractFieldSpec = {
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

export const lanhuAxureSnapshotSpec: ContractFieldSpec = {
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

export const historicalContextPackSpec: ContractFieldSpec = {
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

export const iterativeCaseDraftContractRoutes: Array<{ pattern: RegExp; spec: ContractFieldSpec }> =
  [
    {
      pattern: /^\.ai\/core\/contracts\/requirement-atom\/[^/]+\.yaml$/,
      spec: requirementAtomSpec,
    },
    {
      pattern: /^\.ai\/core\/contracts\/confirmation-question\/[^/]+\.yaml$/,
      spec: confirmationQuestionSpec,
    },
    {
      pattern: /^\.ai\/core\/contracts\/confirmation-package\/[^/]+\.yaml$/,
      spec: confirmationPackageSpec,
    },
    { pattern: /^\.ai\/core\/contracts\/coverage-matrix\/[^/]+\.yaml$/, spec: coverageMatrixSpec },
    {
      pattern: /^\.ai\/core\/contracts\/case-evidence-map\/[^/]+\.yaml$/,
      spec: caseEvidenceMapSpec,
    },
    {
      pattern: /^\.ai\/core\/contracts\/automation-intent\/[^/]+\.yaml$/,
      spec: automationIntentSpec,
    },
    {
      pattern: /^\.ai\/core\/contracts\/lanhu-snapshot\/[^/]+\.yaml$/,
      spec: lanhuAxureSnapshotSpec,
    },
    {
      pattern: /^\.ai\/core\/contracts\/historical-context\/[^/]+\.yaml$/,
      spec: historicalContextPackSpec,
    },
  ];
export const runtimeContractFields = new Set([
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

export const topLevelOnlySpecs: Array<{ pattern: RegExp; spec: ContractFieldSpec }> = [
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

export const rowListSpecs: Array<{ pattern: RegExp; spec: RowListSpec }> = [
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
