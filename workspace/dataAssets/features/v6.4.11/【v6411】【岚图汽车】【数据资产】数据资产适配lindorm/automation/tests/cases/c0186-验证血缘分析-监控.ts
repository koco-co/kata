// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0186",
  "title": "验证血缘分析-监控",
  "steps": [
    {
      "action": "触发血缘分析定时任务；\ncurl -X POST localhost:8875/dmetadata/v1/scheduleJob/dbLineageStatistics",
      "expected": "1）任务执行成功未报错；\n2）统计数据正确"
    }
  ]
} as const;

test.describe("验证血缘分析-监控", () => {
  test("C0186 验证血缘分析-监控", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
