// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C879",
  "title": "验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】关联范围 必选 为空提示",
  "steps": [
    {
      "action": "必选",
      "expected": "为空提示"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】关联范围 必选 为空提示", () => {
  test("C879 验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】关联范围 必选 为空提示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
