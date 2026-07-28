// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0116",
  "title": "验证【元数据同步】_【物化视图表】同步正常",
  "steps": [
    {
      "action": "元数据同步任务，同步非分区物化视图；",
      "expected": "同步任务成功，视图表详情页元数据信息正确"
    },
    {
      "action": "元数据同步任务，同步单分区物化视图；",
      "expected": "同步任务成功，视图表详情页元数据信息正确"
    },
    {
      "action": "元数据同步任务，同步联合分区物化视图；",
      "expected": "同步任务成功，视图表详情页元数据信息正确"
    }
  ]
} as const;

test.describe("验证【元数据同步】_【物化视图表】同步正常", () => {
  test("C0116 验证【元数据同步】_【物化视图表】同步正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
