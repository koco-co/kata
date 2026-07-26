// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C417",
  "title": "验证「我的权限查看」-存在多条将同一张表授予当前用户的数据权限",
  "steps": [
    {
      "action": "1）在「数据权限分配」中对表A添加一条授予当前用户的权限记录\n2）再次在「数据权限分配」中对表A添加一条授予当前用户的权限记录，两次配置的行级权限不一致且规则关系也不一致\n3）在「我的权限查看」中表A数据点击【查看】",
      "expected": "1）表A的行级权限查看弹窗中显示2组当前用户对该表的行级权限"
    },
    {
      "action": "1）在「数据权限分配」中对表A添加一条授予当前用户的权限记录\n2）再次在「数据权限分配」中对表A所属数据库schema1添加一条授予当前用户的权限记录，两次配置的行级权限不一致且规则关系也不一致\n3）在「我的权限查看」中表A数据点击【查看】",
      "expected": "1）表A的行级权限查看弹窗中显示当前用户对该表的行级权限为两次配置的行级权限的集合"
    }
  ]
} as const;

test.describe("验证「我的权限查看」-存在多条将同一张表授予当前用户的数据权限", () => {
  test("C417 验证「我的权限查看」-存在多条将同一张表授予当前用户的数据权限", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
