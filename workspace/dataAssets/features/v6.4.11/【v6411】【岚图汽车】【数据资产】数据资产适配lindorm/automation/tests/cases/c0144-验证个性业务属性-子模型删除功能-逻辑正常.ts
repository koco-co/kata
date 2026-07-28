// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0144",
  "title": "验证个性业务属性-子模型删除功能-逻辑正常",
  "steps": [
    {
      "action": "删除子模型${X}",
      "expected": "列表不显示子模型${X}"
    },
    {
      "action": "进入该子模型${X}应用库下的表详情页，查看「业务属性」",
      "expected": "不显示该子模型下所有个性属性"
    }
  ]
} as const;

test.describe("验证个性业务属性-子模型删除功能-逻辑正常", () => {
  test("C0144 验证个性业务属性-子模型删除功能-逻辑正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
