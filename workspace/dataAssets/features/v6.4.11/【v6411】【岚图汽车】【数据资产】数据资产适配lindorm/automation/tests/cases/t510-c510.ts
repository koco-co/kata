// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C510",
  "title": "验证通知配置-编辑功能正常",
  "steps": [
    {
      "action": "1. 进入资产页面\n2. 点击平台管理-通知中心-通知配置\n3. 点击编辑按钮",
      "expected": "进入编辑配置页面，配置页面展示正确"
    },
    {
      "action": "1. 进入资产页面\n2. 点击平台管理-通知中心-通知配置\n3. 点击编辑按钮，修改配置信息，点击取消按钮",
      "expected": "配置更新失败，不生效"
    },
    {
      "action": "1. 进入资产页面\n2. 点击平台管理-通知中心-通知配置\n3. 点击编辑按钮，修改配置信息，点击确认按钮",
      "expected": "配置更新成功并生效"
    }
  ]
} as const;

test.describe("验证通知配置-编辑功能正常", () => {
  test("C510 验证通知配置-编辑功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
