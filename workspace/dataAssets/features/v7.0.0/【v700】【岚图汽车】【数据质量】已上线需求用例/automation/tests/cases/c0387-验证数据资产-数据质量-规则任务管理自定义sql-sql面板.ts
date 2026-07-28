// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0387",
  "title": "验证【「数据资产」-「数据质量」-「规则任务管理」】自定义sql-sql面板",
  "steps": [
    {
      "action": "1. 引用规则选择「自定义模版」",
      "expected": "1. sql面板正常回显sql模版填写的sql，且不支持编辑；若引用的sql模版填写SQL发生变更，规则编辑更新"
    }
  ]
} as const;

test.describe("验证【「数据资产」-「数据质量」-「规则任务管理」】自定义sql-sql面板", () => {
  test("C0387 验证【「数据资产」-「数据质量」-「规则任务管理」】自定义sql-sql面板", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
