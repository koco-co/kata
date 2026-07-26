// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C942",
  "title": "验证「已生成报告」-报告详情功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「已生成报告」页签",
      "expected": "成功切换到「已生成报告」"
    },
    {
      "action": "选择报告状态为「已生成」的报告记录, 点击「报告详情」",
      "expected": "跳转到【数据质量报告】详情页面"
    }
  ]
} as const;

test.describe("验证「已生成报告」-报告详情功能正常", () => {
  test("C942 验证「已生成报告」-报告详情功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
