// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0425",
  "title": "验证表脱敏功能正常",
  "steps": [
    {
      "action": "1）准备“全部脱敏”类型规则\n2）“全部脱敏”脱敏应用XX表的username字段；\n3）查看该表数据预览",
      "expected": "该表username字段数据全脱敏"
    },
    {
      "action": "1）准备“部分脱敏”类型规则\n2）“部分脱敏”脱敏应用XX表的username字段；\n3）查看该表数据预览",
      "expected": "该表username字段数据部分脱敏"
    }
  ]
} as const;

test.describe("验证表脱敏功能正常", () => {
  test("C0425 验证表脱敏功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
