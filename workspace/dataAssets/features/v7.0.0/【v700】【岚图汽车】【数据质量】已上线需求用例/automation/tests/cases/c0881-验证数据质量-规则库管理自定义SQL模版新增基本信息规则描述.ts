// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0881",
  "title": "验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】规则描述",
  "steps": [
    {
      "action": "提示词：请输入",
      "expected": "提示词正确"
    },
    {
      "action": "必填",
      "expected": "为空提示"
    },
    {
      "action": "最大支持输入255",
      "expected": "超长无法输入"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】规则描述", () => {
  test("C0881 验证【数据质量-规则库管理 自定义SQL模版 新增 基本信息】规则描述", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
