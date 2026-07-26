// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C385",
  "title": "验证【「数据资产」-「数据质量」-「规则任务管理」】自定义sql-规则类型",
  "steps": [
    {
      "action": "提示词：选择规则类型",
      "expected": "提示词正确"
    },
    {
      "action": "选择枚举",
      "expected": "规则类型支持选择完整性/唯一性/准确性/及时性/一致性/规范性"
    },
    {
      "action": "必选",
      "expected": "为空提示"
    },
    {
      "action": "仅支持单选",
      "expected": "选择成功"
    }
  ]
} as const;

test.describe("验证【「数据资产」-「数据质量」-「规则任务管理」】自定义sql-规则类型", () => {
  test("C385 验证【「数据资产」-「数据质量」-「规则任务管理」】自定义sql-规则类型", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
