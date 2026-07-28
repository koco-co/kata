// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0022",
  "title": "验证词根管理-删除",
  "steps": [
    {
      "action": "点击删除并二次确认",
      "expected": "1）提示删除成功；\n2）词根列表删除该词根"
    }
  ]
} as const;

test.describe("验证词根管理-删除", () => {
  test("C0022 验证词根管理-删除", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
