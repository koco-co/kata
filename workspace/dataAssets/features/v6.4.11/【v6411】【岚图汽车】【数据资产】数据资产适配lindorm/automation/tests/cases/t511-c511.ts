// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C511",
  "title": "验证通知配置-删除功能正常",
  "steps": [
    {
      "action": "1. 进入资产页面\n2. 点击平台管理-通知中心-通知配置\n3. 点击删除按钮\n4. 删除弹窗UI 校验",
      "expected": "正确展示二次确认弹窗文案信息"
    },
    {
      "action": "1. 进入资产页面\n2. 点击平台管理-通知中心-通知配置\n3. 点击删除按钮\n4. 点击取消删除按钮\n5. 点击确认删除按钮",
      "expected": "取消删除，删除不生效，确认删除，删除生效，通知配置失效"
    }
  ]
} as const;

test.describe("验证通知配置-删除功能正常", () => {
  test("C511 验证通知配置-删除功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
