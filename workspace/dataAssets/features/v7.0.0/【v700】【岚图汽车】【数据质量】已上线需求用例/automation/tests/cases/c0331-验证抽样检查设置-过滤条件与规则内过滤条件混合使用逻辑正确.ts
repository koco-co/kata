// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0331",
  "title": "验证「抽样检查设置」-「过滤条件」与规则内「过滤条件」混合使用逻辑正确",
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
      "action": "选择「选项配置」 age < =12",
      "expected": "过滤条件配置成功"
    },
    {
      "action": "「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功"
    },
    {
      "action": "「监控规则」新增「完整性校验」「字段」选择「score」「统计函数」选择「表行数」「期望值」为「=2」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成"
    },
    {
      "action": "配置「调度属性」，保存规则",
      "expected": "规则保存成功"
    },
    {
      "action": "立即运行规则",
      "expected": "规则校验通过2 = 2"
    },
    {
      "action": "编辑规则，配置子规则「过滤条件」设置为「id<2」",
      "expected": "配置成功"
    },
    {
      "action": "保存并运行规则",
      "expected": "规则校验不通过(1 != 2)"
    }
  ]
} as const;

test.describe("验证「抽样检查设置」-「过滤条件」与规则内「过滤条件」混合使用逻辑正确", () => {
  test("C0331 验证「抽样检查设置」-「过滤条件」与规则内「过滤条件」混合使用逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
