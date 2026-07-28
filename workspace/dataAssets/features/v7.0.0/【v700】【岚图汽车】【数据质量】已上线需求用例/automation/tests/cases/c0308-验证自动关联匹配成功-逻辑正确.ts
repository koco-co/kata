// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0308",
  "title": "验证「自动关联」匹配成功-逻辑正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」页面",
      "expected": "进入成功"
    },
    {
      "action": "「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功"
    },
    {
      "action": "「监控规则」新增「有效性校验」「字段」选择「age」「统计函数」选择「数值取值范围」「期望值」为「age <=100 」「过滤条件」设置为「id != 100」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成"
    },
    {
      "action": "点击下一步，进入「调度属性」配置页面",
      "expected": "进入成功"
    },
    {
      "action": "「任务关联」处点击「自动关联」按钮",
      "expected": "成功匹配出离线任务table_test"
    },
    {
      "action": "保存规则",
      "expected": "规则保存成功"
    },
    {
      "action": "进入离线平台，对离线任务及下游进行补数据操作，查看结果",
      "expected": "离线任务运行后，质量规则任务也成功运行"
    }
  ]
} as const;

test.describe("验证「自动关联」匹配成功-逻辑正确", () => {
  test("C0308 验证「自动关联」匹配成功-逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
