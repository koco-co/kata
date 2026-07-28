// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0400",
  "title": "验证权限回收列表-数据展示正确",
  "steps": [
    {
      "action": "进入「数据安全」-「数据权限管理」-「数据权限管理」；\n点击「权限回收」进入权限回收页面",
      "expected": "列表默认展示当前租户下所有申请并通过审批的权限记录：\n\t- 申请人：权限申请人的姓名\n\t- 数据源：权限申请表所属数据源\n\t- 数据库：权限申请表所属数据库\n\t- 数据表：权限申请表表名\n\t- 表权限：申请的权限，多个权限有英文分号隔开\n\t- 有效期：权限有效期，精确到日\n\t- 状态：权限回收状态\n\t- 审批时间：审批人通过申请审批的时间，精确到秒"
    }
  ]
} as const;

test.describe("验证权限回收列表-数据展示正确", () => {
  test("C0400 验证权限回收列表-数据展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
