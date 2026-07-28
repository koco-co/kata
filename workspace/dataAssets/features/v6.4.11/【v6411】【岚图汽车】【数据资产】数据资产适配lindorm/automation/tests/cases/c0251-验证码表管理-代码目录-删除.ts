// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0251",
  "title": "验证码表管理-代码目录-删除",
  "steps": [
    {
      "action": "对代码目录进行删除操作",
      "expected": "1）代码目录删除成功\n2）该目录下的代码也被删除"
    }
  ]
} as const;

test.describe("验证码表管理-代码目录-删除", () => {
  test("C0251 验证码表管理-代码目录-删除", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
