import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { sharedSchemasPath } from "@shared/lib/paths.ts";
import Ajv from "ajv";

const schema = JSON.parse(
  readFileSync(sharedSchemasPath("PlaywrightAutomationHandoff.v2.schema.json"), "utf-8"),
);
const validate = new Ajv({ strict: false, validateSchema: false }).compile(schema);

const base = {
  schema: "PlaywrightAutomationHandoff@2",
  feature_id: "2026-04-dq-json-config",
  run_id: "20260510-1430-a3f8c9e1",
  status: "passed",
  intent_id: "SR-INTENT-X",
  source_refs: {
    intent: "SR-INTENT-X",
    env: "SR-ENV-PREFLIGHT-X",
    probe: "SR-UI-PROBE-X",
    self_run: "SR-SELF-RUN-X",
  },
  run_command: "npx playwright test ...",
  acceptance_command:
    "KATA_DATAASSETS_ENV=ltqc-local.yaml KATA_ACTIVE_PROJECT=dataAssets npx playwright test 'features/2026-04-dq-json-config/tests/runners/full.spec.ts' --project=chromium --headed --reporter=line",
  run_exit_code: 0,
  results: {
    total: 46,
    passed: 45,
    failed: 1,
    skipped: 0,
    report_paths: {
      playwright_json: "results/<r>/playwright/results.json",
      allure: "results/<r>/allure-results/",
      stdout: "results/<r>/stdout.log",
    },
  },
  quality_gates: [{ name: "no_weak_assertions", status: "passed" }],
  unresolved_blockers: [],
  next_actions: [],
  excluded_cases: [],
};

describe("PlaywrightAutomationHandoff@2", () => {
  it("accepts a valid passed handoff", () => {
    expect(validate(base)).toBe(true);
  });

  it("rejects unknown status enum", () => {
    expect(validate({ ...base, status: "kinda-passed" })).toBe(false);
  });

  it("rejects negative exit code", () => {
    expect(validate({ ...base, run_exit_code: -1 })).toBe(false);
  });

  it("requires a headed full acceptance command", () => {
    const { acceptance_command: _acceptanceCommand, ...missing } = base;
    expect(validate(missing)).toBe(false);
    expect(
      validate({ ...base, acceptance_command: "npx playwright test tests/runners/smoke.spec.ts" }),
    ).toBe(false);
    expect(
      validate({ ...base, acceptance_command: "npx playwright test tests/runners/full.spec.ts" }),
    ).toBe(false);
  });

  it("requires source_refs.intent", () => {
    expect(validate({ ...base, source_refs: { env: "x", probe: "y", self_run: "z" } })).toBe(false);
  });

  it("accepts excluded_cases as empty array", () => {
    expect(validate({ ...base, excluded_cases: [] })).toBe(true);
  });

  it("accepts a valid excluded case entry", () => {
    expect(
      validate({
        ...base,
        excluded_cases: [
          { case_id: "P0-3", reason_category: "data_prep", detail: "需后台任务完成" },
        ],
      }),
    ).toBe(true);
  });

  it("requires excluded_cases", () => {
    const { excluded_cases: _excluded, ...missing } = base;
    expect(validate(missing)).toBe(false);
  });

  it("rejects unknown excluded reason_category", () => {
    expect(
      validate({ ...base, excluded_cases: [{ case_id: "P0-3", reason_category: "whatever" }] }),
    ).toBe(false);
  });
});
