// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7974-L7988,#L8501,#L8521,#L8540,#L8711,#L11770-L11891,#L13143-L13158
// intent: SR-INTENT-2099-01-DQ-RESULT-FILTERS-001
// probe: results/20260523-1730-mf-quality-result-filters-01/playwright/ui-probe/probe.json
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-23T09:30:00Z
// SourceRefs: SR-2099-01-DQ-RESULT-FILTERS-001, SR-UI-PROBE-20260523-DQ-RESULT-FILTERS-001, SR-SELF-RUN-20260523-DQ-RESULT-FILTERS-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataQualityGeneratedReportCombinedFilterContract,
  expectDataQualityGeneratedReportDownloadContract,
  expectDataQualityGeneratedReportFilterContract,
  expectDataQualityGeneratedReportStatusFilterContract,
  expectDataQualityFailedResultDirtyDetailContract,
  expectDataQualityFailedResultDirtyDownloadContract,
  expectDataQualityFailedResultLogDownloadContract,
  expectDataQualityMultiTableUniqueMultiFieldDirtyStatsContract,
  expectDataQualityMultiTableUniqueSingleFieldDirtyStatsContract,
  expectDataQualityPassedResultNoDetailContract,
  expectDataQualityReportDetailFieldRuleFilterContract,
  expectDataQualityReportDetailMultiTableRuleFilterContract,
  expectDataQualityReportDetailDirtyDataDownloadContract,
  expectDataQualityReportSamplingStatsContract,
  expectDataQualityReportContinuousGenerationContract,
  expectDataQualityReportSameTableMultiTaskContract,
  expectDataQualityReportSameTableMultiTaskDirtyDataContract,
  expectDataQualityReportDetailSingleTableRuleFilterContract,
  expectDataQualityResultFilterContract,
  expectDataQualityResultListSearchDetailContract,
  expectDataQualityRuleBaseCustomRegexContract,
  expectDataQualityRuleSetFilterContract,
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
    "dq-core-result-report-tables",
    DQ_CORE_PRECOND_FILE,
    "SR-2099-01-DQ-RESULT-FILTERS-PRECOND",
  );
});

test("【P0/P1/P2】数据质量校验结果、规则集、规则库正则与报告筛选列表可核验", async ({ page, step }) => {
  await step("步骤1: 进入校验结果查询 → 计划时间、修改人、收藏表筛选与结果列表字段可见", async () => {
    await expectDataQualityResultFilterContract(page, "SR-2099-01-DQ-RESULT-FILTERS-001");
  });

  await step("步骤2: 进入规则集管理 → 表名搜索、新建入口和规则集列表字段可见", async () => {
    await expectDataQualityRuleSetFilterContract(page, "SR-2099-01-DQ-RESULT-FILTERS-001");
  });

  await step("步骤3: 进入规则库配置自定义正则 → 搜索框、列表字段和新增入口可见", async () => {
    await expectDataQualityRuleBaseCustomRegexContract(page, "SR-2099-01-DQ-RESULT-FILTERS-001");
  });

  await step("步骤4: 进入数据质量报告已生成报告 → 报告筛选项、状态列和操作列可见", async () => {
    await expectDataQualityGeneratedReportFilterContract(page, "SR-2099-01-DQ-RESULT-FILTERS-001");
  });
});

