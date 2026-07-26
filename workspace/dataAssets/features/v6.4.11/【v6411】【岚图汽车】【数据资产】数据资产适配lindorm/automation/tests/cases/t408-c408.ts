// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C408",
  "title": "验证权限回收-批量回收功能正常",
  "steps": [
    {
      "action": "对N条未回收状态的权限记录，进行【批量回收】操作",
      "expected": "批量回收操作成功；\n所选记录状态变为“已回收”；\n列表刷新；\n所选记录对应表权限数据正确"
    },
    {
      "action": "进入审计中心，查看审计日志",
      "expected": "新增N条权限回收的审计日志，日志格式为：\n回收了XX用户${数据源名称}数据源${数据库名称}数据库${数据表名称}数据表的ddl;dml权限，列级权限“ab;cd”，行级权限“XXXX展示sql”，有效期至2024-08-31"
    }
  ]
} as const;

test.describe("验证权限回收-批量回收功能正常", () => {
  test("C408 验证权限回收-批量回收功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
