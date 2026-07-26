// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C924",
  "title": "验证「报告配置」-「报告周期」选择框功能校验",
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
      "expected": "进入【调度配置】页面"
    },
    {
      "action": "查看「报告配置」-「报告周期」",
      "expected": "默认选择「月」"
    },
    {
      "action": "「报告周期」选择「月」\n「生效日期」 选择 「2025-07-01 ~ 2025-12-31」\n「选择时间」 选择 「每月xx号（根据实际测试日期来）」\n「具体时间」 选择 「xx 时 xx分（根据实际测试时间来）」",
      "expected": "月维度报告配置完成"
    },
    {
      "action": "「报告周期」选择「天」\n「生效日期」 选择 「2025-07-01 ~ 2025-12-31」\n「具体时间」 选择 「xx 时 xx分（根据实际测试时间来）」",
      "expected": "天维度报告配置完成"
    },
    {
      "action": "「报告周期」选择「周」\n「生效日期」 选择 「2025-07-01 ~ 2025-12-31」\n「选择时间」 选择 「每周星期x（根据实际测试日期来）」\n「具体时间」 选择 「xx 时 xx分（根据实际测试时间来）」",
      "expected": "周维度报告配置完成"
    },
    {
      "action": "「报告周期」选择「自定义」",
      "expected": "自定义报告配置完成"
    }
  ]
} as const;

test.describe("验证「报告配置」-「报告周期」选择框功能校验", () => {
  test("C924 验证「报告配置」-「报告周期」选择框功能校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
