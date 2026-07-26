// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C498",
  "title": "验证移除用户-用户移出产品逻辑正确",
  "steps": [
    {
      "action": "1）点击用户A的移出产品\n2）二次确认",
      "expected": "1）提示移出成员成功!\n2）该用户角色不显示在用户列表中"
    },
    {
      "action": "登陆该用户A，进入资产平台",
      "expected": "提示：该用户无权限进入"
    }
  ]
} as const;

test.describe("验证移除用户-用户移出产品逻辑正确", () => {
  test("C498 验证移除用户-用户移出产品逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
