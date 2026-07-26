// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C870",
  "title": "验证【数据质量-规则库管理 自定义SQL模版】新增「自定义SQL模版」tab",
  "steps": [
    {
      "action": "\"自定义正则\"tab右侧，已新增tab\"自定义sql模版\"",
      "expected": "名称正确"
    },
    {
      "action": "点击\"自定义sql模版\"tab",
      "expected": "显示\"自定义sql模版\"列表"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版】新增「自定义SQL模版」tab", () => {
  test("C870 验证【数据质量-规则库管理 自定义SQL模版】新增「自定义SQL模版」tab", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
