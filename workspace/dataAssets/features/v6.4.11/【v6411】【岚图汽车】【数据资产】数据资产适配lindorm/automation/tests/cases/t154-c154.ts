// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C154",
  "title": "验证数据源列表-数据展示正确",
  "steps": [
    {
      "action": "位置：元数据-元数据管理\n查看列表",
      "expected": "列表展示数据源信息正确：\n\t\t数据源名称、数据库数量、数据表数量、数据源类型、存储大小、更新时间\n数据库数量：当前数据源已同步至资产的数据库总数\n数据表数量：当前数据源已同步至资产的数据表总数\n存储大小：当前数据源所有已同步至资产的数据表的存储大小之和\n更新时间：当前数据源下最近更新的数据表的更新时间"
    }
  ]
} as const;

test.describe("验证数据源列表-数据展示正确", () => {
  test("C154 验证数据源列表-数据展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
