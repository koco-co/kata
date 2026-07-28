// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0871",
  "title": "验证【数据质量-规则库管理 自定义SQL模版】搜索",
  "steps": [
    {
      "action": "提示词：请输入规则名称进行搜索",
      "expected": "提示词正确"
    },
    {
      "action": "支持规则名称搜索输入模糊搜索",
      "expected": "搜索结果正确"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版】搜索", () => {
  test("C0871 验证【数据质量-规则库管理 自定义SQL模版】搜索", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
