// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0125",
  "title": "验证数据地图自动同步(离线建表)",
  "steps": [
    {
      "action": "运行任务",
      "expected": "查询数据地图，任务建的表均同步至数据地图"
    },
    {
      "action": "查看各表详情页-操作记录",
      "expected": "DDL记录正确"
    }
  ]
} as const;

test.describe("验证数据地图自动同步(离线建表)", () => {
  test("C0125 验证数据地图自动同步(离线建表)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
