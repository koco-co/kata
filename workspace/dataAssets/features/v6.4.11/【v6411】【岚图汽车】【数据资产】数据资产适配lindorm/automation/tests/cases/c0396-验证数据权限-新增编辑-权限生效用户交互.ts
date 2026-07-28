// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0396",
  "title": "验证数据权限-「新增/编辑」-权限生效用户交互",
  "steps": [
    {
      "action": "查看“用户组”下拉列表",
      "expected": "1）用户组下拉列表为资产引入的用户组\n2）默认不选中\n3）支持多选"
    },
    {
      "action": "不选择用户组，查看“用户”下拉列表",
      "expected": "下拉列表为资产平台所有非管理员用户"
    },
    {
      "action": "选择用户组，查看“用户”下拉列表",
      "expected": "下拉列表为所选用户组下所有非管理员用户+全部"
    }
  ]
} as const;

test.describe("验证数据权限-「新增/编辑」-权限生效用户交互", () => {
  test("C0396 验证数据权限-「新增/编辑」-权限生效用户交互", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
