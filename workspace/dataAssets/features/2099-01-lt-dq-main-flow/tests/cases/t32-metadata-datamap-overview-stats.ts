// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L449-L449
// intent: SR-INTENT-2099-01-MD-032
// probe: SR-UI-PROBE-20260524-MF-METADATA-OVERVIEW-STATS-001
// page: _shared/pages/2099-01-lt-dq-main-flow/metadata-search-page.ts
// generated_at: 2026-05-24T11:52:00Z
// META: {"id":"MD-032","priority":"P3","title":"数据地图表来源统计页面校验 Shell 可核验"}
// SourceRefs: SR-2099-01-MD-032-L449, SR-UI-PROBE-20260524-MF-METADATA-OVERVIEW-STATS-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import { expectDataMapDatasourceOverviewStatsAndClickthrough } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-search-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(120000);

test("【P3】元数据数据地图表来源统计页面校验 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 进入数据地图首页 → 表来源统计、接口计数和数据源点击跳转证据可核验", async () => {
    await expectDataMapDatasourceOverviewStatsAndClickthrough(page, "SR-2099-01-MD-032");
  });
});
