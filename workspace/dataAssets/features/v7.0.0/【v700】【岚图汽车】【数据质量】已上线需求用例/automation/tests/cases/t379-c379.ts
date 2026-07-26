// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C379",
  "title": "验证不限制「超时时间」功能正确",
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
      "action": "正确配置「监控规则」，进入「调度属性」配置页",
      "expected": "页面正常打开"
    },
    {
      "action": "正确配置「调度属性」，「超时时间」选择「不限制」，保存规则，且「调度属性」中配置「规则报告」为最新结果",
      "expected": "规则保存成功"
    },
    {
      "action": "临时运行规则，查看实例详情及质量报告",
      "expected": "生成正确实例详情，质量报告展示正确"
    }
  ]
} as const;

test.describe("验证不限制「超时时间」功能正确", () => {
  test("C379 验证不限制「超时时间」功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
