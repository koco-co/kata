// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0470",
  "title": "验证手动分级-发布功能正确",
  "steps": [
    {
      "action": "当前界面同一个字段对应不同的分级，点击发布",
      "expected": "发布成功，列表该字段对应级别更高的分级"
    },
    {
      "action": "当前界面同一个分级对应多个字段，点击发布",
      "expected": "发布成功，列表显示所有字段对应的分级"
    }
  ]
} as const;

test.describe("验证手动分级-发布功能正确", () => {
  test("C0470 验证手动分级-发布功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
