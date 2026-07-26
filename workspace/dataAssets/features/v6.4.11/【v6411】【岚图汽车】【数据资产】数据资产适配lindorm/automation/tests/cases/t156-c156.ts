// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C156",
  "title": "验证数据源列表-筛选功能正确",
  "steps": [
    {
      "action": "筛选“数据源类型”",
      "expected": "根据不同的数据源类型，列表展示结果正确"
    }
  ]
} as const;

test.describe("验证数据源列表-筛选功能正确", () => {
  test("C156 验证数据源列表-筛选功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
