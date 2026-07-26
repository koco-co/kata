// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C489",
  "title": "验证离线项目自动引入meta数据源",
  "steps": [
    {
      "action": "离线创建项目，对接数据源计算引擎",
      "expected": "资产数据源管理自动引入该项目的meta数据源，资产元数据同步页面，新增对应meta数据源的周期同步任务"
    }
  ]
} as const;

test.describe("验证离线项目自动引入meta数据源", () => {
  test("C489 验证离线项目自动引入meta数据源", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
