// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0522",
  "title": "验证通知记录页面UI展示正确",
  "steps": [
    {
      "action": "1）进入资产平台\n2）点击平台管理-通知中心-通知记录\n3）页面UI 校验",
      "expected": "消息记录展示【通知模块/接收人/通知方式/webhook/通知内容/通知时间】列，展示【通知模块】/【接收人】/【通知方式】/【通知时间】/【查询】/【重置】按钮"
    }
  ]
} as const;

test.describe("验证通知记录页面UI展示正确", () => {
  test("C0522 验证通知记录页面UI展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
