// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C091",
  "title": "验证标签名复制功能正常",
  "steps": [
    {
      "action": "点击【标签名复制】按钮",
      "expected": "标签名文本拷贝成功"
    }
  ]
} as const;

test.describe("验证标签名复制功能正常", () => {
  test("C091 验证标签名复制功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
