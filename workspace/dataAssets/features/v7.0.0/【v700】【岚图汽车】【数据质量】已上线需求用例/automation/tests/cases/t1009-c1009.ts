// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1009",
  "title": "验证【数据质量报告 报告详情页 字段规则筛选】字段规则筛选项与下拉选项展示完整",
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
      "action": "定位到「字段规则」分区并查看查询区",
      "expected": "查询区显示「规则类型」「规则名称」「字段名称」「字段类型」「质检结果」5个筛选项。"
    },
    {
      "action": "点击「规则类型」多选下拉框",
      "expected": "下拉选项完整显示为「完整性校验」「有效性校验」「唯一性校验」「统计性校验」「时效性校验」「合理性校验」。"
    },
    {
      "action": "点击「质检结果」多选下拉框",
      "expected": "下拉选项完整显示为「校验失败」「校验不通过」「校验通过」。"
    }
  ]
} as const;

test.describe("验证【数据质量报告 报告详情页 字段规则筛选】字段规则筛选项与下拉选项展示完整", () => {
  test("C1009 验证【数据质量报告 报告详情页 字段规则筛选】字段规则筛选项与下拉选项展示完整", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
