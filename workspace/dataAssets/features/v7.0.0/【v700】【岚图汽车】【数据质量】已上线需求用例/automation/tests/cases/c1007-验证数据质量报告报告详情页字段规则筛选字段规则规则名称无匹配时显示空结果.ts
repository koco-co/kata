// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1007",
  "title": "验证【数据质量报告 报告详情页 字段规则筛选】字段规则规则名称无匹配时显示空结果",
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
      "action": "点击「供应商主数据有效性周报」所在行的【报告详情】按钮",
      "expected": "成功进入「供应商主数据有效性周报」报告详情页。"
    },
    {
      "action": "在「字段规则」分区的「规则名称」输入框输入「不存在的字段规则15700」，点击【查询】按钮",
      "expected": "「字段规则」表格显示「暂无数据」，当前分区保留查询值「不存在的字段规则15700」，「单表规则」「多表规则」分区仍保持可见。"
    }
  ]
} as const;

test.describe("验证【数据质量报告 报告详情页 字段规则筛选】字段规则规则名称无匹配时显示空结果", () => {
  test("C1007 验证【数据质量报告 报告详情页 字段规则筛选】字段规则规则名称无匹配时显示空结果", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
