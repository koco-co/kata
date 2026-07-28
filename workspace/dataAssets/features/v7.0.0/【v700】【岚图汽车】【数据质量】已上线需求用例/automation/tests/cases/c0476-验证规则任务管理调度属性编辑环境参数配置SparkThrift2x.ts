// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0476",
  "title": "验证【规则任务管理❯】调度属性编辑环境参数配置(SparkThrift2.x)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步",
      "expected": "进入【新建单表校验规则 ❯ 调度属性】配置页面"
    },
    {
      "action": "点击【环境参数配置】, 设置spark.executor.cores=2 后保存",
      "expected": "规则任务保存成功"
    },
    {
      "action": "进入规则任务详情, 点击「环境参数」",
      "expected": "进入「配置环境参数」界面, 配置参数回显正确"
    },
    {
      "action": "设置spark.executor.cores=3 后保存",
      "expected": "修改成功, 配置参数回显正确"
    }
  ]
} as const;

test.describe("验证【规则任务管理❯】调度属性编辑环境参数配置(SparkThrift2.x)", () => {
  test("C0476 验证【规则任务管理❯】调度属性编辑环境参数配置(SparkThrift2.x)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
