// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C104",
  "title": "验证视图元数据导出正确",
  "steps": [
    {
      "action": "视图详情页，导出元数据",
      "expected": "导出的文件内容正确"
    },
    {
      "action": "元数据管理页，导出元数据",
      "expected": "导出的文件内容正确"
    }
  ]
} as const;

test.describe("验证视图元数据导出正确", () => {
  test("C104 验证视图元数据导出正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
