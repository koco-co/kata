// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C283",
  "title": "验证「规则配置」-「临时保存」功能异常逻辑正确",
  "steps": [
    {
      "action": "进入「资产」-「数据质量」页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「规则任务管理」按钮",
      "expected": "进入「新建监控规则」页面"
    },
    {
      "action": "点击「新建监控规则」按钮",
      "expected": "进入「监控对象」配置页"
    },
    {
      "action": "「规则名称」 输入 \"test\"「选择数据源」 选择 ${datasource}「选择数据库」选择${database}「选择数据表」选择${table}点击「下一步」按钮",
      "expected": "「监控对象」配置完成，跳转到「监控规则配置」页面"
    },
    {
      "action": "「监控规则配置」页面添加校验规则如下「完整性校验」-「规则类型」选择「字段级」「字段」 选择 「id」「统计函数」选择「空值数」「校验方法」选择「固定值」「期望值」选择「<=0」「强弱规则」选择「弱规则」「规则描述」输入「test」",
      "expected": "「监控规则」-「完整性校验规则」配置完成"
    },
    {
      "action": "点击「临时保存」按钮",
      "expected": "提示\"临时保存出错，跳转到其他页面会丢失已配置数据，请确认是否退出新建规则操作\""
    },
    {
      "action": "继续跳转其他页面",
      "expected": "内容不保存"
    }
  ]
} as const;

test.describe("验证「规则配置」-「临时保存」功能异常逻辑正确", () => {
  test("C283 验证「规则配置」-「临时保存」功能异常逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
