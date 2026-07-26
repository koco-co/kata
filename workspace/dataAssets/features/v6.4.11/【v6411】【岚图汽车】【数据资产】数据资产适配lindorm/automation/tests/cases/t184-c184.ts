// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C184",
  "title": "验证血缘分析-创建",
  "steps": [
    {
      "action": "点击【添加数据库】",
      "expected": "显示添加血缘分析弹窗"
    },
    {
      "action": "“数据源类型”选择${DATASOURCE_TYPE}数据源类型",
      "expected": "“数据源”下拉项显示${DATASOURCE_TYPE}数据源类型数据源"
    },
    {
      "action": "“数据源”选择${DATASOURCE_TYPE}数据源类型数据源",
      "expected": "“数据库”下拉项显示所选数据源下所有已同步的数据库"
    },
    {
      "action": "选择数据库，点击【确定】",
      "expected": "创建血缘监控成功"
    }
  ]
} as const;

test.describe("验证血缘分析-创建", () => {
  test("C184 验证血缘分析-创建", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
