// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0395",
  "title": "验证「数据权限分配」-删除交互逻辑正确",
  "steps": [
    {
      "action": "点击【删除】",
      "expected": "二次确认后，当前记录删除"
    }
  ]
} as const;

test.describe("验证「数据权限分配」-删除交互逻辑正确", () => {
  test("C0395 验证「数据权限分配」-删除交互逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
