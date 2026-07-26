// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C061",
  "title": "验证【表结构】-【建表语句】模块功能正常",
  "steps": [
    {
      "action": "点击【建表语句】按钮",
      "expected": "建表语句显示正确"
    },
    {
      "action": "复制建表语句，去底层执行SQL",
      "expected": "执行成功"
    }
  ]
} as const;

test.describe("验证【表结构】-【建表语句】模块功能正常", () => {
  test("C061 验证【表结构】-【建表语句】模块功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
