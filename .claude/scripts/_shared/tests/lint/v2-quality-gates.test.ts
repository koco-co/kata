import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  lintCasesInCasesDirForFeature,
  lintEnvProfileCompliance,
  lintRunnerIsAggregatorForFeature,
} from "@shared/lint/v2-quality-gates.ts";

describe("lintEnvProfileCompliance", () => {
  let scratch: string;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "v2-quality-gates-"));
  });

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it("rejects legacy session fields without requiring a secret in the base profile", () => {
    const envDir = join(scratch, "dataAssets", "_shared", "env");
    mkdirSync(envDir, { recursive: true });
    writeFileSync(
      join(envDir, "dev.yaml"),
      [
        "auth:",
        "  session_path: workspace/other/.kata/auth/session.json",
        "  derive_from_session: true",
        "env: ltqc-dev",
        "runtime:",
        "  allow_write: true",
      ].join("\n"),
    );

    const report = lintEnvProfileCompliance(scratch);

    expect(report.passed).toBe(false);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "env_profile_compliance",
        matched: "auth.session_path",
      }),
    );
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "env_profile_compliance",
        matched: "auth.derive_from_session",
      }),
    );
    expect(report.violations.some((item) => item.matched === "auth.cookie")).toBe(false);
  });

  it("accepts an empty auth.cookie in the committed base profile", () => {
    const envDir = join(scratch, "dataAssets", "_shared", "env");
    mkdirSync(envDir, { recursive: true });
    writeFileSync(
      join(envDir, "dev.yaml"),
      ["auth:", '  cookie: ""', "env: ltqc-dev", "runtime:", "  allow_write: true"].join("\n"),
    );

    const report = lintEnvProfileCompliance(scratch);

    expect(report.passed).toBe(true);
  });

  it("reports writable ltqc-prod profiles", () => {
    const envDir = join(scratch, "dataAssets", "_shared", "env");
    mkdirSync(envDir, { recursive: true });
    writeFileSync(
      join(envDir, "prod.yaml"),
      ["auth:", "  cookie: sid=test", "env: ltqc-prod", "runtime:", "  allow_write: true"].join(
        "\n",
      ),
    );

    const report = lintEnvProfileCompliance(scratch);

    expect(report.passed).toBe(false);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "env_profile_compliance",
        message: "ltqc-prod must keep runtime.allow_write=false.",
      }),
    );
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
