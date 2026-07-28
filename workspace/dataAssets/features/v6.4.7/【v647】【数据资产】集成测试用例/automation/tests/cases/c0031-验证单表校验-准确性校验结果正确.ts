// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0031",
  "title": "验证单表校验-【准确性校验】结果正确",
  "steps": [
    {
      "action": "新建单表规则，选择 doris_demo_data_types_source 表；规则类型选择\"准确性校验\"，选择字段 age，分别创建求和、求平均、负值比、零值比、正值比子规则，配置阈值使校验通过（如求和固定值 ≤ 100，正值比 ≥ 100%）",
      "expected": "规则创建成功，子规则数量为 5"
    },
    {
      "action": "点击【立即运行】，等待实例完成，查看运行结果",
      "expected": "质量实例状态\"运行成功\"；各子规则结果显示\"校验通过\"；实际值：age 求和=77、求平均=25.67、负值比=0%、零值比=0%、正值比=100%"
    },
    {
      "action": "编辑规则，将阈值修改为使所有子规则校验不通过（如正值比固定值 ≥ 200%）",
      "expected": "编辑保存成功，规则配置显示已更新阈值"
    },
    {
      "action": "再次点击【立即运行】，等待实例完成，查看运行结果",
      "expected": "质量实例状态\"运行成功\"；5 条子规则结果均显示\"校验不通过\""
    }
  ]
} as const;

test.describe("验证单表校验-【准确性校验】结果正确", () => {
  test("C0031 验证单表校验-【准确性校验】结果正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
