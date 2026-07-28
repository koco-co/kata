// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0283",
  "title": "验证「已审批」页面审批时间的排序功能",
  "steps": [
    {
      "action": "点击「已审批」页面的审批时间",
      "expected": "列表按照审批时间正序或倒序排序"
    }
  ]
} as const;

test.describe("验证「已审批」页面审批时间的排序功能", () => {
  test("C0283 验证「已审批」页面审批时间的排序功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
