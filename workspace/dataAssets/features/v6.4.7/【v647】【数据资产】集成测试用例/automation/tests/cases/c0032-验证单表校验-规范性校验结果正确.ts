// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0032",
  "title": "验证单表校验-【规范性校验】结果正确",
  "steps": [
    {
      "action": "新建单表规则，选择 doris_demo_data_types_source；规则类型选择\"规范性校验\"，针对相应字段分别创建取值范围、枚举范围、枚举个数、身份证号、手机号、邮箱、最大长度、最小长度、字符串长度、数据精度、空值数、重复数、枚举值子规则，配置阈值使所有校验通过",
      "expected": "规则创建成功，子规则数量与配置项数量一致（13 条）"
    },
    {
      "action": "点击【立即运行】，等待实例完成，查看运行结果",
      "expected": "质量实例状态\"运行成功\"；13 条子规则结果均显示\"校验通过\""
    },
    {
      "action": "编辑规则，修改阈值使所有子规则校验不通过（如取值范围调整为不可能的区间）",
      "expected": "编辑保存成功，规则配置页面显示已修改阈值"
    },
    {
      "action": "再次点击【立即运行】，等待实例完成，查看运行结果",
      "expected": "质量实例状态\"运行成功\"；13 条子规则结果均显示\"校验不通过\""
    }
  ]
} as const;

test.describe("验证单表校验-【规范性校验】结果正确", () => {
  test("C0032 验证单表校验-【规范性校验】结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
