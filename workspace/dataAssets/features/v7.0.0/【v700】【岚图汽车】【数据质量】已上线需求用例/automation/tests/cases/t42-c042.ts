// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C042",
  "title": "验证「新建监控规则」取消-单表多表形式下拉框",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮",
      "expected": "直接进入「监控对象」配置页面"
    }
  ]
} as const;

test.describe("验证「新建监控规则」取消-单表多表形式下拉框", () => {
  test("C042 验证「新建监控规则」取消-单表多表形式下拉框", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
