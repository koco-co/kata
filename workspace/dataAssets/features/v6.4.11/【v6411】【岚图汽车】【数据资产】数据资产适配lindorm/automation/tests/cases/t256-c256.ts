// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C256",
  "title": "验证码表管理-搜索",
  "steps": [
    {
      "action": "输入存在的代码名称/代码编号，回车/点击搜索",
      "expected": "列表展示符合要求的代码"
    },
    {
      "action": "输入不存在的代码名称/代码编号，回车/点击搜索",
      "expected": "列表显示为空"
    }
  ]
} as const;

test.describe("验证码表管理-搜索", () => {
  test("C256 验证码表管理-搜索", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
