// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C026",
  "title": "验证「完整性校验」校验通过质量报告正确",
  "steps": [
    {
      "action": "进入「资产-数据质量-数据质量报告」页面",
      "expected": "页面正常打开，显示报告名称为“test_info_1_可合并完整性规则”的报告"
    },
    {
      "action": "选中该报告，点击“查看报告-报告详情”",
      "expected": "进入该报告的详情页"
    },
    {
      "action": "查看质量报告详情展示",
      "expected": "从上到下依次为： 1）质量评估汇总（test_info_1_可合并完整性规则）：表名-test_info_1；数据源-「${DATASOURCE}」；数据库：「${DATABASE}」 ；检测数据范围-“设置的分区”；表行数-“6”；抽样行数-“--”；字段数-“8”；车辆数-“--”；校验规则数-“4”；校验通过率-“100%” 2）车辆信息汇总：车系、车型（可筛选）、动力类型、车辆数、表中包含车辆数、车辆总数、表中包含总车辆数 3）规则校验明细：规则类型（可筛选）-“完整性校验”；规则名称（可搜索）-已配置的子规则；字段名称（可搜索）-已配置的字段；字段类型（可搜索）-字段对应的类型；质检结果（可筛选）-校验通过；未通过原因-“--”；详情说明-xxxx，符合规则“xxx”；最近一次校验结束时间-xxxx-xx-xx xx:xx:xx；操作-“--”"
    }
  ]
} as const;

test.describe("验证「完整性校验」校验通过质量报告正确", () => {
  test("C026 验证「完整性校验」校验通过质量报告正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
