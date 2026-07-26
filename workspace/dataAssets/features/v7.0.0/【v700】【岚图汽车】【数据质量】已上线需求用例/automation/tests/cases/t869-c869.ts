// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C869",
  "title": "验证【数据质量-规则库管理 自定义正则】规则模式字段删除",
  "steps": [
    {
      "action": "查看自定义正则列表",
      "expected": "「规则模式」字段已删除，不显示"
    },
    {
      "action": "点击「新增自定义正则」按钮，新增页面「规则模式」字段已删除不显示",
      "expected": "新增自定义正则保存成功"
    },
    {
      "action": "点击「编辑」按钮，编辑页面「规则模式」字段已删除不显示",
      "expected": "编辑自定义正则保存成功"
    },
    {
      "action": "点击编辑历史规则信息，编辑页面「规则模式」字段已删除不显示",
      "expected": "编辑历史自定义正则保存成功"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义正则】规则模式字段删除", () => {
  test("C869 验证【数据质量-规则库管理 自定义正则】规则模式字段删除", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
