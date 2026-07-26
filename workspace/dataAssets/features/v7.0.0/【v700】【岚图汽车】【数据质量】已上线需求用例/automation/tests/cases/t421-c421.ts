// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C421",
  "title": "验证「监控规则」-「时效性校验」-「单字段时间差校验」区域详情正确",
  "steps": [
    {
      "action": "进入「资产-【数据资产】-【数据质量】-【规则任务管理】-监控对象」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "「规则名称」输入「test_rule」\n「选择数据源」选择「${DATASOURCE}」\n「选择数据库」选择「${DATABASE}」\n「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功；\n进入「监控规则」配置页"
    },
    {
      "action": "点击【添加规则】按钮，选择「时效性校验」规则",
      "expected": "选择成功，页面显示「时效性校验」规则配置区域"
    },
    {
      "action": "查看配置区域详情",
      "expected": "包含：\n1）「字段」，可选择对应数据表下的所有字段\n2）「统计函数」，可选择「周期性校验（单字段时间差校验）」\n3）「过滤条件」，可选择「选项配置」、「手动配置」\n4）「选择排序字段」，可选择对应数据表下的所有字段\n5）「时间差」，可配置「>/</>=/<=/=/!= xx 毫秒/秒/分钟/小时/天」\n6）「强弱规则」，可选择「强/弱规则」\n7）「规则描述」，可输入内容\n8）「上一步」、「临时保存」和「下一步」按钮"
    }
  ]
} as const;

test.describe("验证「监控规则」-「时效性校验」-「单字段时间差校验」区域详情正确", () => {
  test("C421 验证「监控规则」-「时效性校验」-「单字段时间差校验」区域详情正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
