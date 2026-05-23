import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditWorkflowMaturity } from "../../src/ai-core/workflow-maturity.ts";

const EXPECTED_WORKFLOWS = [
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
];

describe("workflow maturity audit", () => {
  it("classifies all 10 GA-core workflows", () => {
    const result = auditWorkflowMaturity();
    const report = result.value!;

    expect(report.activeWorkflows).toHaveLength(10);
    expect(report.activeWorkflows.sort()).toEqual(EXPECTED_WORKFLOWS);
    expect(result.issues).toEqual([]);
  });

  it("classifies case-draft-from-prd as L3 with fixture and output schemas", () => {
    const result = auditWorkflowMaturity();
    const report = result.value!;
    const entry = report.byWorkflow["case-draft-from-prd@1"];

    expect(entry).toBeDefined();
    expect(entry.level).toBe("L3");
    expect(entry.stepCount).toBe(13);
    expect(entry.hasOutputSchemas).toBe(true);
    expect(entry.hasFailurePolicy).toBe(true);
    expect(entry.hasFixtureReference).toBe(true);
  });

  it("classifies multi-stage workflows with failure policy at L1 or higher", () => {
    const result = auditWorkflowMaturity();
    const report = result.value!;

    const multiStepIds = EXPECTED_WORKFLOWS.filter((id) => id !== "case-draft-from-prd@1");

    for (const id of multiStepIds) {
      const entry = report.byWorkflow[id];
      expect(entry).toBeDefined();
      expect(entry.level).not.toBe("L0");
      expect(entry.stepCount).toBeGreaterThanOrEqual(2);
      expect(entry.hasFailurePolicy).toBe(true);
    }
  });

  it("classifies playwright-automation above L0", () => {
    const result = auditWorkflowMaturity();
    const report = result.value!;
    const entry = report.byWorkflow["playwright-automation@1"];
    expect(entry).toBeDefined();
    expect(entry.level).not.toBe("L0");
  });

  it("reports agent steps that lack subagent constraints", () => {
    const result = auditWorkflowMaturity();
    const report = result.value!;

    for (const [_id, entry] of Object.entries(report.byWorkflow)) {
      for (const stepId of entry.agentStepsWithoutConstraints) {
        expect(stepId).toEqual(expect.any(String));
      }
    }

    const generateTestCases = report.byWorkflow["case-draft-from-prd@1"];
    expect(generateTestCases.agentStepsWithoutConstraints).toEqual([]);

    const managingWorkspaces = report.byWorkflow["workspace-manage@1"];
    expect(managingWorkspaces.agentStepsWithoutConstraints).toEqual([]);
  });

  it("reports unconstrained agent steps in custom workflows", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-workflow-maturity-"));
    try {
      const workflowsDir = join(root, ".ai", "core", "workflows");
      mkdirSync(workflowsDir, { recursive: true });
      writeFileSync(
        join(workflowsDir, "sample.workflow.yaml"),
        [
          "id: sample@1",
          "schema_ref: WorkflowContract@1",
          "entry_skill: sample@1",
          "steps:",
          "  - id: intake",
          "    uses: agent:sample-worker@1",
          "  - id: review",
          "    uses: agent:sample-reviewer@1",
          "    subagent_constraints:",
          "      schema_ref: SubagentConstraints@1",
          "      may_not_ask_user: true",
          "failure_policy:",
          "  missing_evidence: ask_one_clarifying_question",
          "",
        ].join("\n"),
        "utf8",
      );

      const report = auditWorkflowMaturity(root).value!;
      expect(report.byWorkflow["sample@1"].agentStepsWithoutConstraints).toEqual(["intake"]);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("reports L0 workflows as failures when below required level", () => {
    const result = auditWorkflowMaturity();

    const failures = result.value?.failures;
    for (const failure of failures) {
      expect(failure).toHaveProperty("workflowId");
      expect(failure).toHaveProperty("level");
      expect(failure).toHaveProperty("requiredLevel");
      expect(failure).toHaveProperty("message");
    }
  });
});
