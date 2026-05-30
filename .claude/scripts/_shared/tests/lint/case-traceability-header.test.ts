import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintCaseTraceabilityHeader } from "@shared/lint/case-traceability-header.ts";

describe("gate: case_traceability_header", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "gate-trace-"));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  function seed(content: string) {
    const dir = join(scratch, "dataAssets/features/2026-04-x/tests/cases");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "t01.ts"), content);
  }

  it("passes when all 4 trace lines present", () => {
    seed(`// spec: features/2026-04-x/archive.md#case=1
// intent: SR-INTENT-X
// probe: SR-UI-PROBE-X
// page: _shared/pages/dq-page.ts
import { test } from "@playwright/test";
test("x", async () => {});
`);
    const r = lintCaseTraceabilityHeader(scratch);
    expect(r.violations).toHaveLength(0);
  });

  it("reports missing spec line", () => {
    seed(`// intent: SR-INTENT-X
// probe: SR-UI-PROBE-X
// page: _shared/pages/dq-page.ts
test("x", async () => {});
`);
    const r = lintCaseTraceabilityHeader(scratch);
    expect(r.violations.some((v) => v.rule === "trace_header_missing_spec")).toBe(true);
  });

  it("reports missing intent", () => {
    seed(`// spec: features/2026-04-x/archive.md#case=1
// probe: SR-UI-PROBE-X
// page: _shared/pages/dq-page.ts
test("x", async () => {});
`);
    const r = lintCaseTraceabilityHeader(scratch);
    expect(r.violations.some((v) => v.rule === "trace_header_missing_intent")).toBe(true);
  });
});
