// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C948",
  "title": "验证「已生成报告」-生成时间筛选",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "成功进入「已配置报告」页面"
    },
    {
      "action": "点击「已生成报告」页签",
      "expected": "成功切换到「已生成报告」"
    },
    {
      "action": "选择「生成时间」 ${start_time}~${end_time}, 点击「查询」",
      "expected": "1) 选择前: 「生成时间」默认选择${当前日期}~${当前日期}2)选择后: 显示「生成时间」在${start_time}~${end_time}之间的记录"
    },
    {
      "action": "点击「重置」",
      "expected": "显示全部记录"
    }
  ]
} as const;

test.describe("验证「已生成报告」-生成时间筛选", () => {
  test("C948 验证「已生成报告」-生成时间筛选", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
