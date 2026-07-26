// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C451",
  "title": "验证级别管理-内置级别-功能正确",
  "steps": [
    {
      "action": "点击级别管理，查看级别管理列表",
      "expected": "列表从上往下依次为：机密、秘密、核心商密、普通商密，内部、公开\n编号从上往下递增，1->6"
    }
  ]
} as const;

test.describe("验证级别管理-内置级别-功能正确", () => {
  test("C451 验证级别管理-内置级别-功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
