// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0424",
  "title": "验证不同角色用户进入数据安全模块功能正常",
  "steps": [
    {
      "action": "管理员用户进入资产-数据安全",
      "expected": "进入数据权限管理-数据权限分配页面"
    },
    {
      "action": "数据开发用户进入资产-数据安全",
      "expected": "进入数据权限管理-我的权限查看页面"
    },
    {
      "action": "访客用户进入资产-数据安全",
      "expected": "进入数据权限管理-我的权限查看页面"
    },
    {
      "action": "其他角色用户进入资产-数据安全",
      "expected": "进入有权限的第一个页面，且不报错"
    }
  ]
} as const;

test.describe("验证不同角色用户进入数据安全模块功能正常", () => {
  test("C0424 验证不同角色用户进入数据安全模块功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
