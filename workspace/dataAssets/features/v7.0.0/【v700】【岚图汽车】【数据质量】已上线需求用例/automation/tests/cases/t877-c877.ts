// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C877",
  "title": "验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】关联范围 提示词：请选择 提示词正确",
  "steps": [
    {
      "action": "提示词：请选择",
      "expected": "提示词正确"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】关联范围 提示词：请选择 提示词正确", () => {
  test("C877 验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】关联范围 提示词：请选择 提示词正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
