// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C130",
  "title": "验证通用业务属性-查询功能正常",
  "steps": [
    {
      "action": "1）进入元数据-元模型管理-${DATASOURCE_TYPE}的元模型管理页面\n2）点击「通用业务属性」",
      "expected": "跳转至${DATASOURCE_TYPE}的通用业务属性页面"
    },
    {
      "action": "1）查看${DATASOURCE_TYPE}的通用业务属性列表",
      "expected": "正确展示${DATASOURCE_TYPE}内置通用业务属性"
    }
  ]
} as const;

test.describe("验证通用业务属性-查询功能正常", () => {
  test("C130 验证通用业务属性-查询功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
