// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0140",
  "title": "验证个性业务属性-子模型编辑功能-逻辑正常",
  "steps": [
    {
      "action": "输入子模型名称、描述，点击【确定】",
      "expected": "列表中该子模型信息更新正确"
    }
  ]
} as const;

test.describe("验证个性业务属性-子模型编辑功能-逻辑正常", () => {
  test("C0140 验证个性业务属性-子模型编辑功能-逻辑正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
