// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C507",
  "title": "验证通知中心入口展示内容正确",
  "steps": [
    {
      "action": "1. 进入资产平台\n2. 点击平台管理",
      "expected": "新增通知中心tab页面"
    },
    {
      "action": "1. 进入资产平台\n2. 点击平台管理\n3. 点击通知中心",
      "expected": "展示通知配置/通知记录tab按钮"
    }
  ]
} as const;

test.describe("验证通知中心入口展示内容正确", () => {
  test("C507 验证通知中心入口展示内容正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
