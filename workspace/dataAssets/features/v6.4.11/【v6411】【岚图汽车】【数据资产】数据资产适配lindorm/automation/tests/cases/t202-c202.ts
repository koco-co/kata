// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C202",
  "title": "验证标准目录-子目录数量限制100个",
  "steps": [
    {
      "action": "在一个父目录下添加101个子目录",
      "expected": "第101个子目录不能添加"
    }
  ]
} as const;

test.describe("验证标准目录-子目录数量限制100个", () => {
  test("C202 验证标准目录-子目录数量限制100个", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
