// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C278",
  "title": "验证「规则任务管理」页面新增「开启/关闭检测」按钮",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」-「规则任务管理」页面",
      "expected": "进入成功"
    },
    {
      "action": "页面UI CHECK",
      "expected": "「规则任务管理」页面下方新增「开启检测」「关闭检测」按钮"
    }
  ]
} as const;

test.describe("验证「规则任务管理」页面新增「开启/关闭检测」按钮", () => {
  test("C278 验证「规则任务管理」页面新增「开启/关闭检测」按钮", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
