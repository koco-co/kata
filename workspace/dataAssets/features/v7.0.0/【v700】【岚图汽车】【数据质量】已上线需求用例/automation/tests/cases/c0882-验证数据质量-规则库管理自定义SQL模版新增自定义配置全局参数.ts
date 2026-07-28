// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0882",
  "title": "验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置】全局参数",
  "steps": [
    {
      "action": "点击全局参数",
      "expected": "成功出现全局参数弹框"
    },
    {
      "action": "查看内容",
      "expected": "内容正正确"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置】全局参数", () => {
  test("C0882 验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置】全局参数", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
