// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1013",
  "title": "验证【数据质量报告 已生成报告列表页 列表搜索】已生成报告列表页支持报告名称与数据表模糊搜索",
  "steps": [
    {
      "action": "进入【数据质量 → 数据质量报告】页面",
      "expected": "数据质量报告页面正常加载。"
    },
    {
      "action": "点击【已生成报告】页签",
      "expected": "成功切换到「已生成报告」列表页。"
    },
    {
      "action": "在「报告名称」输入框输入「唯一性」，点击【查询】按钮",
      "expected": "列表仅显示报告名称包含「唯一性」的记录，结果为「车辆订单唯一性日报」。"
    },
    {
      "action": "点击【重置】按钮",
      "expected": "查询条件恢复为进入页面时的初始状态，列表重新展示前置条件中的全部报告记录。"
    },
    {
      "action": "在「数据表」输入框输入「user_tag_snapshot」，点击【查询】按钮",
      "expected": "列表仅显示数据表包含「user_tag_snapshot」的记录，结果为「用户标签时效性月报」，数据表显示为「ads_user_tag_snapshot_df」。"
    }
  ]
} as const;

test.describe("验证【数据质量报告 已生成报告列表页 列表搜索】已生成报告列表页支持报告名称与数据表模糊搜索", () => {
  test("C1013 验证【数据质量报告 已生成报告列表页 列表搜索】已生成报告列表页支持报告名称与数据表模糊搜索", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
