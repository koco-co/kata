// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1024",
  "title": "验证「监控规则」-「合理性校验」-「多表字段值对比」校验不通过质量报告内容正确",
  "steps": [
    {
      "action": "进入「资产-数据质量-数据质量报告」页面",
      "expected": "报告进入目录"
    },
    {
      "action": "查看「test_rule2」任务的质量报告详情",
      "expected": "质量评估汇总（任务名）区域，（数据源、数据库、检测数据范围、表行数、抽样行数、字段数、校验规则数、校验通过率）"
    },
    {
      "action": "点击「查看详情」按钮",
      "expected": "显示未通过的明细数据"
    }
  ]
} as const;

test.describe("验证「监控规则」-「合理性校验」-「多表字段值对比」校验不通过质量报告内容正确", () => {
  test("C1024 验证「监控规则」-「合理性校验」-「多表字段值对比」校验不通过质量报告内容正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
