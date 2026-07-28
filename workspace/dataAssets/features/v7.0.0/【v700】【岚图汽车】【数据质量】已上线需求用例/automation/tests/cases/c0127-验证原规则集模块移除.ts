// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0127",
  "title": "验证原「规则集」模块移除",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "【规则任务管理】页面UI CHECK",
      "expected": "不展示【规则集】模块"
    }
  ]
} as const;

test.describe("验证原「规则集」模块移除", () => {
  test("C0127 验证原「规则集」模块移除", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
