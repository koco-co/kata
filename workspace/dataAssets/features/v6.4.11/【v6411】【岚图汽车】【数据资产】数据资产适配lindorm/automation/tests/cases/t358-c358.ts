// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C358",
  "title": "验证【数据质量报告-报告详情】单表规则筛选与规则名称模糊搜索正确",
  "steps": [
    {
      "action": "准备报告「供应商主数据有效性周报」的单表规则明细:\n1）完整性校验 / 主键非空校验 / 校验失败 / 未通过原因: 完整性校验未通过\n2）统计性校验 / 分区行数波动校验 / 校验不通过 / 未通过原因: 统计性校验未通过\n3）唯一性校验 / 主键唯一校验 / 校验通过",
      "expected": "1)报告已生成且状态为「已生成」\n2)单表规则明细包含上述3条数据"
    },
    {
      "action": "进入报告详情页并定位到「单表规则」分区",
      "expected": "1)单表规则查询区仅展示「规则类型」「规则名称」「质检结果」\n2)不展示「字段名称」「字段类型」筛选项"
    },
    {
      "action": "选择:\n- 规则类型: 完整性校验、统计性校验\n- 规则名称: 校验\n- 质检结果: 校验失败、校验不通过\n点击「查 询」",
      "expected": "1)单表规则表格仅显示「主键非空校验」和「分区行数波动校验」\n2)质检结果分别为「校验失败」「校验不通过」"
    },
    {
      "action": "在「规则名称」输入不存在的单表规则名称并点击「查 询」",
      "expected": "1)单表规则表格显示空状态\n2)字段规则和多表规则分区不受影响"
    }
  ]
} as const;

test.describe("验证【数据质量报告-报告详情】单表规则筛选与规则名称模糊搜索正确", () => {
  test("C358 验证【数据质量报告-报告详情】单表规则筛选与规则名称模糊搜索正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
