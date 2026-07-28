// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0214",
  "title": "验证数据标准-删除",
  "steps": [
    {
      "action": "1）对待上线的数据标准，点击【删除】\n2）二次确认",
      "expected": "数据标准删除成功"
    }
  ]
} as const;

test.describe("验证数据标准-删除", () => {
  test("C0214 验证数据标准-删除", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
