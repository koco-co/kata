// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C492",
  "title": "验证数据源列表-搜索功能正常",
  "steps": [
    {
      "action": "1）输入搜索内容\n2）点击搜索图标",
      "expected": "模糊匹配返回数据源名称相符或数据源描述相符的数据源"
    }
  ]
} as const;

test.describe("验证数据源列表-搜索功能正常", () => {
  test("C492 验证数据源列表-搜索功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
