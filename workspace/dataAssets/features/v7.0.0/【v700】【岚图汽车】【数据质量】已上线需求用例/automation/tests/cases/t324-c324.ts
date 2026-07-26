// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C324",
  "title": "验证选择「自动关联离线任务周期」-配置项交互正确（历史回归）",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「调度属性」配置页面",
      "expected": "进入成功"
    },
    {
      "action": "「调度周期」选择「自动关联离线任务周期」",
      "expected": "选择成功"
    },
    {
      "action": "校验配置",
      "expected": "不展示具体时间点可选项"
    }
  ]
} as const;

test.describe("验证选择「自动关联离线任务周期」-配置项交互正确（历史回归）", () => {
  test("C324 验证选择「自动关联离线任务周期」-配置项交互正确（历史回归）", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
