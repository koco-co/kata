// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0138",
  "title": "验证个性业务属性-子模型新增功能-逻辑正常",
  "steps": [
    {
      "action": "输入子模型名称、描述，点击【确定】",
      "expected": "列表中展示新建的子模型信息"
    }
  ]
} as const;

test.describe("验证个性业务属性-子模型新增功能-逻辑正常", () => {
  test("C0138 验证个性业务属性-子模型新增功能-逻辑正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
