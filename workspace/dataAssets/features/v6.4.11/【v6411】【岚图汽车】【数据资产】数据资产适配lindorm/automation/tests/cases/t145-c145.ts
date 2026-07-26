// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C145",
  "title": "验证个性业务属性-子模型查询功能正常",
  "steps": [
    {
      "action": "查看列表",
      "expected": "展示当前租户下该元模型下所有未删除子模型"
    },
    {
      "action": "展开子模型",
      "expected": "显示该子模型下的所有未删除的个性属性信息"
    }
  ]
} as const;

test.describe("验证个性业务属性-子模型查询功能正常", () => {
  test("C145 验证个性业务属性-子模型查询功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
