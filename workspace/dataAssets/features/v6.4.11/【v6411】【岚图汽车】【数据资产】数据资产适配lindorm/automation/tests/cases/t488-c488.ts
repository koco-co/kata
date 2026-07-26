// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C488",
  "title": "验证数据源质量授权功能正常",
  "steps": [
    {
      "action": "1）点击【质量项目授权】；\n2）选择项目进行保存",
      "expected": "质量授权成功"
    }
  ]
} as const;

test.describe("验证数据源质量授权功能正常", () => {
  test("C488 验证数据源质量授权功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
