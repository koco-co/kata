// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C040",
  "title": "验证数据安全权限管理新增权限策略功能",
  "steps": [
    {
      "action": "进入数据安全-权限管理页面",
      "expected": "页面加载成功，权限分配tab/表格可见"
    },
    {
      "action": "查看”新增权限策略”按钮",
      "expected": "按钮可见"
    },
    {
      "action": "验证数据权限-新增功能正常",
      "expected": "「权限范围选择」：\n添加第一条记录：数据库（schema1），数据表（s1_table1、s1_table2、s1_table3）\n添加第二条记录：数据库（schema2），数据表（s2_table1）\n\n「数据权限配置」：\n1）选择”表级权限”：DDL、DML、DQL；\n2）选择”有效期配置”：2023-10-20；\n3）开启”是否开启行列权限配置”\n\n「行列权限配置」：\n配置s1_table1以及s2_table1的行级权限和列级权限\n\n「权限生效用户」：\n1）选择”用户组”；\n2）选择”用户”\n\n点击【新增权限策略】"
    }
  ]
} as const;

test.describe("验证数据安全权限管理新增权限策略功能", () => {
  test("C040 验证数据安全权限管理新增权限策略功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
