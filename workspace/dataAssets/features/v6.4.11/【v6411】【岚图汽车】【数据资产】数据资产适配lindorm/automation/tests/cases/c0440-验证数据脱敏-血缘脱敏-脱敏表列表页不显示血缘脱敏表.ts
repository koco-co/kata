// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0440",
  "title": "验证数据脱敏-血缘脱敏-脱敏表列表页不显示“血缘脱敏表”",
  "steps": [
    {
      "action": "位置：「数据安全」-「数据脱敏管理」\n进入脱敏规则的脱敏表列表页；\n查看列表",
      "expected": "不显示“血缘脱敏表”列"
    }
  ]
} as const;

test.describe("验证数据脱敏-血缘脱敏-脱敏表列表页不显示“血缘脱敏表”", () => {
  test("C0440 验证数据脱敏-血缘脱敏-脱敏表列表页不显示“血缘脱敏表”", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
