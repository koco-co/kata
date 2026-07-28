// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0387",
  "title": "验证数据权限-列级权限校验功能正常",
  "steps": [
    {
      "action": "在「数据安全-数据权限分配」配置dql列级权限选择col1和col2",
      "expected": "数据地图-数据预览只显示col1和col2字段数据"
    },
    {
      "action": "在「数据安全-数据权限分配」配置dql列级权限选择全部",
      "expected": "数据地图-数据预览显示所有字段数据"
    }
  ]
} as const;

test.describe("验证数据权限-列级权限校验功能正常", () => {
  test("C0387 验证数据权限-列级权限校验功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
