// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7945,#L8040,#L8059,#L8078,#L8096,#L8115,#L8134,#L8153,#L8172,#L8190,#L8209,#L8227,#L8402
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
  expectDataQualityFailedResultLogDownloadContract,
  expectDataQualityReportDetailFieldRuleFilterContract,
  expectDataQualityReportDetailMultiTableRuleFilterContract,
  expectDataQualityReportDetailDirtyDataDownloadContract,
  expectDataQualityReportSamplingStatsContract,
  expectDataQualityReportContinuousGenerationContract,
  expectDataQualityReportSameTableMultiTaskContract,
  expectDataQualityReportSameTableMultiTaskDirtyDataContract,
  expectDataQualityReportDetailSingleTableRuleFilterContract,
  expectDataQualityResultFilterContract,
  expectDataQualityRuleBaseCustomRegexContract,
  expectDataQualityRuleSetFilterContract,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";
import { ensureDtstackPreconditionFile } from "../helpers/dtstack-preconditions";

test.setTimeout(15 * 60 * 1000);

const DQ_CORE_PRECOND_FILE =
  "workspace/dataAssets/features/2099-01-lt-dq-main-flow/tests/precond/data-quality-core-tables.yaml";

test.describe("数据质量校验结果与报告筛选", () => {
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

// archive-title: 验证【数据质量报告-已生成报告】报告名称、数据表与生成时间组合筛选正常
test("【P0】数据质量报告已生成报告名称、数据表与生成时间组合筛选可核验", async ({ page }) => {
  await expectDataQualityGeneratedReportCombinedFilterContract(page, "SR-2099-01-DQ-REPORT-GENERATED-FILTER-L8040");
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8059
// SourceRefs: SR-2099-01-DQ-REPORT-GENERATED-STATUS-L8059, SR-UI-PROBE-20260527-DQ-REPORT-GENERATED-STATUS-L8059-001
// archive-title: 验证【数据质量报告-已生成报告】报告状态筛选与状态展示正常
test("【P0】数据质量报告已生成报告状态筛选与状态展示正常", async ({ page }) => {
  await expectDataQualityGeneratedReportStatusFilterContract(
    page,
    "SR-2099-01-DQ-REPORT-GENERATED-STATUS-L8059",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8078
// SourceRefs: SR-2099-01-DQ-REPORT-GENERATED-DOWNLOAD-L8078, SR-UI-PROBE-20260527-DQ-REPORT-GENERATED-DOWNLOAD-L8078-001
test("【P0】数据质量报告已生成报告下载报告功能正常", async ({ page }) => {
  await expectDataQualityGeneratedReportDownloadContract(
    page,
    "SR-2099-01-DQ-REPORT-GENERATED-DOWNLOAD-L8078",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8096
// SourceRefs: SR-2099-01-DQ-REPORT-DETAIL-FIELD-RULE-L8096, SR-UI-PROBE-20260527-DQ-REPORT-DETAIL-FIELD-RULE-L8096-001
test("【P0】数据质量报告详情字段规则筛选与质检结果展示正确", async ({ page }) => {
  await expectDataQualityReportDetailFieldRuleFilterContract(
    page,
    "SR-2099-01-DQ-REPORT-DETAIL-FIELD-RULE-L8096",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8115
// SourceRefs: SR-2099-01-DQ-REPORT-DETAIL-SINGLE-RULE-L8115, SR-UI-PROBE-20260527-DQ-REPORT-DETAIL-SINGLE-RULE-L8115-001
test("【P0】数据质量报告详情单表规则筛选与规则名称模糊搜索正确", async ({ page }) => {
  await expectDataQualityReportDetailSingleTableRuleFilterContract(
    page,
    "SR-2099-01-DQ-REPORT-DETAIL-SINGLE-RULE-L8115",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8134
// SourceRefs: SR-2099-01-DQ-REPORT-DETAIL-MULTI-RULE-L8134, SR-UI-PROBE-20260527-DQ-REPORT-DETAIL-MULTI-RULE-L8134-001
test("【P0】数据质量报告详情多表规则筛选与规则名称模糊搜索正确", async ({ page }) => {
  await expectDataQualityReportDetailMultiTableRuleFilterContract(
    page,
    "SR-2099-01-DQ-REPORT-DETAIL-MULTI-RULE-L8134",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8153
// SourceRefs: SR-2099-01-DQ-REPORT-DETAIL-DIRTY-DATA-L8153, SR-UI-PROBE-20260527-DQ-REPORT-DETAIL-DIRTY-DATA-L8153-001
test("【P0】数据质量报告详情脏数据明细查看与下载正常", async ({ page }) => {
  await expectDataQualityReportDetailDirtyDataDownloadContract(
    page,
    "SR-2099-01-DQ-REPORT-DETAIL-DIRTY-DATA-L8153",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8172
// SourceRefs: SR-2099-01-DQ-REPORT-SAMPLING-STATS-L8172, SR-UI-PROBE-20260527-DQ-REPORT-SAMPLING-STATS-L8172-001
test("【P0】数据质量报告抽样行数数据统计逻辑正确", async ({ page }) => {
  await expectDataQualityReportSamplingStatsContract(page, "SR-2099-01-DQ-REPORT-SAMPLING-STATS-L8172");
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8190
// SourceRefs: SR-2099-01-DQ-REPORT-CONTINUOUS-GENERATION-L8190, SR-UI-PROBE-20260527-DQ-REPORT-CONTINUOUS-GENERATION-L8190-001
test("【P0】数据质量报告持续生成中报告持续更新与查看下载正常", async ({ page }) => {
  await expectDataQualityReportContinuousGenerationContract(
    page,
    "SR-2099-01-DQ-REPORT-CONTINUOUS-GENERATION-L8190",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8209
// SourceRefs: SR-2099-01-DQ-REPORT-SAME-TABLE-MULTI-TASK-L8209, SR-UI-PROBE-20260527-DQ-REPORT-SAME-TABLE-MULTI-TASK-L8209-001
test("【P0】数据质量报告同一张表不同任务生成报告正确", async ({ page }) => {
  await expectDataQualityReportSameTableMultiTaskContract(
    page,
    "SR-2099-01-DQ-REPORT-SAME-TABLE-MULTI-TASK-L8209",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8227
// SourceRefs: SR-2099-01-DQ-REPORT-SAME-TABLE-MULTI-TASK-DIRTY-L8227, SR-UI-PROBE-20260527-DQ-REPORT-SAME-TABLE-MULTI-TASK-DIRTY-L8227-001
test("【P0】数据质量报告同一张表不同任务脏数据明细正确", async ({ page }) => {
  await expectDataQualityReportSameTableMultiTaskDirtyDataContract(
    page,
    "SR-2099-01-DQ-REPORT-SAME-TABLE-MULTI-TASK-DIRTY-L8227",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7945
// SourceRefs: SR-2099-01-DQ-RESULT-FAILED-LOG-DOWNLOAD-L7945, SR-UI-PROBE-20260527-DQ-RESULT-FAILED-LOG-DOWNLOAD-L7945-001
test("【P2】校验结果查询校验失败时查看日志与下载日志正常", async ({ page }) => {
  await expectDataQualityFailedResultLogDownloadContract(
    page,
    "SR-2099-01-DQ-RESULT-FAILED-LOG-DOWNLOAD-L7945",
  );
});
});
