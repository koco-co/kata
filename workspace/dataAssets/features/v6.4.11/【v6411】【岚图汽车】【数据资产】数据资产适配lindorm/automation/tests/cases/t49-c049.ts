// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C049",
  "title": "验证【搜索热度】排序功能正常",
  "steps": [
    {
      "action": "分别搜索表A/B/C 10/7/4次",
      "expected": "搜索正常"
    },
    {
      "action": "点击【搜索热度】升序排序",
      "expected": "表展示顺序为C、B、A"
    },
    {
      "action": "点击【搜索热度】降序排序",
      "expected": "表展示顺序为A、B、C"
    }
  ]
} as const;

test.describe("验证【搜索热度】排序功能正常", () => {
  test("C049 验证【搜索热度】排序功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
