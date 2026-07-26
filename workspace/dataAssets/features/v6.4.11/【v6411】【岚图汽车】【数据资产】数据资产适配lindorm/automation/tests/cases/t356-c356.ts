// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C356",
  "title": "验证【数据质量报告-已生成报告】下载报告功能正常",
  "steps": [
    {
      "action": "准备生成成功报告「供应商主数据有效性周报」:\n- 报告类型: 单表报告\n- 关联数据表: ${SchemaA}.dwd_supplier_info_di\n- 生成样式: 质检式\n- 规则范围: 全部\n- 数据周期: 2026-03-29\n- 报告状态: 已生成\n- 生成时间: 2026-03-29 10:30:00",
      "expected": "1)已生成报告列表存在该记录\n2)操作列展示「下载」「报告详情」"
    },
    {
      "action": "进入【数据质量 → 数据质量报告】并切换到「已生成报告」页签，查询「供应商主数据有效性周报」",
      "expected": "1)列表仅展示目标报告或目标报告位于查询结果中\n2)报告状态为「已生成」"
    },
    {
      "action": "点击目标报告操作列「下载」",
      "expected": "1)触发报告下载\n2)下载文件名称包含「供应商主数据有效性周报」\n3)文件内容包含报告基础信息、质量评估汇总和规则校验明细"
    }
  ]
} as const;

test.describe("验证【数据质量报告-已生成报告】下载报告功能正常", () => {
  test("C356 验证【数据质量报告-已生成报告】下载报告功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
