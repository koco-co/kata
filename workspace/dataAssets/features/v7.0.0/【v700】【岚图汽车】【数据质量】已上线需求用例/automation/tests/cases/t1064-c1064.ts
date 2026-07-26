// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1064",
  "title": "验证历史质量规则的「数据质量-总览」页面展示正确",
  "steps": [
    {
      "action": "进入【资产-数据质量】页面",
      "expected": "页面正常进入"
    },
    {
      "action": "选择项目test1，查看【总览】页面",
      "expected": "页面详情同前面用例，展示正确"
    }
  ]
} as const;

test.describe("验证历史质量规则的「数据质量-总览」页面展示正确", () => {
  test("C1064 验证历史质量规则的「数据质量-总览」页面展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
