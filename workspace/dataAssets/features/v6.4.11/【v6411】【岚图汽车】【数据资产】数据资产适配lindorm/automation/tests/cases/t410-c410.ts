// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C410",
  "title": "验证查看详情-数据正确",
  "steps": [
    {
      "action": "点击记录的【查看详情】",
      "expected": "弹出抽屉显示当前记录的申请权限信息以及申请理由以及回收状态"
    }
  ]
} as const;

test.describe("验证查看详情-数据正确", () => {
  test("C410 验证查看详情-数据正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
