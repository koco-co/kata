// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C055",
  "title": "验证【格式-日期格式-datetime 周期调度】监控规则配置格式-日期格式-datetime时表校验正常",
  "steps": [
    {
      "action": "1. 对于规则任务datetime_01，次日实例生成后查看任务实例",
      "expected": "1. 实例状态显示校验通过"
    }
  ]
} as const;

test.describe("验证【格式-日期格式-datetime 周期调度】监控规则配置格式-日期格式-datetime时表校验正常", () => {
  test("C055 验证【格式-日期格式-datetime 周期调度】监控规则配置格式-日期格式-datetime时表校验正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
