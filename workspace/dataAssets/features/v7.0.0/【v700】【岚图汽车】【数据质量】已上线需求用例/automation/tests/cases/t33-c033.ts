// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C033",
  "title": "验证「规则详情」页面-新增「校验类型」字段",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "进入成功"
    },
    {
      "action": "点击规则A，查看规则A详情",
      "expected": "详情页展示「校验类型」字段，且值为\"单表\""
    }
  ]
} as const;

test.describe("验证「规则详情」页面-新增「校验类型」字段", () => {
  test("C033 验证「规则详情」页面-新增「校验类型」字段", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
