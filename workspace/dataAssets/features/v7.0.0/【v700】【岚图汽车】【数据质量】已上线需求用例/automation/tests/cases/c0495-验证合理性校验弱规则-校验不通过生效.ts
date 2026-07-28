// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0495",
  "title": "验证合理性校验弱规则-校验不通过生效",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功"
    },
    {
      "action": "添加「合理性校验」规则，规则填写：「字段」选择「int_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存",
      "expected": "规则集保存成功"
    },
    {
      "action": "添加「合理性校验」规则，规则填写：「字段」选择「double_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存",
      "expected": "规则集保存成功"
    },
    {
      "action": "「调度属性」配置如下：「调度周期」选择「自动关联离线任务」「规则拼接包」为「1」，「资源组」选择「default」，关联离线任务「test」保存规则",
      "expected": "规则保存成功"
    },
    {
      "action": "进入「租户A」-「离线开发」-「项目A」-「运维中心」，对任务test「补当前任务及下游」，查看结果",
      "expected": "质量任务校验不通过，离线任务运行成功"
    }
  ]
} as const;

test.describe("验证合理性校验弱规则-校验不通过生效", () => {
  test("C0495 验证合理性校验弱规则-校验不通过生效", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
