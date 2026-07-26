// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C142",
  "title": "验证个性业务属性-子模型应用数据库功能-逻辑正常",
  "steps": [
    {
      "action": "对子模型${X}，选择未应用的数据库${A}进行应用数据库操作",
      "expected": "列表中该模型的“已应用库数量”+1"
    },
    {
      "action": "进入该数据库${A}下的任意表详情页，查看「业务属性」",
      "expected": "显示该子模型下所有个性属性"
    }
  ]
} as const;

test.describe("验证个性业务属性-子模型应用数据库功能-逻辑正常", () => {
  test("C142 验证个性业务属性-子模型应用数据库功能-逻辑正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
