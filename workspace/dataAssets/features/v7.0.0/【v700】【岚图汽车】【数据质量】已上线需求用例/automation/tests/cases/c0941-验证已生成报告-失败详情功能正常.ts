// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0941",
  "title": "验证「已生成报告」-失败详情功能正常",
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
      "action": "选择报告状态为「生成失败」的报告记录, 点击「失败详情」",
      "expected": "失败详情支持记录日志信息，抽屉形式展示"
    }
  ]
} as const;

test.describe("验证「已生成报告」-失败详情功能正常", () => {
  test("C0941 验证「已生成报告」-失败详情功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
