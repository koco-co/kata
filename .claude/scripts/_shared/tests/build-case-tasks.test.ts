import { describe, expect, it } from "bun:test";
import {
  classifyMutation,
  isSerialCase,
  parseArchiveCases,
} from "@skills/playwright-automation/scripts/build-case-tasks.ts";

const ARCHIVE_SNIPPET = `---
suite_name: "示例集合"
case_count: 3
---

### 资产盘点

##### 【P1】验证已接入数据源统计数据正确

> 前置条件

\`\`\`
无
\`\`\`

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入资产-【资产盘点】页面 | 进入成功 |
| 2 | 查看"已接入数据源" | 显示统计卡片 |

##### 【P2】新增一条质量规则并删除

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 点击新增规则，填写表单保存 | 创建成功 |
| 2 | 在列表中删除该规则 | 删除成功 |

##### 【P0】泸州老窖环境脏数据清理

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入泸州老窖环境清理脏数据 | 清理成功 |
`;

describe("classifyMutation", () => {
  it("纯查看步骤判为只读", () => {
    expect(classifyMutation("进入页面\n查看统计数据")).toBe(false);
  });
  it("含新增/保存/删除判为写", () => {
    expect(classifyMutation("点击新增规则，填写表单保存")).toBe(true);
    expect(classifyMutation("在列表中删除该规则")).toBe(true);
  });
});

describe("isSerialCase", () => {
  it("同时含创建与删除判为串行", () => {
    expect(isSerialCase("点击新增规则保存\n删除该规则")).toBe(true);
  });
  it("只读用例非串行", () => {
    expect(isSerialCase("进入页面\n查看数据")).toBe(false);
  });
  it("只创建不删除：写但非串行", () => {
    const steps = "点击新增规则，填写表单保存";
    expect(classifyMutation(steps)).toBe(true);
    expect(isSerialCase(steps)).toBe(false);
  });
});

describe("parseArchiveCases", () => {
  const cases = parseArchiveCases(ARCHIVE_SNIPPET);

  it("枚举出全部 3 条用例，标题=heading 文本", () => {
    expect(cases.map((c) => c.title)).toEqual([
      "验证已接入数据源统计数据正确",
      "新增一条质量规则并删除",
      "泸州老窖环境脏数据清理",
    ]);
  });
  it("id 为稳定全局序号、保留 priority", () => {
    expect(cases[0].id).toBe("C001");
    expect(cases[0].priority).toBe("P1");
    expect(cases[1].id).toBe("C002");
  });
  it("读写分类与串行标记正确", () => {
    expect(cases[0].mutates_data).toBe(false);
    expect(cases[1].mutates_data).toBe(true);
    expect(cases[1].serial).toBe(true);
  });
  it("命中租户/环境关键词的用例标 excluded", () => {
    expect(cases[2].excluded).toEqual({
      reason_category: "tenant_mismatch",
      reason: "命中跨环境/租户关键词：泸州老窖",
    });
  });
  it("heading 无优先级前缀时 priority 回退为 P?", () => {
    const cases = parseArchiveCases(
      `##### 无优先级的用例标题\n\n> 用例步骤\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n| 1 | 进入页面 | 成功 |\n`,
    );
    expect(cases[0].priority).toBe("P?");
    expect(cases[0].title).toBe("无优先级的用例标题");
  });
});
