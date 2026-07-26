// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C273",
  "title": "验证左侧模型元素支持删除的操作",
  "steps": [
    {
      "action": "选择一个已被规范设计应用的模型元素，点击删除icon",
      "expected": "二次弹窗提示：删除模型元素，会在已引用该元素的规范设计中同步删除该元素信息"
    },
    {
      "action": "点击确定",
      "expected": "左侧模型元素列表删除该模型元素\n引用了该模型元素的数仓层级删除该模型元素"
    }
  ]
} as const;

test.describe("验证左侧模型元素支持删除的操作", () => {
  test("C273 验证左侧模型元素支持删除的操作", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
