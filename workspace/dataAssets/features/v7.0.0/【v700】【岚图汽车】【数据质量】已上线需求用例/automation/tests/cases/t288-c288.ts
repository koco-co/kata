// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C288",
  "title": "验证「多表唯一性」明细数据-多字段联合查询「重复数」统计正确",
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
      "action": "「监控规则」新增「唯一性校验」「字段」选择「id」「sex」「统计函数」选择「多表唯一性校验」「过滤条件」设置为「id<100」「校验字段逻辑」选择「唯一」「和其他表的校验关系」选择为「且」「对比表」选择「table2」-「sex」「score」字段「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成"
    },
    {
      "action": "配置「调度属性」，保存规则",
      "expected": "规则保存成功"
    },
    {
      "action": "临时运行规则",
      "expected": "规则校验失败"
    },
    {
      "action": "进入「校验结果查询」页面，查看任务实例详情-明细数据",
      "expected": "明细数据内新增字段重复数统计字段"
    },
    {
      "action": "校验字段统计数量数值正确",
      "expected": "table1-id,sex重复值为0，table2-sex,score重复值为2"
    }
  ]
} as const;

test.describe("验证「多表唯一性」明细数据-多字段联合查询「重复数」统计正确", () => {
  test("C288 验证「多表唯一性」明细数据-多字段联合查询「重复数」统计正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
