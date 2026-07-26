// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C608",
  "title": "验证「监控规则」-「合理性校验」-「字段值计算对比」-「计算结果值判断」校验不通过功能",
  "steps": [
    {
      "action": "进入「资产-数据质量-规则集管理-基础信息」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "「选择数据源」选择「${DATASOURCE}」\n「选择数据库」选择「${DATABASE}」\n「选择数据表」选择「${TABLE}」\n「规则包名称」填写「合理性-字段值计算对比」",
      "expected": "基础信息配置成功；\n进入「监控规则」配置页"
    },
    {
      "action": "点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】",
      "expected": "选择成功，页面显示「合理性校验」规则配置区域"
    },
    {
      "action": "「监控规则」配置如下：\n「字段」：「 field_int 」\n「统计函数」：「 字段值计算对比」\n「计算逻辑配置」：「field_smallint/field_tinyint」\n「对比方法」：「计算结果值判断」\n「结果值」：「<100且=100」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成"
    },
    {
      "action": "点击【保存】按钮",
      "expected": "规则保存成功"
    },
    {
      "action": "进入「规则任务管理-监控对象」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "「规则名称」输入「test_rule」\n「选择数据源」选择「${DATASOURCE}」\n「选择数据库」选择「${DATABASE}」\n「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功；\n进入「监控规则」配置页"
    },
    {
      "action": "引入规则包「合理性-字段值计算对比」，点击「下一步」按钮",
      "expected": "引入正确，规则内容置灰，进入「调度属性」"
    },
    {
      "action": "配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果",
      "expected": "规则保存成功"
    },
    {
      "action": "临时运行规则，查看实例详情",
      "expected": "实例运行结果不通过，且实例详情展示正确"
    }
  ]
} as const;

test.describe("验证「监控规则」-「合理性校验」-「字段值计算对比」-「计算结果值判断」校验不通过功能", () => {
  test("C608 验证「监控规则」-「合理性校验」-「字段值计算对比」-「计算结果值判断」校验不通过功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
