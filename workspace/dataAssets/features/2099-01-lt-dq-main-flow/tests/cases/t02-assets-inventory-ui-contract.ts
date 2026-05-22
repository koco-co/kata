// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L50-L122
// intent: SR-INTENT-2099-01-AI-002
// probe: SR-UI-PROBE-20260522-ASSETS-001
// page: _shared/pages/2099-01-lt-dq-main-flow/assets-inventory-page.ts
// generated_at: 2026-05-22T03:01:13Z
// META: {"id":"AI-002","priority":"P2/P3","title":"资产盘点图表模块与筛选项可核验"}
// SourceRefs: SR-2099-01-AI-002, SR-UI-PROBE-20260522-ASSETS-001, SR-SELF-RUN-ASSETS-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectAssetsInventoryApiHealth,
  expectAssetsInventoryDropdowns,
  expectAssetsInventoryModules,
  gotoAssetsInventory,
  triggerAssetsInventoryScheduleJobs,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/assets-inventory-page";
import { ASSETS_INVENTORY_CHART_SCOPE, SR_2099_01_AI_002 } from "../data/assets-inventory-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/session.json",
});
test.setTimeout(35 * 60 * 1000);

test("【P2/P3】资产盘点图表模块、数据源筛选项与统计接口可核验", async ({ page, step }) => {
  test.setTimeout(35 * 60 * 1000);

  await step("步骤1: 调用资产盘点统计调度接口 → 接口调用成功", async () => {
    await triggerAssetsInventoryScheduleJobs(
      page,
      ["saveOneDayDataDistribution", "affectCountStatistic", "saveTop10TableData"],
      SR_2099_01_AI_002,
    );
  });

  await step("步骤2: 进入资产盘点页面 → 图表模块和统计接口正常加载", async () => {
    await gotoAssetsInventory(page, undefined, ASSETS_INVENTORY_CHART_SCOPE.projectId);
    await expectAssetsInventoryModules(page, SR_2099_01_AI_002);
    await expectAssetsInventoryApiHealth(page, SR_2099_01_AI_002);
  });

  await step("步骤3: 展开筛选下拉 → 数据源类型和分布属性选项与真实 UI 一致", async () => {
    await expectAssetsInventoryDropdowns(page, SR_2099_01_AI_002);
  });
});
