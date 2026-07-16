import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  lintCasesInCasesDirForFeature,
  lintEnvProfileCompliance,
  lintRunnerIsAggregatorForFeature,
  lintSessionCompliant,
} from "@shared/lint/v2-quality-gates.ts";

describe("lintEnvProfileCompliance", () => {
  let scratch: string;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "v2-quality-gates-"));
  });

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it("rejects any tracked workspace environment profile", () => {
    const envDir = join(scratch, "dataAssets", "_shared", "env");
    mkdirSync(envDir, { recursive: true });
    writeFileSync(join(envDir, "dev.yaml"), ["schema_version: 1", "env: ltqc-dev"].join("\n"));

    const report = lintEnvProfileCompliance(scratch);

    expect(report.passed).toBe(false);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "env_profile_compliance",
        matched: "legacy env profile",
      }),
    );
  });

  it("accepts a workspace without tracked environment profiles", () => {
    const report = lintEnvProfileCompliance(scratch);

    expect(report.passed).toBe(true);
    expect(report.files).toBe(0);
  });
});

describe("feature-scoped v2 quality gates", () => {
  let scratch: string;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "v2-quality-gates-feature-"));
  });

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it("reports runner specs with inline test bodies as fail severity", () => {
    const featureDir = join(scratch, "feature");
    const runnersDir = join(featureDir, "automation", "tests", "runners");
    mkdirSync(runnersDir, { recursive: true });
    writeFileSync(
      join(runnersDir, "full.spec.ts"),
      "import { test } from '@playwright/test';\ntest('x', () => {});\n",
    );

    const report = lintRunnerIsAggregatorForFeature(featureDir, "fail");

    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "runner_is_aggregator",
        severity: "fail",
      }),
    );
  });

  it("reports tNN case files in automation/tests root as fail severity", () => {
    const featureDir = join(scratch, "feature");
    const testsDir = join(featureDir, "automation", "tests");
    mkdirSync(testsDir, { recursive: true });
    writeFileSync(join(testsDir, "t01-login.ts"), "// misplaced");

    const report = lintCasesInCasesDirForFeature(featureDir, "fail");

    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "cases_in_cases_dir",
        severity: "fail",
      }),
    );
  });
});

describe("lintSessionCompliant", () => {
  let scratch: string;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "session-compliance-"));
  });

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it("rejects file-backed DataAssets authentication", () => {
    const casesDir = join(scratch, "dataAssets", "features", "v1", "feature", "tests", "cases");
    mkdirSync(casesDir, { recursive: true });
    writeFileSync(
      join(casesDir, "t01.ts"),
      'test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session.json" });',
    );

    const report = lintSessionCompliant(scratch);

    expect(report.passed).toBe(false);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "session_compliant",
        matched: "legacy auth session",
      }),
    );
  });
});
