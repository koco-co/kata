// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0403",
  "title": "验证「监控规则」-「时效性校验」-「单字段时间差校验」任务质量报告正确",
  "steps": [
    {
      "action": "进入「资产-【数据资产】-【数据质量】-【规则任务管理】-监控对象」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "「规则名称」输入「test_rule」\n「选择数据源」选择「${DATASOURCE}」\n「选择数据库」选择「${DATABASE}」\n「选择数据表」选择「${TABLE}」",
      "expected": "监控对象配置成功；\n进入「监控规则」配置页"
    },
    {
      "action": "「监控规则」配置如下：\n「监控规则」新增「时效性校验」\n「字段」选择为「order_date」\n「统计函数」选择「周期性校验（单字段时间差校验）」\n「过滤条件」设置为「id<100」\n「选择排序字段」为「order_date」\n「时间差」选择为「<=1秒」\n「强弱规则」选择「弱规则」\n「规则描述」输入「测试规则」",
      "expected": "监控规则配置完成；\n进入「调度属性」页面"
    },
    {
      "action": "配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果",
      "expected": "规则保存成功"
    },
    {
      "action": "临时运行规则，查看质量报告",
      "expected": "页面包含：\n1）报告进入目录\n2）质量评估汇总（任务名）区域，（数据源、数据库、检测数据范围、表行数、抽样行数、字段数、校验规则数、校验通过率）\n3）规则校验明细，（规则类型-时效性校验、规则名称、字段名称、字段类型、质验结果、未通过原因、详情说明、操作）"
    }
  ]
} as const;

test.describe("验证「监控规则」-「时效性校验」-「单字段时间差校验」任务质量报告正确", () => {
  test("C0403 验证「监控规则」-「时效性校验」-「单字段时间差校验」任务质量报告正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
