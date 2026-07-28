// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0389",
  "title": "验证数据权限-权限过期功能正常",
  "steps": [
    {
      "action": "2023-10-18及之前，操作该表",
      "expected": "权限为「数据权限分配」中配置的权限"
    },
    {
      "action": "2023-10-18之后，操作该表",
      "expected": "权限为默认的所有平台层权限"
    }
  ]
} as const;

test.describe("验证数据权限-权限过期功能正常", () => {
  test("C0389 验证数据权限-权限过期功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
