// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0141",
  "title": "验证个性业务属性-子模型应用数据库功能-交互正常",
  "steps": [
    {
      "action": "选择某子模型，点击【应用数据库】",
      "expected": "显示应用数据库弹窗"
    },
    {
      "action": "不选择数据源或数据库，点击【确定】",
      "expected": "提示必填信息"
    },
    {
      "action": "选择数据源",
      "expected": "数据库下拉项为所选数据源下所有已同步的数据库"
    },
    {
      "action": "选择数据源、数据库，点击【确定】",
      "expected": "提示提交成功"
    }
  ]
} as const;

test.describe("验证个性业务属性-子模型应用数据库功能-交互正常", () => {
  test("C0141 验证个性业务属性-子模型应用数据库功能-交互正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
