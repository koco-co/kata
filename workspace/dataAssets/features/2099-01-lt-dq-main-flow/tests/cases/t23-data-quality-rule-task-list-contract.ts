// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7625-L7668
// intent: SR-INTENT-2099-01-DQ-RULE-TASK-LIST-001
// probe: results/20260523-2055-mf-quality-rule-task-list-01/playwright/ui-probe/probe.json
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-23T10:49:54Z
// SourceRefs: SR-2099-01-DQ-RULE-TASK-LIST-001, SR-UI-PROBE-20260523-DQ-RULE-TASK-LIST-001, SR-SELF-RUN-20260523-DQ-RULE-TASK-LIST-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataQualityRuleTaskBatchCloseContract,
  expectDataQualityRuleTaskCreateMonitorObjectContract,
  expectDataQualityRuleTaskDynamicMultiPartitionContract,
  expectDataQualityRuleTaskDynamicSinglePartitionContract,
  expectDataQualityRuleTaskAddSparkEnvParamContract,
  expectDataQualityRuleTaskEditSparkEnvParamContract,
  expectDataQualityRuleTaskExecutorCoresEnvParamContract,
  expectDataQualityRuleTaskImmediateRunContract,
  expectDataQualityRuleTaskListContract,
  expectDataQualityRuleTaskLogLevelEnvParamContract,
  expectDataQualityRuleTaskManualMultiLevelPartitionContract,
  expectDataQualityRuleTaskPartitionDynamicToExistingContract,
  expectDataQualityRuleTaskPartitionManualToDynamicContract,
  expectDataQualityRuleTaskRulePackageMultiSelectContract,
  expectDataQualityRuleTaskSamplingConfigContract,
  expectDataQualityRuleTaskSearchFavoriteContract,
  expectDataQualityRuleTaskSameTableDifferentRulesContract,
  expectDataQualityRuleTaskSameTableSameRulesContract,
  expectDataQualityRuleTaskSparkEnvParamDetailsContract,
  expectDataQualityRuleTaskT1RunContract,
  expectDataQualityRuleTaskTimeoutHandlingContract,
  expectDataQualityRuleTaskUnlimitedTimeoutRunContract,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";
import { ensureDtstackPreconditionFile } from "../helpers/dtstack-preconditions";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(15 * 60 * 1000);

const DQ_CORE_PRECOND_FILE =
  "workspace/dataAssets/features/2099-01-lt-dq-main-flow/tests/precond/data-quality-core-tables.yaml";

test.beforeEach(() => {
  ensureDtstackPreconditionFile(
    "dq-core-rule-task-tables",
    DQ_CORE_PRECOND_FILE,
    "SR-2099-01-DQ-RULE-TASK-PRECOND",
  );
});

