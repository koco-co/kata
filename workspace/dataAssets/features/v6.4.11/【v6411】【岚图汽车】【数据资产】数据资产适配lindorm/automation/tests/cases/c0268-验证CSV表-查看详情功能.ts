// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0268",
  "title": "验证CSV表-查看详情功能",
  "steps": [
    {
      "action": "进入表详情页",
      "expected": "所建表的基本信息、技术属性、字段信息、建表语句等信息正确"
    }
  ]
} as const;

test.describe("验证CSV表-查看详情功能", () => {
  test("C0268 验证CSV表-查看详情功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
