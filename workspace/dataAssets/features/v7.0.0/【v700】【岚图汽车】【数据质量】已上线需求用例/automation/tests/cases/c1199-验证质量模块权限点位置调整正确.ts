// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1199",
  "title": "验证「质量模块」权限点位置调整正确",
  "steps": [
    {
      "action": "进入「资产」-「平台管理」-「角色管理」页面",
      "expected": "进入成功"
    },
    {
      "action": "查看【数据质量报告】",
      "expected": "质量报告调整到\"校验结果查询\"下方"
    }
  ]
} as const;

test.describe("验证「质量模块」权限点位置调整正确", () => {
  test("C1199 验证「质量模块」权限点位置调整正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
