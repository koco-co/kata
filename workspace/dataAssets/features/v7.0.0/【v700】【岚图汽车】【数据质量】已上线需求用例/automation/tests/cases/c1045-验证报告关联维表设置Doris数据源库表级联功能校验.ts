// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1045",
  "title": "验证「报告关联维表设置Doris」数据源、库、表级联功能校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【通用配置】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「报告关联维表设置Doris」",
      "expected": "选择成功"
    },
    {
      "action": "「数据源」选择Doris\n点击「数据库」选择框",
      "expected": "展示已存在的所有schema信息「schemaA」"
    },
    {
      "action": "选择schema后，点击「数据库」选择框",
      "expected": "展示已存在的所有数据库信息「databaseA」"
    },
    {
      "action": "选择数据库后，点击「数据表」选择框",
      "expected": "展示已存在的所有数据表信息「tableA」"
    },
    {
      "action": "如果数据源Doris下没有任何数据库，「数据源」选择Doris\n点击「数据库」选择框",
      "expected": "展示为「暂无数据」缺省页"
    },
    {
      "action": "如果数据源HIVE下database数据库没有任何表，「数据源」选择Doris\n「数据库」选择database，再点击「数据表」选择框",
      "expected": "展示为「暂无数据」缺省页"
    }
  ]
} as const;

test.describe("验证「报告关联维表设置Doris」数据源、库、表级联功能校验", () => {
  test("C1045 验证「报告关联维表设置Doris」数据源、库、表级联功能校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
