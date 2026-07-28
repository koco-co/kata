// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0166",
  "title": "验证数据库列表-数据展示正确",
  "steps": [
    {
      "action": "位置：元数据-元数据管理-${DATASOURCE_TYPE}数据源\n查看列表",
      "expected": "列表展示当前数据源下数据库信息正确：\n\t\t数据库名称、数据表数量、存储大小、更新时间\n数据表数量：当前数据库已同步至资产的数据表+视图总数\n存储大小：当前数据库下所有已同步至资产的数据表的存储大小之和\n更新时间：当前数据库下最近更新的数据表/视图的更新时间"
    }
  ]
} as const;

test.describe("验证数据库列表-数据展示正确", () => {
  test("C0166 验证数据库列表-数据展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
