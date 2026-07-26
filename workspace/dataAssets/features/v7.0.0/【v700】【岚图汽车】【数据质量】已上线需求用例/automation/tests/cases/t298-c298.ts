// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C298",
  "title": "验证「手动输入分区」支持输入「多级分区」功能正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「手动输入分区」，输入「dt='2025-11-21',hour='14'」",
      "expected": "手动输入分区成功"
    },
    {
      "action": "点击数据预览",
      "expected": "数据预览功能正确"
    },
    {
      "action": "「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功"
    },
    {
      "action": "「监控规则」新增「有效性校验」「字段」选择「age」「统计函数」选择「数值取值范围」「期望值」为「age = 21」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」",
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
      "action": "进入「校验结果查询」页面查看任务实例明细数据",
      "expected": "二级分区下的age字段23 != 21"
    }
  ]
} as const;

test.describe("验证「手动输入分区」支持输入「多级分区」功能正确", () => {
  test("C298 验证「手动输入分区」支持输入「多级分区」功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
