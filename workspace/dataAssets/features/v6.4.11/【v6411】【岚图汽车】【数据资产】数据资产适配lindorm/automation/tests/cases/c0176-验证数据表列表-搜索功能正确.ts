// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0176",
  "title": "验证数据表列表-搜索功能正确",
  "steps": [
    {
      "action": "输入已存在的表名/表中文名",
      "expected": "返回当前数据库下名称相符的表/视图"
    },
    {
      "action": "输入不存在的表名/表中文名",
      "expected": "返回结果为空"
    }
  ]
} as const;

test.describe("验证数据表列表-搜索功能正确", () => {
  test("C0176 验证数据表列表-搜索功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
