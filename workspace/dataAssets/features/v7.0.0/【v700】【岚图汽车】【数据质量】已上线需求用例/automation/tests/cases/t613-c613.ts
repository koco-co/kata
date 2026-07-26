// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C613",
  "title": "验证「监控规则」-「一致性校验」-「多表数据一致性比对」区域详情正确",
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
      "action": "点击【添加规则】按钮，选择「一致性校验」规则",
      "expected": "选择成功，页面显示「一致性校验」规则配置区域"
    },
    {
      "action": "查看配置区域详情",
      "expected": "包含：\n1）「校验类型」，可选择多表数据一致性比对\n2）「选择校验字段」，可选择数据表下所有字段\n3）「选择校验表主键」，可选择数据表下所有字段\n4）「选择对比表」，选择数据库下所有表，可配置多个对比表\n5）「输入分区」，可配置「选择已有分区/动态分区/手动输入分区」\n6）「数据预览」，可预览全表数据及分区数据\n7）「选择对比表主键」，可选择对比表下所有字段\n8）「比对字段设置」，展示「选择校验字段」\n9）「强弱规则」，可选择「强/弱规则」\n10）「规则描述」，可输入内容\n11）「保存」、「取消」、「对比细节设置」按钮"
    }
  ]
} as const;

test.describe("验证「监控规则」-「一致性校验」-「多表数据一致性比对」区域详情正确", () => {
  test("C613 验证「监控规则」-「一致性校验」-「多表数据一致性比对」区域详情正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
