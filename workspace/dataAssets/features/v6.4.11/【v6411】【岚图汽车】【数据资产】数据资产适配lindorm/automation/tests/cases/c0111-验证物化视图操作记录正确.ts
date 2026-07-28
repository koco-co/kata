// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0111",
  "title": "验证物化视图操作记录正确",
  "steps": [
    {
      "action": "离线执行物化视图的CREATE操作",
      "expected": "操作记录中记录对应的语句并记为DDL操作"
    },
    {
      "action": "离线执行物化视图的ALTER操作",
      "expected": "操作记录中记录对应的语句并记为DDL操作"
    },
    {
      "action": "离线执行物化视图的REFRESH操作",
      "expected": "操作记录中记录对应的语句并记为DML操作"
    }
  ]
} as const;

test.describe("验证物化视图操作记录正确", () => {
  test("C0111 验证物化视图操作记录正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
