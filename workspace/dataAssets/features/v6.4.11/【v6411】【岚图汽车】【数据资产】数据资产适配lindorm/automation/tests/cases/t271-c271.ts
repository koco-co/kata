// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C271",
  "title": "验证元素值支持删除的操作",
  "steps": [
    {
      "action": "点击元素值的删除icon",
      "expected": "二次弹窗确认：删除元素，将同步删除规范设计和规范建表中已引用和维护的元素信息\n取消    删除"
    },
    {
      "action": "点击删除",
      "expected": "该元素值以及子节点元素值都被删除\n引用该元素值的规范设计及规范建表中该元素值也被删除成功"
    }
  ]
} as const;

test.describe("验证元素值支持删除的操作", () => {
  test("C271 验证元素值支持删除的操作", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
