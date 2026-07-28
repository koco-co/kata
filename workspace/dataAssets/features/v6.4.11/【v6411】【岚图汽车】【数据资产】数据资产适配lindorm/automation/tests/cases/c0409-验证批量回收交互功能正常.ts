// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0409",
  "title": "验证批量回收交互功能正常",
  "steps": [
    {
      "action": "勾选N条“未回收”状态的授权记录；\n点击【批量回收】按钮",
      "expected": "显示“权限回收”弹窗，弹窗内容如下：\n\t文案：是否确认进行权限回收，回收后用户将无法拥有此项权限。\n\t按钮：【取消】/【确定】\n\n点击【确定】，提示“权限回收成功”；点击【取消】，弹窗消失"
    },
    {
      "action": "全选/手动勾选“已回收”记录",
      "expected": "“已回收“记录无法勾选"
    },
    {
      "action": "未勾选“未回收”状态的授权记录",
      "expected": "【批量回收】按钮为禁用状态"
    }
  ]
} as const;

test.describe("验证批量回收交互功能正常", () => {
  test("C0409 验证批量回收交互功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
