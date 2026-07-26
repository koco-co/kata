// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C751",
  "title": "验证搜索框正常模糊搜索规则",
  "steps": [
    {
      "action": "1. 搜索框输入1，点击搜索",
      "expected": "1. 列表模糊查询所有规则名称包含关键字1的规则"
    }
  ]
} as const;

test.describe("验证搜索框正常模糊搜索规则", () => {
  test("C751 验证搜索框正常模糊搜索规则", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
