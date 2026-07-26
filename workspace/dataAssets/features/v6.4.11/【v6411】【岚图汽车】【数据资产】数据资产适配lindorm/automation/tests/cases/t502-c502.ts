// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C502",
  "title": "验证用户管理-添加用户组功能正常",
  "steps": [
    {
      "action": "添加用户组B，点击取消按钮",
      "expected": "用户组未添加"
    },
    {
      "action": "添加用户组B，点击确定按钮",
      "expected": "1）用户组添加成功：\n2）用户组数量统计正确；"
    }
  ]
} as const;

test.describe("验证用户管理-添加用户组功能正常", () => {
  test("C502 验证用户管理-添加用户组功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
