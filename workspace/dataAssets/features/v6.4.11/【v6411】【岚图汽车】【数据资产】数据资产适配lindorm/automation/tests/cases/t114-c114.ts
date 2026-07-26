// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C114",
  "title": "验证血缘解析功能正常",
  "steps": [
    {
      "action": "1）执行并提交离线任务；\n2）查看对应表血缘关系",
      "expected": "表级血缘/字段级血缘正确"
    }
  ]
} as const;

test.describe("验证血缘解析功能正常", () => {
  test("C114 验证血缘解析功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
