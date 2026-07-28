// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0155",
  "title": "验证数据源列表-排序功能正确",
  "steps": [
    {
      "action": "查看默认排序",
      "expected": "列表数据默认按照“更新时间”倒序显示"
    },
    {
      "action": "“存储大小”排序",
      "expected": "根据“存储大小”正序/倒序排列"
    },
    {
      "action": "“更新时间”排序",
      "expected": "根据“更新时间”正序/倒序排列"
    }
  ]
} as const;

test.describe("验证数据源列表-排序功能正确", () => {
  test("C0155 验证数据源列表-排序功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
