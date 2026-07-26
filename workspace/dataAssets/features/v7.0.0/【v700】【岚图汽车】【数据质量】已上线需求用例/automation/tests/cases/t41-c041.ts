// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C041",
  "title": "验证「新建监控规则」下拉框新增「设置默认监控数据源库」按钮",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "UI CHECK",
      "expected": "「新建监控规则」下拉框新增「设置默认监控数据源库」按钮"
    }
  ]
} as const;

test.describe("验证「新建监控规则」下拉框新增「设置默认监控数据源库」按钮", () => {
  test("C041 验证「新建监控规则」下拉框新增「设置默认监控数据源库」按钮", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
