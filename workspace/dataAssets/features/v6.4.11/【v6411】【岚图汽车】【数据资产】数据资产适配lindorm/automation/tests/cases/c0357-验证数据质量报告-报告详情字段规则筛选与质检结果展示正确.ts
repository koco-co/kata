// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0357",
  "title": "验证【数据质量报告-报告详情】字段规则筛选与质检结果展示正确",
  "steps": [
    {
      "action": "准备报告「供应商主数据有效性周报」的字段规则明细:\n1）完整性校验 / 供应商名称非空校验 / supplier_name / STRING / 校验失败 / 未通过原因: 完整性校验未通过\n2）有效性校验 / 供应商编码格式校验 / supplier_code / STRING / 校验不通过 / 未通过原因: 格式校验未通过\n3）唯一性校验 / 供应商编码唯一校验 / supplier_code / STRING / 校验通过\n4）统计性校验 / 分区记录数波动校验 / dt / STRING / 校验通过",
      "expected": "1)报告已生成且状态为「已生成」\n2)字段规则明细包含上述4条数据"
    },
    {
      "action": "进入【数据质量 → 数据质量报告 → 已生成报告】，查询「供应商主数据有效性周报」并点击「报告详情」",
      "expected": "1)进入质量报告详情页\n2)报告名称、数据表、数据周期与目标报告一致"
    },
    {
      "action": "在「字段规则」分区选择:\n- 规则类型: 完整性校验、有效性校验\n- 规则名称: 供应商\n- 字段名称: supplier\n- 字段类型: STR\n- 质检结果: 校验失败、校验不通过\n点击「查 询」",
      "expected": "1)字段规则表格仅显示「供应商名称非空校验」和「供应商编码格式校验」\n2)质检结果分别为「校验失败」「校验不通过」\n3)未通过原因与规则结果一致"
    },
    {
      "action": "点击「重 置」",
      "expected": "1)字段规则筛选条件清空\n2)字段规则表格恢复显示4条字段规则明细"
    }
  ]
} as const;

test.describe("验证【数据质量报告-报告详情】字段规则筛选与质检结果展示正确", () => {
  test("C0357 验证【数据质量报告-报告详情】字段规则筛选与质检结果展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
