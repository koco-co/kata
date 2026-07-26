// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C040",
  "title": "验证「设置默认监控数据源库」功能正确",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「设置默认监控数据源库」按钮",
      "expected": "弹【设置默认监控源库】弹窗"
    },
    {
      "action": "UI CHECK",
      "expected": "展示「默认监控数据源」「默认监控数据库」「取消」「确定」按钮"
    },
    {
      "action": "点击「默认监控数据源」",
      "expected": "仅展示平台引入且已授权给当前项目的数据源"
    },
    {
      "action": "点击「默认监控数据库」",
      "expected": "仅展示「默认监控数据源」下的数据库"
    },
    {
      "action": "选择「默认监控数据源」「默认监控数据库」，点击「确定」按钮",
      "expected": "配置成功，弹窗关闭，创建规则时，自动带入已配置的默认源库"
    },
    {
      "action": "再次点击「设置默认监控数据源库」按钮",
      "expected": "已配置的源库回显正确"
    },
    {
      "action": "编辑默认选择的源库，确认修改",
      "expected": "修改成功，创建规则时，自动引入的默认源库更新正确"
    }
  ]
} as const;

test.describe("验证「设置默认监控数据源库」功能正确", () => {
  test("C040 验证「设置默认监控数据源库」功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
