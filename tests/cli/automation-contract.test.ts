import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectAutomationCoverage } from "../../cli/lib/automation/automation-contract.ts";

function fixture(extraCases = ""): string {
  const feature = mkdtempSync(join(tmpdir(), "kata-contract-"));
  mkdirSync(join(feature, "cases"), { recursive: true });
  mkdirSync(join(feature, "automation", "tests", "cases"), { recursive: true });
  writeFileSync(
    join(feature, "cases", "demo.yaml"),
    `meta:\n  title: demo\n  case_module_id: ""\ncases:\n  - case_id: C0001\n    title: 验证样例\n    priority: P1\n    steps:\n      - action: 点击【保存】\n        expected: 保存成功\n    automation:\n      spec_file: c0001-sample-case.spec.ts\n${extraCases}`,
  );
  return feature;
}

function writeSpec(feature: string, content: string): void {
  writeFileSync(
    join(feature, "automation", "tests", "cases", "c0001-sample-case.spec.ts"),
    content,
  );
}

describe("automation contract", () => {
  it("surfaces implementationIssue for specs disabled via test.skip(true)", () => {
    const feature = fixture();
    writeSpec(
      feature,
      'import { test } from "@playwright/test";\ntest.skip(true, "not ready");\ntest("x", async () => {});\n',
    );
    const coverage = inspectAutomationCoverage(feature);
    expect(coverage.mappedNotImplemented).toHaveLength(1);
    expect(coverage.mappedNotImplemented[0]).toContain("test.skip(true)");
    expect(coverage.cases[0]?.implementationIssue).toContain("test.skip(true)");
  });

  it("no longer treats v6411/inventory keywords as skeleton markers", () => {
    const feature = fixture();
    writeSpec(
      feature,
      "// inventory-consistency check for v6411-ui-case-specs\nexport const ok = true;\n",
    );
    const coverage = inspectAutomationCoverage(feature);
    expect(coverage.implemented).toEqual(["C0001"]);
  });

  it("throws on invalid cases YAML via validateCases", () => {
    const feature = fixture(
      "  - case_id: C0001\n    title: 重复id\n    priority: P1\n    steps:\n      - action: a\n        expected: b\n",
    );
    expect(() => inspectAutomationCoverage(feature)).toThrow(/用例校验未通过/);
  });
});
