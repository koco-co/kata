// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0190",
  "title": "验证标准统计-标准热度-代码表纬度数据统计正确",
  "steps": [
    {
      "action": "查看标准热度-代码表纬度数据",
      "expected": "根据被数据标准引用的次数，统计top10的代码名称"
    }
  ]
} as const;

test.describe("验证标准统计-标准热度-代码表纬度数据统计正确", () => {
  test("C0190 验证标准统计-标准热度-代码表纬度数据统计正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
