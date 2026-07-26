// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C412",
  "title": "验证权限回收权限",
  "steps": [
    {
      "action": "管理员进入数据安全",
      "expected": "有“权限分配”以及“权限回收”页面的查看以及操作权限"
    },
    {
      "action": "数据开发进入数据安全",
      "expected": "无“权限分配”以及“权限回收”页面的查看以及操作权限"
    },
    {
      "action": "访客进入数据安全",
      "expected": "无“权限分配”以及“权限回收”页面的查看以及操作权限"
    }
  ]
} as const;

test.describe("验证权限回收权限", () => {
  test("C412 验证权限回收权限", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
