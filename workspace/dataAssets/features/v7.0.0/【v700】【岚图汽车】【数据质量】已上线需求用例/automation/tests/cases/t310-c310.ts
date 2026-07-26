// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C310",
  "title": "验证「持续生成中报告」异常情况",
  "steps": [
    {
      "action": "进入「数据质量」-「规则任务管理」-「监控对象」页面",
      "expected": "进入成功"
    },
    {
      "action": "「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功"
    },
    {
      "action": "「监控规则」新增「有效性校验」「字段」选择「score」「统计函数」选择「数值取值范围」「期望值」为「score > 150」「过滤条件」设置为「id != 1」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成"
    },
    {
      "action": "「调度属性」配置如下：「调度周期」选择「小时」「生效日期」为「2025-11-20～2025-11-20」「间隔时间」为 「1小时」「开始时间-结束时间」为「00:00:00～15:00:00」「规则拼接包」为「1」「资源组」选择「default」保存规则",
      "expected": "规则保存成功"
    },
    {
      "action": "第二天10：00查看任务运行状态",
      "expected": "报告状态展示为「持续生成中」"
    },
    {
      "action": "12:00中途服务异常，然后14:00服务恢复",
      "expected": "服务恢复健康"
    },
    {
      "action": "查看报告详情",
      "expected": "报告正常展示，仍然持续更新实例运行结果(不影响)"
    }
  ]
} as const;

test.describe("验证「持续生成中报告」异常情况", () => {
  test("C310 验证「持续生成中报告」异常情况", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
