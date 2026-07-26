// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1200",
  "title": "验证「质量模块」权限点名称调整正确",
  "steps": [
    {
      "action": "进入「资产」-「平台管理」-「角色管理」页面",
      "expected": "进入成功"
    },
    {
      "action": "查看「数据质量」模块权限点名称",
      "expected": "1. 原「规则配置」更新为「规则任务管理」2. 原「任务查询」更新为「校验结果查询」"
    }
  ]
} as const;

test.describe("验证「质量模块」权限点名称调整正确", () => {
  test("C1200 验证「质量模块」权限点名称调整正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
