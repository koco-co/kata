// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C075",
  "title": "验证任务名复制功能正常",
  "steps": [
    {
      "action": "点击【任务名复制】按钮",
      "expected": "任务名文本拷贝成功"
    }
  ]
} as const;

test.describe("验证任务名复制功能正常", () => {
  test("C075 验证任务名复制功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
