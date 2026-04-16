import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadBaselineReadinessSummary,
  loadEnvironmentDependentChecks,
  loadKnownBaselineFailures,
  summarizeBaselineDelta,
} from "../../src/ai-core/baseline-report.ts";

function withBaselineContract(content: string, assertion: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "kata-baseline-report-"));
  try {
    mkdirSync(join(root, ".ai/core/evals"), { recursive: true });
    writeFileSync(join(root, ".ai/core/evals/baseline-known-failures.json"), content, "utf8");
    assertion(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function withBaselineContracts(
  input: {
    knownFailures?: string;
    environmentDependentChecks?: string;
  },
  assertion: (root: string) => void,
): void {
  const root = mkdtempSync(join(tmpdir(), "kata-baseline-report-"));
  try {
    mkdirSync(join(root, ".ai/core/evals"), { recursive: true });
    writeFileSync(
      join(root, ".ai/core/evals/baseline-known-failures.json"),
      input.knownFailures ?? JSON.stringify({ schema_version: 1, known_failures: [] }),
      "utf8",
    );
    writeFileSync(
      join(root, ".ai/core/evals/environment-dependent-checks.json"),
      input.environmentDependentChecks ?? JSON.stringify({ schema_version: 1, checks: [] }),
      "utf8",
    );
    assertion(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function expectInvalidBaselineContract(content: string, message: string): void {
  withBaselineContract(content, (root) => {
    const result = summarizeBaselineDelta({ observedAreas: ["report-to-pdf"] }, root);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      {
        code: "baseline.contract_invalid",
        severity: "error",
        path: ".ai/core/evals/baseline-known-failures.json",
        message: expect.stringContaining(message),
      },
    ]);
  });
}

function expectInvalidEnvironmentContract(content: string, message: string): void {
  withBaselineContracts({ environmentDependentChecks: content }, (root) => {
    expect(() => loadEnvironmentDependentChecks(root)).toThrow(message);
  });
}

describe("baseline failure report", () => {
  it("loads empty committed deterministic baseline failures", () => {
    const failures = loadKnownBaselineFailures();

    expect(failures).toEqual([]);
  });

  it("loads baseline readiness summary", () => {
    const summary = loadBaselineReadinessSummary();

    expect(summary.deterministicFailures).toEqual([]);
    expect(summary.environmentDependentChecks).toEqual([
      {
        area: "report-to-pdf",
        command: "KATA_RUN_BROWSER_PDF_TESTS=1 bun test --cwd engine tests/report-to-pdf.test.ts",
        dependency: "Chromium host permissions for Playwright PDF rendering",
        failure_signature: "bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer",
        default_suite_policy: "not_run_by_default",
      },
      {
        area: "behavioral-evals-record",
        command: "bun run engine/src/ai-core/behavioral-evals-cli.ts --mode record",
        dependency: "DEEPSEEK_API_KEY environment variable for LLM-as-judge cassette recording",
        failure_signature: "DEEPSEEK_API_KEY is required",
        default_suite_policy: "not_run_by_default",
      },
    ]);
  });

  it("flags unknown failures as blocking", () => {
    const result = summarizeBaselineDelta({
      observedAreas: ["unknown-ai-core"],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("baseline.unknown_failure");
    expect(result.issues[0]).toMatchObject({
      severity: "error",
      path: "unknown-ai-core",
    });
  });

  it("accepts no observed deterministic failures with an empty known baseline", () => {
    const result = summarizeBaselineDelta({
      observedAreas: [],
    });

    expect(result).toEqual({ ok: true, value: null, issues: [] });
  });

  it("fails closed for malformed baseline failure JSON", () => {
    expectInvalidBaselineContract("{bad json", "Invalid baseline known failures contract.");
  });

  it("fails closed when known_failures is missing", () => {
    expectInvalidBaselineContract(
      JSON.stringify({ schema_version: 1 }),
      "Expected object with schema_version 1 and known_failures array.",
    );
  });

  it("fails closed when deterministic baseline schema_version is missing", () => {
    expectInvalidBaselineContract(
      "{}",
      "Expected object with schema_version 1 and known_failures array.",
    );
  });

  it("fails closed when deterministic baseline schema_version is invalid", () => {
    expectInvalidBaselineContract(
      JSON.stringify({ schema_version: 2, known_failures: [] }),
      "Expected object with schema_version 1 and known_failures array.",
    );
  });

  it("fails closed when deterministic baseline has an unknown top-level field", () => {
    expectInvalidBaselineContract(
      JSON.stringify({ schema_version: 1, known_failures: [], metadata: "fixture" }),
      'top-level must not contain unknown field "metadata".',
    );
  });

  it("fails closed when area is missing", () => {
    expectInvalidBaselineContract(
      JSON.stringify({ schema_version: 1, known_failures: [{ reason: "baseline reason" }] }),
      "known_failures[0].area must be a non-empty string.",
    );
  });

  it("fails closed when area is invalid", () => {
    expectInvalidBaselineContract(
      JSON.stringify({
        schema_version: 1,
        known_failures: [{ area: "", reason: "baseline reason" }],
      }),
      "known_failures[0].area must be a non-empty string.",
    );
  });

  it("fails closed when reason is missing", () => {
    expectInvalidBaselineContract(
      JSON.stringify({ schema_version: 1, known_failures: [{ area: "report-to-pdf" }] }),
      "known_failures[0].reason must be a non-empty string.",
    );
  });

  it("fails closed when reason is invalid", () => {
    expectInvalidBaselineContract(
      JSON.stringify({
        schema_version: 1,
        known_failures: [{ area: "report-to-pdf", reason: "" }],
      }),
      "known_failures[0].reason must be a non-empty string.",
    );
  });

  it("fails closed when deterministic baseline entry has an unknown field", () => {
    expectInvalidBaselineContract(
      JSON.stringify({
        schema_version: 1,
        known_failures: [
          {
            area: "report-to-pdf",
            reason: "baseline reason",
            ticket: "QA-1",
          },
        ],
      }),
      'known_failures[0] must not contain unknown field "ticket".',
    );
  });

  it("fails closed when baseline areas are duplicated", () => {
    expectInvalidBaselineContract(
      JSON.stringify({
        schema_version: 1,
        known_failures: [
          { area: "report-to-pdf", reason: "first reason" },
          { area: "report-to-pdf", reason: "conflicting reason" },
        ],
      }),
      'known_failures[1].area duplicates "report-to-pdf".',
    );
  });

  it("fails closed for malformed environment-dependent checks JSON", () => {
    expectInvalidEnvironmentContract("{bad json", "Invalid environment-dependent checks contract.");
  });

  it("fails closed when environment-dependent schema_version is invalid", () => {
    expectInvalidEnvironmentContract(
      JSON.stringify({ schema_version: 2, checks: [] }),
      "Expected object with schema_version 1 and checks array.",
    );
  });

  it("fails closed when environment-dependent checks has an unknown top-level field", () => {
    expectInvalidEnvironmentContract(
      JSON.stringify({ schema_version: 1, checks: [], metadata: "fixture" }),
      'top-level must not contain unknown field "metadata".',
    );
  });

  it("fails closed when environment-dependent checks array is missing", () => {
    expectInvalidEnvironmentContract(
      JSON.stringify({ schema_version: 1 }),
      "Expected object with schema_version 1 and checks array.",
    );
  });

  it("fails closed when an environment-dependent check field is empty", () => {
    expectInvalidEnvironmentContract(
      JSON.stringify({
        schema_version: 1,
        checks: [
          {
            area: "report-to-pdf",
            command: "",
            dependency: "Chromium host permissions for Playwright PDF rendering",
            failure_signature: "bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer",
            default_suite_policy: "not_run_by_default",
          },
        ],
      }),
      "checks[0].command must be a non-empty string.",
    );
  });

  it("fails closed when an environment-dependent check has an unknown field", () => {
    expectInvalidEnvironmentContract(
      JSON.stringify({
        schema_version: 1,
        checks: [
          {
            area: "report-to-pdf",
            command:
              "KATA_RUN_BROWSER_PDF_TESTS=1 bun test --cwd engine tests/report-to-pdf.test.ts",
            dependency: "Chromium host permissions for Playwright PDF rendering",
            failure_signature: "bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer",
            default_suite_policy: "not_run_by_default",
            retry: false,
          },
        ],
      }),
      'checks[0] must not contain unknown field "retry".',
    );
  });

  it("fails closed when an environment-dependent check default policy is runnable by default", () => {
    expectInvalidEnvironmentContract(
      JSON.stringify({
        schema_version: 1,
        checks: [
          {
            area: "report-to-pdf",
            command:
              "KATA_RUN_BROWSER_PDF_TESTS=1 bun test --cwd engine tests/report-to-pdf.test.ts",
            dependency: "Chromium host permissions for Playwright PDF rendering",
            failure_signature: "bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer",
            default_suite_policy: "run_by_default",
          },
        ],
      }),
      'checks[0].default_suite_policy must be "not_run_by_default".',
    );
  });
});
