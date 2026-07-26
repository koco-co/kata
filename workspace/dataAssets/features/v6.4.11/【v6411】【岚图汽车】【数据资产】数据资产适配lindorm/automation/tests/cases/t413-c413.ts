// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C413",
  "title": "验证「我的权限查看」-列表数据正确",
  "steps": [
    {
      "action": "查看已在「数据权限分配」授予当前用户权限的表",
      "expected": "列表中该表“表权限”、“行级权限”、“列级权限”、“权限有效期”数据为“数据权限分配”中配置的数据"
    },
    {
      "action": "查看未在「数据权限分配」中授予当前用户权限的表",
      "expected": "列表中该表的权限数据如下：\n1）“表权限”：ddl;dql;dml\n2）“权限有效期”：永久\n3）“列级权限”：全部\n4）“行级权限”：全部"
    }
  ]
} as const;

test.describe("验证「我的权限查看」-列表数据正确", () => {
  test("C413 验证「我的权限查看」-列表数据正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
