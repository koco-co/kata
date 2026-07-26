// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C364",
  "title": "验证【数据质量报告】同一张表不同任务脏数据明细正确",
  "steps": [
    {
      "action": "准备同一张表不同任务的脏数据:\n- 数据表: ${SchemaA}.dwd_vehicle_order_di\n- 任务1「车辆订单完整性任务」产生完整性脏数据: order_id 为空、vin 为空\n- 任务2「车辆订单唯一性任务」产生唯一性脏数据: vin=LTV202603290001AA 重复2条\n- 两个任务均已执行完成且结果为「校验不通过」\n- 报告「车辆订单多任务质量报告」已生成",
      "expected": "1)两个任务的校验不通过实例均存在\n2)两个任务均有可查看明细\n3)报告详情可按任务区分脏数据明细"
    },
    {
      "action": "进入【数据质量 → 数据质量报告 → 已生成报告】，打开「车辆订单多任务质量报告」的「报告详情」",
      "expected": "1)报告详情展示两个任务的质量评估汇总\n2)规则校验明细中可区分完整性规则和唯一性规则"
    },
    {
      "action": "查看「车辆订单完整性任务」下规则的脏数据明细",
      "expected": "1)明细展示 order_id 为空、vin 为空的数据\n2)不展示 vin 重复数规则的重复明细"
    },
    {
      "action": "查看「车辆订单唯一性任务」下规则的脏数据明细",
      "expected": "1)明细展示 vin=LTV202603290001AA 的2条重复数据\n2)不展示完整性任务的空值明细\n3)两个任务的明细数据互不串扰"
    }
  ]
} as const;

test.describe("验证【数据质量报告】同一张表不同任务脏数据明细正确", () => {
  test("C364 验证【数据质量报告】同一张表不同任务脏数据明细正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
