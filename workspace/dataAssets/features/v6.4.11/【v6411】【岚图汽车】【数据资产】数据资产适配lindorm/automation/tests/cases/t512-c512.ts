// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C512",
  "title": "验证通知配置-查看详情功能正常",
  "steps": [
    {
      "action": "1. 进入资产页面\n2. 点击平台管理-通知中心-通知配置\n3. 点击查看详情按钮",
      "expected": "通知配置详情信息展示正确"
    },
    {
      "action": "1. 进入资产页面\n2. 点击平台管理-通知中心-通知配置\n3. 编辑配置后更新配置，再次点击查看详情按钮",
      "expected": "通知配置信息更新正确"
    }
  ]
} as const;

test.describe("验证通知配置-查看详情功能正常", () => {
  test("C512 验证通知配置-查看详情功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
