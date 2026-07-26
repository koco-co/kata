// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C930",
  "title": "验证「报告详情」-查看详情功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "成功进入「已配置报告」页面"
    },
    {
      "action": "点击「已生成报告」页签, 选择校验成功的报告记录, 点击「报告详情」按钮",
      "expected": "跳转到【数据质量报告】详情页面, 「规则校验明细-多表规则-质检结果」中存在「校验未通过」的记录"
    },
    {
      "action": "点击操作中的「查看详情」",
      "expected": "支持查看明细数据，展示内容和任务实例模块的查看明细弹窗/抽屉保持一致"
    }
  ]
} as const;

test.describe("验证「报告详情」-查看详情功能正常", () => {
  test("C930 验证「报告详情」-查看详情功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
