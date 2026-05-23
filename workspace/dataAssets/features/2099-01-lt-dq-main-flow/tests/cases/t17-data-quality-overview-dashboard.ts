// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8430-L8533
// intent: SR-INTENT-2099-01-DQ-OVERVIEW-001
// probe: preflight-20260523-ltqc-local
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-23T10:05:00Z
// META: {"id":"DQ-017","priority":"P0","title":"数据质量总览近期异常、趋势、排行与规则分布看板可核验"}
// SourceRefs: SR-2099-01-DQ-OVERVIEW-001, SR-UI-PROBE-20260523-DQ-OVERVIEW-001, SR-SELF-RUN-20260523-DQ-OVERVIEW-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataQualityOverviewDashboardContract,
  expectDataQualityOverviewMoreLink,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0】数据质量总览近期异常、趋势、排行与规则分布看板可核验", async ({ page, step }) => {
  await step("步骤1: 进入数据质量总览 → 总览卡片、趋势/分布/排行图表和近期异常列表可见", async () => {
    await expectDataQualityOverviewDashboardContract(page, "SR-2099-01-DQ-OVERVIEW-001");
  });

  await step("步骤2: 点击近期校验异常结果查看更多 → 跳转至校验结果查询", async () => {
    await expectDataQualityOverviewMoreLink(page, "SR-2099-01-DQ-OVERVIEW-001");
  });
});
