// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0068",
  "title": "验证【Z- score置信区间 周期调度】监控规则Z- score置信区间时表校验正常",
  "steps": [
    {
      "action": "1. 对于规则任务zhixin_01，次日实例生成后查看任务实例",
      "expected": "1. 实例状态显示校验通过"
    }
  ]
} as const;

test.describe("验证【Z- score置信区间 周期调度】监控规则Z- score置信区间时表校验正常", () => {
  test("C0068 验证【Z- score置信区间 周期调度】监控规则Z- score置信区间时表校验正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
