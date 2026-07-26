// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C978",
  "title": "验证「有效性-枚举值」校验不通过时，质量报告文案优化正确",
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
      "action": "「监控规则」新增「有效性校验」「字段」选择「score」「统计函数」选择「枚举值」「期望值」为「100,101,102」「过滤条件」设置为「id != 100」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」",
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
      "expected": "明细数据预览正确"
    },
    {
      "action": "进入【数据质量报告】页面查看报告详情信息",
      "expected": "规则校验不通过说明为\"字段枚举值存在约定范围外的值，约定范围外的值的数量总计为2个，不符合规则\"枚举值包含xx\"\""
    }
  ]
} as const;

test.describe("验证「有效性-枚举值」校验不通过时，质量报告文案优化正确", () => {
  test("C978 验证「有效性-枚举值」校验不通过时，质量报告文案优化正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
