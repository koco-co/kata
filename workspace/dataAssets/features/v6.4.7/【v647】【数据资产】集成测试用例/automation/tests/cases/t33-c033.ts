// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C033",
  "title": "验证单表校验-【唯一性校验】结果正确",
  "steps": [
    {
      "action": "新建单表规则，选择 doris_demo_data_types_source；规则类型选择\"唯一性校验\"，选择字段 user_id，分别创建重复数、重复率、非重复个数、非重复占比子规则，配置阈值使校验通过（如重复数固定值 ≤ 0，非重复个数固定值 = 3）",
      "expected": "规则创建成功，子规则数量为 4"
    },
    {
      "action": "点击【立即运行】，等待实例完成，查看运行结果",
      "expected": "质量实例状态\"运行成功\"；4 条子规则结果均显示\"校验通过\"；实际值：重复数=0、重复率=0%、非重复个数=3、非重复占比=100%"
    },
    {
      "action": "编辑规则，将阈值修改为使所有子规则校验不通过（如非重复个数固定值 ≥ 100）",
      "expected": "编辑保存成功，规则配置页面显示已更新阈值"
    },
    {
      "action": "再次点击【立即运行】，等待实例完成，查看运行结果",
      "expected": "质量实例状态\"运行成功\"；4 条子规则结果均显示\"校验不通过\""
    }
  ]
} as const;

test.describe("验证单表校验-【唯一性校验】结果正确", () => {
  test("C033 验证单表校验-【唯一性校验】结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
