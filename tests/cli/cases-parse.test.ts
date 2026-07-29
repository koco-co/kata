import { describe, expect, it } from "bun:test";
import { parseCasesYaml, validateCases } from "../../cli/lib/cases/parse.ts";

const GOOD = `
meta:
  title: 数据质量规则合并
  version: v6.4.11
  feature_id: f1
  case_module_id: ""
cases:
  - case_id: C0001
    title: 验证单表行数校验通过
    priority: P0
    automation:
      spec_file: c0001-single-table-row-count.spec.ts
    steps:
      - action: 进入数据质量页
        expected: 显示规则列表
`;

describe("parseCasesYaml", () => {
  it("parses a valid file", () => {
    const f = parseCasesYaml(GOOD);
    expect(f.cases).toHaveLength(1);
    expect(f.cases[0].priority).toBe("P0");
    expect(f.cases[0].automation?.spec_file).toBe("c0001-single-table-row-count.spec.ts");
    expect(validateCases(f)).toEqual([]);
  });
  it("keeps a numeric case module id and accepts the explicit empty default", () => {
    expect(parseCasesYaml(GOOD).meta.case_module_id).toBe("");
    const withId = parseCasesYaml(GOOD.replace('case_module_id: ""', 'case_module_id: "10307"'));
    expect(withId.meta.case_module_id).toBe("10307");
  });
  it("rejects a missing or non-numeric case module id", () => {
    expect(() => parseCasesYaml(GOOD.replace('  case_module_id: ""\n', ""))).toThrow(
      /meta\.case_module_id/,
    );
    expect(() =>
      parseCasesYaml(GOOD.replace('case_module_id: ""', "case_module_id: abc")),
    ).toThrow(/meta\.case_module_id/);
  });
  it("flags a case with no steps", () => {
    const f = parseCasesYaml(GOOD);
    f.cases.push({ id: "C0002", title: "空", priority: "P1", steps: [] });
    expect(validateCases(f).length).toBeGreaterThan(0);
  });
  it("rejects bad priority", () => {
    const bad = GOOD.replace("P0", "P9");
    expect(() => parseCasesYaml(bad)).toThrow();
  });
  it("rejects unsafe automation spec names", () => {
    expect(() =>
      parseCasesYaml(GOOD.replace("c0001-single-table-row-count.spec.ts", "Data Quality.ts")),
    ).toThrow(/spec_file/);
  });
});

describe("parseCasesYaml strict optional fields", () => {
  it("rejects a non-array tags field instead of silently dropping it", () => {
    const bad = GOOD.replace("steps:", "tags: 模块A\n    steps:");
    expect(() => parseCasesYaml(bad)).toThrow(/cases\[0\]\.tags 期望数组,实际字符串/);
  });
  it("rejects non-string elements inside tags", () => {
    const bad = GOOD.replace("steps:", "tags: [ok, 1]\n    steps:");
    expect(() => parseCasesYaml(bad)).toThrow(/cases\[0\]\.tags\[1\] 期望字符串,实际数字/);
  });
  it("rejects a non-string precondition", () => {
    const bad = GOOD.replace("steps:", "precondition: 5\n    steps:");
    expect(() => parseCasesYaml(bad)).toThrow(/cases\[0\]\.precondition 期望字符串,实际数字/);
  });
  it("rejects a non-string source_ref", () => {
    const bad = GOOD.replace("steps:", "source_ref: [a]\n    steps:");
    expect(() => parseCasesYaml(bad)).toThrow(/cases\[0\]\.source_ref 期望字符串,实际数组/);
  });
  it("rejects a non-string meta.source", () => {
    const bad = GOOD.replace("feature_id: f1", "feature_id: f1\n  source: 3");
    expect(() => parseCasesYaml(bad)).toThrow(/meta\.source 期望字符串,实际数字/);
  });
  it("keeps well-formed optional fields", () => {
    const good = GOOD.replace(
      "steps:",
      "precondition: 前置\n    tags: [模块A, 页面B]\n    source_ref: PRD#1\n    steps:",
    );
    const f = parseCasesYaml(good);
    expect(f.cases[0].precondition).toBe("前置");
    expect(f.cases[0].tags).toEqual(["模块A", "页面B"]);
    expect(f.cases[0].source_ref).toBe("PRD#1");
  });
});
