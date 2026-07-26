// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C467",
  "title": "验证【规则任务管理❯】Spark环境参数配置生效(spark.network.timeout)",
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
      "action": "点击【环境参数配置】, 设置spark.network.timeout=300s 后保存",
      "expected": "规则任务保存成功"
    },
    {
      "action": "运行规则任务",
      "expected": "任务运行成功, 校验结果正常"
    },
    {
      "action": "进入Apache Hadoop YARN界面, 点击 Tracking UI: ApplicationMaster，在 Environment 页签搜索该参数",
      "expected": "确认 Value 为 300s"
    }
  ]
} as const;

test.describe("验证【规则任务管理❯】Spark环境参数配置生效(spark.network.timeout)", () => {
  test("C467 验证【规则任务管理❯】Spark环境参数配置生效(spark.network.timeout)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
