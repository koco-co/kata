// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0697",
  "title": "验证「规则任务实例」页面-新增「校验类型」字段",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【校验结果查询】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择A规则的实例，点击查看详情",
      "expected": "详情页展示「校验类型」字段，且值为\"单表\""
    }
  ]
} as const;

test.describe("验证「规则任务实例」页面-新增「校验类型」字段", () => {
  test("C0697 验证「规则任务实例」页面-新增「校验类型」字段", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
