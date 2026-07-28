// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0096",
  "title": "验证指标名复制功能正常",
  "steps": [
    {
      "action": "点击【指标名复制】按钮",
      "expected": "指标名文本拷贝成功"
    }
  ]
} as const;

test.describe("验证指标名复制功能正常", () => {
  test("C0096 验证指标名复制功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
