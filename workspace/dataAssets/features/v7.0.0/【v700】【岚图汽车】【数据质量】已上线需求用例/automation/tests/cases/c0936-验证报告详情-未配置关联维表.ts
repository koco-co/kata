// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0936",
  "title": "验证「报告详情」-未配置关联维表",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "成功进入「已配置报告」页面"
    },
    {
      "action": "点击「已生成报告」页签, 选择校验成功的报告记录, 点击「报告详情」按钮",
      "expected": "跳转到【数据质量报告】详情页面"
    },
    {
      "action": "检查报告详情页面显示",
      "expected": "质量评估汇总(car_compare02--delivery_time=2025-10-01)\n1) 不显示车辆数\n2) 不显示「车辆信息汇总」表格"
    }
  ]
} as const;

test.describe("验证「报告详情」-未配置关联维表", () => {
  test("C0936 验证「报告详情」-未配置关联维表", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
