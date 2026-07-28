// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0883",
  "title": "验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置】Sql面板",
  "steps": [
    {
      "action": "输入sql",
      "expected": "输入成功"
    },
    {
      "action": "sql支持参数化",
      "expected": "使用${xxxx}表示"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置】Sql面板", () => {
  test("C0883 验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置】Sql面板", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
