// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0180",
  "title": "验证已订阅的数据表详情页展示",
  "steps": [
    {
      "action": "1.进入【元数据】-【数据地图】，点击数据表，点击xx表\n2.查看xx表订阅状态",
      "expected": "xx表右上显示修改订阅按钮"
    }
  ]
} as const;

test.describe("验证已订阅的数据表详情页展示", () => {
  test("C0180 验证已订阅的数据表详情页展示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
