import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeAutomation } from "../../cli/lib/automation-normalize.ts";

describe("automation normalize", () => {
  it("dry-runs and applies data/sql/root runner migration", () => {
    const feature = mkdtempSync(join(tmpdir(), "kata-auto-normalize-"));
    mkdirSync(join(feature, "automation", "tests", "data"), { recursive: true });
    mkdirSync(join(feature, "automation", "sql"), { recursive: true });
    mkdirSync(join(feature, "automation", "tests", "runners"), { recursive: true });
    writeFileSync(join(feature, "automation", "tests", "data", "fixture.ts"), "export {};\n");
    writeFileSync(join(feature, "automation", "sql", "setup.sql"), "select 1;\n");
    writeFileSync(join(feature, "automation", "tests", "smoke.spec.ts"), 'import "x";\n');
    const dry = normalizeAutomation(feature, { dryRun: true });
    expect(dry.moved.length).toBe(3);
    const applied = normalizeAutomation(feature, { apply: true });
    expect(applied.unfixable).toHaveLength(0);
    expect(readdirSync(join(feature, "automation", "tests", "fixtures"))).toContain("fixture.ts");
    expect(readdirSync(join(feature, "automation", "tests", "sql"))).toContain("setup.sql");
    expect(readdirSync(join(feature, "automation", "tests", "runners"))).toContain("smoke.spec.ts");
  });
});
