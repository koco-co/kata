// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0050",
  "title": "验证选择数据表选项过滤已配置的表",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面, 点击新增规则集",
      "expected": "进入【新建规则集 ❯ 基础信息】配置页面"
    },
    {
      "action": "选择已配置过规则的数据源(hive2.x)、数据库后, 查看选择数据表下拉选项",
      "expected": "过滤已配置的hive表tableA"
    },
    {
      "action": "选择已配置过规则的数据源(sparkthrift2.x)、数据库后, 查看选择数据表下拉选项",
      "expected": "过滤已配置的sparkthrift表tableA"
    },
    {
      "action": "选择已配置过规则的数据源(doris3.x)、数据库后, 查看选择数据表下拉选项",
      "expected": "过滤已配置的doris表tableA"
    }
  ]
} as const;

test.describe("验证选择数据表选项过滤已配置的表", () => {
  test("C0050 验证选择数据表选项过滤已配置的表", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
