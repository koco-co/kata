// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1058",
  "title": "验证「数据质量」模块新增「通用配置」一级菜单",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】页面",
      "expected": "进入成功"
    },
    {
      "action": "页面模块UI CHECK",
      "expected": "左侧一级菜单新增「通用配置」"
    }
  ]
} as const;

test.describe("验证「数据质量」模块新增「通用配置」一级菜单", () => {
  test("C1058 验证「数据质量」模块新增「通用配置」一级菜单", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
