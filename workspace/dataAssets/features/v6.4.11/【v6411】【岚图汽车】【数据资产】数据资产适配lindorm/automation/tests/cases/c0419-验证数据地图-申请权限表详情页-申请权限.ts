// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0419",
  "title": "验证「数据地图-申请权限」表详情页-申请权限",
  "steps": [
    {
      "action": "1）所选表在「数据安全-数据权限分配」中只有一条被授权给该用户的记录：\n- 表级权限：ddl\n- 权限有效期：2023-10-18\n2）勾选表级权限：DQL\n3）选择列级权限：ab;cd\n4）申请权限并通过审批",
      "expected": "1）审批中心生成1条审批记录\n2）「安全审计」新增审计日志：\n\t\t- 操作模块：元数据\n\t\t- 动作：表权限申请\n\t\t- 详细内容：请${数据源名称}数据源下${数据库名称}数据库${数据表名称}数据表的dql权限，列级权限“ab;cd”，有效期至2023-10-18\n3）审批通过后，「我的权限查看」页面该表权限如下：\n    - 表级权限：DDL、DQL\n    - 列级权限：ab;cd\n    - 行级权限：无"
    },
    {
      "action": "1）所选表在「数据安全-数据权限分配」中只有一条被授权给该用户的记录：\n    - 表级权限：dql\n    - 列级权限：ab;cd\n    - 行级权限：col1 = value1 and col2 is null\n    - 权限有效期：2023-10-18\n2）勾选表级权限：DDL\n3）选择列级权限：ab;cd;ef\n4）申请权限并通过审批",
      "expected": "1）审批中心生成1条审批记录\n2）「安全审计」新增审计日志：\n\t\t- 操作模块：元数据\n\t\t- 动作：表权限申请\n\t\t- 详细内容：请${数据源名称}数据源下${数据库名称}数据库${数据表名称}数据表的ddl权限，列级权限“ef”，有效期至2023-10-18\n3）审批通过后，「我的权限查看」页面该表权限如下：\n    - 表级权限：DDL、DQL\n    - 列级权限：ab;cd;ef\n    - 行级权限：col1 = value1 and col2 is null"
    }
  ]
} as const;

test.describe("验证「数据地图-申请权限」表详情页-申请权限", () => {
  test("C0419 验证「数据地图-申请权限」表详情页-申请权限", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
