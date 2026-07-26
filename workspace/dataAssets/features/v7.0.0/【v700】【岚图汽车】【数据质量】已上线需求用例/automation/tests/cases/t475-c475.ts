// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C475",
  "title": "验证【规则任务管理❯】规则任务详情-环境参数显示正常(SparkThrift2.x)",
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
      "action": "点击【环境参数配置】",
      "expected": "进入【环境参数配置】页面, 可进行编辑, 默认内容:## Driver程序使用的CPU核数,默认为1# spark.driver.cores=1## Driver程序使用内存大小,默认1g# spark.driver.memory=1g## 对Spark每个action结果集大小的限制，最少是1M，若设为0则不限制大小。## 若Job结果超过限制则会异常退出，若结果集限制过大也可能造成OOM问题，默认1g# spark.driver.maxResultSize=1g## 启动的executor的数量，默认为1# spark.executor.instances=1## 每个executor使用的CPU核数，默认为1# spark.executor.cores=1## 每个executor内存大小,默认1g# spark.executor.memory=1g## spark 日志级别可选ALL, DEBUG, ERROR, FATAL, INFO, OFF, TRACE, WARN# logLevel = INFO## spark中所有网络交互的最大超时时间# spark.network.timeout=120s## executor的OffHeap内存，和spark.executor.memory配置使用# spark.yarn.executor.memoryOverhead=## 设置spark sql shuffle分区数，默认200# spark.sql.shuffle.partitions=200## 开启spark推测行为，默认false# spark.speculation=false"
    },
    {
      "action": "保存后, 进入规则任务详情页中, 点击【环境参数】",
      "expected": "展开环境参数抽屉, 参数显示正常"
    },
    {
      "action": "运行规则任务",
      "expected": "运行成功, 校验结果正常"
    }
  ]
} as const;

test.describe("验证【规则任务管理❯】规则任务详情-环境参数显示正常(SparkThrift2.x)", () => {
  test("C475 验证【规则任务管理❯】规则任务详情-环境参数显示正常(SparkThrift2.x)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
