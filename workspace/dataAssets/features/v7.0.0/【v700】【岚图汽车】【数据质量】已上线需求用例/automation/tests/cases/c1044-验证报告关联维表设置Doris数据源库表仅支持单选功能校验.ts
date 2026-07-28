// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1044",
  "title": "验证「报告关联维表设置Doris」数据源、库、表仅支持单选功能校验",
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
      "action": "点击「数据源」选择框",
      "expected": "仅支持选择单个数据源"
    },
    {
      "action": "点击「schema」选择框，选择schema",
      "expected": "仅支持选择单个schema"
    },
    {
      "action": "点击「数据库」选择框，选择数据库",
      "expected": "仅支持选择单个数据库"
    },
    {
      "action": "点击「数据表」选择框，选择数据表",
      "expected": "仅支持选择单个数据表"
    }
  ]
} as const;

test.describe("验证「报告关联维表设置Doris」数据源、库、表仅支持单选功能校验", () => {
  test("C1044 验证「报告关联维表设置Doris」数据源、库、表仅支持单选功能校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
