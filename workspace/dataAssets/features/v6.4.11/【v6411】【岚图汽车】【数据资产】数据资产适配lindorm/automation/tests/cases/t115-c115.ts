// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C115",
  "title": "验证【元数据同步】_【视图表】同步正常",
  "steps": [
    {
      "action": "元数据同步任务，同步常规视图表；",
      "expected": "同步任务成功，视图表详情页元数据信息正确"
    }
  ]
} as const;

test.describe("验证【元数据同步】_【视图表】同步正常", () => {
  test("C115 验证【元数据同步】_【视图表】同步正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
