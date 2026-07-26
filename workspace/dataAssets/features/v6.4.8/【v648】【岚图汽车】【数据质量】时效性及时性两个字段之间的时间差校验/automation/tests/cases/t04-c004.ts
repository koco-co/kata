// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C004",
  "title": "验证「多字段时间差校验」字段组限制个数正确",
  "steps": [
    {
      "action": "进入「资产-数据质量-规则任务配置-监控对象」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功； 进入「监控规则」配置页"
    },
    {
      "action": "点击【添加规则】按钮，选择「时效性校验」规则",
      "expected": "选择成功，页面显示「时效性校验」规则配置区域"
    },
    {
      "action": "配置10个「对比字段组」",
      "expected": "配置成功"
    },
    {
      "action": "配置11个「对比字段组」",
      "expected": "提示最多配置10个对比字段组"
    }
  ]
} as const;

test.describe("验证「多字段时间差校验」字段组限制个数正确", () => {
  test("C004 验证「多字段时间差校验」字段组限制个数正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
