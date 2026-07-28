// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0041",
  "title": "验证数据分级分类各页面入口可正常进入",
  "steps": [
    {
      "action": "进入级别管理页面",
      "expected": "页面加载成功，\"添加级别\"按钮可见"
    },
    {
      "action": "进入自动分级页面",
      "expected": "页面加载成功，表格/卡片可见"
    },
    {
      "action": "进入分级数据页面",
      "expected": "页面加载成功，表格/卡片可见"
    }
  ]
} as const;

test.describe("验证数据分级分类各页面入口可正常进入", () => {
  test("C0041 验证数据分级分类各页面入口可正常进入", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
