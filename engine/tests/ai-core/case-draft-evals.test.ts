import { describe, expect, it } from "bun:test";
import { runCaseDraftWorkflowEvals } from "../../src/ai-core/case-draft-evals.ts";

describe("case-draft sparse PRD evals", () => {
  it("runs every committed sparse PRD fixture", async () => {
    const result = await runCaseDraftWorkflowEvals();

    expect(result.ok).toBe(true);
    expect(result.value?.passed).toBe(8);
    expect(result.value?.failed).toBe(0);
  });

  it("fails when a blocking unknown fixture claims final archive output", async () => {
    const result = await runCaseDraftWorkflowEvals({
      fixtureOverrides: {
        "blocking-unknown": {
          expected: {
            final_archive_generated: true,
          },
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("case_draft_eval.blocking_output");
  });

  it("fails when expected_rule_ids is missing or malformed", async () => {
    const missing = await runCaseDraftWorkflowEvals({
      fixtureOverrides: {
        "sparse-lanhu-only": {
          expected_rule_ids: undefined,
        },
      },
    });
    const malformed = await runCaseDraftWorkflowEvals({
      fixtureOverrides: {
        "sparse-lanhu-only": {
          expected_rule_ids: "case_draft_eval.fixture_missing",
        },
      },
    });

    expect(missing.ok).toBe(false);
    expect(missing.issues.map((issue) => issue.code)).toContain("case_draft_eval.fixture_missing");
    expect(malformed.ok).toBe(false);
    expect(malformed.issues.map((issue) => issue.code)).toContain(
      "case_draft_eval.fixture_missing",
    );
  });

  it("fails when a scenario-required expected key is missing", async () => {
    const result = await runCaseDraftWorkflowEvals({
      fixtureOverrides: {
        "sparse-lanhu-only": {
          expected: {
            confirmation_package_generated: undefined,
          },
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("case_draft_eval.fixture_missing");
    expect(result.issues.map((issue) => issue.path).join("\n")).toContain(
      "expected.confirmation_package_generated",
    );
  });

  it("fails when expected_rule_ids contains an unknown rule id", async () => {
    const result = await runCaseDraftWorkflowEvals({
      fixtureOverrides: {
        "sparse-lanhu-only": {
          expected_rule_ids: ["case_draft_eval.not_real"],
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("case_draft_eval.fixture_missing");
    expect(result.issues.map((issue) => issue.path).join("\n")).toContain("expected_rule_ids[0]");
  });

  it("does not allow expected_rule_ids to whitelist fixture contract failures", async () => {
    const result = await runCaseDraftWorkflowEvals({
      fixtureOverrides: {
        "sparse-lanhu-only": {
          expected: {
            confirmation_package_generated: undefined,
          },
          expected_rule_ids: ["case_draft_eval.fixture_missing"],
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("case_draft_eval.fixture_missing");
  });
});
