// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C152",
  "title": "验证个性业务属性-删除功能逻辑正常",
  "steps": [
    {
      "action": "删除业务属性${X}",
      "expected": "列表不显示业务属性${X}"
    }
  ]
} as const;

test.describe("验证个性业务属性-删除功能逻辑正常", () => {
  test("C152 验证个性业务属性-删除功能逻辑正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