test("【P0】数据质量报告已生成报告名称、数据表与生成时间组合筛选可核验", async ({ page }) => {
  await expectDataQualityGeneratedReportCombinedFilterContract(page, "SR-2099-01-DQ-REPORT-GENERATED-FILTER-L8711");
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8730
// SourceRefs: SR-2099-01-DQ-REPORT-GENERATED-STATUS-L8730, SR-UI-PROBE-20260527-DQ-REPORT-GENERATED-STATUS-L8730-001
test("【P0】数据质量报告已生成报告状态筛选与状态展示正常", async ({ page }) => {
  await expectDataQualityGeneratedReportStatusFilterContract(
    page,
    "SR-2099-01-DQ-REPORT-GENERATED-STATUS-L8730",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8749
// SourceRefs: SR-2099-01-DQ-REPORT-GENERATED-DOWNLOAD-L8749, SR-UI-PROBE-20260527-DQ-REPORT-GENERATED-DOWNLOAD-L8749-001
test("【P0】数据质量报告已生成报告下载报告功能正常", async ({ page }) => {
  await expectDataQualityGeneratedReportDownloadContract(
    page,
    "SR-2099-01-DQ-REPORT-GENERATED-DOWNLOAD-L8749",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8767
// SourceRefs: SR-2099-01-DQ-REPORT-DETAIL-FIELD-RULE-L8767, SR-UI-PROBE-20260527-DQ-REPORT-DETAIL-FIELD-RULE-L8767-001
test("【P0】数据质量报告详情字段规则筛选与质检结果展示正确", async ({ page }) => {
  await expectDataQualityReportDetailFieldRuleFilterContract(
    page,
    "SR-2099-01-DQ-REPORT-DETAIL-FIELD-RULE-L8767",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8786
// SourceRefs: SR-2099-01-DQ-REPORT-DETAIL-SINGLE-RULE-L8786, SR-UI-PROBE-20260527-DQ-REPORT-DETAIL-SINGLE-RULE-L8786-001
test("【P0】数据质量报告详情单表规则筛选与规则名称模糊搜索正确", async ({ page }) => {
  await expectDataQualityReportDetailSingleTableRuleFilterContract(
    page,
    "SR-2099-01-DQ-REPORT-DETAIL-SINGLE-RULE-L8786",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8805
// SourceRefs: SR-2099-01-DQ-REPORT-DETAIL-MULTI-RULE-L8805, SR-UI-PROBE-20260527-DQ-REPORT-DETAIL-MULTI-RULE-L8805-001
test("【P0】数据质量报告详情多表规则筛选与规则名称模糊搜索正确", async ({ page }) => {
  await expectDataQualityReportDetailMultiTableRuleFilterContract(
    page,
    "SR-2099-01-DQ-REPORT-DETAIL-MULTI-RULE-L8805",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8824
// SourceRefs: SR-2099-01-DQ-REPORT-DETAIL-DIRTY-DATA-L8824, SR-UI-PROBE-20260527-DQ-REPORT-DETAIL-DIRTY-DATA-L8824-001
test("【P0】数据质量报告详情脏数据明细查看与下载正常", async ({ page }) => {
  await expectDataQualityReportDetailDirtyDataDownloadContract(
    page,
    "SR-2099-01-DQ-REPORT-DETAIL-DIRTY-DATA-L8824",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8843
// SourceRefs: SR-2099-01-DQ-REPORT-SAMPLING-STATS-L8843, SR-UI-PROBE-20260527-DQ-REPORT-SAMPLING-STATS-L8843-001
test("【P0】数据质量报告抽样行数数据统计逻辑正确", async ({ page }) => {
  await expectDataQualityReportSamplingStatsContract(page, "SR-2099-01-DQ-REPORT-SAMPLING-STATS-L8843");
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8861
// SourceRefs: SR-2099-01-DQ-REPORT-CONTINUOUS-GENERATION-L8861, SR-UI-PROBE-20260527-DQ-REPORT-CONTINUOUS-GENERATION-L8861-001
test("【P0】数据质量报告持续生成中报告持续更新与查看下载正常", async ({ page }) => {
  await expectDataQualityReportContinuousGenerationContract(
    page,
    "SR-2099-01-DQ-REPORT-CONTINUOUS-GENERATION-L8861",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8880
// SourceRefs: SR-2099-01-DQ-REPORT-SAME-TABLE-MULTI-TASK-L8880, SR-UI-PROBE-20260527-DQ-REPORT-SAME-TABLE-MULTI-TASK-L8880-001
test("【P0】数据质量报告同一张表不同任务生成报告正确", async ({ page }) => {
  await expectDataQualityReportSameTableMultiTaskContract(
    page,
    "SR-2099-01-DQ-REPORT-SAME-TABLE-MULTI-TASK-L8880",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8898
// SourceRefs: SR-2099-01-DQ-REPORT-SAME-TABLE-MULTI-TASK-DIRTY-L8898, SR-UI-PROBE-20260527-DQ-REPORT-SAME-TABLE-MULTI-TASK-DIRTY-L8898-001
test("【P0】数据质量报告同一张表不同任务脏数据明细正确", async ({ page }) => {
  await expectDataQualityReportSameTableMultiTaskDirtyDataContract(
    page,
    "SR-2099-01-DQ-REPORT-SAME-TABLE-MULTI-TASK-DIRTY-L8898",
  );
});

test("【P0】校验结果查询列表筛选、状态列与实例详情可核验", async ({ page }) => {
  await expectDataQualityResultListSearchDetailContract(page, "SR-2099-01-DQ-RESULT-L8501");
});

test("【P0】校验结果查询校验通过实例不展示明细入口可核验", async ({ page }) => {
  await expectDataQualityPassedResultNoDetailContract(page, "SR-2099-01-DQ-RESULT-L8521");
});

test("【P0】校验结果查询校验异常实例明细查看与失败字段可核验", async ({ page }) => {
  await expectDataQualityFailedResultDirtyDetailContract(page, "SR-2099-01-DQ-RESULT-L8540");
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8559
// SourceRefs: SR-2099-01-DQ-RESULT-DIRTY-DOWNLOAD-L8559, SR-UI-PROBE-20260527-DQ-RESULT-DIRTY-DOWNLOAD-L8559-001
test("【P0】校验结果查询校验不通过明细下载功能正常", async ({ page }) => {
  await expectDataQualityFailedResultDirtyDownloadContract(page, "SR-2099-01-DQ-RESULT-DIRTY-DOWNLOAD-L8559");
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8578
// SourceRefs: SR-2099-01-DQ-RESULT-FAILED-LOG-DOWNLOAD-L8578, SR-UI-PROBE-20260527-DQ-RESULT-FAILED-LOG-DOWNLOAD-L8578-001
test("【P0】校验结果查询校验失败时查看日志与下载日志正常", async ({ page }) => {
  await expectDataQualityFailedResultLogDownloadContract(page, "SR-2099-01-DQ-RESULT-FAILED-LOG-DOWNLOAD-L8578");
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8597
// SourceRefs: SR-2099-01-DQ-RESULT-MULTI-TABLE-UNIQUE-SINGLE-L8597, SR-UI-PROBE-20260527-DQ-RESULT-MULTI-TABLE-UNIQUE-SINGLE-L8597-001
test("【P0】校验结果查询多表唯一性明细数据单字段重复数统计正确", async ({ page }) => {
  await expectDataQualityMultiTableUniqueSingleFieldDirtyStatsContract(
    page,
    "SR-2099-01-DQ-RESULT-MULTI-TABLE-UNIQUE-SINGLE-L8597",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8616
// SourceRefs: SR-2099-01-DQ-RESULT-MULTI-TABLE-UNIQUE-MULTI-L8616, SR-UI-PROBE-20260527-DQ-RESULT-MULTI-TABLE-UNIQUE-MULTI-L8616-001
test("【P0】校验结果查询多表唯一性明细数据多字段联合重复数统计正确", async ({ page }) => {
  await expectDataQualityMultiTableUniqueMultiFieldDirtyStatsContract(
    page,
    "SR-2099-01-DQ-RESULT-MULTI-TABLE-UNIQUE-MULTI-L8616",
  );
});
