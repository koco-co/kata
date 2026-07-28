// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0354",
  "title": "验证【数据质量报告-已生成报告】报告名称、数据表与生成时间组合筛选正常",
  "steps": [
    {
      "action": "准备已生成报告列表数据:\n1）「供应商主数据完整性日报」/ 数据表「dwd_supplier_info_di」/ 生成时间「2026-03-28 10:15:00」/ 报告状态「已生成」\n2）「供应商主数据有效性周报」/ 数据表「dwd_supplier_info_di」/ 生成时间「2026-03-29 10:30:00」/ 报告状态「已生成」\n3）「车辆订单唯一性日报」/ 数据表「dwd_vehicle_order_di」/ 生成时间「2026-03-30 09:20:00」/ 报告状态「已生成」\n4）「车辆质量持续生成报告」/ 数据表「dwd_vehicle_quality_di」/ 生成时间「2026-03-31 15:40:00」/ 报告状态「持续生成中」",
      "expected": "1)四条报告记录均可在「已生成报告」页签查询到\n2)报告名称、关联数据表、生成时间和报告状态与准备数据一致"
    },
    {
      "action": "进入【数据质量 → 数据质量报告】，切换到「已生成报告」页签",
      "expected": "1)展示筛选项「报告名称」「数据表」「生成时间」\n2)列表列包含「报告名称」「报告类型」「关联数据表」「生成样式」「规则范围」「数据周期」「报告状态」「生成时间」「操作」"
    },
    {
      "action": "输入:\n- 报告名称: 供应商主数据\n- 数据表: dwd_supplier_info\n- 生成时间: 2026-03-29 00:00:00 ~ 2026-03-29 23:59:59\n点击「查 询」",
      "expected": "1)列表仅展示「供应商主数据有效性周报」\n2)报告数据表为「dwd_supplier_info_di」\n3)生成时间为「2026-03-29 10:30:00」"
    },
    {
      "action": "点击「重 置」",
      "expected": "1)报告名称、数据表、生成时间条件清空\n2)列表恢复展示初始报告记录"
    }
  ]
} as const;

test.describe("验证【数据质量报告-已生成报告】报告名称、数据表与生成时间组合筛选正常", () => {
  test("C0354 验证【数据质量报告-已生成报告】报告名称、数据表与生成时间组合筛选正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
