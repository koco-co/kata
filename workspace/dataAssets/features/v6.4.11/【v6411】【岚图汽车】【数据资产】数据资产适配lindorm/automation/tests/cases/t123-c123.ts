// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C123",
  "title": "验证【元数据同步】_【表索引】同步正确",
  "steps": [
    {
      "action": "1）通过元数据同步${TABLE_NAME}表",
      "expected": "${TABLE_NAME}表详情页-表结构-索引TAB页数据正确"
    },
    {
      "action": "1）离线创建${TABLE_NAME}表",
      "expected": "${TABLE_NAME}表详情页-表结构-索引TAB页数据正确"
    }
  ]
} as const;

test.describe("验证【元数据同步】_【表索引】同步正确", () => {
  test("C123 验证【元数据同步】_【表索引】同步正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