test("【P0】数据质量规则任务管理列表 API 与首行展示一致可核验", async ({ page, step }) => {
  await step("步骤1: 进入规则任务管理 → 列表加载后首条任务与 monitor/pageQuery 返回一致", async () => {
    await expectDataQualityRuleTaskListContract(page, "SR-2099-01-DQ-RULE-TASK-LIST-001");
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8099
// SourceRefs: SR-2099-01-DQ-RULE-TASK-LIST-FAVORITE-L8099, SR-UI-PROBE-20260527-DQ-RULE-TASK-LIST-FAVORITE-L8099-001
test("【P0】数据质量规则任务管理列表搜索收藏最近修改人与规则状态可核验", async ({ page, step }) => {
  await step("步骤1-3: 进入规则任务管理 → 表名搜索 → 收藏/我收藏的表/最近修改人筛选并核验状态列", async () => {
    await expectDataQualityRuleTaskSearchFavoriteContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-LIST-FAVORITE-L8099",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8119
// SourceRefs: SR-2099-01-DQ-RULE-TASK-CREATE-OBJECT-L8119, SR-UI-PROBE-20260527-DQ-RULE-TASK-CREATE-OBJECT-L8119-001
test("【P0】数据质量规则任务管理新建监控规则基础监控对象配置可核验", async ({ page, step }) => {
  await step("步骤1-2: 进入规则任务管理 → 新建监控规则 → 填写 SparkThrift2.x/pw_test/dwd_vehicle_quality_di 并进入监控规则配置", async () => {
    await expectDataQualityRuleTaskCreateMonitorObjectContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-CREATE-OBJECT-L8119",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8138
// SourceRefs: SR-2099-01-DQ-RULE-TASK-RULE-PACKAGE-L8138, SR-UI-PROBE-20260527-DQ-RULE-TASK-RULE-PACKAGE-L8138-001
test("【P0】数据质量规则任务管理引用规则包多选功能正常可核验", async ({ page, step }) => {
  await step("步骤1-2: 新建监控规则进入监控规则页 → 多选引用完整性/有效性规则包并核验规则展示不重复", async () => {
    await expectDataQualityRuleTaskRulePackageMultiSelectContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-RULE-PACKAGE-L8138",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8157
// SourceRefs: SR-2099-01-DQ-RULE-TASK-BATCH-CLOSE-L8157, SR-UI-PROBE-20260527-DQ-RULE-TASK-BATCH-CLOSE-L8157-001
test("【P0】数据质量规则任务管理批量关闭检测功能正常可核验", async ({ page, step }) => {
  await step("步骤1-2: 进入规则任务管理 → 勾选多个已开启检测任务 → 批量关闭并核验选中/未选状态", async () => {
    await expectDataQualityRuleTaskBatchCloseContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-BATCH-CLOSE-L8157",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8176
// SourceRefs: SR-2099-01-DQ-RULE-TASK-IMMEDIATE-RUN-L8176, SR-UI-PROBE-20260527-DQ-RULE-TASK-IMMEDIATE-RUN-L8176-001
test("【P0】数据质量规则任务管理运行方式立即生成任务正常可核验", async ({ page, step }) => {
  await step("步骤1-2: 新建监控规则进入调度属性 → 配置手动触发/立即生成/不限制超时 → 保存并立即执行后查询实例", async () => {
    await expectDataQualityRuleTaskImmediateRunContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-IMMEDIATE-RUN-L8176",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8195
// SourceRefs: SR-2099-01-DQ-RULE-TASK-T1-RUN-L8195, SR-UI-PROBE-20260527-DQ-RULE-TASK-T1-RUN-L8195-001
test("【P1】数据质量规则任务管理运行方式T+1生成任务正常可核验", async ({ page, step }) => {
  await step("步骤1-2: 新建监控规则进入调度属性 → 配置天级调度/T+1生成/不限制超时 → 保存后确认未立即生成实例", async () => {
    await expectDataQualityRuleTaskT1RunContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-T1-RUN-L8195",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8214
// SourceRefs: SR-2099-01-DQ-RULE-TASK-PARTITION-DYNAMIC-EXISTING-L8214, SR-UI-PROBE-20260527-DQ-RULE-TASK-PARTITION-DYNAMIC-EXISTING-L8214-001
test("【P0】数据质量规则任务管理编辑分区动态改已有分区后实例同步可核验", async ({ page, step }) => {
  await step("步骤1-2: 编辑车辆质量分区编辑任务 → 动态分区改为选择已有分区 → 保存立即执行并核验实例分区", async () => {
    await expectDataQualityRuleTaskPartitionDynamicToExistingContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-PARTITION-DYNAMIC-EXISTING-L8214",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8233
// SourceRefs: SR-2099-01-DQ-RULE-TASK-PARTITION-MANUAL-DYNAMIC-L8233, SR-UI-PROBE-20260527-DQ-RULE-TASK-PARTITION-MANUAL-DYNAMIC-L8233-001
test("【P0】数据质量规则任务管理编辑分区手动改动态分区后实例同步可核验", async ({ page, step }) => {
  await step("步骤1-2: 编辑车辆质量分区编辑任务 → 手动输入分区改为选择动态分区 → 保存立即执行并核验实例分区", async () => {
    await expectDataQualityRuleTaskPartitionManualToDynamicContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-PARTITION-MANUAL-DYNAMIC-L8233",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8252
// SourceRefs: SR-2099-01-DQ-RULE-TASK-MANUAL-MULTI-PARTITION-L8252, SR-UI-PROBE-20260527-DQ-RULE-TASK-MANUAL-MULTI-PARTITION-L8252-001
test("【P0】数据质量规则任务管理手动输入多级分区功能正常可核验", async ({ page, step }) => {
  await step("步骤1-2: 编辑二级分区规则任务 → 手动输入 stat_date/city_code 多级分区 → 保存立即执行并核验实例分区", async () => {
    await expectDataQualityRuleTaskManualMultiLevelPartitionContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-MANUAL-MULTI-PARTITION-L8252",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8271
// SourceRefs: SR-2099-01-DQ-RULE-TASK-DYNAMIC-SINGLE-PARTITION-L8271, SR-UI-PROBE-20260527-DQ-RULE-TASK-DYNAMIC-SINGLE-PARTITION-L8271-001
test("【P0】数据质量规则任务管理选择动态分区仅选择一级分区校验结果正确", async ({ page, step }) => {
  await step("步骤1-2: 编辑分区表规则任务 → 选择动态分区并仅选择一级分区字段 → 保存立即执行并核验实例分区", async () => {
    await expectDataQualityRuleTaskDynamicSinglePartitionContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-DYNAMIC-SINGLE-PARTITION-L8271",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8290
// SourceRefs: SR-2099-01-DQ-RULE-TASK-DYNAMIC-MULTI-PARTITION-L8290, SR-UI-PROBE-20260527-DQ-RULE-TASK-DYNAMIC-MULTI-PARTITION-L8290-001
test("【P0】数据质量规则任务管理选择动态分区选择一二级分区校验结果正确", async ({ page, step }) => {
  await step("步骤1-2: 编辑二级分区表规则任务 → 选择动态分区的一二级分区字段 → 保存立即执行并核验实例分区", async () => {
    await expectDataQualityRuleTaskDynamicMultiPartitionContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-DYNAMIC-MULTI-PARTITION-L8290",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8309
// SourceRefs: SR-2099-01-DQ-RULE-TASK-SAMPLING-CONFIG-L8309, SR-UI-PROBE-20260527-DQ-RULE-TASK-SAMPLING-CONFIG-L8309-001
test("【P0】数据质量规则任务管理抽样检查设置配置联合生效", async ({ page, step }) => {
  await step("步骤1-2: 新建监控规则 → 开启抽样检查设置并配置抽样行数 → 保存立即执行并核验实例抽样信息", async () => {
    await expectDataQualityRuleTaskSamplingConfigContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-SAMPLING-CONFIG-L8309",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8328
// SourceRefs: SR-2099-01-DQ-RULE-TASK-ADD-SPARK-ENV-PARAM-L8328, SR-UI-PROBE-20260527-DQ-RULE-TASK-ADD-SPARK-ENV-PARAM-L8328-001
test("【P0】数据质量规则任务管理调度属性新增环境参数配置正常", async ({ page, step }) => {
  await step("步骤1-2: 编辑车辆质量环境参数任务 → 进入调度属性 → 新增 spark.sql.shuffle.partitions=2 并核验详情回显", async () => {
    await expectDataQualityRuleTaskAddSparkEnvParamContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-ADD-SPARK-ENV-PARAM-L8328",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8347
// SourceRefs: SR-2099-01-DQ-RULE-TASK-EDIT-SPARK-ENV-PARAM-L8347, SR-UI-PROBE-20260527-DQ-RULE-TASK-EDIT-SPARK-ENV-PARAM-L8347-001
test("【P0】数据质量规则任务管理调度属性编辑环境参数配置正常", async ({ page, step }) => {
  await step("步骤1-2: 编辑车辆质量环境参数任务 → 修改 logLevel 参数值 → 保存后进入详情并立即执行核验实例", async () => {
    await expectDataQualityRuleTaskEditSparkEnvParamContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-EDIT-SPARK-ENV-PARAM-L8347",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8366
// SourceRefs: SR-2099-01-DQ-RULE-TASK-LOGLEVEL-ENV-PARAM-L8366, SR-UI-PROBE-20260527-DQ-RULE-TASK-LOGLEVEL-ENV-PARAM-L8366-001
test("【P0】数据质量规则任务管理Spark环境参数配置生效logLevel", async ({ page, step }) => {
  await step("步骤1-2: 配置 logLevel=INFO → 保存并立即执行 → 查看运行日志确认 INFO 级别日志", async () => {
    await expectDataQualityRuleTaskLogLevelEnvParamContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-LOGLEVEL-ENV-PARAM-L8366",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8385
// SourceRefs: SR-2099-01-DQ-RULE-TASK-EXECUTOR-CORES-ENV-PARAM-L8385, SR-UI-PROBE-20260527-DQ-RULE-TASK-EXECUTOR-CORES-ENV-PARAM-L8385-001
test("【P0】数据质量规则任务管理Spark环境参数配置生效executorCores", async ({ page, step }) => {
  await step("步骤1-2: 配置 spark.executor.cores=1 → 保存并立即执行 → 核验任务详情和实例", async () => {
    await expectDataQualityRuleTaskExecutorCoresEnvParamContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-EXECUTOR-CORES-ENV-PARAM-L8385",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8404
// SourceRefs: SR-2099-01-DQ-RULE-TASK-SPARK-ENV-PARAM-DETAILS-L8404, SR-UI-PROBE-20260527-DQ-RULE-TASK-SPARK-ENV-PARAM-DETAILS-L8404-001
test("【P0】数据质量规则任务管理规则任务详情环境参数显示正常", async ({ page, step }) => {
  await step("步骤1-2: 进入车辆质量环境参数任务详情 → 核验 logLevel 与 spark.executor.cores 名称和值", async () => {
    await expectDataQualityRuleTaskSparkEnvParamDetailsContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-SPARK-ENV-PARAM-DETAILS-L8404",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8423
// SourceRefs: SR-2099-01-DQ-RULE-TASK-UNLIMITED-TIMEOUT-RUN-L8423, SR-UI-PROBE-20260527-DQ-RULE-TASK-UNLIMITED-TIMEOUT-RUN-L8423-001
test("【P0】数据质量规则任务管理不限制超时时间时任务可正常运行", async ({ page, step }) => {
  await step("步骤1-2: 编辑车辆质量立即生成任务 → 配置超时时间不限制 → 保存立即执行并核验实例进入非超时终态", async () => {
    await expectDataQualityRuleTaskUnlimitedTimeoutRunContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-UNLIMITED-TIMEOUT-RUN-L8423",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8442
// SourceRefs: SR-2099-01-DQ-RULE-TASK-TIMEOUT-HANDLING-L8442, SR-UI-PROBE-20260527-DQ-RULE-TASK-TIMEOUT-HANDLING-L8442-001
test("【P0】数据质量规则任务管理运行时长大于超时时间时任务超时处理正确", async ({ page, step }) => {
  await step("步骤1-2: 编辑车辆质量立即生成任务 → 配置短超时时间 → 执行后核验结果或日志包含超时原因", async () => {
    await expectDataQualityRuleTaskTimeoutHandlingContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-TIMEOUT-HANDLING-L8442",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8461
// SourceRefs: SR-2099-01-DQ-RULE-TASK-SAME-TABLE-DIFFERENT-RULES-L8461, SR-UI-PROBE-20260527-DQ-RULE-TASK-SAME-TABLE-DIFFERENT-RULES-L8461-001
test("【P0】数据质量规则任务管理同一张表不同任务名不同规则创建成功", async ({ page, step }) => {
  await step("步骤1-2: 针对 dwd_vehicle_quality_di 新建两个不同任务名且不同规则包的任务 → 分别保存执行并生成实例", async () => {
    await expectDataQualityRuleTaskSameTableDifferentRulesContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-SAME-TABLE-DIFFERENT-RULES-L8461",
    );
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8480
// SourceRefs: SR-2099-01-DQ-RULE-TASK-SAME-TABLE-SAME-RULES-L8480, SR-UI-PROBE-20260527-DQ-RULE-TASK-SAME-TABLE-SAME-RULES-L8480-001
test("【P1】数据质量规则任务管理同一张表不同任务名相同规则创建成功", async ({ page, step }) => {
  await step("步骤1-2: 针对 dwd_vehicle_quality_di 新建两个不同任务名且相同规则包的任务 → 分别保存执行并按任务名区分实例", async () => {
    await expectDataQualityRuleTaskSameTableSameRulesContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-SAME-TABLE-SAME-RULES-L8480",
    );
  });
});
