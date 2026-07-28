// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0359",
  "title": "验证【数据质量报告-报告详情】多表规则筛选与规则名称模糊搜索正确",
  "steps": [
    {
      "action": "准备报告「供应商主数据有效性周报」的多表规则明细:\n1）合理性校验 / 主表与维表金额差异阈值校验 / 校验失败 / 未通过原因: 合理性校验未通过\n2）时效性校验 / 主表与维表分区时效对齐校验 / 校验不通过 / 未通过原因: 时效性校验未通过\n3）统计性校验 / 主表与维表记录数差异校验 / 校验通过",
      "expected": "1)报告已生成且状态为「已生成」\n2)多表规则明细包含上述3条数据"
    },
    {
      "action": "进入报告详情页并定位到「多表规则」分区",
      "expected": "1)多表规则查询区仅展示「规则类型」「规则名称」「质检结果」\n2)不展示「字段名称」「字段类型」筛选项"
    },
    {
      "action": "选择:\n- 规则类型: 合理性校验、时效性校验\n- 规则名称: 主表与维表\n- 质检结果: 校验失败、校验不通过\n点击「查 询」",
      "expected": "1)多表规则表格仅显示「主表与维表金额差异阈值校验」和「主表与维表分区时效对齐校验」\n2)规则名称模糊匹配生效\n3)质检结果与筛选条件一致"
    },
    {
      "action": "点击「重 置」",
      "expected": "1)多表规则筛选条件清空\n2)表格恢复显示「主表与维表记录数差异校验」等原始记录"
    }
  ]
} as const;

test.describe("验证【数据质量报告-报告详情】多表规则筛选与规则名称模糊搜索正确", () => {
  test("C0359 验证【数据质量报告-报告详情】多表规则筛选与规则名称模糊搜索正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
