// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C752",
  "title": "验证自定义正则正常查看详情",
  "steps": [
    {
      "action": "1. 选择一个规则，点击规则后操作列查看详情按钮",
      "expected": "1. 弹出规则详情弹窗\n包含输入框规则名称、规则模式、规则类型、关联范围、规则描述、正则"
    }
  ]
} as const;

test.describe("验证自定义正则正常查看详情", () => {
  test("C752 验证自定义正则正常查看详情", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
