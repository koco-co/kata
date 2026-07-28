// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0411",
  "title": "验证审计中心，权限回收日志筛选查询正确",
  "steps": [
    {
      "action": "根据“操作模块”筛选",
      "expected": "筛选结果包含权限回收日志"
    },
    {
      "action": "根据“动作”筛选",
      "expected": "筛选结果包含权限回收日志"
    }
  ]
} as const;

test.describe("验证审计中心，权限回收日志筛选查询正确", () => {
  test("C0411 验证审计中心，权限回收日志筛选查询正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
