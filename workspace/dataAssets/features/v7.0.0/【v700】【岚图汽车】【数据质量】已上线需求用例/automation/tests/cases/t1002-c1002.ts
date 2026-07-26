// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1002",
  "title": "验证【数据质量报告 报告详情页 文案修正】质检结果文案在各规则分区筛选项与明细结果中展示一致",
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
      "action": "分别查看「字段规则」「单表规则」「多表规则」分区表格中的「质检结果」列",
      "expected": "字段规则中的「供应商名称非空校验」显示为「校验失败」，单表规则中的「分区行数波动校验」显示为「校验不通过」，多表规则中的「主表与维表记录数差异校验」显示为「校验通过」，三个分区的结果文案保持一致。"
    }
  ]
} as const;

test.describe("验证【数据质量报告 报告详情页 文案修正】质检结果文案在各规则分区筛选项与明细结果中展示一致", () => {
  test("C1002 验证【数据质量报告 报告详情页 文案修正】质检结果文案在各规则分区筛选项与明细结果中展示一致", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
