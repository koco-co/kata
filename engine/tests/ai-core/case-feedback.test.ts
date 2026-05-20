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
