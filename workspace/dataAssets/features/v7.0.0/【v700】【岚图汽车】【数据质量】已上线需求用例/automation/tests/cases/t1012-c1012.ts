// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1012",
  "title": "验证【数据质量报告 已生成报告列表页 列表搜索】已生成报告列表页报告名称无匹配时显示空结果",
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
      "action": "在「报告名称」输入框输入「不存在的报告名称15700」，点击【查询】按钮",
      "expected": "列表不返回任何报告记录，列表区域显示「暂无数据」，查询框保留输入值「不存在的报告名称15700」。"
    }
  ]
} as const;

test.describe("验证【数据质量报告 已生成报告列表页 列表搜索】已生成报告列表页报告名称无匹配时显示空结果", () => {
  test("C1012 验证【数据质量报告 已生成报告列表页 列表搜索】已生成报告列表页报告名称无匹配时显示空结果", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
