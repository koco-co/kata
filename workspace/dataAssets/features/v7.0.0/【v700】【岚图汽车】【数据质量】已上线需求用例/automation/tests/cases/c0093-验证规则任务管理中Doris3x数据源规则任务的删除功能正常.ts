// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0093",
  "title": "验证「规则任务管理」中 Doris 3.x 数据源规则任务的删除功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择一条规则任务, 点击删除按钮",
      "expected": "删除成功"
    }
  ]
} as const;

test.describe("验证「规则任务管理」中 Doris 3.x 数据源规则任务的删除功能正常", () => {
  test("C0093 验证「规则任务管理」中 Doris 3.x 数据源规则任务的删除功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
