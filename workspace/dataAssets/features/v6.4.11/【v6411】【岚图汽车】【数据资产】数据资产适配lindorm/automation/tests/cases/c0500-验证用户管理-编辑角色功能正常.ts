// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0500",
  "title": "验证用户管理-编辑角色功能正常",
  "steps": [
    {
      "action": "点击【编辑角色】",
      "expected": "只能修改个人角色和质量模块所属项目"
    },
    {
      "action": "1）修改个人角色和质量模块所属项目\n2）点击确定",
      "expected": "用户角色编辑成功，且数据正确"
    }
  ]
} as const;

test.describe("验证用户管理-编辑角色功能正常", () => {
  test("C0500 验证用户管理-编辑角色功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
