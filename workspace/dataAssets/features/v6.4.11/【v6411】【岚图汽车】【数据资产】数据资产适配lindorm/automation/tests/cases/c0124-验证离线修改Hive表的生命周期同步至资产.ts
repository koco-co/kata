// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0124",
  "title": "验证离线修改Hive表的生命周期同步至资产",
  "steps": [
    {
      "action": "离线SparkSQL任务修改表生命周期：\nALTER TABLE student_lifecycle SET TBLPROPERTIES ('lifecycle'='12');\n等待同步；\n查看资产-数据地图-该表表详情-基本信息",
      "expected": "生命周期更新正确"
    }
  ]
} as const;

test.describe("验证离线修改Hive表的生命周期同步至资产", () => {
  test("C0124 验证离线修改Hive表的生命周期同步至资产", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
