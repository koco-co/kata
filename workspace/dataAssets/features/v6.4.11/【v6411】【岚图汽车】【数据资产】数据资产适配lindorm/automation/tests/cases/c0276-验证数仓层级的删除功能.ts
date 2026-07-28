// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0276",
  "title": "验证数仓层级的删除功能",
  "steps": [
    {
      "action": "点击删除",
      "expected": "弹窗二次确认：\n删除数仓层级，将同步删除该层级中的规范设计"
    },
    {
      "action": "点击确定",
      "expected": "全局提示：删除成功\n列表中该数仓层级被删除\n规范建表的数仓层级目录中该数仓层级被删除\n规范建表的新建和编辑界面中的数仓层级下拉框中该数仓层级也被删除"
    }
  ]
} as const;

test.describe("验证数仓层级的删除功能", () => {
  test("C0276 验证数仓层级的删除功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
