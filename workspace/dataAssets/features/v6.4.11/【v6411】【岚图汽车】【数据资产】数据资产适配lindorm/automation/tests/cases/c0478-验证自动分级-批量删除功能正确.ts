// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0478",
  "title": "验证自动分级-批量删除功能正确",
  "steps": [
    {
      "action": "不勾选规则，查看删除按钮",
      "expected": "删除按钮置灰，不可点击"
    },
    {
      "action": "勾选规则，查看删除按钮",
      "expected": "删除按钮变为白色可点击状态"
    },
    {
      "action": "勾选状态为已生效的规则，点击删除按钮",
      "expected": "弹窗提示：“您确认要删除吗？”【确认/取消】"
    },
    {
      "action": "点击确认",
      "expected": "提示：“删除成功！”"
    }
  ]
} as const;

test.describe("验证自动分级-批量删除功能正确", () => {
  test("C0478 验证自动分级-批量删除功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
