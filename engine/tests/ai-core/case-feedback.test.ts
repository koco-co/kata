import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("playwright-automation workflow defines case-feedback step", () => {
  it("workflow yaml declares case-feedback step id", () => {
    const wf = read(".ai/core/workflows/playwright-automation.workflow.yaml");
    expect(wf).toMatch(/-\s+id:\s+case-feedback\b/);
  });

  it("case-feedback step references CaseCorrections@1 output schema", () => {
    const wf = read(".ai/core/workflows/playwright-automation.workflow.yaml");
    expect(wf).toMatch(/case-feedback[\s\S]{0,200}output_schema:\s*CaseCorrections@1/);
  });
});
