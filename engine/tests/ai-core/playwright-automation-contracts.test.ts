import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateAllAiCoreContracts } from "../../src/ai-core/contract-schema.ts";

const root = join(import.meta.dirname, "../../..");

const schemaIds = [
  "UiAutomationIntent@1",
  "UiAutomationPreflight@1",
  "UiProbeSnapshot@1",
  "PlanReconciliation@1",
  "PlaywrightScriptManifest@1",
  "SelfRunResult@1",
  "UiRunTriage@1",
  "RepairAttemptLog@1",
  "PlaywrightAutomationHandoff@2",
];

function schemaPath(id: string): string {
  return `.ai/core/schemas/${id.replace("@", ".v")}.schema.json`;
}

describe("playwright automation contracts", () => {
  it("registers every Playwright automation schema in registry", () => {
    const registry = readFileSync(join(root, ".ai/core/schemas/registry.yaml"), "utf8");
    for (const id of schemaIds) {
      expect(registry).toContain(`id: ${id}`);
      expect(registry).toContain(`path: ${schemaPath(id)}`);
    }
  });

  it("keeps all Playwright automation schema files strict", async () => {
    for (const id of schemaIds) {
      const schema = JSON.parse(readFileSync(join(root, schemaPath(id)), "utf8"));
      expect(schema.$id).toBe(id);
      expect(schema.additionalProperties).toBe(false);
    }
    const result = await validateAllAiCoreContracts();
    expect(result.ok).toBe(true);
  });

  it("allows workflow phase budgets and repair limits", async () => {
    const result = await validateAllAiCoreContracts({
      virtualFiles: {
        ".ai/core/workflows/playwright-automation.workflow.yaml": [
          "id: playwright-automation@1",
          "schema_ref: WorkflowContract@1",
          "entry_skill: playwright-automation@1",
          "inputs:",
          "  request:",
          "    kind: request",
          "    required: true",
          "budgets:",
          "  total_run_budget_tokens: 32000",
          "  total_run_budget_usd_cents: 160",
          "  aggregation_budget_tokens: 3000",
          "  rate_card_ref: local-ga-core@1",
          "  phase_token_budgets:",
          "    case-normalize: 2200",
          "  repair_limits:",
          "    max_attempts_per_spec: 3",
          "    max_locator_retries_per_spec: 2",
          "    max_user_questions_per_blocker: 1",
          "steps:",
          "  - id: case-normalize",
          "failure_policy:",
          "  missing_evidence: ask_one_clarifying_question",
          "",
        ].join("\n"),
      },
    });
    const issues = result.issues.filter(
      (i) => i.message.includes("phase_token_budgets") || i.message.includes("repair_limits"),
    );
    expect(issues.length).toBe(0);
  });
});
