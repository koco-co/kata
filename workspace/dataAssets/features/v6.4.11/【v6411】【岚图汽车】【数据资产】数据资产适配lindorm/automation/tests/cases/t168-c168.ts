// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C168",
  "title": "验证数据库列表-搜索功能正确",
  "steps": [
    {
      "action": "输入已存在的数据库名称",
      "expected": "返回当前数据源下名称相符的数据库信息"
    },
    {
      "action": "输入不存在的数据库名称",
      "expected": "返回结果为空"
    }
  ]
} as const;

test.describe("验证数据库列表-搜索功能正确", () => {
  test("C168 验证数据库列表-搜索功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
