// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0403",
  "title": "验证权限回收列表-分页功能正确",
  "steps": [
    {
      "action": "“上一页”/“下一页”翻页",
      "expected": "“上一页”数据正确；“下一页”数据正确"
    },
    {
      "action": "指定页码翻页",
      "expected": "数据正确"
    },
    {
      "action": "筛选后翻页：\n先进行筛选查询；\n再进行翻页",
      "expected": "数据正确"
    },
    {
      "action": "翻页后筛选：\n先翻页到最后一页（最后一页数据小于每页最大条数）；\n再进行筛选查询（筛选后页数要小于筛选前页数）",
      "expected": "页码更新为第一页；筛选数据正确"
    }
  ]
} as const;

test.describe("验证权限回收列表-分页功能正确", () => {
  test("C0403 验证权限回收列表-分页功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
