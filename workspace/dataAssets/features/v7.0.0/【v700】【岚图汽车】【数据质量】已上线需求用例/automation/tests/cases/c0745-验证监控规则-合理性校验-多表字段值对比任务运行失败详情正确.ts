// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0745",
  "title": "验证「监控规则」-「合理性校验」-「多表字段值对比」任务运行失败详情正确",
  "steps": [
    {
      "action": "进入「资产-【数据资产】-【数据质量】-【校验结果查询】」页面",
      "expected": "页面正常打开，页面显示「test_rule3」相关任务，校验结果为\"运行失败\""
    },
    {
      "action": "点击「test_rule3」任务表名称",
      "expected": "抽屉展开结果详情"
    },
    {
      "action": "查看详情",
      "expected": "页面包含：\n任务名称、监控报告tab、表级报告tab、「查看日志」按钮"
    },
    {
      "action": "点击【监控报告】tab",
      "expected": "包含「合理性校验」-「多表字段值计算对比」-「计算结果对比」配置的详情：\n「字段」：「 field_date 」\n「统计函数」：「 多表字段值对比」\n「过滤条件」：「 --」\n「校验表主键」：「id」\n「关联表1」：「 B」，\n「关联表1主键」：「 id」\n「对比方法」：「计算结果对比」\n「计算逻辑」：「A.field_date +B.field_date =（A.field_date +B.field_date ）*B.field_date 」 「强弱规则」：「弱规则」\n「规则描述」：「测试规则」"
    },
    {
      "action": "点击「查看日志」按钮",
      "expected": "支持查看运行失败的日志"
    }
  ]
} as const;

test.describe("验证「监控规则」-「合理性校验」-「多表字段值对比」任务运行失败详情正确", () => {
  test("C0745 验证「监控规则」-「合理性校验」-「多表字段值对比」任务运行失败详情正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
