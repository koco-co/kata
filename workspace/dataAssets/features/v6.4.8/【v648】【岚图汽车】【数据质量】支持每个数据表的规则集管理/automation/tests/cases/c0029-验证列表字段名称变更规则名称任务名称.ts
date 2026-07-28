// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0029",
  "title": "验证列表字段名称变更(规则名称 ❯ 任务名称)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "检查规则任务管理列表字段",
      "expected": "原列表字段名称(规则名称)变更为: 任务名称"
    }
  ]
} as const;

test.describe("验证列表字段名称变更(规则名称 ❯ 任务名称)", () => {
  test("C0029 验证列表字段名称变更(规则名称 ❯ 任务名称)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
