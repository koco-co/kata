// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C332",
  "title": "验证「抽样检查设置」-「过滤条件设置」-「手动配置」功能正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "开启「抽样检查配置」，仅勾选「过滤条件设置」",
      "expected": "开启配置成功"
    },
    {
      "action": "选择「手动配置」 age < =12",
      "expected": "过滤条件配置成功"
    },
    {
      "action": "「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功"
    },
    {
      "action": "「监控规则」新增「完整性校验」「字段」选择「score」「统计函数」选择「表行数」「期望值」为「=2」「过滤条件」设置为「age<=13」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成"
    },
    {
      "action": "配置「调度属性」，保存规则",
      "expected": "规则保存成功"
    },
    {
      "action": "立即运行规则",
      "expected": "规则校验成功(2=2)（抽样检查设置优先级高于规则内配置）"
    }
  ]
} as const;

test.describe("验证「抽样检查设置」-「过滤条件设置」-「手动配置」功能正确", () => {
  test("C332 验证「抽样检查设置」-「过滤条件设置」-「手动配置」功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
