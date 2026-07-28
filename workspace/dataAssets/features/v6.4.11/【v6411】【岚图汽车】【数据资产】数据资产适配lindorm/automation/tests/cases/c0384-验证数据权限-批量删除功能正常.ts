// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0384",
  "title": "验证数据权限-「批量删除」功能正常",
  "steps": [
    {
      "action": "不勾选数据",
      "expected": "【批量删除】为不可点击状态"
    },
    {
      "action": "勾选数据，点击【批量删除】",
      "expected": "二次确认提示“请确认是否删除此项权限”"
    },
    {
      "action": "点击【确定】",
      "expected": "删除成功，列表数据刷新"
    }
  ]
} as const;

test.describe("验证数据权限-「批量删除」功能正常", () => {
  test("C0384 验证数据权限-「批量删除」功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
