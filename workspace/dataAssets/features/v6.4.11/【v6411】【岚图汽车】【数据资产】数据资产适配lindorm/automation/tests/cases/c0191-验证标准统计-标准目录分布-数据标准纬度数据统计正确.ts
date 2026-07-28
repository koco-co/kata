// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0191",
  "title": "验证标准统计-标准目录分布-数据标准纬度数据统计正确",
  "steps": [
    {
      "action": "查看标准目录分布-数据标准纬度数据",
      "expected": "统计一级目录下的数据标准占比情况"
    }
  ]
} as const;

test.describe("验证标准统计-标准目录分布-数据标准纬度数据统计正确", () => {
  test("C0191 验证标准统计-标准目录分布-数据标准纬度数据统计正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
