// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C281",
  "title": "验证「审批中」页面，点击表名的跳转功能",
  "steps": [
    {
      "action": "查看列表中表名的状态",
      "expected": "动作为新建的表名不可点击，其余表名显示为可点击状态"
    },
    {
      "action": "点击可点击状态的表名",
      "expected": "跳转至该表的元数据详情页"
    }
  ]
} as const;

test.describe("验证「审批中」页面，点击表名的跳转功能", () => {
  test("C281 验证「审批中」页面，点击表名的跳转功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
