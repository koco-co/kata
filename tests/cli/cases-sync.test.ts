import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCasesSync } from "../../cli/commands/cases-sync.ts";

describe("kata cases sync", () => {
  it("reports API executor cases separately from unmapped Playwright cases", () => {
    const feature = mkdtempSync(join(tmpdir(), "kata-sync-api-test-"));
    mkdirSync(join(feature, "cases"), { recursive: true });
    writeFileSync(
      join(feature, "cases", "需求.yaml"),
      'meta: { title: 需求, case_module_id: "" }\ncases:\n  - case_id: C0001\n    automation:\n      executor: api\n    title: 验证接口\n    priority: P1\n    steps:\n      - { action: 调用接口, expected: 返回成功 }\n',
    );

    const report = runCasesSync(feature);
    expect(report.renames[0]?.status).toBe("api");
  });

  it("renames the unique legacy file to the explicit YAML spec_file", () => {
    const feature = mkdtempSync(join(tmpdir(), "kata-sync-test-"));
    mkdirSync(join(feature, "cases"), { recursive: true });
    mkdirSync(join(feature, "automation", "tests", "cases"), { recursive: true });
    const oldName = "c0001-legacy-case.ts";
    const newName = "c0001-login-flow.spec.ts";
    writeFileSync(
      join(feature, "cases", "需求.yaml"),
      `meta: { title: 需求, case_module_id: "" }\ncases:\n  - case_id: C0001\n    automation:\n      spec_file: ${newName}\n    title: 验证新标题\n    priority: P1\n    steps:\n      - { action: 操作, expected: 预期 }\n`,
    );
    writeFileSync(
      join(feature, "automation", "tests", "cases", oldName),
      ['import { test } from "@playwright/test";', 'test("验证新标题", async () => {});', ""].join(
        "\n",
      ),
    );

    const report = runCasesSync(feature, true);
    expect(report.applied).toBe(true);
    expect(existsSync(join(feature, "automation", "tests", "cases", oldName))).toBe(false);
    expect(existsSync(join(feature, "automation", "tests", "cases", newName))).toBe(true);
    expect(readFileSync(join(feature, "cases", "需求.yaml"), "utf8")).toContain(
      `spec_file: ${newName}`,
    );
    expect(report.renames[0]?.reason).toContain("唯一旧脚本");
    expect(
      readFileSync(join(feature, "automation", "tests", "runners", "generated.ts"), "utf8"),
    ).toContain(newName);
  });

  it("finds legacy scripts in case category subdirectories", () => {
    const feature = mkdtempSync(join(tmpdir(), "kata-sync-nested-test-"));
    mkdirSync(join(feature, "cases"), { recursive: true });
    mkdirSync(join(feature, "automation", "tests", "cases", "规则集管理"), { recursive: true });
    writeFileSync(
      join(feature, "cases", "需求.yaml"),
      'meta: { title: 需求, case_module_id: "" }\ncases:\n  - case_id: C0001\n    automation:\n      spec_file: c0001-rule-set.spec.ts\n    title: 验证规则集\n    priority: P1\n    steps:\n      - { action: 操作, expected: 预期 }\n',
    );
    writeFileSync(
      join(feature, "automation", "tests", "cases", "规则集管理", "c0001-legacy-rule.ts"),
      "export const implemented = true;\n",
    );

    runCasesSync(feature, true);
    expect(
      existsSync(
        join(feature, "automation", "tests", "cases", "规则集管理", "c0001-rule-set.spec.ts"),
      ),
    ).toBe(true);
  });

  it("resolves a duplicate destination by keeping the fuller implementation", () => {
    const feature = mkdtempSync(join(tmpdir(), "kata-sync-conflict-test-"));
    mkdirSync(join(feature, "cases"), { recursive: true });
    mkdirSync(join(feature, "automation", "tests", "cases"), { recursive: true });
    const target = "c0001-rule-set.spec.ts";
    const legacy = "c0001-legacy-rule.ts";
    writeFileSync(
      join(feature, "cases", "需求.yaml"),
      `meta: { title: 需求, case_module_id: "" }\ncases:\n  - case_id: C0001\n    automation:\n      spec_file: ${target}\n    title: 验证规则集\n    priority: P1\n    steps:\n      - { action: 操作, expected: 预期 }\n`,
    );
    writeFileSync(join(feature, "automation", "tests", "cases", target), "export {};\n");
    writeFileSync(
      join(feature, "automation", "tests", "cases", legacy),
      "import { expect } from '@playwright/test';\nexpect(true).toBe(true);\n",
    );

    const report = runCasesSync(feature, true);
    expect(report.renames[0]?.status).toBe("conflict");
    expect(report.renames[0]?.reason).toContain("内容更完整");
    expect(readFileSync(join(feature, "automation", "tests", "cases", target), "utf8")).toContain(
      "expect(true)",
    );
    expect(existsSync(join(feature, "automation", "tests", "cases", legacy))).toBe(false);
  });
});
