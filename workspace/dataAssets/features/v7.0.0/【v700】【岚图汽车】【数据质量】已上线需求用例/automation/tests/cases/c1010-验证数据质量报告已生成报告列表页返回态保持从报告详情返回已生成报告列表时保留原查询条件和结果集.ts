// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1010",
  "title": "验证【数据质量报告 已生成报告列表页 返回态保持】从报告详情返回已生成报告列表时保留原查询条件和结果集",
  "steps": [
    {
      "action": "进入【数据质量 → 数据质量报告】页面",
      "expected": "数据质量报告页面正常加载。"
    },
    {
      "action": "点击【已生成报告】页签",
      "expected": "成功切换到「已生成报告」列表页。"
    },
    {
      "action": "在「报告名称」输入框输入「供应商主数据」，在「数据表」输入框输入「dwd_supplier_info」，在「生成时间」选择「2026-03-29 00:00:00」至「2026-03-29 23:59:59」，点击【查询】按钮",
      "expected": "列表仅显示「供应商主数据有效性周报」1条记录。"
    },
    {
      "action": "点击「供应商主数据有效性周报」所在行的【报告详情】按钮",
      "expected": "成功进入「供应商主数据有效性周报」报告详情页。"
    },
    {
      "action": "点击面包屑中的【数据质量报告】",
      "expected": "返回「已生成报告」列表页后，「报告名称」仍为「供应商主数据」，「数据表」仍为「dwd_supplier_info」，「生成时间」仍为「2026-03-29 00:00:00 ~ 2026-03-29 23:59:59」，列表仍只显示「供应商主数据有效性周报」1条记录。"
    }
  ]
} as const;

test.describe("验证【数据质量报告 已生成报告列表页 返回态保持】从报告详情返回已生成报告列表时保留原查询条件和结果集", () => {
  test("C1010 验证【数据质量报告 已生成报告列表页 返回态保持】从报告详情返回已生成报告列表时保留原查询条件和结果集", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
