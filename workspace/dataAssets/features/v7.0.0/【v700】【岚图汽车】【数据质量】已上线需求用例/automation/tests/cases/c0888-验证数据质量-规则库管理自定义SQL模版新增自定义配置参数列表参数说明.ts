// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0888",
  "title": "验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置 参数列表】参数说明",
  "steps": [
    {
      "action": "非必填",
      "expected": "支持为空"
    },
    {
      "action": "最大支持输入255",
      "expected": "超长无法输入"
    },
    {
      "action": "支持在规则配置页面\"?\"悬浮查看",
      "expected": "内容和配置一致"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置 参数列表】参数说明", () => {
  test("C0888 验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置 参数列表】参数说明", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
