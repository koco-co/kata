import { describe, expect, it } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateAllAiCoreContracts } from "../../src/ai-core/contract-schema.ts";

describe("AI Core contract schema validation", () => {
  it("validates every committed AI Core contract file", async () => {
    const result = await validateAllAiCoreContracts();
    expect(result.ok).toBe(true);
    expect(result.value?.checkedFiles.length).toBeGreaterThan(30);
  });

  it("rejects skill contracts with orchestration fields", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/skills/bad/skill.yaml": [
          "id: bad@1",
          "name: bad",
          "plugin_calls:",
          "  - fixture-design-source.fetch-design-doc@1",
          "",
        ].join("\n"),
      },
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "contract.skill_orchestration_field",
    );
  });

  it("surfaces strict yaml parser issues", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/commands/bad.command.yaml": "id: bad@1\ndescription: |\n  multiline\n",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.unsupported_block_scalar");
  });

  it("rejects prompt contracts that only satisfy top-level fields", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/prompts/bad.prompt.yaml": [
          "id: bad-prompt@1",
          "schema_ref: PromptContract@1",
          "locale: zh-CN",
          "model_lock:",
          "  capability_ref: model-capabilities@1",
          "input_schema: SomeInput@1",
          "output_schema: SomeOutput@1",
          "rendering:",
          "  system: missing role_sections and boundaries",
          "prefill:",
          "  required: true",
          "fallback:",
          "  missing_evidence: blocked",
          "hallucination_policy:",
          "  unsupported_fact: block",
          "",
        ].join("\n"),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("contract.schema_invalid");
    expect(result.issues.map((issue) => issue.message)).toContain(
      "model_lock.required_capabilities must be a non-empty string array.",
    );
  });

  it("accepts iterative case-draft contract golden fixtures", async () => {
    const sourceRef =
      "lanhu.fixture:datasource-form#sha256:947d4c2d1db745733c0ee6905724af4e92b9bf94952a017a915b8afa4ca7694f";
    const sourceRefs = [`  - ${sourceRef}`];
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/contracts/requirement-atom/requirement-atom.golden.yaml": [
          "schema_ref: RequirementAtom@1",
          "id: atom-datasource-type-fields",
          "title: SparkThrift and Doris datasource required fields differ",
          "source_refs:",
          ...sourceRefs,
          "subject: datasource creation form",
          "condition: user selects SparkThrift or Doris as datasource type",
          "action: system renders type-specific connection fields",
          "expected_result: SparkThrift shows thrift connection fields and Doris shows FE address, port, and account permission fields.",
          "field_rules:",
          "  - SparkThrift requires thrift host and port.",
          "  - Doris requires FE address, port, username, and password.",
          "state_rules:",
          "  - Switching datasource type refreshes visible required fields.",
          "permissions:",
          "  - user can create datasource",
          "data_dependencies:",
          "  - dataAssets env profile",
          "evidence_kind: lanhu_observed",
          "ambiguity_class: defaultable_unknown",
          "confidence: medium",
          "",
        ].join("\n"),
        ".ai/core/contracts/confirmation-question/confirmation-question.golden.yaml": [
          "schema_ref: ConfirmationQuestion@1",
          "id: q-datasource-fields",
          "severity: defaultable_unknown",
          "location: datasource creation form > datasource type",
          "question: Should SparkThrift and Doris keep different required connection fields?",
          "recommended_answer: SparkThrift requires thrift connection fields; Doris requires FE address, port, and account permission fields.",
          "basis:",
          "  - lanhu_observed: SparkThrift and Doris form variants",
          "impact_if_unanswered: Cases can proceed with the project default and remain marked defaulted.",
          "options:",
          "  - use_recommended_answer",
          "  - keep_as_pending",
          "  - custom_answer",
          "affected_atoms:",
          "  - atom-datasource-type-fields",
          "",
        ].join("\n"),
        ".ai/core/contracts/confirmation-package/confirmation-package.golden.yaml": [
          "schema_ref: ConfirmationPackage@1",
          "id: cp-datasource",
          "module: dataAssets datasource management",
          "round: 1",
          "questions:",
          "  - q-datasource-fields",
          "blocking_count: 0",
          "defaultable_count: 1",
          "source_refs:",
          ...sourceRefs,
          "",
        ].join("\n"),
        ".ai/core/contracts/coverage-matrix/coverage-matrix.golden.yaml": [
          "schema_ref: CoverageMatrix@1",
          "id: cm-datasource-type-fields",
          "title: Datasource type-specific required fields",
          "coverage_type: positive",
          "requirement_atom_ids:",
          "  - atom-datasource-type-fields",
          "risk_level: P1",
          "evidence_status: defaulted",
          "manual_case_allowed: true",
          "automation_allowed: true",
          "",
        ].join("\n"),
        ".ai/core/contracts/case-evidence-map/case-evidence-map.golden.yaml": [
          "schema_ref: CaseEvidenceMap@1",
          "case_id: case-datasource-create-sparkthrift-doris",
          "coverage_matrix_ids:",
          "  - cm-datasource-type-fields",
          "requirement_atom_ids:",
          "  - atom-datasource-type-fields",
          "assertions:",
          "  - SparkThrift and Doris show different required connection fields.",
          "source_refs:",
          ...sourceRefs,
          "",
        ].join("\n"),
        ".ai/core/contracts/automation-intent/automation-intent.golden.yaml": [
          "schema_ref: AutomationIntent@1",
          "case_id: case-datasource-create-sparkthrift-doris",
          "title: Create SparkThrift and Doris datasources with type-specific fields",
          "automation_status: ready",
          "entry_page_hint: dataAssets datasource management",
          "data_setup:",
          "  - login as datasource manager",
          "visible_assertions:",
          "  - SparkThrift required fields are visible after selecting SparkThrift.",
          "  - Doris required fields are visible after selecting Doris.",
          "stable_text_anchors:",
          "  - SparkThrift",
          "  - Doris",
          "pending_blockers: []",
          "source_refs:",
          ...sourceRefs,
          "",
        ].join("\n"),
        ".ai/core/contracts/lanhu-snapshot/lanhu-snapshot.golden.yaml": [
          "schema_ref: LanhuAxureSnapshot@1",
          "id: lanhu-datasource-snapshot",
          "title: SparkThrift and Doris datasource form",
          `source_ref: ${sourceRef}`,
          "pages:",
          "  - datasource creation",
          "observed_text:",
          "  - SparkThrift",
          "  - Doris",
          "interaction_hints:",
          "  - datasource type changes visible required fields",
          "",
        ].join("\n"),
        ".ai/core/contracts/historical-context/historical-context.golden.yaml": [
          "schema_ref: HistoricalContextPack@1",
          "id: history-datasource",
          "module: dataAssets datasource management",
          "candidate_modules:",
          "  - datasource management",
          "old_behavior:",
          "  - SparkThrift and Doris used distinct connection field groups.",
          "old_cases:",
          "  - case-datasource-create-sparkthrift",
          "likely_data_dependencies:",
          "  - dataAssets env profile",
          "known_pitfalls:",
          "  - Historical behavior recommends defaults but does not confirm new product intent.",
          "source_refs:",
          ...sourceRefs,
          "",
        ].join("\n"),
      },
    });

    expect(result.ok).toBe(true);
  });

  it("rejects ConfirmationQuestion without affected atoms", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/contracts/confirmation-question/missing-affected-atoms.yaml": [
          "schema_ref: ConfirmationQuestion@1",
          "id: q-missing-affected-atoms",
          "severity: blocking_unknown",
          "location: datasource creation form",
          "question: Which fields are required?",
          "recommended_answer: Confirm with product.",
          "basis:",
          "  - lanhu_observed: sparse datasource form",
          "impact_if_unanswered: Final cases would include unsupported field assertions.",
          "options:",
          "  - ask_product",
          "",
        ].join("\n"),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.message)).toContain(
      "Missing required contract field: affected_atoms",
    );
  });

  it("rejects invalid iterative contract field types", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/contracts/coverage-matrix/invalid-field-types.yaml": [
          "schema_ref: CoverageMatrix@1",
          "id: cm-invalid-field-types",
          "title: Invalid field types",
          "coverage_type: positive",
          "requirement_atom_ids:",
          "  - atom-datasource-type-fields",
          "risk_level: P1",
          "evidence_status: defaulted",
          "manual_case_allowed: maybe",
          "automation_allowed: sure",
          "",
        ].join("\n"),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.message)).toContain(
      "manual_case_allowed must be a boolean.",
    );
    expect(result.issues.map((issue) => issue.message)).toContain(
      "automation_allowed must be a boolean.",
    );
  });

  it("accepts the case-draft sparse PRD eval golden suite", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/evals/case-draft/golden.yaml": [
          "suite: case-draft",
          "cases:",
          "  - id: sparse-lanhu-only",
          "    fixture: fixtures/sparse-lanhu-only.json",
          "  - id: lanhu-plus-history",
          "    fixture: fixtures/lanhu-plus-history.json",
          "  - id: conflicting-history",
          "    fixture: fixtures/conflicting-history.json",
          "  - id: inferable-project",
          "    fixture: fixtures/inferable-project.json",
          "  - id: multi-candidate-project",
          "    fixture: fixtures/multi-candidate-project.json",
          "  - id: non-blocking-pending",
          "    fixture: fixtures/non-blocking-pending.json",
          "  - id: blocking-unknown",
          "    fixture: fixtures/blocking-unknown.json",
          "  - id: automation-deferred",
          "    fixture: fixtures/automation-deferred.json",
          "",
        ].join("\n"),
      },
    });

    expect(result.ok).toBe(true);
  });

  it("rejects invalid RequirementAtom enum values", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/contracts/requirement-atom/requirement-atom.golden.yaml": [
          "schema_ref: RequirementAtom@1",
          "id: atom-invalid-enums",
          "title: Invalid enum fixture",
          "source_refs:",
          "  - lanhu.fixture:datasource-form#sha256:947d4c2d1db745733c0ee6905724af4e92b9bf94952a017a915b8afa4ca7694f",
          "subject: datasource creation form",
          "condition: user selects SparkThrift or Doris as datasource type",
          "action: system renders type-specific connection fields",
          "expected_result: SparkThrift and Doris fields are validated.",
          "field_rules:",
          "  - SparkThrift requires thrift host and port.",
          "state_rules:",
          "  - Switching datasource type refreshes visible required fields.",
          "permissions:",
          "  - user can create datasource",
          "data_dependencies:",
          "  - dataAssets env profile",
          "evidence_kind: pending_product",
          "ambiguity_class: resolved",
          "confidence: maybe",
          "",
        ].join("\n"),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("contract.schema_invalid");
    expect(result.issues.map((issue) => issue.message).join("\n")).toContain(
      "Invalid evidence_kind",
    );
    expect(result.issues.map((issue) => issue.message).join("\n")).toContain(
      "Invalid ambiguity_class",
    );
  });

  it("rejects invalid RequirementAtom source_refs entries", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/contracts/requirement-atom/invalid-source-ref.yaml": [
          "schema_ref: RequirementAtom@1",
          "id: atom-invalid-source-ref",
          "title: Invalid source ref fixture",
          "source_refs: [definitely-not-a-source-ref]",
          "subject: datasource creation form",
          "evidence_kind: lanhu_observed",
          "ambiguity_class: defaultable_unknown",
          "confidence: medium",
          "",
        ].join("\n"),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.message)).toContain(
      "Invalid source_refs entry: definitely-not-a-source-ref",
    );
  });

  it("rejects invalid LanhuAxureSnapshot source_ref values", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/contracts/lanhu-snapshot/invalid-source-ref.yaml": [
          "schema_ref: LanhuAxureSnapshot@1",
          "id: lanhu-invalid-source-ref",
          "title: Invalid source ref fixture",
          "source_ref: definitely-not-a-source-ref",
          "pages:",
          "  - datasource creation",
          "",
        ].join("\n"),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.message)).toContain(
      "Invalid source_ref: definitely-not-a-source-ref",
    );
  });

  it("fails closed for unclassified AI Core yaml paths", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/unknown/foo.yaml": "id: unknown@1\n",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("contract.unclassified_yaml");
  });

  it("normalizes virtual file keys before reading content", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-empty-root-"));
    const result = await validateAllAiCoreContracts({
      root,
      virtualFiles: {
        "./.ai/core/skills/bad/skill.yaml": [
          "id: bad@1",
          "name: bad",
          "plugin_calls:",
          "  - fixture-design-source.fetch-design-doc@1",
          "",
        ].join("\n"),
      },
    });

    expect(result.value?.checkedFiles).toEqual([".ai/core/skills/bad/skill.yaml"]);
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "contract.skill_orchestration_field",
    );
  });

  it("rejects unknown runtime contract fields", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/runtimes/claude.yaml": [
          "runtime: claude",
          "projection_root: .claude",
          "supports_startup_preflight: false",
          "memory_trust: advisory_untrusted",
          "generated_files:",
          "  - CLAUDE.md",
          "unexpected_field: accepted",
          "",
        ].join("\n"),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("contract.schema_invalid");
    expect(result.issues.map((issue) => issue.message)).toContain(
      "Unknown contract field: unexpected_field",
    );
  });

  it("rejects generated docs blocks with unknown targets and invalid source/id values", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/docs/generated-blocks.yaml": [
          "blocks:",
          "  - id: Skill List",
          "    source: docs/manual",
          "    targets:",
          "      - README-FR.md",
          "",
        ].join("\n"),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("contract.schema_invalid");
    expect(result.issues.map((issue) => issue.message)).toContain(
      "docs blocks row 1 has invalid id: Skill List.",
    );
    expect(result.issues.map((issue) => issue.message)).toContain(
      "docs blocks row 1 has invalid source: docs/manual.",
    );
    expect(result.issues.map((issue) => issue.message)).toContain(
      "docs blocks row 1 has invalid target: README-FR.md.",
    );
  });

  it("rejects generated docs blocks with syntactically valid but unsupported ids", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/docs/generated-blocks.yaml": [
          "blocks:",
          "  - id: not-rendered",
          "    source: .ai/core",
          "    targets:",
          "      - README.md",
          "",
        ].join("\n"),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("contract.schema_invalid");
    expect(result.issues.map((issue) => issue.message)).toContain(
      "docs blocks row 1 has unsupported id: not-rendered.",
    );
  });

  it("accepts the generated README command index block source", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/docs/generated-blocks.yaml": [
          "blocks:",
          "  - id: command-index",
          "    source: .ai/core/commands",
          "    targets:",
          "      - README.md",
          "      - README-EN.md",
          "",
        ].join("\n"),
      },
    });

    expect(result.issues.map((issue) => issue.message)).not.toContain(
      "docs blocks row 1 has unsupported id: command-index.",
    );
    expect(result.issues.map((issue) => issue.message)).not.toContain(
      "docs blocks row 1 has invalid source: .ai/core/commands.",
    );
  });

  it("rejects translation glossary terms missing required locales", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/docs/translation-glossary.yaml": [
          "terms:",
          "  - id: skill",
          "    zh-CN: 技能",
          "",
        ].join("\n"),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("yaml.missing_required_row_field");
    expect(result.issues.map((issue) => issue.message)).toContain(
      "terms row 1 is missing required field en-US.",
    );
  });
});
