// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1015",
  "title": "验证【数据质量报告 已生成报告列表页 列表搜索】已生成报告列表页查询区字段与列表默认展示正确",
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
      "action": "查看列表页查询区",
      "expected": "查询区显示「报告名称」「数据表」「生成时间」三个查询项，并显示【查询】【重置】按钮。"
    },
    {
      "action": "查看列表页首屏记录与操作列",
      "expected": "列表中展示前置条件中的报告记录，至少可见「供应商主数据有效性周报」和「车辆订单唯一性日报」两条数据，且每条记录的操作列均显示【报告详情】按钮。"
    }
  ]
} as const;

test.describe("验证【数据质量报告 已生成报告列表页 列表搜索】已生成报告列表页查询区字段与列表默认展示正确", () => {
  test("C1015 验证【数据质量报告 已生成报告列表页 列表搜索】已生成报告列表页查询区字段与列表默认展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
