// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0243",
  "title": "验证词根管理-编辑",
  "steps": [
    {
      "action": "点击编辑",
      "expected": "弹出编辑词根弹窗"
    },
    {
      "action": "编辑内容，点击确定",
      "expected": "1）提示编辑词根成功！\n2）该词根显示为编辑后的内容"
    }
  ]
} as const;

test.describe("验证词根管理-编辑", () => {
  test("C0243 验证词根管理-编辑", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
