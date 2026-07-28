// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0405",
  "title": "验证权限回收列表-操作列功能正确",
  "steps": [
    {
      "action": "查看“已回收”状态记录的操作列",
      "expected": "操作列，只有【查看详情】按钮可用，【权限回收】按钮为禁用状态"
    },
    {
      "action": "查看“未回收”状态记录的操作列",
      "expected": "操作列，有【查看详情】、【权限回收】按钮可用"
    }
  ]
} as const;

test.describe("验证权限回收列表-操作列功能正确", () => {
  test("C0405 验证权限回收列表-操作列功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
