// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0054",
  "title": "验证表名复制功能正常",
  "steps": [
    {
      "action": "点击【表名复制】按钮",
      "expected": "表名文本拷贝成功"
    }
  ]
} as const;

test.describe("验证表名复制功能正常", () => {
  test("C0054 验证表名复制功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
