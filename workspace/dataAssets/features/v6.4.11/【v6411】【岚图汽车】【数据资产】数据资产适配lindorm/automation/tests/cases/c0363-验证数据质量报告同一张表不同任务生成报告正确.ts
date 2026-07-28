// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0363",
  "title": "验证【数据质量报告】同一张表不同任务生成报告正确",
  "steps": [
    {
      "action": "准备同一张表不同任务:\n- 数据表: ${SchemaA}.dwd_vehicle_order_di\n- 任务1: 车辆订单完整性任务，规则包: 完整性规则包，报告名称: 车辆订单完整性任务数据质量报告\n- 任务2: 车辆订单唯一性任务，规则包: 唯一性规则包，报告名称: 车辆订单唯一性任务数据质量报告\n- 两个任务均配置「调度周期: 手动触发」「实例生成方式: 立即生成」并执行完成",
      "expected": "1)同一张表下两个任务均保存成功\n2)两个任务名称不同、规则不同\n3)校验结果查询可分别查询到两个任务最新实例"
    },
    {
      "action": "进入【数据质量 → 数据质量报告】，在「已配置报告」中新增或确认报告「车辆订单多任务质量报告」:\n- 报告类型: 单表报告\n- 关联数据表: ${SchemaA}.dwd_vehicle_order_di\n- 选择任务: 车辆订单完整性任务、车辆订单唯一性任务\n- 生成样式: 质检式\n- 规则范围: 全部",
      "expected": "1)报告保存成功\n2)报告配置中的选择任务包含两个任务\n3)已配置报告列表展示该报告"
    },
    {
      "action": "运行两个规则任务后进入「已生成报告」，打开「车辆订单多任务质量报告」的「报告详情」",
      "expected": "1)报告详情按任务展示质量评估汇总\n2)同时展示「车辆订单完整性任务」和「车辆订单唯一性任务」结果\n3)不同任务的规则校验明细互不覆盖"
    }
  ]
} as const;

test.describe("验证【数据质量报告】同一张表不同任务生成报告正确", () => {
  test("C0363 验证【数据质量报告】同一张表不同任务生成报告正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
