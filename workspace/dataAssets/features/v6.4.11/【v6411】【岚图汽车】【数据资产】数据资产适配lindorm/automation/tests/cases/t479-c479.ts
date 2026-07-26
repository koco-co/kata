// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C479",
  "title": "验证自动分级-规则详情-编辑规则功能正确",
  "steps": [
    {
      "action": "点击「编辑规则」",
      "expected": "跳转至编辑规则界面\n除规则名称不可编辑，其他为可编辑状态"
    },
    {
      "action": "编辑内容，点击「立即生效」",
      "expected": "跳转至分级设置界面"
    },
    {
      "action": "点击该规则名称，查看规则详情页",
      "expected": "规则详情显示为编辑后的内容，生效时间更新为编辑后生效时间"
    }
  ]
} as const;

test.describe("验证自动分级-规则详情-编辑规则功能正确", () => {
  test("C479 验证自动分级-规则详情-编辑规则功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
