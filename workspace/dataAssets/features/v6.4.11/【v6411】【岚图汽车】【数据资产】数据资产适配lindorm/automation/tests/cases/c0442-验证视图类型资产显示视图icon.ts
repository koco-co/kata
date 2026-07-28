// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0442",
  "title": "验证视图类型资产显示“视图”icon",
  "steps": [
    {
      "action": "进入【数据安全-数据脱敏管理】；\n点击【脱敏应用】；\n弹窗中选择数据源类型、数据源、数据库；\n查看表下拉选项",
      "expected": "列表中视图名右侧显示视图icon"
    }
  ]
} as const;

test.describe("验证视图类型资产显示“视图”icon", () => {
  test("C0442 验证视图类型资产显示“视图”icon", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
