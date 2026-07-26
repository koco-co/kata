// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C438",
  "title": "验证数据脱敏-规则优先级-交互正确",
  "steps": [
    {
      "action": "数据范围输入",
      "expected": "只能输入1～9999；\n默认值是1"
    },
    {
      "action": "hover提示icon",
      "expected": "提示：规则优先级支持输入正整数，数值越小，优先级越高，若优先级级别冲突，默认按照最新配置的识别规则进行脱敏应用。"
    }
  ]
} as const;

test.describe("验证数据脱敏-规则优先级-交互正确", () => {
  test("C438 验证数据脱敏-规则优先级-交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
