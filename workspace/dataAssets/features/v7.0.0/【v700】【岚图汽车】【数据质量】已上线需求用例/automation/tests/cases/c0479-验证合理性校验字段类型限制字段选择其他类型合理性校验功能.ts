// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0479",
  "title": "验证【合理性校验字段类型限制】字段选择其他类型，合理性校验功能",
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
      "action": "添加「合理性校验」规则，规则填写：「字段」选择非数值型/string的字段，「统计函数」选择「数据变化趋势」，「选择排序字段」选择「col1」，「校验方法」选择「单调递增」/「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存",
      "expected": "保存失败，只能选择数值型/string"
    }
  ]
} as const;

test.describe("验证【合理性校验字段类型限制】字段选择其他类型，合理性校验功能", () => {
  test("C0479 验证【合理性校验字段类型限制】字段选择其他类型，合理性校验功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
