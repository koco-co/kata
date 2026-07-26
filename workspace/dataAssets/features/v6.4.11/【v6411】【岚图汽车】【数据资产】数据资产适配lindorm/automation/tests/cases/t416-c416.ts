// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C416",
  "title": "验证「我的权限查看」-行级权限查看",
  "steps": [
    {
      "action": "1）在「数据权限分配」中对表A进行行级权限配置；\n2）在「我的权限查看」中表A数据点击【查看】",
      "expected": "弹窗显示当前用户对该表的行级权限配置"
    }
  ]
} as const;

test.describe("验证「我的权限查看」-行级权限查看", () => {
  test("C416 验证「我的权限查看」-行级权限查看", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
