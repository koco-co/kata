// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0257",
  "title": "验证行业模板列表展示",
  "steps": [
    {
      "action": "显示\"行业模版\"下拉框，搜索框，【引用标准】按钮，行业模板列表",
      "expected": "操作成功"
    }
  ]
} as const;

test.describe("验证行业模板列表展示", () => {
  test("C0257 验证行业模板列表展示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
