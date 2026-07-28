// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0505",
  "title": "验证角色管理-角色权限树展示正确",
  "steps": [
    {
      "action": "查看角色管理页面的显示",
      "expected": "1）title显示：权限点、管理员、数据开发、访客；\n2）列表根据权限点显示权限树，不可编辑\n3）权限树权限点与prd一致：\\${KATA_CASE_URL}"
    },
    {
      "action": "鼠标置于角色名称右侧查看icon",
      "expected": "显示：角色名称、角色描述、最近修改人、最近修改时间"
    }
  ]
} as const;

test.describe("验证角色管理-角色权限树展示正确", () => {
  test("C0505 验证角色管理-角色权限树展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
