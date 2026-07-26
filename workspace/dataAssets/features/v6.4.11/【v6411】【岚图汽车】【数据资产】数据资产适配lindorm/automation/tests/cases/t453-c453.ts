// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C453",
  "title": "验证级别管理-编辑级别-功能正确",
  "steps": [
    {
      "action": "点击级别的编辑icon",
      "expected": "弹出编辑级别弹窗"
    },
    {
      "action": "清空级别名称输入框",
      "expected": "级别名称下出现提示：“级别名称不可为空！”"
    },
    {
      "action": "编辑级别名称为已存在的级别名称，点击空白处",
      "expected": "级别名称下出现提示：“该级别已存在，请修改！”"
    },
    {
      "action": "编辑级别名称和级别描述，点击确认",
      "expected": "级别列表的内容显示为编辑后的内容"
    }
  ]
} as const;

test.describe("验证级别管理-编辑级别-功能正确", () => {
  test("C453 验证级别管理-编辑级别-功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
