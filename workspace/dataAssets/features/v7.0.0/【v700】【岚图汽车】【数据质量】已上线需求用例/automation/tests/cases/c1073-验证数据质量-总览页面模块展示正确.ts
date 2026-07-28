// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1073",
  "title": "验证「数据质量-总览」页面模块展示正确",
  "steps": [
    {
      "action": "进入【资产-数据质量-总览】页面",
      "expected": "页面正常进入"
    },
    {
      "action": "查看页面内容",
      "expected": "展示【数据质量概览】、【规则库分布】、【已配置规则分类】、【校验异常top排名】、【近7日校验结果分析】、【近期校验异常结果】；右上角展示【最近一次更新时间：xxxx-xx-xx xx:xx:xx】"
    }
  ]
} as const;

test.describe("验证「数据质量-总览」页面模块展示正确", () => {
  test("C1073 验证「数据质量-总览」页面模块展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
