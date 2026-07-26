// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C983",
  "title": "验证「数据质量报告」-新增「抽样行数」模块内容",
  "steps": [
    {
      "action": "进入「数据质量」-【数据质量报告】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择当前质量规则报告，点击查看详情",
      "expected": "报告内容新增「抽样行数」模块"
    },
    {
      "action": "鼠标hover 「？」处",
      "expected": "提示\"记录抽样后的表行数，统计报告数据周期范围内，跑的所有分区的抽样数量总和\""
    }
  ]
} as const;

test.describe("验证「数据质量报告」-新增「抽样行数」模块内容", () => {
  test("C983 验证「数据质量报告」-新增「抽样行数」模块内容", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
