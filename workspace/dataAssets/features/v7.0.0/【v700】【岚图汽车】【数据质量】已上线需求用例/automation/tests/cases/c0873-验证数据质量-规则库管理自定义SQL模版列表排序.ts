// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0873",
  "title": "验证【数据质量-规则库管理 自定义SQL模版】列表排序",
  "steps": [
    {
      "action": "1. 按照修改时间倒排",
      "expected": "1. 排序正确"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版】列表排序", () => {
  test("C0873 验证【数据质量-规则库管理 自定义SQL模版】列表排序", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
