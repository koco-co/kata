// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C702",
  "title": "验证「完整性校验」-「实例详情-监控报告」增加「规则类型」字段",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【校验结果查询】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择实例A，查看监控报告",
      "expected": "报告详情新增「规则类型-字段级」字段"
    },
    {
      "action": "选择实例B，查看监控报告",
      "expected": "报告详情新增「规则类型-字段级」字段"
    },
    {
      "action": "选择实例C，查看监控报告",
      "expected": "报告详情新增「规则类型-单表」字段"
    }
  ]
} as const;

test.describe("验证「完整性校验」-「实例详情-监控报告」增加「规则类型」字段", () => {
  test("C702 验证「完整性校验」-「实例详情-监控报告」增加「规则类型」字段", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
