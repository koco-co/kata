// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0754",
  "title": "验证新建自定义正则正常",
  "steps": [
    {
      "action": "点击新建自定义正则",
      "expected": "弹出新建规则弹窗\n包含输入框规则名称、规则模式、规则类型、关联范围、规则描述、正则"
    },
    {
      "action": "输入\n规则名称：test_01\n规则模式：正则\n规则类型：有效性\n关联范围：字段级\n规则描述：只允许正整数\n正则：^[1-9]\\\\d*$\n点击确定",
      "expected": "模式选择正则后类型和范围默认为有效性及字段级\n自定义正则新建成功\n列表正常展示新建规则"
    }
  ]
} as const;

test.describe("验证新建自定义正则正常", () => {
  test("C0754 验证新建自定义正则正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
