// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C990",
  "title": "验证历史质量报告内，质量评估汇总命名变更",
  "steps": [
    {
      "action": "进入「数据质量-质量报告」，查看table1质量报告",
      "expected": "进入成功"
    },
    {
      "action": "查看报告内，质量评估汇总后的名称",
      "expected": "展示表名_任务名称，即table1_test_rule"
    }
  ]
} as const;

test.describe("验证历史质量报告内，质量评估汇总命名变更", () => {
  test("C990 验证历史质量报告内，质量评估汇总命名变更", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
