// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0258",
  "title": "验证引用码表功能",
  "steps": [
    {
      "action": "1.选择模板下拉框选择代码表\n2.点击引用码表\n3.选择同级目录引入",
      "expected": "码表管理目录下成功引入同级码表"
    },
    {
      "action": "1.选择模板下拉框选择代码表\n2.点击引用码表\n3.选择子级目录引入",
      "expected": "码表管理目录下成功引入子级码表"
    }
  ]
} as const;

test.describe("验证引用码表功能", () => {
  test("C0258 验证引用码表功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
