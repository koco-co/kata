import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runHandoffRender } from "../../src/cli/handoff-render.ts";

const validHandoff = {
  schema: "PlaywrightAutomationHandoff@2",
  feature_id: "2026-04-dq-builtin-reasonability-field-calc-compare",
  run_id: "20260520-1500-abcdef12",
  status: "passed",
  intent_id: "SR-INTENT-XYZ",
  source_refs: { intent: "SR-INTENT-XYZ", env: "SR-ENV-1", probe: "SR-PROBE-1", self_run: "SR-RUN-1" },
  run_command: "npx playwright test ... --headed",
  acceptance_command:
    "KATA_DATAASSETS_ENV=ltqc-local.yaml KATA_ACTIVE_PROJECT=dataAssets npx playwright test 'features/x/tests/runners/full.spec.ts' --project=chromium --headed --reporter=line",
  run_exit_code: 0,
  results: { total: 5, passed: 5, failed: 0, skipped: 0, report_paths: {} },
  quality_gates: [],
  unresolved_blockers: [],
  next_actions: [],
};

const validSummary = {
  schema: "CaseCorrections@1",
  feature_id: "2026-04-dq-builtin-reasonability-field-calc-compare",
  run_id: "20260520-1500-abcdef12",
  generated_at: "2026-05-20T15:00:00Z",
  generator: "playwright-automation@1",
  status: "pending",
  total: 7,
  by_category: {
    ui_text_drift: 4,
    business_rule: 2,
    ambiguous_step: 1,
    dependency_missing: 0,
    unverifiable_assertion: 0,
    wrong_priority: 0,
    duplicate: 0,
    missing_coverage: 0,
  },
  corrections_md: "results/20260520-1500-abcdef12/case-corrections.md",
  apply_command:
    "/case-edit apply-corrections workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare 20260520-1500-abcdef12",
};

let workspaceRoot: string;
let runDir: string;

function setupBase() {
  workspaceRoot = mkdtempSync(join(tmpdir(), "kata-handoff-test-"));
  runDir = join(
    workspaceRoot,
    "dataAssets",
    "features",
    validHandoff.feature_id,
    "results",
    validHandoff.run_id,
  );
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, "handoff.json"), JSON.stringify(validHandoff), "utf8");
}

describe("handoff render Case Feedback section", () => {
  beforeAll(() => setupBase());
  afterAll(() => rmSync(workspaceRoot, { recursive: true, force: true }));

  it("omits Case Feedback section when sidecar is absent", async () => {
    await runHandoffRender({
      project: "dataAssets",
      featureId: validHandoff.feature_id,
      runId: validHandoff.run_id,
      workspaceRoot,
    });
    const md = readFileSync(join(runDir, "handoff.md"), "utf8");
    expect(md).not.toContain("## Case Feedback");
  });

  it("renders Case Feedback section with counts and apply command when sidecar exists", async () => {
    writeFileSync(
      join(runDir, "case-corrections-summary.json"),
      JSON.stringify(validSummary),
      "utf8",
    );
    await runHandoffRender({
      project: "dataAssets",
      featureId: validHandoff.feature_id,
      runId: validHandoff.run_id,
      workspaceRoot,
    });
    const md = readFileSync(join(runDir, "handoff.md"), "utf8");
    expect(md).toContain("## Case Feedback");
    expect(md).toContain("corrections: results/20260520-1500-abcdef12/case-corrections.md (7 pending)");
    expect(md).toContain("ui_text_drift=4");
    expect(md).toContain("business_rule=2");
    expect(md).toContain("/case-edit apply-corrections");
  });

  it("renders Case Feedback section with 'none' when total is zero", async () => {
    writeFileSync(
      join(runDir, "case-corrections-summary.json"),
      JSON.stringify({
        ...validSummary,
        total: 0,
        by_category: Object.fromEntries(
          Object.keys(validSummary.by_category).map((k) => [k, 0]),
        ),
      }),
      "utf8",
    );
    await runHandoffRender({
      project: "dataAssets",
      featureId: validHandoff.feature_id,
      runId: validHandoff.run_id,
      workspaceRoot,
    });
    const md = readFileSync(join(runDir, "handoff.md"), "utf8");
    expect(md).toContain("## Case Feedback");
    expect(md).toContain("corrections: none");
  });

  it("throws when sidecar exists but fails CaseCorrections@1 schema", async () => {
    writeFileSync(
      join(runDir, "case-corrections-summary.json"),
      JSON.stringify({ ...validSummary, status: "draft" }),
      "utf8",
    );
    await expect(
      runHandoffRender({
        project: "dataAssets",
        featureId: validHandoff.feature_id,
        runId: validHandoff.run_id,
        workspaceRoot,
      }),
    ).rejects.toThrow(/CaseCorrections@1/);
  });
});
