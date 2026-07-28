// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0464",
  "title": "验证【规则任务管理❯】Spark环境参数配置生效(spark.driver.maxResultSize)",
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
      "action": "点击【环境参数配置】, 设置spark.driver.maxResultSize=2g 后保存",
      "expected": "规则任务保存成功"
    },
    {
      "action": "运行规则任务",
      "expected": "任务运行成功, 校验结果正常"
    },
    {
      "action": "进入Apache Hadoop YARN界面, 点击 Tracking UI: ApplicationMaster，在 Environment 页签确认该参数值",
      "expected": "应为2g"
    }
  ]
} as const;

test.describe("验证【规则任务管理❯】Spark环境参数配置生效(spark.driver.maxResultSize)", () => {
  test("C0464 验证【规则任务管理❯】Spark环境参数配置生效(spark.driver.maxResultSize)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
