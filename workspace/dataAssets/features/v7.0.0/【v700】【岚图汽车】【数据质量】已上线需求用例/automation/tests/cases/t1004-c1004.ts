// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1004",
  "title": "验证【数据质量报告 报告详情页 单表多表规则筛选】多表规则支持规则类型与质检结果多选结合规则名称模糊组合筛选",
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
      "action": "查看「多表规则」分区查询区",
      "expected": "查询区仅显示「规则类型」「规则名称」「质检结果」3个筛选项，不显示「字段名称」「字段类型」输入项。"
    },
    {
      "action": "在「多表规则」分区选择「规则类型」为「合理性校验」「时效性校验」，在「规则名称」输入框输入「主表与维表」，在「质检结果」选择「校验失败」「校验不通过」，点击【查询】按钮",
      "expected": "多表规则表格仅显示2条记录：1）「主表与维表金额差异阈值校验 / 校验失败」；2）「主表与维表分区时效对齐校验 / 校验不通过」。"
    },
    {
      "action": "点击「多表规则」分区中的【重置】按钮",
      "expected": "「多表规则」分区的查询条件全部清空，表格恢复显示「主表与维表记录数差异校验 / 校验通过」等原始记录。"
    }
  ]
} as const;

test.describe("验证【数据质量报告 报告详情页 单表多表规则筛选】多表规则支持规则类型与质检结果多选结合规则名称模糊组合筛选", () => {
  test("C1004 验证【数据质量报告 报告详情页 单表多表规则筛选】多表规则支持规则类型与质检结果多选结合规则名称模糊组合筛选", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
