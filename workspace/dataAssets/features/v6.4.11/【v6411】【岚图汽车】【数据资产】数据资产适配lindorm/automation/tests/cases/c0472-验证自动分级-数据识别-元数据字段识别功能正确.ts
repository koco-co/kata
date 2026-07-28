// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0472",
  "title": "验证自动分级-数据识别-元数据字段识别功能正确",
  "steps": [
    {
      "action": "添加/编辑自动分级配置数据识别\n1）配置“数据识别”为“元数据字段识别”-“字段名识别”；\n2）输入内容为“order*price”",
      "expected": "分级打标对象为：${DATASOURCE_TYPE}数据源类型下所有字段名符合的字段（如：order_price、order_total_price、orderprice等）"
    },
    {
      "action": "添加/编辑自动分级配置数据识别\n1）配置“数据识别”为“元数据字段识别”-“字段名排除”；\n2）输入内容为“order*price”",
      "expected": "分级打标对象为：${DATASOURCE_TYPE}数据源类型下所有字段名不符合的字段（如：order_price、order_total_price、orderprice等诸如此类字段不会被打标）"
    }
  ]
} as const;

test.describe("验证自动分级-数据识别-元数据字段识别功能正确", () => {
  test("C0472 验证自动分级-数据识别-元数据字段识别功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
