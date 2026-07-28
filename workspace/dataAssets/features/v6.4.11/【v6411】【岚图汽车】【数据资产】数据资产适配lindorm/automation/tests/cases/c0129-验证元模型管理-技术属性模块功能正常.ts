// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0129",
  "title": "验证【元模型管理】-【技术属性】模块功能正常",
  "steps": [
    {
      "action": "查看${DATASOURCE_TYPE} RDB类型的技术属性列表",
      "expected": "${DATASOURCE_TYPE}类型的技术属性初始化且显示正确"
    },
    {
      "action": "查看SparkThrift2.x、Greenplum、Oracle、OushuDB、SAP HANA 1.x、SAP HANA 2.x",
      "expected": "技术属性列表包含视图属性：源表名、视图描述"
    }
  ]
} as const;

test.describe("验证【元模型管理】-【技术属性】模块功能正常", () => {
  test("C0129 验证【元模型管理】-【技术属性】模块功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
