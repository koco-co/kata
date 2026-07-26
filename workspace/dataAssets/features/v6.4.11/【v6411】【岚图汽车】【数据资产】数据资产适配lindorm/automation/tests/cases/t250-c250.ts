// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C250",
  "title": "验证码表管理-代码目录-移动",
  "steps": [
    {
      "action": "把一个只拥有1级的代码目录移动到一级目录下",
      "expected": "代码目录移动成功"
    },
    {
      "action": "把一个只拥有1级的代码目录移动到6级目录下",
      "expected": "代码目录移动失败，提示：超过最大层级！"
    }
  ]
} as const;

test.describe("验证码表管理-代码目录-移动", () => {
  test("C250 验证码表管理-代码目录-移动", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
