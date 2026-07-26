// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C313",
  "title": "验证「持续生成中报告」查看下载功能正确",
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
      "action": "「调度属性」配置如下：「调度周期」选择「小时」「生效日期」为「2025-11-20～2025-11-22」「间隔时间」为 「1小时」「开始时间-结束时间」为「00:00:00～00:00:00」「规则拼接包」为「1」「资源组」选择「default」保存规则",
      "expected": "规则保存成功"
    },
    {
      "action": "第二天10:00，进入质量报告页面查看报告",
      "expected": "报告状态展示为「持续生成中」"
    },
    {
      "action": "进入详情查看",
      "expected": "校验结果已输出0～10点的校验结果"
    },
    {
      "action": "下载报告",
      "expected": "报告下载成功，内容展示正确"
    }
  ]
} as const;

test.describe("验证「持续生成中报告」查看下载功能正确", () => {
  test("C313 验证「持续生成中报告」查看下载功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
