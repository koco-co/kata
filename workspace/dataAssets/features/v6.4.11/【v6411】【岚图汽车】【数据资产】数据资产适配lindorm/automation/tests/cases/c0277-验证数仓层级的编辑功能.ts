// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0277",
  "title": "验证数仓层级的编辑功能",
  "steps": [
    {
      "action": "点击编辑",
      "expected": "弹出编辑弹窗\n弹窗内容同新建，所有内容均可编辑修改"
    },
    {
      "action": "编辑中文名称、英文名称、绑定数据库、描述信息，点击确定",
      "expected": "列表中该数仓层级信息显示为编辑后的信息\n规范建表的数仓层级目录信息更新为编辑后的内容\n规范建表的新建和编辑界面中的数仓层级下拉框内容也更新为编辑后的内容"
    }
  ]
} as const;

test.describe("验证数仓层级的编辑功能", () => {
  test("C0277 验证数仓层级的编辑功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
