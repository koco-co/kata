// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0181",
  "title": "验证修改订阅功能",
  "steps": [
    {
      "action": "1.进入【元数据】-【数据地图】，点击数据表，点击xx表\n2.点击修改订阅按钮\n3.修改订阅内容确定\n4.再次点击修改订阅",
      "expected": "1.弹出小提示：订阅成功！\n2.订阅弹窗回显，修改的内容"
    }
  ]
} as const;

test.describe("验证修改订阅功能", () => {
  test("C0181 验证修改订阅功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
