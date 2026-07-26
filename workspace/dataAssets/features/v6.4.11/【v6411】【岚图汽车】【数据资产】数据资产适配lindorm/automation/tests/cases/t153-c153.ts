// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C153",
  "title": "验证元数据管理页，页面跳转正确",
  "steps": [
    {
      "action": "位置：元数据-元数据管理",
      "expected": "显示数据源列表"
    },
    {
      "action": "点击${DATASOURCE _TYPE}数据源",
      "expected": "进入该数据源的数据库列表页；\n面包屑显示：[数据源名称]（[数据源类型]）> 数据库"
    },
    {
      "action": "点击具体数据库",
      "expected": "进入该数据库的数据表列表页；\n面包屑显示：[数据源名称]（[数据源类型]）> [数据库名称] > 数据表"
    }
  ]
} as const;

test.describe("验证元数据管理页，页面跳转正确", () => {
  test("C153 验证元数据管理页，页面跳转正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
