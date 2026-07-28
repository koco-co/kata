// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0399",
  "title": "验证权限回收交互功能正常",
  "steps": [
    {
      "action": "点击某“未回收”状态的授权记录的【权限回收】按钮",
      "expected": "显示“权限回收”弹窗，弹窗内容如下：\n\t文案：是否确认进行权限回收，回收后用户将无法拥有此项权限。\n\t按钮：【取消】/【确定】"
    },
    {
      "action": "位置：“权限回收”弹窗；\n点击【确定】",
      "expected": "弹窗消失；\ntoast提示“权限回收成功”"
    },
    {
      "action": "位置：“权限回收”弹窗；\n点击【取消】",
      "expected": "弹窗消失；"
    }
  ]
} as const;

test.describe("验证权限回收交互功能正常", () => {
  test("C0399 验证权限回收交互功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
