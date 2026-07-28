// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0513",
  "title": "验证通知配置-筛选功能正常",
  "steps": [
    {
      "action": "根据接收人查询",
      "expected": "返回接收人为所选人的通知配置"
    },
    {
      "action": "根据通知模块查询",
      "expected": "返回通知模块为所选模块的通知配置"
    }
  ]
} as const;

test.describe("验证通知配置-筛选功能正常", () => {
  test("C0513 验证通知配置-筛选功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
