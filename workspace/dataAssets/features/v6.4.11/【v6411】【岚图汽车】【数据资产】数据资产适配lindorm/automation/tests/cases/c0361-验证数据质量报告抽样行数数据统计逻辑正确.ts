// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0361",
  "title": "验证【数据质量报告】抽样行数数据统计逻辑正确",
  "steps": [
    {
      "action": "准备抽样任务报告依赖:\n- 数据表: ${SchemaA}.dwd_vehicle_quality_di\n- 规则任务: 车辆质量抽样校验任务\n- 抽样检查: 开启\n- 抽样方式: 按行数抽样\n- 抽样行数: 10\n- 报告名称: 车辆质量抽样检查日报\n- 报告状态: 已生成",
      "expected": "1)规则任务执行完成\n2)任务实例详情展示抽样检查配置\n3)报告「车辆质量抽样检查日报」生成成功"
    },
    {
      "action": "进入【数据质量 → 数据质量报告 → 已生成报告】，查询「车辆质量抽样检查日报」并点击「报告详情」",
      "expected": "1)进入报告详情页\n2)质量评估汇总展示目标任务"
    },
    {
      "action": "查看质量评估汇总中的表行数、抽样行数和规则校验明细统计",
      "expected": "1)抽样行数展示为10\n2)规则结果统计基于抽样数据\n3)报告中的校验通过率、校验规则数与任务实例一致"
    }
  ]
} as const;

test.describe("验证【数据质量报告】抽样行数数据统计逻辑正确", () => {
  test("C0361 验证【数据质量报告】抽样行数数据统计逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
