// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L223-L430
// intent: SR-INTENT-2099-01-MD-004
// probe: SR-UI-PROBE-20260523-MF-METADATA-SEARCH-001
// page: _shared/pages/2099-01-lt-dq-main-flow/metadata-search-page.ts
// generated_at: 2026-05-23T07:40:00Z
// META: {"id":"MD-004","priority":"P2/P3","title":"数据地图搜索类型统计与入口交互可核验"}
// SourceRefs: SR-2099-01-MD-004, SR-2099-01-MD-005, SR-2099-01-MD-006, SR-2099-01-MD-007, SR-2099-01-MD-008, SR-UI-PROBE-20260523-MF-METADATA-SEARCH-001, SR-SELF-RUN-20260523-MF-METADATA-SEARCH-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataMapStatisticsAndTypes,
  expectDataMapTypeNavigation,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-search-page";
import {
  SR_2099_01_MD_004,
  SR_2099_01_MD_005,
  SR_2099_01_MD_006,
  SR_2099_01_MD_007,
  SR_2099_01_MD_008,
} from "../data/metadata-contract";

const DATA_MAP_REMAINING_TYPES = ["离线任务", "实时任务", "API", "智能标签", "指标"] as const;

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(120000);

test("【P2/P3】元数据数据地图统计入口与剩余类型搜索页可核验", async ({ page, step }) => {
  await step("步骤1: 进入数据地图首页 → 资产类型统计和页面模块可见", async () => {
    await expectDataMapStatisticsAndTypes(page, SR_2099_01_MD_004);
  });

  await step("步骤2: 点击离线任务/实时任务/API/智能标签/指标 → 对应搜索页筛选区可见", async () => {
    await expectDataMapTypeNavigation(
      page,
      DATA_MAP_REMAINING_TYPES,
      [
        SR_2099_01_MD_004,
        SR_2099_01_MD_005,
        SR_2099_01_MD_006,
        SR_2099_01_MD_007,
        SR_2099_01_MD_008,
      ].join(", "),
    );
  });
});
