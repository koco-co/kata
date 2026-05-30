import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getRegisteredPrefixes,
  isRegisteredPrefix,
  lintSourceRefRegistry,
} from "@shared/lint/source-ref-registry.ts";

describe("SourceRefRegistry loader", () => {
  it("returns 4 prefixes", () => {
    const names = getRegisteredPrefixes().map((p) => p.prefix);
    expect(names.sort()).toEqual(["SR-ENV-PREFLIGHT", "SR-INTENT", "SR-SELF-RUN", "SR-UI-PROBE"]);
  });

  it("matches known prefix", () => {
    expect(isRegisteredPrefix("SR-INTENT-FOO123")).toBe(true);
  });

  it("rejects unregistered prefix", () => {
    expect(isRegisteredPrefix("SR-FOOBAR-XYZ")).toBe(false);
  });

  it("reports unregistered refs in case files as failures", () => {
    const scratch = mkdtempSync(join(tmpdir(), "source-ref-lint-"));
    try {
      const dir = join(scratch, "dataAssets/features/2026-05-x/tests/cases");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "t01.ts"), "// intent: SR-FOOBAR-X\n");
      const report = lintSourceRefRegistry(scratch);
      expect(report.violations).toHaveLength(1);
      expect(report.violations[0].severity).toBe("fail");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
