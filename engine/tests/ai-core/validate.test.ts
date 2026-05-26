import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAiCore } from "../../src/ai-core/load.ts";
import { repoRoot } from "../../src/ai-core/paths.ts";
import type { AiCoreProject } from "../../src/ai-core/types.ts";
import { validateAiCore, validateAiCoreStrict } from "../../src/ai-core/validate.ts";

describe("ai-core schema registry", () => {
  it("loads the committed schema registry and guard registry", async () => {
    const core = await loadAiCore();
    expect(core.schemas.map((schema) => schema.id)).toContain("SkillContract@1");
    expect(core.schemas.map((schema) => schema.id)).toContain("PromptContract@1");
    expect(core.schemas.map((schema) => schema.id)).toContain("SourceRef@1");
    expect(core.schemas.map((schema) => schema.id)).toContain("SourceSnapshot@1");
    expect(core.plugins.map((plugin) => plugin.id)).toContain(
      "fixture-design-source.fetch-design-doc@1",
    );
    expect(core.guards.map((guard) => guard.id)).toContain("write_policy.block_repos_write@1");
  });

  it("does not retain engine/lib as a transitional implementation root after GA cleanup", async () => {
    const core = await loadAiCore();
    expect(core.implementationRoots).not.toContain("engine/lib/**");
    expect(core.implementationRoots).toContain("engine/src/ai-core/**");
    expect(core.implementationRoots).toContain("engine/src/source-ref/**");
  });

  it("validates an empty alpha skeleton without runtime contracts", async () => {
    const core = await loadAiCore();
    const result = validateAiCore(core);
    expect(result.ok).toBe(true);
    expect(result.issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("validates committed contract schemas in the strict validator", async () => {
    const core = await loadAiCore();
    const result = await validateAiCoreStrict(core);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(core);
    expect(result.issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("reports skill orchestration fields in the strict validator", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-strict-orchestration-"));
    const skillPath = ".ai/core/skills/bad/skill.yaml";
    mkdirSync(join(root, ".ai/core/skills/bad"), { recursive: true });
    writeFileSync(
      join(root, skillPath),
      [
        "id: bad@1",
        "name: bad",
        "kind: product",
        "schema_version: SkillContract@1",
        "skill_version: 1",
        "status: active",
        "description: bad",
        "outputs:",
        "inputs:",
        "allowed_tools:",
        "context_budget: small",
        "evidence_policy: strict",
        "failure_policy: fail",
        "body: text",
        "agent_dispatch:",
        "  - case-draft-worker@1",
        "",
      ].join("\n"),
    );

    const result = await validateAiCoreStrict({
      ...projectWithSchema(root, "Contract@1", "schemas/Contract.v1.schema.json"),
      schemas: [],
      skills: [{ id: "bad@1", path: skillPath }],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "contract.skill_orchestration_field",
    );
  });

  it("reports missing GA-core workflow contracts", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-missing-ga-workflows-"));
    const workflowPath = ".ai/core/workflows/case-draft-from-prd.workflow.yaml";
    mkdirSync(join(root, ".ai/core/workflows"), { recursive: true });
    writeFileSync(
      join(root, workflowPath),
      [
        "id: case-draft-from-prd@1",
        "schema_ref: WorkflowContract@1",
        "entry_skill: case-draft@1",
        "inputs:",
        "  prd:",
        "    kind: file_or_fixture",
        "    required: true",
        "budgets:",
        "  total_tokens: 24000",
        "  aggregation_budget_tokens: 3000",
        "  cost_rate_card: local-p0-fixture@1",
        "steps:",
        "  - id: fetch_design_doc",
        "    uses_agent: case-draft-worker@1",
        "failure_policy:",
        "  missing_evidence: refuse_missing_evidence@1",
        "",
      ].join("\n"),
    );

    const result = validateAiCore({
      ...projectWithSchema(root, "Contract@1", "schemas/Contract.v1.schema.json"),
      schemas: [],
      workflows: [{ id: "case-draft-from-prd@1", path: workflowPath }],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("workflow_contract.missing");
  });

  it("reports malformed GA-core workflow contracts without throwing", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-malformed-ga-workflow-"));
    const workflowPath = ".ai/core/workflows/workspace-manage.workflow.yaml";
    mkdirSync(join(root, ".ai/core/workflows"), { recursive: true });
    writeFileSync(
      join(root, workflowPath),
      [
        "id: workspace-manage@1",
        "schema_ref: WorkflowContract@1",
        "inputs:",
        "  request:",
        "    kind: request",
        "    required: true",
        "",
      ].join("\n"),
    );

    const result = validateAiCore({
      ...projectWithSchema(root, "Contract@1", "schemas/Contract.v1.schema.json"),
      schemas: [],
      workflows: [{ id: "workspace-manage@1", path: workflowPath }],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("workflow_contract.malformed");
  });

  it("validates discovered P0 contract instances", async () => {
    const core = await loadAiCore();
    expect(validateAiCore(core).ok).toBe(true);

    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-contract-invalid-"));
    const badAgentPath = ".ai/core/agents/bad.agent.yaml";
    mkdirSync(join(root, ".ai/core/agents"), { recursive: true });
    writeFileSync(
      join(root, badAgentPath),
      [
        "id: bad-agent@1",
        "schema_ref: PromptContract@1",
        "role: worker",
        "unexpected: true",
        "",
      ].join("\n"),
    );

    const result = validateAiCore({
      ...projectWithSchema(root, "Contract@1", "schemas/Contract.v1.schema.json"),
      schemas: [],
      agents: [{ id: "bad-agent@1", path: badAgentPath }],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("contract.schema_invalid");
  });

  it("discovers the P0 product skill, prompt, workflow, and agents", async () => {
    const core = await loadAiCore();
    expect(core.skills.map((skill) => skill.id).sort()).toEqual([
      "bug-file@1",
      "case-draft@1",
      "case-edit@1",
      "case-hotfix@1",
      "conflict-analyze@1",
      "diff-scan@1",
      "infra-diagnose@1",
      "knowledge-curate@1",
      "playwright-automation@1",
      "workspace-manage@1",
    ]);
    expect(core.prompts.map((prompt) => prompt.id).sort()).toEqual([
      "bug-file-prompt@1",
      "case-draft-prompt@1",
      "case-edit-prompt@1",
      "case-hotfix-prompt@1",
      "conflict-analyze-prompt@1",
      "diff-scan-prompt@1",
      "infra-diagnose-prompt@1",
      "knowledge-curate-prompt@1",
      "playwright-automation-prompt@1",
      "workspace-manage-prompt@1",
    ]);
    const playwrightPrompt = core.prompts.find(
      (prompt) => prompt.id === "playwright-automation-prompt@1",
    );
    const playwrightPromptPath = playwrightPrompt?.path;
    expect(playwrightPromptPath).toBe(".ai/core/prompts/playwright-automation.prompt.yaml");
    if (!playwrightPromptPath) throw new Error("Missing playwright automation prompt path.");
    const playwrightPromptText = readFileSync(join(repoRoot(), playwrightPromptPath), "utf8");
    expect(playwrightPromptText).toContain("- acceptance_command");
    expect(playwrightPromptText).toContain("PlaywrightAutomationHandoff@2");
    expect(playwrightPromptText).toContain("playwright-automation references 分阶段加载");
    expect(core.workflows.map((workflow) => workflow.id).sort()).toEqual([
      "bug-file@1",
      "case-draft-from-prd@1",
      "case-edit@1",
      "case-hotfix@1",
      "conflict-analyze@1",
      "diff-scan@1",
      "infra-diagnose@1",
      "knowledge-curate@1",
      "playwright-automation@1",
      "workspace-manage@1",
    ]);
    expect(core.agents.map((agent) => agent.id).sort()).toEqual([
      "bug-file-worker@1",
      "case-draft-worker@1",
      "case-edit-worker@1",
      "case-hotfix-worker@1",
      "case-reviewer@1",
      "conflict-analyze-worker@1",
      "diff-scan-worker@1",
      "infra-diagnose-worker@1",
      "knowledge-curate-worker@1",
      "playwright-automation-worker@1",
      "workspace-manage-worker@1",
    ]);
    expect(core.plugins.map((plugin) => plugin.id)).toEqual([
      "fixture-design-source.fetch-design-doc@1",
      "lanhu.design-source@1",
    ]);
  });

  it("rejects duplicate discovered contract ids per collection", async () => {
    const root = writeCoreRegistries({});
    mkdirSync(join(root, ".ai/core/skills/a"), { recursive: true });
    mkdirSync(join(root, ".ai/core/skills/b"), { recursive: true });
    writeFileSync(join(root, ".ai/core/skills/a/skill.yaml"), "id: duplicate-skill@1\n");
    writeFileSync(join(root, ".ai/core/skills/b/skill.yaml"), "id: duplicate-skill@1\n");

    await expect(loadAiCoreFromRoot(root)).rejects.toThrow(
      "Duplicate contract id duplicate-skill@1",
    );
  });

  it("rejects duplicate discovered contract ids across collections", async () => {
    const root = writeCoreRegistries({});
    mkdirSync(join(root, ".ai/core/skills/case-draft"), { recursive: true });
    mkdirSync(join(root, ".ai/core/prompts"), { recursive: true });
    writeFileSync(
      join(root, ".ai/core/skills/case-draft/skill.yaml"),
      "id: duplicate-contract@1\n",
    );
    writeFileSync(
      join(root, ".ai/core/prompts/duplicate.prompt.yaml"),
      "id: duplicate-contract@1\n",
    );

    await expect(loadAiCoreFromRoot(root)).rejects.toThrow(
      "Duplicate contract id duplicate-contract@1",
    );
  });

  it("rejects arbitrary workflow ids that mirror product skill ids", async () => {
    const root = writeCoreRegistries({});
    mkdirSync(join(root, ".ai/core/skills/custom-skill"), { recursive: true });
    mkdirSync(join(root, ".ai/core/workflows"), { recursive: true });
    writeFileSync(join(root, ".ai/core/skills/custom-skill/skill.yaml"), "id: custom-skill@1\n");
    writeFileSync(join(root, ".ai/core/workflows/custom.workflow.yaml"), "id: custom-skill@1\n");

    await expect(loadAiCoreFromRoot(root)).rejects.toThrow("Duplicate contract id custom-skill@1");
  });

  it("allows required GA workflow ids to mirror product skill ids", async () => {
    const root = writeCoreRegistries({});
    mkdirSync(join(root, ".ai/core/skills/workspace-manage"), { recursive: true });
    mkdirSync(join(root, ".ai/core/workflows"), { recursive: true });
    writeFileSync(
      join(root, ".ai/core/skills/workspace-manage/skill.yaml"),
      "id: workspace-manage@1\n",
    );
    writeFileSync(
      join(root, ".ai/core/workflows/workspace.workflow.yaml"),
      "id: workspace-manage@1\n",
    );

    const core = await loadAiCoreFromRoot(root);
    expect(core.skills.map((skill) => skill.id)).toEqual(["workspace-manage@1"]);
    expect(core.workflows.map((workflow) => workflow.id)).toEqual(["workspace-manage@1"]);
  });

  it("discovers product skills only from exact skill.yaml basenames", async () => {
    const root = writeCoreRegistries({});
    mkdirSync(join(root, ".ai/core/skills/good/references"), { recursive: true });
    writeFileSync(join(root, ".ai/core/skills/good/skill.yaml"), "id: good-skill@1\n");
    writeFileSync(
      join(root, ".ai/core/skills/good/references/foo-skill.yaml"),
      "id: hidden-reference@1\n",
    );

    const core = await loadAiCoreFromRoot(root);
    expect(core.skills.map((skill) => skill.id)).toEqual(["good-skill@1"]);
  });

  it("reports nested workflow step id pattern violations", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-workflow-invalid-step-"));
    const workflowPath = ".ai/core/workflows/bad.workflow.yaml";
    mkdirSync(join(root, ".ai/core/workflows"), { recursive: true });
    writeFileSync(
      join(root, workflowPath),
      [
        "id: bad-workflow@1",
        "schema_ref: WorkflowContract@1",
        "entry_skill: case-draft@1",
        "inputs:",
        "  prd:",
        "    kind: file_or_fixture",
        "    required: true",
        "budgets:",
        "  total_tokens: 24000",
        "  aggregation_budget_tokens: 3000",
        "  cost_rate_card: local-p0-fixture@1",
        "steps:",
        "  - id: Bad Step!",
        "    uses_agent: case-draft-worker@1",
        "failure_policy:",
        "  missing_evidence: refuse_missing_evidence@1",
        "",
      ].join("\n"),
    );

    const result = validateAiCore({
      ...projectWithSchema(root, "Contract@1", "schemas/Contract.v1.schema.json"),
      schemas: [],
      workflows: [{ id: "bad-workflow@1", path: workflowPath }],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("contract.schema_invalid");
    expect(result.issues.map((issue) => issue.message)).toContain(
      "Invalid workflow step id: Bad Step!",
    );
  });

  it("reports workflow step id violations when id is not the first sequence field", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-workflow-reordered-step-"));
    const workflowPath = ".ai/core/workflows/bad-reordered.workflow.yaml";
    mkdirSync(join(root, ".ai/core/workflows"), { recursive: true });
    writeFileSync(
      join(root, workflowPath),
      [
        "id: bad-reordered-workflow@1",
        "schema_ref: WorkflowContract@1",
        "entry_skill: case-draft@1",
        "inputs:",
        "  prd:",
        "    kind: file_or_fixture",
        "    required: true",
        "budgets:",
        "  total_tokens: 24000",
        "  aggregation_budget_tokens: 3000",
        "  cost_rate_card: local-p0-fixture@1",
        "steps:",
        "  - uses_agent: case-draft-worker@1",
        "    id: Bad Step!",
        "failure_policy:",
        "  missing_evidence: refuse_missing_evidence@1",
        "",
      ].join("\n"),
    );

    const result = validateAiCore({
      ...projectWithSchema(root, "Contract@1", "schemas/Contract.v1.schema.json"),
      schemas: [],
      workflows: [{ id: "bad-reordered-workflow@1", path: workflowPath }],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("contract.schema_invalid");
    expect(result.issues.map((issue) => issue.message)).toContain(
      "Invalid workflow step id: Bad Step!",
    );
  });

  it("reports workflow steps missing required id", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-workflow-missing-step-id-"));
    const workflowPath = ".ai/core/workflows/missing-step-id.workflow.yaml";
    mkdirSync(join(root, ".ai/core/workflows"), { recursive: true });
    writeFileSync(
      join(root, workflowPath),
      [
        "id: missing-step-id-workflow@1",
        "schema_ref: WorkflowContract@1",
        "entry_skill: case-draft@1",
        "inputs:",
        "  prd:",
        "    kind: file_or_fixture",
        "    required: true",
        "budgets:",
        "  total_tokens: 24000",
        "  aggregation_budget_tokens: 3000",
        "  cost_rate_card: local-p0-fixture@1",
        "steps:",
        "  - uses_agent: case-draft-worker@1",
        "failure_policy:",
        "  missing_evidence: refuse_missing_evidence@1",
        "",
      ].join("\n"),
    );

    const result = validateAiCore({
      ...projectWithSchema(root, "Contract@1", "schemas/Contract.v1.schema.json"),
      schemas: [],
      workflows: [{ id: "missing-step-id-workflow@1", path: workflowPath }],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("contract.workflow_step_id_missing");
    expect(result.issues.map((issue) => issue.message)).toContain(
      "Workflow step is missing required id",
    );
  });

  it("reports an error when a schema file $id does not match the registry id", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-schema-id-"));
    const schemaPath = "schemas/Contract.v1.schema.json";
    mkdirSync(join(root, "schemas"), { recursive: true });
    writeFileSync(
      join(root, schemaPath),
      JSON.stringify({
        $id: "OtherContract@1",
        type: "object",
        additionalProperties: false,
        properties: {},
      }),
    );

    const result = validateAiCore(projectWithSchema(root, "Contract@1", schemaPath));
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("schema.id_mismatch");
  });

  it("reports an error when an object schema boundary omits additionalProperties false", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-schema-strict-"));
    const schemaPath = "schemas/Contract.v1.schema.json";
    mkdirSync(join(root, "schemas"), { recursive: true });
    writeFileSync(
      join(root, schemaPath),
      JSON.stringify({
        $id: "Contract@1",
        type: "object",
        additionalProperties: false,
        properties: {
          nested: {
            type: "object",
            properties: {},
          },
        },
      }),
    );

    const result = validateAiCore(projectWithSchema(root, "Contract@1", schemaPath));
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "schema.additional_properties_required",
    );
  });

  it("reports an error when an object schema under $defs omits additionalProperties false", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ai-core-schema-defs-"));
    const schemaPath = "schemas/Contract.v1.schema.json";
    mkdirSync(join(root, "schemas"), { recursive: true });
    writeFileSync(
      join(root, schemaPath),
      JSON.stringify({
        $id: "Contract@1",
        type: "object",
        additionalProperties: false,
        properties: {},
        $defs: {
          nested: {
            type: "object",
            properties: {},
          },
        },
      }),
    );

    const result = validateAiCore(projectWithSchema(root, "Contract@1", schemaPath));
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "schema.additional_properties_required",
    );
  });

  it("declares the P0 alpha fields planned for product skill contracts", () => {
    const schema = JSON.parse(
      readFileSync(join(repoRoot(), ".ai/core/schemas/SkillContract.v1.schema.json"), "utf8"),
    );
    expect(Object.keys(schema.properties)).toEqual(
      expect.arrayContaining([
        "command_aliases",
        "inputs",
        "references",
        "few_shots",
        "evidence",
        "failure_policy",
      ]),
    );
    expect(schema.properties.command_aliases.items.additionalProperties).toBe(false);
    expect(schema.properties.inputs.additionalProperties.type).toBe("object");
    expect(schema.properties.evidence.additionalProperties).toBe(false);
    expect(schema.properties.failure_policy.additionalProperties.type).toBe("string");
  });

  it("declares the planned Task 3 evidence policy and body shapes", () => {
    const schema = JSON.parse(
      readFileSync(join(repoRoot(), ".ai/core/schemas/SkillContract.v1.schema.json"), "utf8"),
    );
    const evidencePolicy = schema.properties.evidence;
    const body = schema.properties.body;

    expect(evidencePolicy.additionalProperties).toBe(false);
    expect(evidencePolicy.properties.required_source_refs.items.type).toBe("string");
    expect(evidencePolicy.properties.stale_ref_policy.enum).toContain("block");
    expect(body.additionalProperties).toBe(false);
    expect(body.properties.always_load.type).toBe("object");
    expect(body.properties.always_load.additionalProperties).toBe(false);
    expect(body.properties.always_load.properties.routing_summary.items.type).toBe("string");
    expect(body.properties.always_load.properties.hard_rules.items.type).toBe("string");
    expect(schema.properties.references.items.additionalProperties).toBe(false);
    expect(schema.properties.references.items.required).toEqual(
      expect.arrayContaining(["path", "type", "load_phases", "purpose", "load_when"]),
    );
    expect(schema.properties.references.items.properties.load_phases.items.pattern).toBe(
      "^[a-z][a-z0-9_-]*$",
    );
    expect(schema.properties.few_shots.items.additionalProperties).toBe(false);
    expect(schema.properties.few_shots.items.required).toEqual(
      expect.arrayContaining(["path", "load_phases", "purpose", "load_when", "max_tokens"]),
    );
  });

  it("declares the P0 prompt contract fields used by case-draft-prompt", () => {
    const schema = JSON.parse(
      readFileSync(join(repoRoot(), ".ai/core/schemas/PromptContract.v1.schema.json"), "utf8"),
    );
    expect(schema.required).toEqual(
      expect.arrayContaining([
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
      ]),
    );
    expect(Object.keys(schema.properties)).toEqual(
      expect.arrayContaining([
        "schema_ref",
        "model_lock",
        "input_schema",
        "output_schema",
        "few_shots",
      ]),
    );
    expect(schema.properties.schema_ref.const).toBe("PromptContract@1");
    expect(schema.properties.rendering.additionalProperties).toBe(false);
  });

  it("declares the P0 workflow contract fields used by case-draft-from-prd", () => {
    const schema = JSON.parse(
      readFileSync(join(repoRoot(), ".ai/core/schemas/WorkflowContract.v1.schema.json"), "utf8"),
    );
    expect(schema.required).toEqual(
      expect.arrayContaining([
        "id",
        "schema_ref",
        "entry_skill",
        "inputs",
        "budgets",
        "steps",
        "failure_policy",
      ]),
    );
    expect(schema.properties.schema_ref.const).toBe("WorkflowContract@1");
    expect(Object.keys(schema.properties.steps.items.properties)).toEqual(
      expect.arrayContaining([
        "id",
        "uses_plugin",
        "uses_agent",
        "prompt",
        "requires",
        "condition",
        "output_schema",
        "iteration",
      ]),
    );
    expect(schema.properties.steps.items.properties.condition).toMatchObject({
      type: "string",
      minLength: 1,
    });
    expect(schema.properties.steps.items.properties.iteration).toMatchObject({
      type: "object",
      required: ["max_rounds", "back_to", "scope"],
      additionalProperties: false,
    });
    expect(schema.properties.steps.items.properties.iteration.properties.max_rounds).toMatchObject({
      type: "integer",
      minimum: 1,
    });
    expect(schema.properties.steps.items.properties.iteration.properties.back_to).toMatchObject({
      type: "string",
      pattern: schema.properties.steps.items.properties.id.pattern,
    });
    expect(schema.properties.steps.items.properties.iteration.properties.scope).toMatchObject({
      type: "string",
      minLength: 1,
    });
    expect(schema.properties.steps.items.additionalProperties).toBe(false);
  });

  it("declares workflow step ids compatible with the Task 3 plan", () => {
    const schema = JSON.parse(
      readFileSync(join(repoRoot(), ".ai/core/schemas/WorkflowContract.v1.schema.json"), "utf8"),
    );
    const pattern = new RegExp(schema.properties.steps.items.properties.id.pattern);
    expect(pattern.test("fetch_design_doc")).toBe(true);
    expect(pattern.test("draft_cases")).toBe(true);
    expect(pattern.test("review_cases")).toBe(true);
    expect(pattern.test("Bad Step!")).toBe(false);
  });

  it("declares the P0 agent contract fields used by case agents", () => {
    const schema = JSON.parse(
      readFileSync(join(repoRoot(), ".ai/core/schemas/AgentContract.v1.schema.json"), "utf8"),
    );
    expect(schema.required).toEqual(
      expect.arrayContaining([
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
      ]),
    );
    expect(schema.properties.schema_ref.const).toBe("AgentContract@1");
    expect(schema.properties.runner.enum).toEqual(
      expect.arrayContaining(["worktree_patch", "read_only"]),
    );
    expect(schema.properties.write_capability.enum).toEqual(
      expect.arrayContaining(["patch_only", "none"]),
    );
  });

  it("declares Task 7 PluginManifest constants and safe relative roots", () => {
    const schema = JSON.parse(
      readFileSync(join(repoRoot(), ".ai/core/schemas/PluginManifest.v1.schema.json"), "utf8"),
    );
    const safePathPattern = new RegExp(schema.properties.package_root.pattern);

    expect(schema.properties.capability.properties.kind.enum).toEqual(
      expect.arrayContaining(["fixture_reader", "source_provider", "notification_sink"]),
    );
    expect(schema.properties.output_schema.minLength).toBe(1);
    expect(schema.properties.artifact_staging.properties.root.const).toBe(".ai/runs/staging");
    expect(safePathPattern.test(".ai/core/plugins/fixture-design-source")).toBe(true);
    expect(safePathPattern.test("/tmp/plugin")).toBe(false);
    expect(safePathPattern.test(".ai/core/plugins/../escape")).toBe(false);
    expect(safePathPattern.test("../.ai/core/plugins/fixture-design-source")).toBe(false);
  });

  it("validates committed plugin manifests as PluginManifest contracts", async () => {
    const core = await loadAiCore();
    const result = validateAiCore(core);

    expect(core.plugins.map((plugin) => plugin.path)).toContain(
      ".ai/core/plugins/fixture-design-source/plugin.yaml",
    );
    expect(core.plugins.map((plugin) => plugin.path)).toContain(
      ".ai/core/plugins/lanhu/plugin.yaml",
    );
    expect(result.ok).toBe(true);
    expect(
      result.issues.filter(
        (issue) => issue.path.endsWith("plugin.yaml") && issue.severity === "error",
      ),
    ).toEqual([]);
  });

  it("reports invalid PluginManifest contracts", async () => {
    const root = writeCoreRegistries({});
    writeFileSync(
      join(root, ".ai/core/schemas/Contract.v1.schema.json"),
      JSON.stringify({
        $id: "Contract@1",
        type: "object",
        additionalProperties: false,
        properties: {},
      }),
    );
    writePluginManifest(root, [
      "id: bad-plugin.fetch@1",
      "schema_ref: PluginManifest@1",
      "package_root: .ai/core/plugins/../escape",
      "capability:",
      "  kind: raw_reader",
      "  network: false",
      "  secrets: false",
      "argv_schema:",
      "  required:",
      "    - fixtureName",
      "output_schema: RawText@1",
      "timeout_ms: 1000",
      "artifact_staging:",
      "  enabled: true",
      "  root: ../staging",
      "capability_required:",
      "  fs_read: []",
      "  fs_write: []",
      "  net: []",
      "  secret_refs: []",
      "",
    ]);

    const result = validateAiCore(await loadAiCoreFromRoot(root));

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("contract.schema_invalid");
    expect(result.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "PluginManifest package_root must stay under .ai/core/plugins without dot segments.",
        "PluginManifest capability.kind must be one of: fixture_reader, source_provider, notification_sink.",
        "PluginManifest output_schema must be SourceSnapshot@1.",
        "PluginManifest artifact_staging.root must be .ai/runs/staging.",
      ]),
    );
  });

  it("declares SourceSnapshot schema for fixture plugin output", () => {
    const schema = JSON.parse(
      readFileSync(join(repoRoot(), ".ai/core/schemas/SourceSnapshot.v1.schema.json"), "utf8"),
    );

    expect(schema.$id).toBe("SourceSnapshot@1");
    expect(schema.required).toEqual(["text", "sourceRef"]);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.text.type).toBe("string");
    expect(schema.properties.sourceRef.pattern).toContain("sha256");
  });

  it("declares SourceRef as the canonical P0 string shape", () => {
    const sourceRefSchema = JSON.parse(
      readFileSync(join(repoRoot(), ".ai/core/schemas/SourceRef.v1.schema.json"), "utf8"),
    );
    const sourceSnapshotSchema = JSON.parse(
      readFileSync(join(repoRoot(), ".ai/core/schemas/SourceSnapshot.v1.schema.json"), "utf8"),
    );
    const handoffEnvelopeSchema = JSON.parse(
      readFileSync(join(repoRoot(), ".ai/core/schemas/HandoffEnvelope.v1.schema.json"), "utf8"),
    );
    const pattern = new RegExp(sourceRefSchema.pattern);

    expect(sourceRefSchema.$id).toBe("SourceRef@1");
    expect(sourceRefSchema.type).toBe("string");
    expect(sourceSnapshotSchema.properties.sourceRef.pattern).toBe(sourceRefSchema.pattern);
    expect(handoffEnvelopeSchema.properties.provenance.properties.sourceRefs.items.pattern).toBe(
      sourceRefSchema.pattern,
    );
    expect(
      pattern.test(
        "prd.file:demo#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBe(true);
    expect(
      pattern.test(
        "command.output:fixture-1#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBe(true);
    expect(
      pattern.test(
        "knowledge.entry:dataAssets.core#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBe(true);
    expect(
      pattern.test(
        "repo.line:frontend.src.index:10#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBe(true);
    expect(
      pattern.test(
        "case.archive:dataAssets.login#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBe(true);
    expect(
      pattern.test(
        "workspace.config:dataAssets#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBe(true);
    expect(
      pattern.test(
        "lanhu.fixture:login-page#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBe(true);
    expect(
      pattern.test(
        "http://example.test/raw#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBe(false);
    expect(
      pattern.test(
        "prd.file::demo#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBe(false);
    expect(
      pattern.test(
        "command.output:-run#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBe(false);
    expect(
      pattern.test(
        "knowledge.entry::bad#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBe(false);
    expect(
      pattern.test(
        "repo.line:-bad#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBe(false);
    expect(pattern.test("prd.file:demo#sha256:abc")).toBe(false);
  });

  it("declares only current AI Core env config without a legacy migration surface", () => {
    const defaults = readFileSync(join(repoRoot(), ".ai/core/config/defaults.yaml"), "utf8");
    const envSchema = JSON.parse(
      readFileSync(join(repoRoot(), ".ai/core/config/env.schema.json"), "utf8"),
    );

    expect(envSchema.properties.KATA_TARGET_ENV.type).toBe("string");
    expect(envSchema.properties.KATA_TARGET_ENV.pattern).toContain("A-Za-z0-9");
    expect(envSchema.properties.legacy_env_fail_fast).toBeUndefined();
    expect(defaults).not.toContain("legacy_env_fail_fast:");
  });

  it("rejects duplicate schema ids while loading registries", async () => {
    const root = writeCoreRegistries({
      schemas: [
        "  - id: Contract@1\n    version: 1\n    path: .ai/core/schemas/Contract.v1.schema.json",
        "  - id: Contract@1\n    version: 1\n    path: .ai/core/schemas/ContractCopy.v1.schema.json",
      ],
    });

    await expect(loadAiCoreFromRoot(root)).rejects.toThrow("Duplicate schema id: Contract@1");
  });

  it("rejects invalid guard kinds while loading registries", async () => {
    const root = writeCoreRegistries({
      guards: [
        "  - id: typo.bad_guard@1\n    kind: bad_kind\n    implementation: engine/src/policy/bad.ts#bad",
      ],
    });

    await expect(loadAiCoreFromRoot(root)).rejects.toThrow(
      "Invalid guard kind for typo.bad_guard@1: bad_kind",
    );
  });
});

function projectWithSchema(root: string, id: string, path: string): AiCoreProject {
  return {
    root,
    schemas: [{ id, version: 1, path }],
    guards: [],
    implementationRoots: [],
    runtimeRoots: [],
    skills: [],
    prompts: [],
    workflows: [],
    agents: [],
    plugins: [],
  };
}

function loadAiCoreFromRoot(root: string): Promise<AiCoreProject> {
  return loadAiCore({
    coreRoot: join(root, ".ai", "core"),
    root,
  });
}

function writeCoreRegistries(overrides: {
  schemas?: string[];
  guards?: string[];
  runtimeRoots?: string[];
}): string {
  const root = mkdtempSync(join(tmpdir(), "kata-ai-core-registry-"));
  const coreRoot = join(root, ".ai", "core");
  mkdirSync(join(coreRoot, "schemas"), { recursive: true });
  mkdirSync(join(coreRoot, "guards"), { recursive: true });
  mkdirSync(join(coreRoot, "runtimes"), { recursive: true });

  writeFileSync(
    join(coreRoot, "schemas", "registry.yaml"),
    `schemas:\n${(overrides.schemas ?? ["  - id: Contract@1\n    version: 1\n    path: .ai/core/schemas/Contract.v1.schema.json"]).join("\n")}\n`,
  );
  writeFileSync(
    join(coreRoot, "guards", "registry.yaml"),
    `guards:\n${(overrides.guards ?? ["  - id: write_policy.block_repos_write@1\n    kind: write_policy\n    implementation: engine/src/policy/write-policy.ts#blockReposWrite"]).join("\n")}\n`,
  );
  writeFileSync(
    join(coreRoot, "runtimes", "implementation-roots.yaml"),
    `implementation_roots:\n${(overrides.runtimeRoots ?? ["  - path: engine/src/ai-core/**\n    status: declared\n    hidden_id_lint: true"]).join("\n")}\n`,
  );
  return root;
}

function writePluginManifest(root: string, lines: string[]): void {
  const pluginRoot = join(root, ".ai", "core", "plugins", "bad-plugin");
  mkdirSync(pluginRoot, { recursive: true });
  writeFileSync(join(pluginRoot, "plugin.yaml"), lines.join("\n"));
}
