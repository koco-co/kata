// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C418",
  "title": "验证「我的权限查看」-“数据目录”树状目录数据正确",
  "steps": [
    {
      "action": "查看默认状态下，数据目录",
      "expected": "数据目录及展开后数据正确"
    },
    {
      "action": "搜索目录",
      "expected": "搜索结果正确"
    }
  ]
} as const;

test.describe("验证「我的权限查看」-“数据目录”树状目录数据正确", () => {
  test("C418 验证「我的权限查看」-“数据目录”树状目录数据正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
