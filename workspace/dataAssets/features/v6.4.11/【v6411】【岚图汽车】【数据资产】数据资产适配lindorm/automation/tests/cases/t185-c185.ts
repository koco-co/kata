// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C185",
  "title": "验证血缘分析-查询",
  "steps": [
    {
      "action": "“数据源类型”选择${DATASOURCE_TYPE}数据源类型",
      "expected": "列表返回已同步${DATASOURCE_TYPE}数据源类型数据库库的分析数据"
    },
    {
      "action": "查看列表数据",
      "expected": "包含${DATASOURCE_TYPE}数据源类型数据库的分析数据"
    }
  ]
} as const;

test.describe("验证血缘分析-查询", () => {
  test("C185 验证血缘分析-查询", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
