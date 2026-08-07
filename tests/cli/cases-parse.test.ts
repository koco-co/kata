import { describe, expect, it } from "bun:test";
import { parseCasesYaml, validateCases } from "../../cli/lib/cases/parse.ts";

const GOOD = `
meta:
  title: 数据质量规则合并
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
    expect(() => parseCasesYaml(GOOD.replace('case_module_id: ""', "case_module_id: abc"))).toThrow(
      /meta\.case_module_id/,
    );
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

  it("accepts API automation without a Playwright spec file", () => {
    const api = GOOD.replace(
      "      spec_file: c0001-single-table-row-count.spec.ts",
      "      executor: api",
    );
    const file = parseCasesYaml(api);
    expect(file.cases[0].automation).toEqual({ executor: "api" });
    expect(validateCases(file)).toEqual([]);
  });

  it("keeps legacy spec_file mappings as implicit Playwright automation", () => {
    const file = parseCasesYaml(GOOD);
    expect(file.cases[0].automation).toEqual({
      spec_file: "c0001-single-table-row-count.spec.ts",
    });
    expect(validateCases(file)).toEqual([]);
  });

  it("accepts an explicit Playwright intent without a spec mapping", () => {
    const playwright = GOOD.replace(
      "      spec_file: c0001-single-table-row-count.spec.ts",
      "      executor: playwright",
    );
    const file = parseCasesYaml(playwright);
    expect(file.cases[0].automation).toEqual({ executor: "playwright" });
    expect(validateCases(file)).toEqual([]);
  });

  it("rejects empty mappings, unsupported executors and API mappings with spec_file", () => {
    expect(() =>
      parseCasesYaml(
        GOOD.replace("      spec_file: c0001-single-table-row-count.spec.ts", "      {}"),
      ),
    ).toThrow(/automation.*至少声明/);
    expect(() =>
      parseCasesYaml(
        GOOD.replace(
          "      spec_file: c0001-single-table-row-count.spec.ts",
          "      executor: selenium",
        ),
      ),
    ).toThrow(/automation\.executor/);
    expect(() =>
      parseCasesYaml(
        GOOD.replace(
          "      spec_file: c0001-single-table-row-count.spec.ts",
          "      executor: api\n      spec_file: c0001-single-table-row-count.spec.ts",
        ),
      ),
    ).toThrow(/executor.*api.*spec_file|spec_file.*executor.*api/);
  });

  it("requires declared import and export file names instead of bare formats", () => {
    const named = GOOD.replace(
      '  case_module_id: ""',
      '  case_module_id: ""\n  imports: [历史用例.csv]\n  exports: [交付用例.xmind, 交付用例.md]',
    );
    expect(parseCasesYaml(named).meta).toMatchObject({
      imports: ["历史用例.csv"],
      exports: ["交付用例.xmind", "交付用例.md"],
    });
    expect(() => parseCasesYaml(named.replace("交付用例.xmind", "xmind"))).toThrow(/文件名/);
    expect(() => parseCasesYaml(named.replace("历史用例.csv", "../历史用例.csv"))).toThrow(
      /文件名/,
    );
  });

  it("parses an explicit requirements aggregate and preserves requirement links", () => {
    const aggregate = `
meta:
  title: 泸州老窖定制化回归基线
  l1_title: 【泸州老窖】资产定制化代码剥离
  case_module_id: ""
  layout: requirements
requirements:
  - requirement_id: "16178"
    title: 【泸州老窖】新增行级权限管控
    source: 禅道需求 16178
cases:
  - case_id: C0001
    requirement_id: "16178"
    title: 验证行级权限配置
    priority: P0
    steps:
      - action: 配置行级权限
        expected: 仅授权数据可见
`;
    const f = parseCasesYaml(aggregate);
    expect(f.meta.layout).toBe("requirements");
    expect(f.meta.l1_title).toBe("【泸州老窖】资产定制化代码剥离");
    expect(f.requirements).toEqual([
      { requirement_id: "16178", title: "【泸州老窖】新增行级权限管控", source: "禅道需求 16178" },
    ]);
    expect(f.cases[0].requirement_id).toBe("16178");
    expect(validateCases(f)).toEqual([]);
  });

  it("rejects an aggregate case that references an unknown requirement", () => {
    const aggregate = `
meta: { title: t, case_module_id: "", layout: requirements }
requirements:
  - requirement_id: "1"
    title: R1
    source: S1
cases:
  - case_id: C0001
    requirement_id: "2"
    title: C
    priority: P1
    steps: [{ action: a, expected: e }]
`;
    expect(validateCases(parseCasesYaml(aggregate))).toContain("用例 C0001 引用了未知需求 2");
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
    const bad = GOOD.replace('case_module_id: ""', 'case_module_id: ""\n  source: 3');
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

  it("rejects retired meta.version and meta.feature_id fields", () => {
    expect(() =>
      parseCasesYaml(GOOD.replace("case_module_id", "version: v1\n  case_module_id")),
    ).toThrow(/meta\.version 已退役/);
    expect(() =>
      parseCasesYaml(GOOD.replace("case_module_id", "feature_id: legacy\n  case_module_id")),
    ).toThrow(/meta\.feature_id 已退役/);
  });
});
