// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0030",
  "title": "验证单表校验-【完整性校验-字段级-单字段】结果正确",
  "steps": [
    {
      "action": "新建单表规则，选择 doris_test 表；规则类型选择\"完整性校验-字段级\"，选择字段 name，分别创建空值数、空值率、空串数、空串率子规则，配置阈值使校验通过（如空值数固定值 ≤ 0）",
      "expected": "规则创建成功，规则列表显示新增规则行；子规则数量为 4"
    },
    {
      "action": "点击【立即运行】，等待实例完成，查看运行结果",
      "expected": "质量实例状态为\"运行成功\"；4 条子规则结果均显示\"校验通过\"；实际值：空值数=0、空值率=0%、空串数=0、空串率=0%"
    },
    {
      "action": "编辑规则，将阈值修改为使所有子规则校验不通过（如空值数固定值 ≥ 1）",
      "expected": "编辑保存成功，规则配置显示已更新阈值"
    },
    {
      "action": "再次点击【立即运行】，等待实例完成，查看运行结果",
      "expected": "质量实例状态为\"运行成功\"；4 条子规则结果均显示\"校验不通过\"；告警/异常标记可见"
    }
  ]
} as const;

test.describe("验证单表校验-【完整性校验-字段级-单字段】结果正确", () => {
  test("C0030 验证单表校验-【完整性校验-字段级-单字段】结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
