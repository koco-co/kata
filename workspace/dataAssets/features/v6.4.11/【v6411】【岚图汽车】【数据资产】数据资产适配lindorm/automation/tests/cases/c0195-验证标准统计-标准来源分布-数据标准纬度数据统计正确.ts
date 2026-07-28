// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0195",
  "title": "验证标准统计-标准来源分布-数据标准纬度数据统计正确",
  "steps": [
    {
      "action": "查看标准来源分布-数据标准纬度数据",
      "expected": "统计各个标准来源下的数据标准、代码占比情况"
    }
  ]
} as const;

test.describe("验证标准统计-标准来源分布-数据标准纬度数据统计正确", () => {
  test("C0195 验证标准统计-标准来源分布-数据标准纬度数据统计正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
