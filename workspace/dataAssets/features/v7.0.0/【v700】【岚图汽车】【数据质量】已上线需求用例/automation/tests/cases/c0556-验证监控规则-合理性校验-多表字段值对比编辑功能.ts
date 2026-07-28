// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0556",
  "title": "验证「监控规则」-「合理性校验」-「多表字段值对比」编辑功能",
  "steps": [
    {
      "action": "进入「资产-数据质量-规则集管理」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "点击表名为A的编辑按钮",
      "expected": "「监控规则」为「合理性校验」；\n1）子规则一：「合理性校验」-「多表字段值对比」-「计算结果对比」：\n「字段」：「 field_int 」\n「统计函数」：「 多表字段值对比」\n「校验表主键」：「id」\n「关联表1」：「 B」，「关联表1主键」：「 id」\n「计算逻辑配置1」：「A.field_tinyint+B.field_smallint」\n「对比方法」：「计算结果对比」\n「计算逻辑配置2」：「A.field_bigint+B.field_bigint」\n「对比规则」：「A.field_tinyint+B.field_smallint>A.field_bigint+B.field_bigint」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」\n2）子规则二：「合理性校验」-「多表字段值对比」-「计算结果值判断」：\n「字段」：「 field_float」\n「统计函数」：「 多表字段值对比」\n「校验表主键」：「id」\n「关联表1」：「 B」，「关联表1主键」：「 id」\n「计算逻辑配置1」：「（A.field_float-B.field_float）/A.field_float」\n「对比方法」：「计算结果值判断」\n「结果值」：「>=1或<=10000」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」\n3）全部置灰显示，不可编辑"
    },
    {
      "action": "查看页面回显",
      "expected": "1）「选择数据源」置灰显示「${DATASOURCE}」，不可编辑\n2）「选择数据库」置灰显示「${DATABASE}」，不可编辑\n3）「选择数据表」置灰显示「${TABLE}」，不可编辑\n4）规则包可编辑"
    },
    {
      "action": "点击下一步按钮",
      "expected": "进入编辑规则集-监控规则页面"
    },
    {
      "action": "查看页面回显，并编辑",
      "expected": "「监控规则」为「合理性校验」；\n1）子规则一：「合理性校验」-「多表字段值对比」-「计算结果对比」：\n「字段」：「 field_int 」\n「统计函数」：「 多表字段值对比」\n「校验表主键」：「id」\n「关联表1」：「 B」，「关联表1主键」：「 id」\n「计算逻辑配置1」：「A.field_tinyint+B.field_smallint」\n「对比方法」：「计算结果对比」\n「计算逻辑配置2」：「A.field_bigint+B.field_bigint」\n「对比规则」：「A.field_tinyint+B.field_smallint>A.field_bigint+B.field_bigint」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」\n2）子规则二：「合理性校验」-「多表字段值对比」-「计算结果值判断」：\n「字段」：「 field_float」\n「统计函数」：「 多表字段值对比」\n「校验表主键」：「id」\n「关联表1」：「 B」，「关联表1主键」：「 id」\n「计算逻辑配置1」：「（A.field_float-B.field_float）/A.field_float」\n「对比方法」：「计算结果值判断」\n「结果值」：「>=1或<=10000」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」\n3）编辑子规则二：「结果值」为「 =100且!=1」"
    },
    {
      "action": "点击保存按钮",
      "expected": "正常保存"
    },
    {
      "action": "进入「资产-【数据资产】-【数据质量】-【规则任务管理】」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "点击规则名称「test_rule1」的编辑按钮",
      "expected": "进入「编辑单表校验规则-监控对象」页"
    },
    {
      "action": "查看页面内容回显",
      "expected": "1）「规则名称」显示「test_rule1」，可编辑\n2）「选择数据源」置灰显示「${DATASOURCE}」，不可编辑\n3）「选择数据库」置灰显示「${DATABASE}」，不可编辑\n4）「选择数据表」置灰显示「${TABLE}」，不可编辑"
    },
    {
      "action": "编辑「规则名称」为「test_rule1_new」，点击下一步按钮",
      "expected": "进入「编辑单表校验规则-监控规则」页"
    },
    {
      "action": "查看页面内容回显",
      "expected": "1、显示规则包引入区域，可更新引入"
    },
    {
      "action": "更新引入规则包",
      "expected": "子规则二的「结果值」更新为「 =100且!=1」 ，其余不变，置灰不可编辑"
    },
    {
      "action": "点击下一步按钮",
      "expected": "监控规则配置完成；\n进入「调度属性」页面"
    },
    {
      "action": "配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果",
      "expected": "规则保存成功"
    },
    {
      "action": "临时运行规则，进入校验结果查询页面",
      "expected": "显示实例中子规则一运行通过，子规则二运行不通过"
    }
  ]
} as const;

test.describe("验证「监控规则」-「合理性校验」-「多表字段值对比」编辑功能", () => {
  test("C0556 验证「监控规则」-「合理性校验」-「多表字段值对比」编辑功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
