import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  generateAutomationRunner,
  inspectAutomationCoverage,
} from "../../cli/lib/automation/automation-contract.ts";

function fixture(extraCases = "", specFile = "c0001-sample-case.spec.ts"): string {
  const feature = mkdtempSync(join(tmpdir(), "kata-contract-"));
  mkdirSync(join(feature, "cases"), { recursive: true });
  mkdirSync(join(feature, "automation", "tests", "cases"), { recursive: true });
  writeFileSync(
    join(feature, "cases", "demo.yaml"),
    `meta:\n  title: demo\n  case_module_id: ""\ncases:\n  - case_id: C0001\n    title: 验证样例\n    priority: P1\n    steps:\n      - action: 点击【保存】\n        expected: 保存成功\n    automation:\n      spec_file: ${specFile}\n${extraCases}`,
  );
  return feature;
}

function writeSpec(feature: string, content: string, specFile = "c0001-sample-case.spec.ts"): void {
  writeFileSync(join(feature, "automation", "tests", "cases", specFile), content);
}

describe("automation contract", () => {
  it("rejects a cases directory that resolves through a symlink", () => {
    const feature = fixture();
    const outside = mkdtempSync(join(tmpdir(), "kata-contract-outside-"));
    const casesDir = join(feature, "automation", "tests", "cases");
    rmSync(casesDir, { recursive: true, force: true });
    symlinkSync(outside, casesDir);
    expect(() => inspectAutomationCoverage(feature)).toThrow(/不得经过符号链接/);
  });

  it("reports API cases separately without treating them as missing Playwright coverage", () => {
    const feature = mkdtempSync(join(tmpdir(), "kata-contract-api-"));
    mkdirSync(join(feature, "cases"), { recursive: true });
    mkdirSync(join(feature, "automation", "tests", "cases"), { recursive: true });
    writeFileSync(
      join(feature, "cases", "demo.yaml"),
      `meta:\n  title: demo\n  case_module_id: ""\ncases:\n  - case_id: C0001\n    title: 验证门户接口分页\n    priority: P1\n    steps:\n      - action: 调用门户接口\n        expected: 返回正确分页数据\n    automation:\n      executor: api\n  - case_id: C0002\n    title: 验证页面展示\n    priority: P1\n    steps:\n      - action: 打开页面\n        expected: 页面展示正确\n`,
    );

    const coverage = inspectAutomationCoverage(feature);
    expect(coverage.api).toEqual(["C0001"]);
    expect(coverage.unmapped).toEqual(["C0002"]);
    expect(coverage.missingSpecFile).toEqual(["C0002"]);
    expect(coverage.cases[0]).toMatchObject({
      id: "C0001",
      executor: "api",
      status: "api",
    });

    const runner = generateAutomationRunner(feature);
    expect(runner.imports).toEqual([]);
  });

  it("surfaces implementationIssue for specs disabled via test.skip(true)", () => {
    const feature = fixture();
    writeSpec(
      feature,
      'import { test } from "@playwright/test";\ntest.skip(true, "not ready");\ntest("验证样例", async () => {});\n',
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
      [
        'import { test } from "@playwright/test";',
        "// inventory-consistency check for v6411-ui-case-specs",
        '// import "./missing.spec";',
        '/* import "./also-missing.spec"; */',
        'test("验证样例", async () => {});',
        "",
      ].join("\n"),
    );
    const coverage = inspectAutomationCoverage(feature);
    expect(coverage.implemented).toEqual(["C0001"]);
    expect(coverage.titleMismatches).toEqual([]);
  });

  it("does not count an explicit TODO case as implemented", () => {
    const feature = fixture();
    writeSpec(
      feature,
      [
        'import { test } from "@playwright/test";',
        "// TODO: 当前先保证页面主流程可执行，业务断言待补充。",
        'test("验证样例", async () => {});',
        "",
      ].join("\n"),
    );
    const coverage = inspectAutomationCoverage(feature);
    expect(coverage.mappedNotImplemented[0]).toContain("explicit incomplete marker");
  });

  it("uses the YAML spec_file mapping when script titles are more granular", () => {
    const feature = fixture();
    writeSpec(
      feature,
      [
        '// META: {"title":"验证样例"}',
        'import { test } from "@playwright/test";',
        'test("验证缩写标题", async () => {});',
        "",
      ].join("\n"),
    );
    const coverage = inspectAutomationCoverage(feature);
    expect(coverage.implemented).toEqual(["C0001"]);
    expect(coverage.titleMismatches).toEqual([
      "C0001:canonical YAML title is absent from executable source",
    ]);
  });

  it("requires the spec_file case ID prefix to match the YAML case ID", () => {
    const specFile = "c0002-wrong-case.spec.ts";
    const feature = fixture("", specFile);
    writeSpec(
      feature,
      'import { test } from "@playwright/test";\ntest("验证样例", async () => {});\n',
      specFile,
    );
    const coverage = inspectAutomationCoverage(feature);
    expect(coverage.mappedNotImplemented[0]).toContain("case ID prefix");
  });

  it("requires a real test declaration", () => {
    const feature = fixture();
    writeSpec(feature, 'export const title = "验证样例";\n');
    const coverage = inspectAutomationCoverage(feature);
    expect(coverage.mappedNotImplemented[0]).toContain("no Playwright test declaration");
  });

  it("throws on invalid cases YAML via validateCases", () => {
    const feature = fixture(
      "  - case_id: C0001\n    title: 重复id\n    priority: P1\n    steps:\n      - action: a\n        expected: b\n",
    );
    expect(() => inspectAutomationCoverage(feature)).toThrow(/用例校验未通过/);
  });

  it("generates runtime imports from the repository root when invoked in a subdirectory", () => {
    const feature = fixture();
    writeSpec(
      feature,
      'import { test } from "@playwright/test";\ntest("验证样例", async () => {});\n',
    );
    const previous = process.cwd();
    const repoRoot = resolve(import.meta.dir, "../..");
    try {
      process.chdir(join(repoRoot, "cli"));
      generateAutomationRunner(feature, { apply: true });
    } finally {
      process.chdir(previous);
    }
    const runnerDir = join(feature, "automation", "tests", "runners");
    const generated = readFileSync(join(runnerDir, "generated.ts"), "utf8");
    const configImport = generated.match(/loadPlaywrightAutomationConfig } from "([^"]+)"/)?.[1];
    expect(configImport).toBeDefined();
    expect(resolve(runnerDir, configImport as string)).toBe(
      join(repoRoot, "runtime", "automation", "config", "playwright"),
    );
  });
});
