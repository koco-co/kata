import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintFeatureRootLayout } from "@shared/lint/feature-root-layout.ts";

describe("lintFeatureRootLayout (L12)", () => {
  let scratch: string;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-l12-"));
  });

  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  // 规范 feature：版本层 + 只含允许条目
  it("passes a compliant versioned feature with only allowed entries", () => {
    const featureDir = join(scratch, "v6.4/【v6.4】good-feature");
    mkdirSync(join(featureDir, "cases"), { recursive: true });
    mkdirSync(join(featureDir, "automation"), { recursive: true });
    mkdirSync(join(featureDir, "runs"), { recursive: true });
    writeFileSync(join(featureDir, "metadata.yaml"), "schema: FeatureMetadata@2\n");
    const violations = lintFeatureRootLayout(scratch);
    expect(violations).toHaveLength(0);
  });

  // 根级混入了非允许条目
  it("flags stray entries at feature root (e.g. AUTOMATION-PLAN.md, results/)", () => {
    const featureDir = join(scratch, "v6.4/【v6.4】dirty-feature");
    mkdirSync(join(featureDir, "cases"), { recursive: true });
    mkdirSync(join(featureDir, "automation"), { recursive: true });
    // 混入非允许条目
    writeFileSync(join(featureDir, "AUTOMATION-PLAN.md"), "plan");
    mkdirSync(join(featureDir, "results"), { recursive: true });
    const violations = lintFeatureRootLayout(scratch);
    expect(violations.length).toBeGreaterThanOrEqual(2);
    expect(violations.every((v) => v.rule === "L12")).toBe(true);
    expect(violations.some((v) => v.file.includes("AUTOMATION-PLAN.md"))).toBe(true);
    expect(violations.some((v) => v.file.includes("results"))).toBe(true);
  });

  // legacy-flat feature（未进版本层）整体标为 L12
  it("flags legacy-flat feature directory as needing migration", () => {
    const featureDir = join(scratch, "【v6.4】legacy-feature");
    mkdirSync(join(featureDir, "tests"), { recursive: true });
    const violations = lintFeatureRootLayout(scratch);
    expect(violations).toHaveLength(1);
    const v = violations[0];
    expect(v?.rule).toBe("L12");
    expect(v?.file).toBe(featureDir);
    expect(v?.message).toContain("kata features migrate");
  });

  // _standing zone 内的 feature 也应正常检查
  it("checks _standing zone features for stray entries", () => {
    const featureDir = join(scratch, "_standing/【v6.4】standing-feature");
    mkdirSync(join(featureDir, "cases"), { recursive: true });
    writeFileSync(join(featureDir, "stray.json"), "{}");
    const violations = lintFeatureRootLayout(scratch);
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations.some((v) => v.file.includes("stray.json"))).toBe(true);
  });

  // _archived zone 内的 feature 也应正常检查
  it("checks _archived zone features for stray entries", () => {
    const featureDir = join(scratch, "_archived/v6.3/【v6.3】archived-feature");
    mkdirSync(join(featureDir, "cases"), { recursive: true });
    writeFileSync(join(featureDir, "old-report.md"), "old");
    const violations = lintFeatureRootLayout(scratch);
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations.some((v) => v.file.includes("old-report.md"))).toBe(true);
  });

  // 空 features 目录：无违规
  it("passes empty features root", () => {
    const violations = lintFeatureRootLayout(scratch);
    expect(violations).toHaveLength(0);
  });
});
