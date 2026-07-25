import { describe, expect, it } from "bun:test";
import { archiveToCasesYaml } from "../../cli/lib/cases/from-archive.ts";
import { parseCasesYaml, validateCases } from "../../cli/lib/cases/parse.ts";

const ARCHIVE = `---
case_count: 1
---

## 单表校验

##### 【P0】验证单表行数校验通过

> 前置条件

\`\`\`
已创建 Doris 数据源
\`\`\`

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据质量页 | 显示规则列表 |
`;

describe("archiveToCasesYaml", () => {
  const yaml = archiveToCasesYaml(ARCHIVE, { title: "t", version: "v", feature_id: "f" });

  it("converts archive cases to yaml preserving count", () => {
    const f = parseCasesYaml(yaml);
    expect(f.cases).toHaveLength(1);
    expect(f.cases[0].title).toContain("行数校验");
  });
  it("strips the priority prefix from titles and keeps priority", () => {
    const f = parseCasesYaml(yaml);
    expect(f.cases[0].title).not.toContain("【P0】");
    expect(f.cases[0].priority).toBe("P0");
  });
  it("preserves precondition, steps and module tag", () => {
    const f = parseCasesYaml(yaml);
    expect(f.cases[0].precondition).toContain("Doris");
    expect(f.cases[0].steps[0].action).toBe("进入数据质量页");
    expect(f.cases[0].steps[0].expected).toBe("显示规则列表");
    expect(f.cases[0].tags?.[0]).toBe("单表校验");
  });
  it("generates sequential ids and passes validation", () => {
    const f = parseCasesYaml(yaml);
    expect(f.cases[0].id).toBe("C001");
    expect(validateCases(f)).toEqual([]);
  });
});

describe("archiveToCasesYaml real-world variants", () => {
  const META = { title: "t", version: "v", feature_id: "f" };
  it("accepts h4 case headings when no h5 exists", () => {
    const md = `## 模块\n\n### 页面\n\n#### 【146116】验证报告展示\n\n> 用例步骤\n\n| 编号 | 步骤 | 预期 |\n| -- | -- | -- |\n| 1 | 进入 | 显示 |\n`;
    const f = parseCasesYaml(archiveToCasesYaml(md, META));
    expect(f.cases).toHaveLength(1);
    expect(f.cases[0].title).toContain("146116");
  });
  it("keeps continuation rows with empty action cells", () => {
    const md = `## 模块\n\n##### 【P0】用例一\n\n> 用例步骤\n\n| 编号 | 步骤 | 预期 |\n| -- | -- | -- |\n| 1 | 操作 | 预期 |\n| 2 |  | 结果符合预期 |\n`;
    const f = parseCasesYaml(archiveToCasesYaml(md, META));
    expect(f.cases[0].steps).toHaveLength(2);
    expect(f.cases[0].steps[1].action).toBe("");
    expect(validateCases(f)).toEqual([]);
  });
  it("fills a placeholder step for title-only stub cases", () => {
    const md = `## 模块\n\n##### 【P1】只有标题的用例\n\n> 前置条件\n\n\`\`\`\n无\n\`\`\`\n`;
    const f = parseCasesYaml(archiveToCasesYaml(md, META));
    expect(f.cases[0].steps).toHaveLength(1);
    expect(validateCases(f)).toEqual([]);
  });
  it("does not emit yaml anchors for shared tag paths", () => {
    const rows = Array.from({ length: 120 }, (_, i) => `| ${i + 1} | 操作${i} | 预期${i} |`).join(
      "\n",
    );
    const cases = Array.from(
      { length: 60 },
      () => `##### 【P1】用例\n\n> 用例步骤\n\n| 编号 | 步骤 | 预期 |\n| -- | -- | -- |\n${rows}\n`,
    ).join("\n");
    const yaml = archiveToCasesYaml(`## 模块\n\n### 页面\n\n${cases}`, META);
    expect(yaml).not.toContain("&a1");
    const f = parseCasesYaml(yaml);
    expect(f.cases).toHaveLength(60);
  });
});
