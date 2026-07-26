// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C880",
  "title": "验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】关联范围 仅支持单选 选择成功",
  "steps": [
    {
      "action": "仅支持单选",
      "expected": "选择成功"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】关联范围 仅支持单选 选择成功", () => {
  test("C880 验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】关联范围 仅支持单选 选择成功", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
