// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C065",
  "title": "验证【数据预览】功能正常",
  "steps": [
    {
      "action": "点击表详情【数据预览】按钮",
      "expected": "表所有字段信息，以及表内前N条数据展示正确"
    },
    {
      "action": "空白页展示",
      "expected": "展示“暂无数据”"
    }
  ]
} as const;

test.describe("验证【数据预览】功能正常", () => {
  test("C065 验证【数据预览】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
