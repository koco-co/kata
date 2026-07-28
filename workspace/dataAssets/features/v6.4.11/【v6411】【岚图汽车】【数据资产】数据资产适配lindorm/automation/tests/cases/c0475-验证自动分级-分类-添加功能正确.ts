// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0475",
  "title": "验证自动分级-分类-添加功能正确",
  "steps": [
    {
      "action": "点击分类右侧的“+”icon",
      "expected": "分类搜索框下新增一个输入框"
    },
    {
      "action": "不输入内容，回车",
      "expected": "提示：“分类名称不能为空或空字符串”"
    },
    {
      "action": "输入与一级分类同名的分类名称，回车",
      "expected": "提示：“同级目录下名称不可重复”"
    },
    {
      "action": "输入与不同级分类同名的分类名称，回车",
      "expected": "分类新增成功"
    }
  ]
} as const;

test.describe("验证自动分级-分类-添加功能正确", () => {
  test("C0475 验证自动分级-分类-添加功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
