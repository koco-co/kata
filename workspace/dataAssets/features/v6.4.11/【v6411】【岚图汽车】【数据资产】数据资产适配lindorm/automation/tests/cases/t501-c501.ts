// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C501",
  "title": "验证用户管理-用户组权限功能正常",
  "steps": [
    {
      "action": "通过用户组添加至资产，增加个人角色权限「数据开发」，登录该用户",
      "expected": "可进入资产，且拥有数据开发&访客权限"
    },
    {
      "action": "通过用户组添加至资产，增加用户A个人角色权限「数据开发」，移除用户组",
      "expected": "用户A已用户角色保留在【用户】tab中，且个人角色「访客」为默认选中，且置灰不可编辑"
    },
    {
      "action": "通过用户组添加至资产，增加用户A个人角色权限「数据开发」，移除用户组，登录用户A",
      "expected": "可进入资产，且拥有数据开发&访客权限"
    }
  ]
} as const;

test.describe("验证用户管理-用户组权限功能正常", () => {
  test("C501 验证用户管理-用户组权限功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
