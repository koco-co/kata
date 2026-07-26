// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C476",
  "title": "验证自动分级-分类-编辑功能正确",
  "steps": [
    {
      "action": "点击分类的编辑icon",
      "expected": "分类变为可编辑状态"
    },
    {
      "action": "编辑分类名称，回车",
      "expected": "1）分类名称显示为编辑后的内容；\n2）规则列表的分类显示为编辑后的内容"
    }
  ]
} as const;

test.describe("验证自动分级-分类-编辑功能正确", () => {
  test("C476 验证自动分级-分类-编辑功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
