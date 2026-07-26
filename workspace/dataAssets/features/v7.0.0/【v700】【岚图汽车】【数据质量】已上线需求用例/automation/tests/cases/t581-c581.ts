// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C581",
  "title": "验证「监控规则」-「合理性校验」-「多表字段值对比」页面交互正确",
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
      "action": "正确配置「字段」、「统计函数-多表字段值对比」、「校验表主键」",
      "expected": "配置成功，下方显示「选择关联表」配置区域"
    },
    {
      "action": "多选「校验表主键」的值",
      "expected": "支持多选"
    },
    {
      "action": "鼠标悬浮「选择关联表-关联表主键」处的\"？\"图标",
      "expected": "悬浮提示：\"根据主键关联一致的数据进行计算校验\""
    },
    {
      "action": "设置10个关联表",
      "expected": "正常设置，无报错提示"
    },
    {
      "action": "设置11个关联表",
      "expected": "提示最多添加10个关联表"
    },
    {
      "action": "删除关联表，仅剩1个",
      "expected": "「删除」按钮置灰，不可删除"
    },
    {
      "action": "配置超长计算逻辑，查看规则配置区域的计算逻辑比对显示",
      "expected": "超出显示长度部分为\"…\"，鼠标悬浮展示全部"
    }
  ]
} as const;

test.describe("验证「监控规则」-「合理性校验」-「多表字段值对比」页面交互正确", () => {
  test("C581 验证「监控规则」-「合理性校验」-「多表字段值对比」页面交互正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
