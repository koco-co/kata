// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0157",
  "title": "验证数据源列表-搜索功能正确",
  "steps": [
    {
      "action": "输入已存在的数据源名称",
      "expected": "返回数据源名称相符的数据源信息"
    },
    {
      "action": "输入不存在的数据源名称",
      "expected": "返回结果为空"
    }
  ]
} as const;

test.describe("验证数据源列表-搜索功能正确", () => {
  test("C0157 验证数据源列表-搜索功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
