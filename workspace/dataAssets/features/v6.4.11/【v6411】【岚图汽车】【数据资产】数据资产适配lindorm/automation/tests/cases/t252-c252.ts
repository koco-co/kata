// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C252",
  "title": "验证码表管理-新建",
  "steps": [
    {
      "action": "点击新建代码",
      "expected": "弹出新建代码弹窗"
    },
    {
      "action": "填写内容，点击确定",
      "expected": "1）提示新增代码成功！\n2）代码列表新增该代码"
    }
  ]
} as const;

test.describe("验证码表管理-新建", () => {
  test("C252 验证码表管理-新建", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
