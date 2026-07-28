// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0441",
  "title": "验证数据脱敏-血缘脱敏-脱敏表查看血缘功能",
  "steps": [
    {
      "action": "脱敏表A无下游血缘表",
      "expected": "该脱敏表无【查看血缘】按钮；"
    },
    {
      "action": "脱敏表B有下游血缘表",
      "expected": "该脱敏表有【查看血缘】按钮；"
    },
    {
      "action": "点击脱敏表B的【查看血缘】",
      "expected": "跳转至脱敏表B的表详情页的“血缘关系”-“字段级血缘”页面；\n且血缘关系正确"
    }
  ]
} as const;

test.describe("验证数据脱敏-血缘脱敏-脱敏表查看血缘功能", () => {
  test("C0441 验证数据脱敏-血缘脱敏-脱敏表查看血缘功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
