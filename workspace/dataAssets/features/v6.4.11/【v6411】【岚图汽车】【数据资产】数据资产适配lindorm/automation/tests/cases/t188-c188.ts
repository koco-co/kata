// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C188",
  "title": "验证标准统计-代码表数量/词根数量统计正确",
  "steps": [
    {
      "action": "查看代码表数量/词根数量",
      "expected": "代码表、词根数量正确"
    }
  ]
} as const;

test.describe("验证标准统计-代码表数量/词根数量统计正确", () => {
  test("C188 验证标准统计-代码表数量/词根数量统计正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
