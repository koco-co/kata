// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C388",
  "title": "验证数据权限-权限生效用户功能正常",
  "steps": [
    {
      "action": "1）用户平台权限无“表删除”权限；\n2）在「数据安全-数据权限分配」中授权用户某表的DDL权限",
      "expected": "该用户在数据资产无删表权限"
    },
    {
      "action": "在「数据安全-数据权限分配」中配置表A的权限生效用户，不包含用户A",
      "expected": "用户A默认拥有该表的所有平台层权限"
    }
  ]
} as const;

test.describe("验证数据权限-权限生效用户功能正常", () => {
  test("C388 验证数据权限-权限生效用户功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
