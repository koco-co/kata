// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0187",
  "title": "验证标准统计-数据标准上线状态统计正确",
  "steps": [
    {
      "action": "查看数据标准上线状态统计",
      "expected": "1）“已上线”数统计正确；\n2）“待上线”数统计正确"
    }
  ]
} as const;

test.describe("验证标准统计-数据标准上线状态统计正确", () => {
  test("C0187 验证标准统计-数据标准上线状态统计正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
