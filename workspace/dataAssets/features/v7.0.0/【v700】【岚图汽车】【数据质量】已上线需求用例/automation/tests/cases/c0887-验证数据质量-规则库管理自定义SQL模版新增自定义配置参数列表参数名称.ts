// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0887",
  "title": "验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置 参数列表】参数名称",
  "steps": [
    {
      "action": "当类型选择当前校验表",
      "expected": "参数名称置灰无需配置"
    },
    {
      "action": "当类型选择其他类型",
      "expected": "支持输入"
    },
    {
      "action": "必填",
      "expected": "为空提示"
    },
    {
      "action": "最大支持输入50",
      "expected": "超长无法输入"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置 参数列表】参数名称", () => {
  test("C0887 验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置 参数列表】参数名称", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
