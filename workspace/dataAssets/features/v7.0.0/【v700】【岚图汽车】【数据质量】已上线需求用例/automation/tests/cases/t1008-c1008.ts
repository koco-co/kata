// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1008",
  "title": "验证【数据质量报告 报告详情页 字段规则筛选】字段规则支持规则类型与质检结果多选结合多字段模糊组合筛选",
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
      "action": "在「字段规则」分区选择「规则类型」为「完整性校验」「有效性校验」，在「规则名称」输入框输入「供应商」，在「字段名称」输入框输入「supplier」，在「字段类型」输入框输入「STR」，在「质检结果」选择「校验失败」「校验不通过」，点击【查询】按钮",
      "expected": "字段规则表格仅显示2条记录：1）「供应商名称非空校验 / supplier_name / STRING / 校验失败」；2）「供应商编码格式校验 / supplier_code / STRING / 校验不通过」。"
    },
    {
      "action": "点击「字段规则」分区中的【重置】按钮",
      "expected": "「字段规则」分区的查询条件全部清空，表格恢复显示「供应商编码唯一校验」和「分区记录数波动校验」等原始记录。"
    }
  ]
} as const;

test.describe("验证【数据质量报告 报告详情页 字段规则筛选】字段规则支持规则类型与质检结果多选结合多字段模糊组合筛选", () => {
  test("C1008 验证【数据质量报告 报告详情页 字段规则筛选】字段规则支持规则类型与质检结果多选结合多字段模糊组合筛选", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
