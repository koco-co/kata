// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C309",
  "title": "验证「数据质量」-「规则任务管理」-「调度配置」新增「自动关联」按钮",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「任务调度属性」配置页面",
      "expected": "进入成功"
    },
    {
      "action": "UI CHECK",
      "expected": "「任务关联」模块下新增「自动关联」按钮"
    }
  ]
} as const;

test.describe("验证「数据质量」-「规则任务管理」-「调度配置」新增「自动关联」按钮", () => {
  test("C309 验证「数据质量」-「规则任务管理」-「调度配置」新增「自动关联」按钮", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
