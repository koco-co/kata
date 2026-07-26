// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C462",
  "title": "验证手动分级-添加功能正确",
  "steps": [
    {
      "action": "点击手动分级，进入添加手动分级页面",
      "expected": "操作成功"
    },
    {
      "action": "查看分类下拉项",
      "expected": "展示所有未删除的分类"
    },
    {
      "action": "检查“数据源类型”、“数据源”、“数据库”，以及手动分级栏中数据表、字段选项的级联查询",
      "expected": "级联查询功能正常"
    },
    {
      "action": "1）输入分类\n2）添加若干组分级和表、字段\n3）点击发布",
      "expected": "添加手动分级成功"
    }
  ]
} as const;

test.describe("验证手动分级-添加功能正确", () => {
  test("C462 验证手动分级-添加功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
