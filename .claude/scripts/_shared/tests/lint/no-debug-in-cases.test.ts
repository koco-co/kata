import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintNoDebugInCases } from "@shared/lint/no-debug-in-cases.ts";

describe("gate: no_debug_in_cases", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "gate-debug-"));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  function seed(name: string) {
    const dir = join(scratch, "dataAssets/features/v6.4/【v6.4】feature-x/automation/tests/cases");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, name), "test('x', async () => {});");
  }

  it("reports *-debug*", () => {
    seed("t01-debug.spec.ts");
    const r = lintNoDebugInCases(scratch);
    expect(r.violations).toHaveLength(1);
  });

  it("reports *-repro*", () => {
    seed("foo-repro.spec.ts");
    const r = lintNoDebugInCases(scratch);
    expect(r.violations).toHaveLength(1);
  });

  it("reports diag_*", () => {
    seed("diag_foo.ts");
    const r = lintNoDebugInCases(scratch);
    expect(r.violations).toHaveLength(1);
  });

  it("passes for normal t01.ts", () => {
    seed("t01.ts");
    const r = lintNoDebugInCases(scratch);
    expect(r.violations).toHaveLength(0);
  });
});
