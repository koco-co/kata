// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C352",
  "title": "验证【数据质量报告-已配置报告】报告名称重复校验正常",
  "steps": [
    {
      "action": "准备已配置报告「供应商主数据完整性日报」:\n- 报告类型: 单表报告\n- 关联数据表: ${SchemaA}.dwd_supplier_info_di\n- 关联任务: 供应商主数据完整性任务\n- 报告周期: 天\n- 生成样式: 质检式\n- 规则范围: 全部",
      "expected": "1)已配置报告列表存在「供应商主数据完整性日报」\n2)报告配置可正常编辑和查看"
    },
    {
      "action": "进入【数据质量 → 数据质量报告】，点击「新增报告」",
      "expected": "1)打开新增报告弹窗\n2)展示「基础信息」「关联数据表」「报告周期及内容设置」"
    },
    {
      "action": "在新增报告弹窗填写:\n- 报告名称: 供应商主数据完整性日报\n- 生成样式: 质检式\n- 规则范围: 全部\n- 关联数据表: ${SchemaA}.dwd_supplier_info_di\n- 报告周期: 天\n点击「确定」",
      "expected": "1)提示已存在相同报告名称或报告名称重复\n2)报告不能保存\n3)原报告「供应商主数据完整性日报」配置不被覆盖"
    }
  ]
} as const;

test.describe("验证【数据质量报告-已配置报告】报告名称重复校验正常", () => {
  test("C352 验证【数据质量报告-已配置报告】报告名称重复校验正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
