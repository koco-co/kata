// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0494",
  "title": "验证数据源列表-数据源类型筛选功能正常",
  "steps": [
    {
      "action": "查看列表“数据源类型”下拉项",
      "expected": "包含所有资产支持的数据源类型"
    },
    {
      "action": "筛选“数据源类型”",
      "expected": "列表返回对应数据源类型的所有已引入的数据源，且数据正确"
    }
  ]
} as const;

test.describe("验证数据源列表-数据源类型筛选功能正常", () => {
  test("C0494 验证数据源列表-数据源类型筛选功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
