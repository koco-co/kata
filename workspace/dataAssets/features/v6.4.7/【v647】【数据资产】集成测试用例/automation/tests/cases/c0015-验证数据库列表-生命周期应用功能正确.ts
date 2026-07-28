// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0015",
  "title": "验证数据库列表-生命周期应用功能正确",
  "steps": [
    {
      "action": "tableB（未同步至资产）所属数据源和所属数据库为：datasourceB、schemaB\n只配置datasourceB的生命周期为3天；schemaB未设置生命周期；\n将tableB同步至资产；\n查看tableB的生命周期",
      "expected": "tableB的生命周期为3天"
    },
    {
      "action": "tableC（未同步至资产）所属数据源和所属数据库为：datasourceC、schemaC\ndatasourceC未设置生命周期；schemaC设置生命周期为10天；\n将tableC同步至资产；\n查看tableC的生命周期",
      "expected": "tableC的生命周期为10天"
    },
    {
      "action": "tableA（未同步至资产）所属数据源和所属数据库为：datasourceA、schemaA\n先配置datasourceA的生命周期为3天；后配置schemaA的生命周期为10天；\n将tableA同步至资产；\n查看tableA的生命周期",
      "expected": "tableA的生命周期为10天"
    }
  ]
} as const;

test.describe("验证数据库列表-生命周期应用功能正确", () => {
  test("C0015 验证数据库列表-生命周期应用功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
