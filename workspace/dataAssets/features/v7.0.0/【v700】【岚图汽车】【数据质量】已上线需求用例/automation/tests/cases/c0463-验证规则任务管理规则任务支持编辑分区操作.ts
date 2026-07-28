// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0463",
  "title": "验证【规则任务管理❯】规则任务支持编辑分区操作",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择规则任务A, 进入编辑页",
      "expected": "1) 分区配置处于可编辑状态2) 分区配置信息回显正常"
    }
  ]
} as const;

test.describe("验证【规则任务管理❯】规则任务支持编辑分区操作", () => {
  test("C0463 验证【规则任务管理❯】规则任务支持编辑分区操作", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
