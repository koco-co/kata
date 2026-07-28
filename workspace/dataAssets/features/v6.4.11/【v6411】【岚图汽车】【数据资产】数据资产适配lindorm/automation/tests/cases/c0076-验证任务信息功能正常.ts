// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0076",
  "title": "验证【任务信息】功能正常",
  "steps": [
    {
      "action": "点击表详情【任务信息】按钮",
      "expected": "展示“任务名称”“任务名称复制按钮”“查看详情按钮”“任务SQL按钮”“任务类型”“责任人”“创建时间”“最近修改人”“最近修改时间”“描述”"
    },
    {
      "action": "点击【任务SQL】按钮",
      "expected": "弹【查看SQL】弹窗，展示任务SQL内容，【取消】【复制】【关闭弹窗】按钮"
    },
    {
      "action": "点击【查看SQL】-【复制】按钮",
      "expected": "任务SQL内容复制成功"
    }
  ]
} as const;

test.describe("验证【任务信息】功能正常", () => {
  test("C0076 验证【任务信息】功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
