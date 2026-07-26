// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C127",
  "title": "验证物化视图同步成功(不支持)",
  "steps": [
    {
      "action": "离线任务创建联合分区物化视图；",
      "expected": "1）同步任务成功；\n2）该物化视图表详情页，元数据信息正确"
    },
    {
      "action": "离线任务创建单分区物化视图；",
      "expected": "1）同步任务成功；\n2）该物化视图表详情页，元数据信息正确"
    },
    {
      "action": "离线任务创建非分区物化视图；",
      "expected": "1）同步任务成功；\n2）该物化视图表详情页，元数据信息正确"
    }
  ]
} as const;

test.describe("验证物化视图同步成功(不支持)", () => {
  test("C127 验证物化视图同步成功(不支持)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
