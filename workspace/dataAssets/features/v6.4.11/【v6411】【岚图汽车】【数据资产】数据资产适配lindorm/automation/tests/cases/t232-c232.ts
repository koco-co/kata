// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C232",
  "title": "验证标准映射-表标准映射功能正常",
  "steps": [
    {
      "action": "1）创建对应邮箱地址的标准映射\n2）查看邮箱地址的“映射记录”",
      "expected": "映射记录中显示已绑定的字段信息正确"
    }
  ]
} as const;

test.describe("验证标准映射-表标准映射功能正常", () => {
  test("C232 验证标准映射-表标准映射功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
