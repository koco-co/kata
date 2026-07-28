// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0113",
  "title": "验证视图血缘关系",
  "steps": [
    {
      "action": "1）提交离线任务\n2）查看数据地图视图的血缘关系-表级血缘",
      "expected": "表级血缘关系正确："
    },
    {
      "action": "1）提交离线任务\n2）查看数据地图视图的血缘关系-字段级血缘",
      "expected": "字段级血缘关系正确"
    },
    {
      "action": "查看跨库血缘",
      "expected": "表级血缘和字段级血缘正常"
    }
  ]
} as const;

test.describe("验证视图血缘关系", () => {
  test("C0113 验证视图血缘关系", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
