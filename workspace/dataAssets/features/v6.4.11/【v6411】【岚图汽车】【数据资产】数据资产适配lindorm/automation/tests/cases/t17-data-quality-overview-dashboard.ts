// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7452,#L7473,#L7493,#L7513,#L7533
// intent: SR-INTENT-2099-01-DQ-OVERVIEW-001
// probe: preflight-20260523-ltqc-local
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-23T10:05:00Z
// META: {"id":"DQ-017","priority":"P0","title":"数据质量总览统计卡片、规则分布、异常排行与趋势切换可核验"}
// SourceRefs: SR-2099-01-DQ-OVERVIEW-001, SR-UI-PROBE-20260523-DQ-OVERVIEW-001, SR-SELF-RUN-20260523-DQ-OVERVIEW-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataQualityOverviewDashboardContract,
  expectDataQualityOverviewLastUpdateRefreshContract,
  expectDataQualityOverviewMoreLink,
  expectDataQualityOverviewRecentErrorDetailContract,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";

test.setTimeout(3 * 60 * 1000);

test("【P0】数据质量总览统计卡片、规则分布、异常排行与趋势切换可核验", async ({ page, step }) => {
  await step("步骤1: 进入数据质量总览 → 统计卡片、规则分布、排行列表与趋势图和接口数据一致", async () => {
    await expectDataQualityOverviewDashboardContract(page, "SR-2099-01-DQ-OVERVIEW-001");
  });

  await step("步骤2: 点击近期校验异常结果查看更多 → 跳转至校验结果查询", async () => {
    await expectDataQualityOverviewMoreLink(page, "SR-2099-01-DQ-OVERVIEW-001");
  });
});

// SourceRefs: SR-2099-01-DQ-OVERVIEW-L7533, SR-UI-PROBE-20260526-DQ-OVERVIEW-RECENT-ERROR-001
test("【P0】数据质量总览近期校验异常结果查看详情跳转可核验", async ({ page, step }) => {
  await step("步骤1: 点击近期校验异常结果查看详情 → 展示任务名称、状态和规则结果", async () => {
    await expectDataQualityOverviewRecentErrorDetailContract(page, "SR-2099-01-DQ-OVERVIEW-L7533");
  });
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7553
// SourceRefs: SR-2099-01-DQ-OVERVIEW-LAST-UPDATE-L7553, SR-UI-PROBE-20260527-DQ-OVERVIEW-LAST-UPDATE-L7553-001
test("【P1】数据质量总览最近一次更新时间随统计刷新正确", async ({ page, step }) => {
  await step("步骤1: 立即执行既有规则任务 → 返回总览后最近一次更新时间与统计卡片刷新", async () => {
    await expectDataQualityOverviewLastUpdateRefreshContract(
      page,
      "SR-2099-01-DQ-OVERVIEW-LAST-UPDATE-L7553",
    );
  });
});
