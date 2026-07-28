// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0003",
  "title": "验证【离线任务】任务数量统计正确",
  "steps": [
    {
      "action": "1. 在离线平台（项目 env_rebuild_test）新增 SQL 建表任务，目标表为 test_table\n2. 点击【临时运行】或【提交】",
      "expected": "【离线任务】任务统计数量显示 M+1，页面数字与操作前相差恰好为 1"
    }
  ]
} as const;

test.describe("验证【离线任务】任务数量统计正确", () => {
  test("C0003 验证【离线任务】任务数量统计正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
