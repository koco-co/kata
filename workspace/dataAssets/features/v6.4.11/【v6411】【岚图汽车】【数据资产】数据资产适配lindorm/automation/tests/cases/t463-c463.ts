// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C463",
  "title": "验证手动分级-编辑功能正确",
  "steps": [
    {
      "action": "不修改级别和分类，点击确定",
      "expected": "编辑成功；\n列表数据不变；\n历史记录新增一条数据一样的历史记录数据；"
    },
    {
      "action": "修改级别和分类，点击取消",
      "expected": "编辑成功；\n列表数据不变；\n历史记录无新增；"
    },
    {
      "action": "修改级别和分类，点击确定",
      "expected": "编辑成功；\n列表数据显示修改后的数据；\n历史记录新增一条历史记录数据；"
    }
  ]
} as const;

test.describe("验证手动分级-编辑功能正确", () => {
  test("C463 验证手动分级-编辑功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
