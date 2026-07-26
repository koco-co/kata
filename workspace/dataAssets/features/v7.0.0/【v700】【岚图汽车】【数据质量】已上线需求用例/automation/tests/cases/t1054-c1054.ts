// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1054",
  "title": "验证「报告关联维表设置Hive」数据源、库、表级联功能校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【通用配置】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择「报告关联维表设置Hive」",
      "expected": "选择成功"
    },
    {
      "action": "「数据源」选择HIVE\n点击「数据库」选择框",
      "expected": "展示已存在的所有数据库信息「databaseA」"
    },
    {
      "action": "选择数据库后，点击「数据表」选择框",
      "expected": "展示已存在的所有数据表信息「tableA」"
    },
    {
      "action": "如果数据源HIVE下没有任何数据库，「数据源」选择HIVE\n点击「数据库」选择框",
      "expected": "展示为「暂无数据」缺省页"
    },
    {
      "action": "如果数据源HIVE下database数据库没有任何表，「数据源」选择HIVE\n「数据库」选择database，再点击「数据表」选择框",
      "expected": "展示为「暂无数据」缺省页"
    }
  ]
} as const;

test.describe("验证「报告关联维表设置Hive」数据源、库、表级联功能校验", () => {
  test("C1054 验证「报告关联维表设置Hive」数据源、库、表级联功能校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
