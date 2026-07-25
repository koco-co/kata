import { describe, expect, it } from "bun:test";
import { parseCasesYaml, validateCases } from "../../cli/lib/cases/parse.ts";

const GOOD = `
meta:
  title: 数据质量规则合并
  version: v6.4.11
  feature_id: f1
cases:
  - id: C001
    title: 验证单表行数校验通过
    priority: P0
    steps:
      - action: 进入数据质量页
        expected: 显示规则列表
`;

describe("parseCasesYaml", () => {
  it("parses a valid file", () => {
    const f = parseCasesYaml(GOOD);
    expect(f.cases).toHaveLength(1);
    expect(f.cases[0].priority).toBe("P0");
    expect(validateCases(f)).toEqual([]);
  });
  it("flags a case with no steps", () => {
    const f = parseCasesYaml(GOOD);
    f.cases.push({ id: "C002", title: "空", priority: "P1", steps: [] });
    expect(validateCases(f).length).toBeGreaterThan(0);
  });
  it("rejects bad priority", () => {
    const bad = GOOD.replace("P0", "P9");
    expect(() => parseCasesYaml(bad)).toThrow();
  });
});
