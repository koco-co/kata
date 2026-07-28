// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0878",
  "title": "验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】关联范围 选择枚举 字段级/表级/多表",
  "steps": [
    {
      "action": "选择枚举",
      "expected": "字段级/表级/多表"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】关联范围 选择枚举 字段级/表级/多表", () => {
  test("C0878 验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】关联范围 选择枚举 字段级/表级/多表", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
