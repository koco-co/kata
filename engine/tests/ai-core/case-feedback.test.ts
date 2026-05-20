import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("plan-reconcile reference allows corrections writeback", () => {
  it("removes the legacy ban on editing archive.md", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/plan-reconcile.md");
    expect(ref).not.toContain("不修改 archive.md 或 test-point-checklist.md");
  });

  it("documents that discrepancies flow into case-corrections.md", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/plan-reconcile.md");
    expect(ref).toContain("case-corrections.md");
    expect(ref).toContain("/case-edit apply-corrections");
  });

  it("still forbids modifying test-point-checklist.md", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/plan-reconcile.md");
    expect(ref).toContain("test-point-checklist.md");
    expect(ref).toMatch(/test-point-checklist\.md.*(不修改|不变|不动)/);
  });
});

describe("case-feedback reference exists and covers required protocol", () => {
  it("file exists at expected path", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/case-feedback.md");
    expect(ref.length).toBeGreaterThan(0);
  });

  it("defines the 8 correction categories", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/case-feedback.md");
    for (const cat of [
      "ui_text_drift",
      "business_rule",
      "ambiguous_step",
      "dependency_missing",
      "unverifiable_assertion",
      "wrong_priority",
      "duplicate",
      "missing_coverage",
    ]) {
      expect(ref).toContain(cat);
    }
  });

  it("defines the 3 confidence levels", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/case-feedback.md");
    for (const lvl of ["high", "medium", "low"]) {
      expect(ref).toContain(`confidence: ${lvl}`);
    }
  });

  it("requires sidecar summary json with CaseCorrections@1 schema", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/case-feedback.md");
    expect(ref).toContain("case-corrections-summary.json");
    expect(ref).toContain("CaseCorrections@1");
  });

  it("specifies dedup against applied (filter) and rejected (mark + 3-strike) history", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/case-feedback.md");
    expect(ref).toContain("case-corrections-applied.md");
    expect(ref).toContain("previously_rejected");
    expect(ref).toMatch(/3 ?次|≥ ?3|>= ?3/);
  });

  it("forbids touching archive/xmind directly inside case-feedback step", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/case-feedback.md");
    expect(ref).toMatch(/不得.*archive\.md|禁止.*archive\.md/);
    expect(ref).toMatch(/不得.*xmind|禁止.*xmind/);
  });
});
