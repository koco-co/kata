// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0325",
  "title": "验证「数据质量」-「规则任务管理」-「调度配置-调度周期」交互变更正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「调度属性」配置页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「调度周期」下拉框",
      "expected": "除原有调度选项外，新增「手动关联离线任务周期」选项"
    }
  ]
} as const;

test.describe("验证「数据质量」-「规则任务管理」-「调度配置-调度周期」交互变更正确", () => {
  test("C0325 验证「数据质量」-「规则任务管理」-「调度配置-调度周期」交互变更正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
