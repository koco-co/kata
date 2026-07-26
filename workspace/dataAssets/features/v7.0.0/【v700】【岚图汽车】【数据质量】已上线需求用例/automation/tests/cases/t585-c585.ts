// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C585",
  "title": "验证「监控规则」-「合理性校验」新增「多表字段值对比」统计函数",
  "steps": [
    {
      "action": "进入「资产-数据质量-规则集管理-基础信息」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "「选择数据源」选择「${DATASOURCE}」\n「选择数据库」选择「${DATABASE}」\n「选择数据表」选择「${TABLE}」\n「规则包名称」填写「合理性-多表字段值对比」",
      "expected": "基础信息配置成功；\n进入「监控规则」配置页"
    },
    {
      "action": "点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】",
      "expected": "选择成功，页面显示「合理性校验」规则配置区域"
    },
    {
      "action": "点击「合理性校验-统计函数」下拉框",
      "expected": "显示「多表字段值对比」项"
    }
  ]
} as const;

test.describe("验证「监控规则」-「合理性校验」新增「多表字段值对比」统计函数", () => {
  test("C585 验证「监控规则」-「合理性校验」新增「多表字段值对比」统计函数", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
