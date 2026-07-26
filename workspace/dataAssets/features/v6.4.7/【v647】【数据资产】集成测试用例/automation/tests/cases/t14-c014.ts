// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C014",
  "title": "验证数据表列表-数据展示正确",
  "steps": [
    {
      "action": "位置：元数据-元数据管理-Doris 数据源-包含 `test_table` 的数据库\n查看列表",
      "expected": "列表展示当前数据库下数据表/视图信息正确（与表详情页一致）：\n表名、表中文名、创建时间、存储大小、更新时间"
    }
  ]
} as const;

test.describe("验证数据表列表-数据展示正确", () => {
  test("C014 验证数据表列表-数据展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
