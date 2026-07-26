// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C928",
  "title": "验证「报告配置」-「无需生成报告」按钮功能校验",
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
      "action": "配置「数据源」「数据库」「数据表」，选择【完整性校验】规则",
      "expected": "选择成功，展示【完整性校验】规则配置项"
    },
    {
      "action": "【完整性校验】规则均配置",
      "expected": "配置完成"
    },
    {
      "action": "点击「下一步」",
      "expected": "进入【调度配置】页面，默认不勾选「无需生成报告」"
    },
    {
      "action": "「调度配置」-「报告配置」点击勾选「无需生成报告」按钮",
      "expected": "「报告配置」模块隐藏所有配置项"
    },
    {
      "action": "「调度配置」-「报告配置」取消勾选「无需生成报告」按钮",
      "expected": "「正确展示「报告配置」模块所有配置项"
    }
  ]
} as const;

test.describe("验证「报告配置」-「无需生成报告」按钮功能校验", () => {
  test("C928 验证「报告配置」-「无需生成报告」按钮功能校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
