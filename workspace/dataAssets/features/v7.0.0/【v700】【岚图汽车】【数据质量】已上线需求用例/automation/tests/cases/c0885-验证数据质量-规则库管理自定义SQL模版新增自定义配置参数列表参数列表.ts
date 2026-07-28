// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0885",
  "title": "验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置 参数列表】参数列表",
  "steps": [
    {
      "action": "参数来源sql输入的参数${xxxx}",
      "expected": "保存一致"
    },
    {
      "action": "排序",
      "expected": "顺序，去重"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置 参数列表】参数列表", () => {
  test("C0885 验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置 参数列表】参数列表", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
