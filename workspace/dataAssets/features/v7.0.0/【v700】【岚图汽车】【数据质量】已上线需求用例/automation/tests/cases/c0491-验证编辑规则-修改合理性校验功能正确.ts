// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0491",
  "title": "验证编辑规则-修改合理性校验功能正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "编辑规则「test_rule」",
      "expected": "进入编辑页面"
    },
    {
      "action": "修改「合理性校验」规则，规则填写：「字段」选择「int_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存",
      "expected": "规则集保存成功"
    },
    {
      "action": "「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则",
      "expected": "规则保存成功"
    },
    {
      "action": "立即运行",
      "expected": "运行成功"
    },
    {
      "action": "查看结果",
      "expected": "校验不通过"
    },
    {
      "action": "查看明细",
      "expected": "明细正确"
    }
  ]
} as const;

test.describe("验证编辑规则-修改合理性校验功能正确", () => {
  test("C0491 验证编辑规则-修改合理性校验功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
