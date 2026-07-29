import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateGeneratedPlaceholders } from "../../cli/lib/automation-placeholders.ts";

function fixture(): string {
  const feature = mkdtempSync(join(tmpdir(), "kata-placeholder-migration-"));
  mkdirSync(join(feature, "cases"), { recursive: true });
  mkdirSync(join(feature, "automation", "tests", "cases"), { recursive: true });
  mkdirSync(join(feature, "automation", "tests", "runners"), { recursive: true });
  writeFileSync(
    join(feature, "cases", "demo.yaml"),
    [
      "meta:",
      "  title: demo",
      "  version: v7.0.0",
      "  feature_id: demo",
      "cases:",
      "  - case_id: C0001",
      "    title: 占位用例",
      "    priority: P1",
      "    automation:",
      "      spec_file: c0001-placeholder-case.spec.ts",
      "    steps:",
      "      - action: 点击保存",
      "        expected: 保存成功",
      "  - case_id: C0002",
      "    title: 真实用例",
      "    priority: P1",
      "    automation:",
      "      spec_file: c0002-real-case.spec.ts",
      "    steps:",
      "      - action: 点击保存",
      "        expected: 保存成功",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(feature, "automation", "tests", "cases", "c0001-placeholder-case.spec.ts"),
    "import { runGeneratedCase } from 'shared';\n",
  );
  writeFileSync(
    join(feature, "automation", "tests", "cases", "c0002-real-case.spec.ts"),
    "export {};\n",
  );
  writeFileSync(join(feature, "automation", "tests", "runners", "full.spec.ts"), "");
  return feature;
}

describe("automation placeholder migration", () => {
  it("dry-runs and then removes only mapped generated placeholders", () => {
    const feature = fixture();
    const dryRun = migrateGeneratedPlaceholders(feature);
    expect(dryRun.placeholderScripts).toEqual(["c0001-placeholder-case.spec.ts"]);
    expect(
      existsSync(join(feature, "automation", "tests", "cases", "c0001-placeholder-case.spec.ts")),
    ).toBe(true);

    const applied = migrateGeneratedPlaceholders(feature, { apply: true });
    expect(applied.removedMappings).toEqual(["c0001-placeholder-case.spec.ts"]);
    expect(
      existsSync(join(feature, "automation", "tests", "cases", "c0001-placeholder-case.spec.ts")),
    ).toBe(false);
    expect(
      existsSync(join(feature, "automation", "tests", "cases", "c0002-real-case.spec.ts")),
    ).toBe(true);
    const yaml = readFileSync(join(feature, "cases", "demo.yaml"), "utf8");
    expect(yaml).not.toContain("c0001-placeholder-case.spec.ts");
    expect(yaml).toContain("c0002-real-case.spec.ts");
  });
});
