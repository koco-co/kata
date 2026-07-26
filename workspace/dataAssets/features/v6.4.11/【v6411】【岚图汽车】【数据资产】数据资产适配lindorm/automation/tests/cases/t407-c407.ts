// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C407",
  "title": "验证权限回收-行列权限回收功能正常",
  "steps": [
    {
      "action": "对某条用户申请的权限且未回收的记录，进行【权限回收】；",
      "expected": "权限回收操作成功；\n该记录状态变为“已回收”；\n列表刷新"
    },
    {
      "action": "进入审计中心，查看审计日志",
      "expected": "新增一条权限回收的审计日志，日志格式为：\n回收了XX用户${数据源名称}数据源${数据库名称}数据库${数据表名称}数据表的ddl;dml权限，列级权限“ab;cd”，行级权限“XXXX展示sql”，有效期至2024-08-31"
    },
    {
      "action": "该数据开发用户进入对应表的表详情页，查看【数据预览】",
      "expected": "数据预览时，行列权限数据正确（权限回收成功）"
    }
  ]
} as const;

test.describe("验证权限回收-行列权限回收功能正常", () => {
  test("C407 验证权限回收-行列权限回收功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
