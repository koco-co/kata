// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C506",
  "title": "验证角色管理-权限生效正确",
  "steps": [
    {
      "action": "登录访客用户，查看访客可查看的模块是否齐全",
      "expected": "用户可访问模块与访客配置的权限点一致"
    },
    {
      "action": "登录数据开发用户，查看访客可查看的模块是否齐全",
      "expected": "用户可访问模块与数据开发配置的权限点一致"
    },
    {
      "action": "登录管理员用户，查看访客可查看的模块是否齐全",
      "expected": "用户可访问模块与管理员配置的权限点一致"
    }
  ]
} as const;

test.describe("验证角色管理-权限生效正确", () => {
  test("C506 验证角色管理-权限生效正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
