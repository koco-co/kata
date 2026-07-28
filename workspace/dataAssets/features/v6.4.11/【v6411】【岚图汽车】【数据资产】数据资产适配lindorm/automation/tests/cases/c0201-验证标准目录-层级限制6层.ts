// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0201",
  "title": "验证标准目录-层级限制6层",
  "steps": [
    {
      "action": "1)目录添加至6层\n2)点击第六层目录右侧的“...”",
      "expected": "1）弹出小弹窗\n2）弹窗仅显示“编辑”，“删除”可选项"
    }
  ]
} as const;

test.describe("验证标准目录-层级限制6层", () => {
  test("C0201 验证标准目录-层级限制6层", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
