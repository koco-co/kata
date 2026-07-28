// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0468",
  "title": "验证【规则任务管理❯】Spark环境参数配置生效(spark.sql.shuffle.partitions)",
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
      "action": "点击【环境参数配置】, 设置spark.sql.shuffle.partitions=10 后保存",
      "expected": "规则任务保存成功"
    },
    {
      "action": "运行规则任务",
      "expected": "任务运行成功, 校验结果正常"
    },
    {
      "action": "进入Apache Hadoop YARN界面, 点击 Tracking UI: ApplicationMaster 进入 Spark UI，在 Stages 页签查看 Shuffle 操作的 Tasks 总数",
      "expected": "应为 10"
    }
  ]
} as const;

test.describe("验证【规则任务管理❯】Spark环境参数配置生效(spark.sql.shuffle.partitions)", () => {
  test("C0468 验证【规则任务管理❯】Spark环境参数配置生效(spark.sql.shuffle.partitions)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
