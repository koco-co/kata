// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L223,#L241,#L259,#L277,#L295,#L313,#L329,#L344,#L360,#L374,#L388,#L402,#L416,#L430
// intent: SR-INTENT-2099-01-MD-004
// probe: SR-UI-PROBE-20260523-MF-METADATA-SEARCH-001
// page: _shared/pages/2099-01-lt-dq-main-flow/metadata-search-page.ts
// generated_at: 2026-05-23T07:40:00Z
// META: {"id":"MD-004","priority":"P2/P3","title":"数据地图搜索类型统计与入口交互可核验"}
// SourceRefs: SR-2099-01-MD-OFFLINE-SEARCH-L223, SR-2099-01-MD-REALTIME-SEARCH-L241, SR-2099-01-MD-API-SEARCH-L259, SR-2099-01-MD-TAG-SEARCH-L277, SR-2099-01-MD-INDEX-SEARCH-L295, SR-2099-01-MD-RECENT-QUERY-L313, SR-2099-01-MD-TYPE-STATS-L329, SR-2099-01-MD-TABLE-COUNT-L344, SR-2099-01-MD-OFFLINE-COUNT-L360, SR-2099-01-MD-REALTIME-COUNT-L374, SR-2099-01-MD-API-COUNT-L388, SR-2099-01-MD-TAG-COUNT-L402, SR-2099-01-MD-INDEX-COUNT-L416, SR-2099-01-MD-TYPE-CLICKTHROUGH-L430, SR-2099-01-MD-004, SR-2099-01-MD-005, SR-2099-01-MD-006, SR-2099-01-MD-007, SR-2099-01-MD-008, SR-UI-PROBE-20260523-MF-METADATA-SEARCH-001, SR-SELF-RUN-20260523-MF-METADATA-SEARCH-001
import { test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  expectDataMapStatisticsAndTypes,
  expectDataMapTypeNavigation,
} from "../../../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-search-page";
import {
  SR_2099_01_MD_004,
  SR_2099_01_MD_005,
  SR_2099_01_MD_006,
  SR_2099_01_MD_007,
  SR_2099_01_MD_008,
} from "../fixtures/metadata-contract";

const DATA_MAP_CLICKTHROUGH_TYPES = ["数据表", "离线任务", "实时任务", "API", "智能标签", "指标"] as const;

test.setTimeout(120000);

test("【P2/P3】元数据数据地图统计入口与剩余类型搜索页可核验", async ({ page, step }) => {
  await step("步骤1: 进入数据地图首页 → 资产类型统计和页面模块可见", async () => {
    await expectDataMapStatisticsAndTypes(page, SR_2099_01_MD_004);
  });

  await step("步骤2: 点击数据表/离线任务/实时任务/API/智能标签/指标 → 对应搜索页筛选区可见", async () => {
    await expectDataMapTypeNavigation(
      page,
      DATA_MAP_CLICKTHROUGH_TYPES,
      [
        SR_2099_01_MD_004,
        SR_2099_01_MD_005,
        SR_2099_01_MD_006,
        SR_2099_01_MD_007,
        SR_2099_01_MD_008,
        "SR-2099-01-MD-TYPE-CLICKTHROUGH-L430",
      ].join(", "),
    );
  });
});
