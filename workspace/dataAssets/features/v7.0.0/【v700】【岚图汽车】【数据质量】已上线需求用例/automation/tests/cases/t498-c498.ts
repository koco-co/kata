// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C498",
  "title": "验证合理性校验-单调递减实例详情正确",
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
      "action": "添加「合理性校验」规则，规则填写：「字段」选择「int_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存",
      "expected": "规则集保存成功"
    },
    {
      "action": "「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则",
      "expected": "规则保存成功"
    },
    {
      "action": "立即运行，查看实例详情",
      "expected": "合理性校验展示：「字段」：「int_col」，「统计函数」：「数据变化趋势」，「过滤条件」：「id<100」「排序字段」：「id」，「校验方法」：「单调递减」，「强弱规则」：「弱规则」，「规则描述」：「合理性校验测试」"
    }
  ]
} as const;

test.describe("验证合理性校验-单调递减实例详情正确", () => {
  test("C498 验证合理性校验-单调递减实例详情正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
