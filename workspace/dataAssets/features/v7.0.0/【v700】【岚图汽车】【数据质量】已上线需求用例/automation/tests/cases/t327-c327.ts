// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C327",
  "title": "验证「抽样检查设置」-配置联合生效功能正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "开启「抽样检查配置」，勾选「字段内容去重设置」「过滤条件设置」「抽样设置」",
      "expected": "开启配置成功"
    },
    {
      "action": "「字段内容去重设置」配置为「age、score」「过滤条件设置」配置为「手动配置」「age >= 20」「抽样设置」配置为「百分比配置」「12.55%」",
      "expected": "配置成功"
    },
    {
      "action": "「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功"
    },
    {
      "action": "「监控规则」新增「完整性校验」「字段」选择「score」「统计函数」选择「表行数」「期望值」为「<=10」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成"
    },
    {
      "action": "配置「调度属性」，保存规则",
      "expected": "规则保存成功"
    },
    {
      "action": "立即运行规则",
      "expected": "规则校验成功(10/9<=10)(结合子规则中的条件过滤，可能为10也可能为9)"
    }
  ]
} as const;

test.describe("验证「抽样检查设置」-配置联合生效功能正确", () => {
  test("C327 验证「抽样检查设置」-配置联合生效功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
