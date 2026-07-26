// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C484",
  "title": "验证数据源自动引入设置-关闭自动引入设置逻辑正确",
  "steps": [
    {
      "action": "关闭“自动引入设置”",
      "expected": "1）“数据源类型“自动更新为“全部”；\n2）【编辑】按钮为禁用状态"
    }
  ]
} as const;

test.describe("验证数据源自动引入设置-关闭自动引入设置逻辑正确", () => {
  test("C484 验证数据源自动引入设置-关闭自动引入设置逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
