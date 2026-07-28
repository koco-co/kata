// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0515",
  "title": "验证通知配置-分页功能正常",
  "steps": [
    {
      "action": "先翻页，再筛选",
      "expected": "页面数据展示正确"
    },
    {
      "action": "先筛选、再分页",
      "expected": "页面数据展示正确"
    }
  ]
} as const;

test.describe("验证通知配置-分页功能正常", () => {
  test("C0515 验证通知配置-分页功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
