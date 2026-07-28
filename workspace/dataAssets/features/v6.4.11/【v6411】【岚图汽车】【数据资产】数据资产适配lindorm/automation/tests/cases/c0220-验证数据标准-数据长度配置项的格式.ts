// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0220",
  "title": "验证数据标准-数据长度配置项的格式",
  "steps": [
    {
      "action": "点击运算符下拉框",
      "expected": "下拉框显示：=、<="
    },
    {
      "action": "在数值输入框中输入小数，点击空白处",
      "expected": "数值输入框内容清空"
    },
    {
      "action": "在数值输入框中输入负整数，点击空白处",
      "expected": "数值输入框内容清空"
    },
    {
      "action": "在数值输入框中输入正整数，点击空白处",
      "expected": "数值输入框内容保存"
    }
  ]
} as const;

test.describe("验证数据标准-数据长度配置项的格式", () => {
  test("C0220 验证数据标准-数据长度配置项的格式", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
