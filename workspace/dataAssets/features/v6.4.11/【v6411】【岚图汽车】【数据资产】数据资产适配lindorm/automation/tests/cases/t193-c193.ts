// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C193",
  "title": "验证标准统计-标准趋势-数据标准纬度数据统计正确",
  "steps": [
    {
      "action": "查看标准趋势-数据标准纬度数据",
      "expected": "统计近一个月内已发布标准总数的变化趋势"
    }
  ]
} as const;

test.describe("验证标准统计-标准趋势-数据标准纬度数据统计正确", () => {
  test("C193 验证标准统计-标准趋势-数据标准纬度数据统计正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
