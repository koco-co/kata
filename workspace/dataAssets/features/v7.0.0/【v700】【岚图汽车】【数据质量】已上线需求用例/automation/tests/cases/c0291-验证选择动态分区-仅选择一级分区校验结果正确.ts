// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0291",
  "title": "验证「选择动态分区」-仅选择一级分区校验结果正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「选择动态分区」，一级分区选择「dt」，一级分区值选择「参数1」（2025-11-20），不选择二级分区",
      "expected": "一级分区数据选择成功"
    },
    {
      "action": "点击「数据预览」",
      "expected": "展示所有数据(需要确认是否合理)"
    },
    {
      "action": "「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功"
    },
    {
      "action": "「监控规则」新增「有效性校验」「字段」选择「age」「统计函数」选择「数值取值范围」「期望值」为「age <= 21」「过滤条件」设置为「id != 100」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成"
    },
    {
      "action": "配置「调度属性」，保存规则",
      "expected": "规则保存成功"
    },
    {
      "action": "立即运行规则，查看规则运行结果",
      "expected": "规则校验不通过"
    },
    {
      "action": "进入任务实例页面查看规则明细数据",
      "expected": "id 为2的那条数据被校验出来，age = 22，不符合期望值age<=21"
    }
  ]
} as const;

test.describe("验证「选择动态分区」-仅选择一级分区校验结果正确", () => {
  test("C0291 验证「选择动态分区」-仅选择一级分区校验结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
