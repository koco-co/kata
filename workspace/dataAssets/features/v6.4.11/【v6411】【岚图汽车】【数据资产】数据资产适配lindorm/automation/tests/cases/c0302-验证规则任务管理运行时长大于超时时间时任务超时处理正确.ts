// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0302",
  "title": "验证【规则任务管理】运行时长大于超时时间时任务超时处理正确",
  "steps": [
    {
      "action": "进入规则任务「调度属性」页面",
      "expected": "1)页面展示「超时时间」配置项"
    },
    {
      "action": "配置较短「超时时间」并执行长耗时校验任务",
      "expected": "1)任务超过配置时长后被超时处理\n2)校验结果查询展示失败或超时状态\n3)实例日志包含超时原因"
    }
  ]
} as const;

test.describe("验证【规则任务管理】运行时长大于超时时间时任务超时处理正确", () => {
  test("C0302 验证【规则任务管理】运行时长大于超时时间时任务超时处理正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
