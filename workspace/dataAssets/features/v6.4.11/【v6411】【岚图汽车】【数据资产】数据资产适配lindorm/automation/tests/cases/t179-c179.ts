// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C179",
  "title": "验证订阅功能",
  "steps": [
    {
      "action": "1.进入【元数据】-【数据地图】，点击数据表\n2.点击xx表右上角上的订阅",
      "expected": "弹出订阅弹窗"
    },
    {
      "action": "1.进入【元数据】-【数据地图】，点击数据表\n2.点击xx表右上角上的订阅\n3.告警方式选择邮箱/钉钉",
      "expected": "xx表的订阅状态由‘订阅’变为‘取消订阅’"
    }
  ]
} as const;

test.describe("验证订阅功能", () => {
  test("C179 验证订阅功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
