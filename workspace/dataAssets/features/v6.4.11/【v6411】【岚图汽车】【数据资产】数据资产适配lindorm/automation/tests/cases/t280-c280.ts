// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C280",
  "title": "验证「审批中」页面操作下的的撤回功能",
  "steps": [
    {
      "action": "点击「审批中」页面审批申请的撤回按钮",
      "expected": "二次弹窗确认：\n确认撤回审批申请？\n撤回后表将维持提交审批前状态"
    },
    {
      "action": "点击否",
      "expected": "列表还存在该审批申请"
    },
    {
      "action": "点击是",
      "expected": "全局提示：操作成功；\n「审批中」页面列表不显示该审批申请；\n「已审批」页面列表显示该审批申请，状态显示为已撤回"
    }
  ]
} as const;

test.describe("验证「审批中」页面操作下的的撤回功能", () => {
  test("C280 验证「审批中」页面操作下的的撤回功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
