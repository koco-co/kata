// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0876",
  "title": "验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】规则分类",
  "steps": [
    {
      "action": "提示词：请选择",
      "expected": "提示词正确"
    },
    {
      "action": "选择枚举",
      "expected": "完整性/唯一性/有效性/统计性/时效性/合理性"
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

test.describe("验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】规则分类", () => {
  test("C0876 验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】规则分类", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
