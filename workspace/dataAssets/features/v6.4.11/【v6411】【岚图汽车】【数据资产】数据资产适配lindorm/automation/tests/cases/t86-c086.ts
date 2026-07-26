// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C086",
  "title": "验证API名复制功能正常",
  "steps": [
    {
      "action": "点击【API名复制】按钮",
      "expected": "API名文本拷贝成功"
    }
  ]
} as const;

test.describe("验证API名复制功能正常", () => {
  test("C086 验证API名复制功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
