// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0514",
  "title": "验证通知配置-重置功能正常",
  "steps": [
    {
      "action": "1. 进入资产页面\n2. 点击平台管理-通知中心-通知配置\n3. 筛选文本框内输入xx,点击重置按钮",
      "expected": "重置成功，筛选文本框内内容清空"
    },
    {
      "action": "1. 进入资产页面\n2. 点击平台管理-通知中心-通知配置\n3. 筛选文本框内为空，点击重置按钮",
      "expected": "重置成功"
    }
  ]
} as const;

test.describe("验证通知配置-重置功能正常", () => {
  test("C0514 验证通知配置-重置功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
