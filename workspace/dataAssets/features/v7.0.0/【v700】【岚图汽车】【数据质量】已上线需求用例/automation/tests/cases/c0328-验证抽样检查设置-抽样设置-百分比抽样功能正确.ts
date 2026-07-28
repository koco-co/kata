// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0328",
  "title": "验证「抽样检查设置」-「抽样设置」-「百分比抽样」功能正确",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "开启「抽样检查配置」，仅勾选「抽样设置」-「百分比抽样」",
      "expected": "开启配置成功"
    },
    {
      "action": "「绝对数抽样」输入「10%」,点击下一步",
      "expected": "配置成功"
    },
    {
      "action": "「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功"
    },
    {
      "action": "「监控规则」新增「完整性校验」「字段」选择「score」「统计函数」选择「表行数」「期望值」为「=1」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成"
    },
    {
      "action": "配置「调度属性」，保存规则",
      "expected": "规则保存成功"
    },
    {
      "action": "立即运行规则",
      "expected": "规则校验成功(1=1)(0.5条四舍五入统计为1条)"
    },
    {
      "action": "编辑规则，配置规则「百分比抽样」设置为「45%」",
      "expected": "配置成功"
    },
    {
      "action": "保存并运行规则",
      "expected": "规则校验失败(2 != 1)(2.25四舍五入到2)"
    }
  ]
} as const;

test.describe("验证「抽样检查设置」-「抽样设置」-「百分比抽样」功能正确", () => {
  test("C0328 验证「抽样检查设置」-「抽样设置」-「百分比抽样」功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
