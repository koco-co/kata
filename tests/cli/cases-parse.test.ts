import { describe, expect, it } from "bun:test";
import { parseCasesYaml, validateCases } from "../../cli/lib/cases/parse.ts";
import { validateCanonicalCases } from "../../cli/lib/cases/schema.ts";

const GOOD = `
meta:
  title: 数据质量规则合并
  feature_id: quality-rule-merge
  project_id: data-assets
  case_module_id: ""
cases:
  - case_id: C0001
    title: 验证单表行数校验通过
    priority: P0
    automation:
      effects:
        platform_write: false
      business_record:
        policy: not_applicable
        reason: 只读查询不会产生业务记录
      implementations:
        - executor: playwright-web-ui
          state: active
    steps:
      - action: 进入数据质量页
        expected: 显示规则列表
`;

describe("parseCasesYaml", () => {
  it("parses a valid file", () => {
    const f = parseCasesYaml(GOOD);
    expect(f.meta.project_id).toBe("data-assets");
    expect(f.cases).toHaveLength(1);
    expect(f.cases[0].priority).toBe("P0");
    expect(f.cases[0].automation).toEqual({
      effects: { platform_write: false },
      business_record: {
        policy: "not_applicable",
        reason: "只读查询不会产生业务记录",
      },
      implementations: [{ executor: "playwright-web-ui", state: "active" }],
    });
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
  it("parses and normalizes an optional automation env", () => {
    const withEnv = parseCasesYaml(
      GOOD.replace('case_module_id: ""', 'case_module_id: ""\n  automation_env: ltqc-lindorm-dev'),
    );
    expect(withEnv.meta.automation_env).toBe("ltqc-lindorm-dev");
    expect(validateCases(withEnv)).toEqual([]);
    expect(parseCasesYaml(GOOD).meta.automation_env).toBeUndefined();
  });
  it("rejects invalid or non-string automation env", () => {
    expect(() =>
      parseCasesYaml(
        GOOD.replace('case_module_id: ""', 'case_module_id: ""\n  automation_env: 123'),
      ),
    ).toThrow(/meta\.automation_env/);
    expect(() =>
      parseCasesYaml(
        GOOD.replace('case_module_id: ""', 'case_module_id: ""\n  automation_env: "Bad Env"'),
      ),
    ).toThrow(/invalid environment name/);
  });
  it("flags a case with no steps", () => {
    const f = parseCasesYaml(GOOD);
    f.cases.push({ id: "C0002", title: "空", priority: "P1", steps: [] });
    expect(validateCases(f).length).toBeGreaterThan(0);
  });
  it("keeps case IDs stable when canonical cases are reordered", () => {
    const file = parseCasesYaml(GOOD);
    const original = file.cases[0];
    file.cases = [
      {
        id: "C0042",
        title: "验证后新增的稳定用例身份",
        priority: "P1",
        steps: [{ action: "执行操作", expected: "结果正确" }],
      },
      original,
    ];

    expect(validateCases(file)).toEqual([]);

    file.cases.push({ ...original });
    expect(validateCases(file)).toContain("用例 id 重复: C0001");
  });
  it("rejects bad priority", () => {
    const bad = GOOD.replace("P0", "P9");
    expect(() => parseCasesYaml(bad)).toThrow();
  });
  it("accepts multiple unique active and planned executor implementations", () => {
    const source = GOOD.replace(
      "        - executor: playwright-web-ui\n          state: active",
      "        - executor: playwright-web-ui\n          state: active\n        - executor: request-api\n          state: planned",
    );

    expect(parseCasesYaml(source).cases[0].automation?.implementations).toEqual([
      { executor: "playwright-web-ui", state: "active" },
      { executor: "request-api", state: "planned" },
    ]);
  });

  it("rejects legacy and unknown automation fields fail closed", () => {
    for (const field of [
      "      executor: playwright-web-ui\n",
      "      spec_file: c0001-example.spec.ts\n",
      "      browser: chromium\n",
    ]) {
      expect(() =>
        parseCasesYaml(GOOD.replace("      effects:\n", `${field}      effects:\n`)),
      ).toThrow(/automation.*不允许字段/);
    }
  });

  it("requires the complete canonical automation structure", () => {
    expect(() =>
      parseCasesYaml(GOOD.replace("      effects:\n        platform_write: false\n", "")),
    ).toThrow(/automation\.effects.*缺失/);
    expect(() =>
      parseCasesYaml(
        GOOD.replace(
          "      business_record:\n        policy: not_applicable\n        reason: 只读查询不会产生业务记录\n",
          "",
        ),
      ),
    ).toThrow(/automation\.business_record.*缺失/);
    expect(() =>
      parseCasesYaml(
        GOOD.replace(
          "      implementations:\n        - executor: playwright-web-ui\n          state: active\n",
          "",
        ),
      ),
    ).toThrow(/automation\.implementations.*缺失/);
  });

  it("validates effects and the business-record policy union strictly", () => {
    expect(() =>
      parseCasesYaml(GOOD.replace("platform_write: false", "platform_write: no")),
    ).toThrow(/platform_write.*布尔/);
    expect(() =>
      parseCasesYaml(
        GOOD.replace(
          "        platform_write: false",
          "        platform_write: false\n        retry: 1",
        ),
      ),
    ).toThrow(/automation\.effects.*不允许字段/);
    expect(() =>
      parseCasesYaml(
        GOOD.replace(
          "        policy: not_applicable\n        reason: 只读查询不会产生业务记录",
          "        policy: required\n        reason: 不应存在",
        ),
      ),
    ).toThrow(/business_record.*不允许字段/);
    expect(() => parseCasesYaml(GOOD.replace("只读查询不会产生业务记录", '"  有空白  "'))).toThrow(
      /business_record\.reason.*无首尾空白/,
    );
  });

  it("requires non-empty unique kebab executor implementations with a valid state", () => {
    expect(() =>
      parseCasesYaml(
        GOOD.replace(
          "        - executor: playwright-web-ui\n          state: active",
          "        []",
        ),
      ),
    ).toThrow(/implementations.*非空数组/);
    expect(() =>
      parseCasesYaml(
        GOOD.replace(
          "        - executor: playwright-web-ui\n          state: active",
          "        - executor: Playwright Web\n          state: active",
        ),
      ),
    ).toThrow(/implementations\[0\]\.executor/);
    expect(() => parseCasesYaml(GOOD.replace("state: active", "state: disabled"))).toThrow(
      /implementations\[0\]\.state/,
    );
    expect(() =>
      parseCasesYaml(
        GOOD.replace(
          "        - executor: playwright-web-ui\n          state: active",
          "        - executor: playwright-web-ui\n          state: active\n        - executor: playwright-web-ui\n          state: planned",
        ),
      ),
    ).toThrow(/implementations.*重复 executor/);
    expect(() =>
      parseCasesYaml(
        GOOD.replace("          state: active", "          state: active\n          retries: 2"),
      ),
    ).toThrow(/implementations\[0\].*不允许字段/);
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

  it("keeps immutable project and feature identities and rejects invalid metadata", () => {
    expect(parseCasesYaml(GOOD).meta.feature_id).toBe("quality-rule-merge");
    expect(parseCasesYaml(GOOD).meta.project_id).toBe("data-assets");
    expect(() =>
      parseCasesYaml(GOOD.replace("case_module_id", "version: v1\n  case_module_id")),
    ).toThrow(/meta\.version 已退役/);
    expect(() => parseCasesYaml(GOOD.replace("quality-rule-merge", "Quality Rule Merge"))).toThrow(
      /meta\.feature_id/,
    );
    expect(() => parseCasesYaml(GOOD.replace("data-assets", "Data Assets"))).toThrow(
      /meta\.project_id/,
    );
    expect(() => parseCasesYaml(GOOD.replace("data-assets", '" data-assets "'))).toThrow(
      /meta\.project_id/,
    );
  });

  it("keeps draft validation reusable while canonical validation requires both stable identities", () => {
    const draft = parseCasesYaml(
      GOOD.replace("  feature_id: quality-rule-merge\n", "").replace(
        "  project_id: data-assets\n",
        "",
      ),
    );

    expect(validateCases(draft)).toEqual([]);
    expect(validateCanonicalCases(draft)).toContain(
      "meta.feature_id 缺失；canonical cases 必须声明不可变身份",
    );
    expect(validateCanonicalCases(draft)).toContain(
      "meta.project_id 缺失；canonical cases 必须声明不可变身份",
    );
  });
});
