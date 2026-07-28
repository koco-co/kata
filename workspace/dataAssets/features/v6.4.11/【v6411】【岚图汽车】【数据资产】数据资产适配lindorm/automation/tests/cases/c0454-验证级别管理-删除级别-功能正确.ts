// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0454",
  "title": "验证级别管理-删除级别-功能正确",
  "steps": [
    {
      "action": "点击存在已有字段分级的级别的「删除」",
      "expected": "弹窗二次确认：“您确认要删除吗？”【确认/取消】"
    },
    {
      "action": "点击确定",
      "expected": "全局提示：“「XX」级别下存在分级字段，需要下架该级别下的全部分级字段才能删除该级别!”"
    },
    {
      "action": "点击不存在已有字段分级的级别的「删除」",
      "expected": "弹窗二次确认：“您确认要删除吗？”【确认/取消】"
    },
    {
      "action": "点击确定",
      "expected": "全局提示：“删除成功！”\n“手动分级”、“自动分级”、“分级数据”页面的级别枚举值删除该级别"
    }
  ]
} as const;

test.describe("验证级别管理-删除级别-功能正确", () => {
  test("C0454 验证级别管理-删除级别-功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
