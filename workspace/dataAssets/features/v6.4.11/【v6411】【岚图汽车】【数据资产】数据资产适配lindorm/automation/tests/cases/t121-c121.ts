// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C121",
  "title": "验证【元数据同步】_【异常场景】",
  "steps": [
    {
      "action": "1） 新增完元数据同步任务A，点击立即运行\n2） agentShell sidercar 服务不健康",
      "expected": "运行失败，报错agentsidercar服务不通"
    },
    {
      "action": "1） 新增完元数据同步任务A，点击立即运行\n2） 运行过程中，删除同步任务A中选择的表",
      "expected": "运行失败，报错表找不到"
    }
  ]
} as const;

test.describe("验证【元数据同步】_【异常场景】", () => {
  test("C121 验证【元数据同步】_【异常场景】", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
