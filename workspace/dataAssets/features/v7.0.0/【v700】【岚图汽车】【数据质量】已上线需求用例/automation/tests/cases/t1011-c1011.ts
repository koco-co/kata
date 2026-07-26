// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1011",
  "title": "验证【数据质量报告 已生成报告列表页 列表搜索】已生成报告列表页重置后恢复初始查询状态",
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
      "action": "在「报告名称」输入框输入「供应商主数据」，在「数据表」输入框输入「dwd_supplier_info」，在「生成时间」选择「2026-03-28 00:00:00」至「2026-03-29 23:59:59」，点击【查询】按钮",
      "expected": "列表仅显示「供应商主数据完整性日报」和「供应商主数据有效性周报」2条记录。"
    },
    {
      "action": "点击【重置】按钮",
      "expected": "「报告名称」「数据表」输入框内容被清空，「生成时间」恢复为进入页面时的初始值。"
    },
    {
      "action": "查看列表数据",
      "expected": "列表恢复展示前置条件中的4条报告记录。"
    }
  ]
} as const;

test.describe("验证【数据质量报告 已生成报告列表页 列表搜索】已生成报告列表页重置后恢复初始查询状态", () => {
  test("C1011 验证【数据质量报告 已生成报告列表页 列表搜索】已生成报告列表页重置后恢复初始查询状态", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
