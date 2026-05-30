import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintEnvProfileCompliance } from "@shared/lint/v2-quality-gates.ts";

describe("lintEnvProfileCompliance", () => {
  let scratch: string;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "v2-quality-gates-"));
  });

  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it("reports auth session paths outside the project auth directory", () => {
    const envDir = join(scratch, "dataAssets", "_shared", "env");
    mkdirSync(envDir, { recursive: true });
    writeFileSync(
      join(envDir, "dev.yaml"),
      [
        "auth:",
        "  session_path: workspace/other/.kata/auth/session.json",
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
        matched: "workspace/other/.kata/auth/session.json",
      }),
    );
  });

  it("reports writable ltqc-prod profiles", () => {
    const envDir = join(scratch, "dataAssets", "_shared", "env");
    mkdirSync(envDir, { recursive: true });
    writeFileSync(
      join(envDir, "prod.yaml"),
      [
        "auth:",
        "  session_path: workspace/dataAssets/.kata/auth/session.json",
        "env: ltqc-prod",
        "runtime:",
        "  allow_write: true",
      ].join("\n"),
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
