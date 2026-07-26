// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1014",
  "title": "验证【数据质量报告 已生成报告列表页 列表搜索】已生成报告列表页支持报告名称数据表和生成时间组合筛选",
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
      "expected": "查询条件提交成功，列表区域刷新。"
    },
    {
      "action": "查看查询结果",
      "expected": "列表仅显示1条记录，报告名称为「供应商主数据有效性周报」，数据表为「dwd_supplier_info_di」，生成时间为「2026-03-29 10:30:00」。"
    }
  ]
} as const;

test.describe("验证【数据质量报告 已生成报告列表页 列表搜索】已生成报告列表页支持报告名称数据表和生成时间组合筛选", () => {
  test("C1014 验证【数据质量报告 已生成报告列表页 列表搜索】已生成报告列表页支持报告名称数据表和生成时间组合筛选", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
