// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0035",
  "title": "验证「校验规则配置」页面-新增「校验类型」配置项",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "进入成功"
    },
    {
      "action": "配置「数据源」「数据库」「数据表」等信息，选择【完整性校验】规则",
      "expected": "选择成功，展示【完整性校验】规则配置项"
    },
    {
      "action": "UI CHECK",
      "expected": "展示「校验类型」「字段」「统计函数」「过滤条件」「校验方法」「期望值」「强弱规则」「规则描述」「保存」「取消」按钮"
    }
  ]
} as const;

test.describe("验证「校验规则配置」页面-新增「校验类型」配置项", () => {
  test("C0035 验证「校验规则配置」页面-新增「校验类型」配置项", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
