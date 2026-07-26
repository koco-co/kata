// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C508",
  "title": "验证「合理性校验」规则框-选择排序字段正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功"
    },
    {
      "action": "添加「合理性校验」规则",
      "expected": "新增合理性校验规则框"
    },
    {
      "action": "查看选择排序字段展示",
      "expected": "展示选择表下的所有字段，单选"
    }
  ]
} as const;

test.describe("验证「合理性校验」规则框-选择排序字段正确", () => {
  test("C508 验证「合理性校验」规则框-选择排序字段正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
