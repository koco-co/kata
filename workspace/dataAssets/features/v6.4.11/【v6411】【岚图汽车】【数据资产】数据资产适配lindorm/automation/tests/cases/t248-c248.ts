// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C248",
  "title": "验证码表管理-代码目录-新增",
  "steps": [
    {
      "action": "1）点击添加icon\n2）在输入框中输入代码目录名称，回车",
      "expected": "代码目录新建成功"
    }
  ]
} as const;

test.describe("验证码表管理-代码目录-新增", () => {
  test("C248 验证码表管理-代码目录-新增", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
