// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0455",
  "title": "验证级别管理-批量删除级别-功能正确",
  "steps": [
    {
      "action": "不勾选级别，查看「删除」按钮",
      "expected": "「删除」按钮置灰，不可点击"
    },
    {
      "action": "勾选一个存在已有字段分级的级别，点击「删除」按钮",
      "expected": "弹窗二次确认：“您确认要删除吗？”【确认/取消】"
    },
    {
      "action": "点击确认",
      "expected": "全局提示：“该级别下存在分级字段，需要下架该级别下的全部分级字段才可以删除该级别!”"
    },
    {
      "action": "勾选一个不存在已有字段分级的级别，点击「删除」按钮",
      "expected": "弹窗二次确认：“您确认要删除吗？”【确认/取消】"
    },
    {
      "action": "点击确认",
      "expected": "全局提示：“删除成功！”；\n“手动分级”、“自动分级”、“分级数据”页面的级别枚举值删除该级别"
    },
    {
      "action": "勾选多个存在已有字段分级的级别和1个不存在已有字段分级的级别，点击「删除」按钮",
      "expected": "弹窗二次确认：“您确认要删除吗？”【确认/取消】"
    },
    {
      "action": "点击确认",
      "expected": "全局提示：“1个级别删除成功，**、**级别下存在分级字段，需要下架该级别下的全部分级字段才可以删除级别”；\n“手动分级”、“自动分级”、“分级数据”页面的级别枚举值删除被删除成功的级别"
    }
  ]
} as const;

test.describe("验证级别管理-批量删除级别-功能正确", () => {
  test("C0455 验证级别管理-批量删除级别-功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
