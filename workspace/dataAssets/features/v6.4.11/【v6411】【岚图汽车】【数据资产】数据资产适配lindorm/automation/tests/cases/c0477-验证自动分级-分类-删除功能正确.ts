// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0477",
  "title": "验证自动分级-分类-删除功能正确",
  "steps": [
    {
      "action": "点击不存在子类别或规则的分类删除icon",
      "expected": "弹窗提示：“删除分类时，会同步删除该分类下的子节点、规则，是否确认删除？”"
    },
    {
      "action": "点击确认",
      "expected": "该分类删除成功"
    },
    {
      "action": "点击存在子类别的分类删除icon",
      "expected": "弹窗提示：“删除分类时，会同步删除该分类下的子节点、规则，是否确认删除？”"
    },
    {
      "action": "点击确认",
      "expected": "分类与分类下的子分类都被删除成功"
    },
    {
      "action": "点击存在正在分级中规则的分类删除icon",
      "expected": "弹框提示：“该分类下存在分级中的规则，暂时无法删除，请分级结束后再删除！”"
    },
    {
      "action": "点击存在分级数据的分类删除icon",
      "expected": "弹窗提示：“该分类下存在分级字段，需要下架该分类下的全部分级字段才可以删除分类”"
    },
    {
      "action": "点击既存在正在分级中规则又存在分级数据的分类删除icon",
      "expected": "弹窗提示：“该分类下存在分级中的规则，暂时无法删除，请分级结束后再删除！”"
    }
  ]
} as const;

test.describe("验证自动分级-分类-删除功能正确", () => {
  test("C0477 验证自动分级-分类-删除功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
