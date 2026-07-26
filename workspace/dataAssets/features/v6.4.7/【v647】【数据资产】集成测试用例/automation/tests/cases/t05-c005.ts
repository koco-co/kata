// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C005",
  "title": "验证【表结构】-【建表语句】模块功能正常",
  "steps": [
    {
      "action": "进入 test_table 表详情页，点击【建表语句】按钮",
      "expected": "建表语句弹窗打开，内容包含\"test_table\"表名、字段 id/name/info 及其类型和 COMMENT，语法与 sql/base-tables.sql 保持一致"
    },
    {
      "action": "点击【复制】按钮，将建表语句粘贴至离线平台 SQL 编辑器执行",
      "expected": "SQL 执行成功，无报错；在 Doris 数据源中可查到结构一致的新表"
    }
  ]
} as const;

test.describe("验证【表结构】-【建表语句】模块功能正常", () => {
  test("C005 验证【表结构】-【建表语句】模块功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
