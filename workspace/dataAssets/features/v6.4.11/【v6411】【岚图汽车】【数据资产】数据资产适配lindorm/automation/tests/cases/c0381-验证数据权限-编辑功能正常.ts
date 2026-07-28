// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0381",
  "title": "验证数据权限-编辑功能正常",
  "steps": [
    {
      "action": "「权限范围选择」：\n删除第一条记录；\n添加一条记录：数据库（schema3），数据表（s3_table1、s3_table2）\n\n「数据权限配置」：\n1）选择“表级权限”：DDL；\n2）选择“有效期配置”：2023-10-21；\n3）开启“是否开启行列权限配置”\n\n「行列权限配置」：\n配置s2_table1以及s3_table1的行级权限和列级权限\n\n「权限生效用户」：\n1）选择“用户组”；\n2）选择“用户”\n\n点击【保存】",
      "expected": "1）提示编辑数据成功\n2）页面跳转至列表页，列表数据刷新\n3）「安全审计」新增审计日志：\n\t\t- 操作模块：数据安全-数据权限分配\n\t\t- 动作：编辑权限\n\t\t- 详细内容：编辑了权限策略，编辑了${数据源名称}数据源下的权限信息，生效于XX等共XX个用户，权限有效期为2023-10-21"
    }
  ]
} as const;

test.describe("验证数据权限-编辑功能正常", () => {
  test("C0381 验证数据权限-编辑功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
