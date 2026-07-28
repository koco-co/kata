// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0402",
  "title": "验证权限回收列表-搜索功能正确",
  "steps": [
    {
      "action": "输入已存在的权限记录的用户名称",
      "expected": "模糊返回符合所输申请人名称相符的权限记录"
    },
    {
      "action": "输入不存在的权限记录的用户名称",
      "expected": "返回结果为空"
    },
    {
      "action": "输入已存在的权限记录的数据表",
      "expected": "模糊返回符合所输数据表名相符的权限记录"
    },
    {
      "action": "输入不存在的权限记录的数据表",
      "expected": "返回结果为空"
    }
  ]
} as const;

test.describe("验证权限回收列表-搜索功能正确", () => {
  test("C0402 验证权限回收列表-搜索功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
