// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0582",
  "title": "验证「监控规则」-「合理性校验」-「多表字段值对比」必填交互正确",
  "steps": [
    {
      "action": "进入「资产-数据质量-规则集管理-监控规则」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "点击【添加规则】按钮，选择「合理性校验」规则",
      "expected": "选择成功，页面显示「合理性校验」规则配置区域"
    },
    {
      "action": "规则不配置任何内容，点击【保存】按钮",
      "expected": "「字段」、「统计函数」、「校验表主键」、「选择关联表」、「计算逻辑配置」、「对比方法」标红提示未填写内容"
    },
    {
      "action": "正确配置「字段」、「统计函数」、「校验表主键」、「选择关联表」、「计算逻辑配置」、「对比方法」，点击【保存】按钮",
      "expected": "规则保存成功，无标红提示"
    }
  ]
} as const;

test.describe("验证「监控规则」-「合理性校验」-「多表字段值对比」必填交互正确", () => {
  test("C0582 验证「监控规则」-「合理性校验」-「多表字段值对比」必填交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
