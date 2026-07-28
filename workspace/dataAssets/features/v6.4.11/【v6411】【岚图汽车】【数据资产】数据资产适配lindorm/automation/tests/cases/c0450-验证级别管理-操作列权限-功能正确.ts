// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0450",
  "title": "验证级别管理-操作列权限-功能正确",
  "steps": [
    {
      "action": "admin进入级别管理页",
      "expected": "有编辑、删除、置顶权限"
    },
    {
      "action": "管理员进入级别管理页",
      "expected": "有编辑、删除、置顶权限"
    },
    {
      "action": "数据开发进入级别管理页",
      "expected": "有无编辑、删除、置顶权限"
    },
    {
      "action": "数据访客进入级别管理页",
      "expected": "有无编辑、删除、置顶、申请权限权限"
    }
  ]
} as const;

test.describe("验证级别管理-操作列权限-功能正确", () => {
  test("C0450 验证级别管理-操作列权限-功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
