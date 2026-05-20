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

describe("playwright-automation skill.yaml exposes case-feedback", () => {
  it("declares case_corrections as an output", () => {
    const yaml = read(".ai/core/skills/playwright-automation/skill.yaml");
    expect(yaml).toMatch(/outputs:[\s\S]*- case_corrections/);
  });

  it("references case-feedback.md with phase case-feedback", () => {
    const yaml = read(".ai/core/skills/playwright-automation/skill.yaml");
    expect(yaml).toContain("references/case-feedback.md");
    expect(yaml).toMatch(/load_phases:[\s\S]*- case-feedback/);
    expect(yaml).toContain("step.id == case-feedback");
  });
});

describe("handoff reference documents Case Feedback section", () => {
  it("mentions case-corrections-summary.json as the sidecar", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/handoff.md");
    expect(ref).toContain("case-corrections-summary.json");
  });

  it("includes the apply-corrections command form", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/handoff.md");
    expect(ref).toContain("/case-edit apply-corrections");
  });

  it("notes the Case Feedback section is rendered conditionally", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/handoff.md");
    expect(ref).toMatch(/Case Feedback/);
  });
});
