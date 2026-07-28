// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0034",
  "title": "验证查看全局参数功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面,  编辑规则集rule01, 点击下一步",
      "expected": "进入【编辑规则集 ❯ 监控规则】配置页面"
    },
    {
      "action": "在规则包配置中, 点击【查看全局参数】按钮",
      "expected": "进入全局参数弹窗, 展示全局参数名称列表"
    }
  ]
} as const;

test.describe("验证查看全局参数功能正常", () => {
  test("C0034 验证查看全局参数功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
