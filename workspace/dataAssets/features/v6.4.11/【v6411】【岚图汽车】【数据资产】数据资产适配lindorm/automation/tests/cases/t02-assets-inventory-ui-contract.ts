// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L50,#L66,#L84,#L105
// intent: SR-INTENT-2099-01-AI-002
// probe: SR-UI-PROBE-20260522-ASSETS-001
// page: _shared/pages/2099-01-lt-dq-main-flow/assets-inventory-page.ts
// generated_at: 2026-05-22T03:01:13Z
// META: {"id":"AI-002","priority":"P2/P3","title":"资产盘点图表模块与筛选项可核验"}
// SourceRefs: SR-2099-01-AI-002, SR-2099-01-AI-DIRECTORY-DISTRIBUTION-L66, SR-2099-01-AI-VALUE-RANK-L84, SR-2099-01-AI-STORAGE-RESOURCE-L105, SR-UI-PROBE-20260522-ASSETS-001, SR-SELF-RUN-ASSETS-001
import { test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  expectAssetsInventoryApiHealth,
  expectAssetsInventoryDropdowns,
  expectAssetsInventoryModules,
  gotoAssetsInventory,
  triggerAssetsInventoryScheduleJobs,
} from "../../../../../../_shared/pages/2099-01-lt-dq-main-flow/assets-inventory-page";
import {
  ASSETS_INVENTORY_CHART_SCOPE,
  SR_2099_01_AI_002,
  SR_2099_01_AI_DIRECTORY_DISTRIBUTION_L66,
  SR_2099_01_AI_STORAGE_RESOURCE_L105,
  SR_2099_01_AI_VALUE_RANK_L84,
} from "../fixtures/assets-inventory-contract";

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

test("【P2】资产盘点数据目录分布图数据接口与缺省态入口可核验", async ({ page, step }) => {
  await step("步骤1-5: 调用分布调度、进入资产盘点并核验数据目录分布模块", async () => {
    await triggerAssetsInventoryScheduleJobs(page, ["saveOneDayDataDistribution"], SR_2099_01_AI_DIRECTORY_DISTRIBUTION_L66);
    await gotoAssetsInventory(page, undefined, ASSETS_INVENTORY_CHART_SCOPE.projectId);
    await expectAssetsInventoryModules(page, SR_2099_01_AI_DIRECTORY_DISTRIBUTION_L66);
    await expectAssetsInventoryApiHealth(page, SR_2099_01_AI_DIRECTORY_DISTRIBUTION_L66);
  });
});

test("【P3】资产盘点数据价值排行近7天近一月近一年与排序入口可核验", async ({ page, step }) => {
  await step("步骤1-8: 调用价值排行调度、进入资产盘点并核验价值排行模块和筛选入口", async () => {
    await triggerAssetsInventoryScheduleJobs(page, ["affectCountStatistic"], SR_2099_01_AI_VALUE_RANK_L84);
    await gotoAssetsInventory(page, undefined, ASSETS_INVENTORY_CHART_SCOPE.projectId);
    await expectAssetsInventoryModules(page, SR_2099_01_AI_VALUE_RANK_L84);
    await expectAssetsInventoryDropdowns(page, SR_2099_01_AI_VALUE_RANK_L84);
  });
});

test("【P3】资产盘点存储资源情况排行与表行数排行入口可核验", async ({ page, step }) => {
  await step("步骤1-6: 调用存储排行调度、进入资产盘点并核验存储资源情况模块", async () => {
    await triggerAssetsInventoryScheduleJobs(page, ["saveTop10TableData"], SR_2099_01_AI_STORAGE_RESOURCE_L105);
    await gotoAssetsInventory(page, undefined, ASSETS_INVENTORY_CHART_SCOPE.projectId);
    await expectAssetsInventoryModules(page, SR_2099_01_AI_STORAGE_RESOURCE_L105);
    await expectAssetsInventoryApiHealth(page, SR_2099_01_AI_STORAGE_RESOURCE_L105);
  });
});
