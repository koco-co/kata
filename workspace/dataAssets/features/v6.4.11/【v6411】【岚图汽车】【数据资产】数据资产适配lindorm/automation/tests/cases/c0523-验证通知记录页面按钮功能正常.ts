// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0523",
  "title": "验证通知记录页面按钮功能正常",
  "steps": [
    {
      "action": "1）进入资产平台\n2）点击平台管理-通知中心-通知记录\n3）输入通知模块/接收人/通知方式/通知时间，模糊查询",
      "expected": "成功匹配出符合条件的通知记录"
    }
  ]
} as const;

test.describe("验证通知记录页面按钮功能正常", () => {
  test("C0523 验证通知记录页面按钮功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
