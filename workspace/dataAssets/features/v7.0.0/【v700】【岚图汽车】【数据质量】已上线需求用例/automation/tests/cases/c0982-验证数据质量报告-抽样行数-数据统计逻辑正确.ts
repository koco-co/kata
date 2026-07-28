// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0982",
  "title": "验证「数据质量报告」-「抽样行数」-数据统计逻辑正确",
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
      "action": "「百分比」输入「80%」,点击下一步",
      "expected": "配置成功"
    },
    {
      "action": "「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」「分区」选择「${业务日期_当天}」",
      "expected": "监控对象配置成功"
    },
    {
      "action": "「监控规则」新增「完整性校验」「字段」选择「score」「统计函数」选择「表行数」「期望值」为「<=4」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成"
    },
    {
      "action": "配置「调度属性」-「报告数据周期」选择为「3天前」（3-0）保存规则",
      "expected": "规则保存成功"
    },
    {
      "action": "立即运行规则",
      "expected": "规则校验成功(4=4)"
    },
    {
      "action": "运行3天，查看质量报告「抽样行数」统计",
      "expected": "数量为12条(每个分区5条，抽样后4条，运行3天所以12条)"
    }
  ]
} as const;

test.describe("验证「数据质量报告」-「抽样行数」-数据统计逻辑正确", () => {
  test("C0982 验证「数据质量报告」-「抽样行数」-数据统计逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
