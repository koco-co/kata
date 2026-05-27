// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L124,#L142
// intent: SR-INTENT-2099-01-AI-003
// probe: SR-UI-PROBE-20260522-ASSETS-TRENDS-001
// page: _shared/pages/2099-01-lt-dq-main-flow/assets-inventory-page.ts
// generated_at: 2026-05-22T13:08:09Z
// META: {"id":"AI-003","priority":"P3","title":"资产盘点趋势图可核验"}
// SourceRefs: SR-2099-01-AI-003, SR-2099-01-AI-SEARCH-TREND-L142, SR-UI-PROBE-20260522-ASSETS-TRENDS-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectAssetsInventoryTrendApiHealth,
  expectAssetsInventoryTrendDropdowns,
  expectAssetsInventoryTrendModules,
  gotoAssetsInventory,
  triggerAssetsInventoryScheduleJobs,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/assets-inventory-page";
import {
  ASSETS_INVENTORY_TREND_SCOPE,
  SR_2099_01_AI_003,
  SR_2099_01_AI_SEARCH_TREND_L142,
} from "../data/assets-inventory-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(30 * 60 * 1000);

test("【P3】资产盘点元数据变化与资产查询趋势图可核验", async ({ page, step }) => {
  await step("步骤1: 调用趋势统计调度接口 → 接口调用成功", async () => {
    await triggerAssetsInventoryScheduleJobs(
      page,
      ["saveTodayPreviewData", "saveTodaySearchStatistic"],
      SR_2099_01_AI_003,
    );
  });

  await step("步骤2: 进入资产盘点页面 → 趋势图卡片和趋势接口正常加载", async () => {
    await gotoAssetsInventory(page, undefined, ASSETS_INVENTORY_TREND_SCOPE.projectId);
    await expectAssetsInventoryTrendModules(page, SR_2099_01_AI_003);
    await expectAssetsInventoryTrendApiHealth(page, SR_2099_01_AI_003);
  });

  await step("步骤3: 展开趋势图筛选下拉 → 数据源与查询指标选项与真实 UI 一致", async () => {
    await expectAssetsInventoryTrendDropdowns(page, SR_2099_01_AI_003);
  });
});

test("【P3】资产盘点资产查询趋势图查询次数登录次数登录人数可核验", async ({ page, step }) => {
  await step("步骤1-6: 调用资产查询趋势调度、进入资产盘点并核验资产查询趋势模块和筛选入口", async () => {
    await triggerAssetsInventoryScheduleJobs(page, ["saveTodaySearchStatistic"], SR_2099_01_AI_SEARCH_TREND_L142);
    await gotoAssetsInventory(page, undefined, ASSETS_INVENTORY_TREND_SCOPE.projectId);
    await expectAssetsInventoryTrendModules(page, SR_2099_01_AI_SEARCH_TREND_L142);
    await expectAssetsInventoryTrendApiHealth(page, SR_2099_01_AI_SEARCH_TREND_L142);
    await expectAssetsInventoryTrendDropdowns(page, SR_2099_01_AI_SEARCH_TREND_L142);
  });
});
