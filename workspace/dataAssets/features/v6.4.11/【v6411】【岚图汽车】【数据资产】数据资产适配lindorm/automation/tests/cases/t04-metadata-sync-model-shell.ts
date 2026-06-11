// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L1995,#L2009,#L2084,#L2100,#L2115,#L2130,#L2150,#L2166,#L2181,#L2237,#L2253,#L2270,#L2286
// intent: SR-INTENT-2099-01-MD-002
// probe: SR-UI-PROBE-20260522-METADATA-003, SR-UI-PROBE-20260523-MF-METADATA-001
// page: _shared/pages/2099-01-lt-dq-main-flow/metadata-sync-page.ts
// generated_at: 2026-05-22T03:12:41Z
// META: {"id":"MD-002","priority":"P1","title":"元数据同步与元模型管理 Shell 可核验"}
// SourceRefs: SR-2099-01-MD-SYNC-CREATE-L1995, SR-2099-01-MD-SYNC-ALL-TYPES-L2009, SR-2099-01-MD-SYNC-FILTER-L2084, SR-2099-01-MD-SYNC-MANY-TABLES-L2100, SR-2099-01-MD-SYNC-EXCEPTION-L2115, SR-2099-01-MD-SYNC-OWNER-L2130, SR-2099-01-MD-SYNC-INDEX-L2150, SR-2099-01-MD-OFFLINE-LIFECYCLE-L2166, SR-2099-01-MD-OFFLINE-TABLE-AUTO-SYNC-L2181, SR-2099-01-MD-MVIEW-OPERATION-RECORD-L2237, SR-2099-01-MD-OFFLINE-TASK-VIEW-LINEAGE-L2253, SR-2099-01-MD-VIEW-LINEAGE-L2270, SR-2099-01-MD-LINEAGE-PARSE-L2286, SR-2099-01-MD-002, SR-2099-01-MD-003, SR-UI-PROBE-20260522-METADATA-003, SR-UI-PROBE-20260523-MF-METADATA-001, SR-SELF-RUN-METADATA-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectMetaModelShell,
  expectMetadataSyncShell,
  expectSyncTaskAdvancedOptionsShell,
  expectSyncTaskCreateEntry,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-sync-page";
import { SR_2099_01_MD_002, SR_2099_01_MD_003 } from "../data/metadata-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(90000);

test("【P1】元数据同步列表和元模型管理 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 进入元数据同步页面 → 周期同步列表 Shell 可见", async () => {
    await expectMetadataSyncShell(page, SR_2099_01_MD_002);
  });

  await step("步骤2: 进入元模型管理页面 → 元模型卡片和编辑入口可见", async () => {
    await expectMetaModelShell(page, SR_2099_01_MD_002);
  });
});

test("【P1】元数据同步新增周期任务入口字段可核验", async ({ page, step }) => {
  await step("步骤1: 进入元数据同步并打开新增周期同步任务 → 创建向导关键字段可见", async () => {
    await expectSyncTaskCreateEntry(page, "SR-2099-01-MD-SYNC-CREATE-L1995");
  });
});

test("【P1/P2/P3】元数据同步高级配置、过滤、负责人、索引与血缘相关入口可核验", async ({ page, step }) => {
  await step("步骤1: 打开新增周期同步任务 → 全类型字段、过滤、大量表、负责人、索引和立即同步入口可见", async () => {
    await expectSyncTaskAdvancedOptionsShell(
      page,
      "SR-2099-01-MD-SYNC-ALL-TYPES-L2009, SR-2099-01-MD-SYNC-FILTER-L2084, SR-2099-01-MD-SYNC-MANY-TABLES-L2100, SR-2099-01-MD-SYNC-EXCEPTION-L2115, SR-2099-01-MD-SYNC-OWNER-L2130, SR-2099-01-MD-SYNC-INDEX-L2150",
    );
  });

  await step("步骤2: 元数据同步列表 → 离线自动同步、生命周期、物化视图操作记录和血缘解析相关同步入口可见", async () => {
    await expectMetadataSyncShell(
      page,
      "SR-2099-01-MD-OFFLINE-LIFECYCLE-L2166, SR-2099-01-MD-OFFLINE-TABLE-AUTO-SYNC-L2181, SR-2099-01-MD-MVIEW-OPERATION-RECORD-L2237, SR-2099-01-MD-OFFLINE-TASK-VIEW-LINEAGE-L2253, SR-2099-01-MD-VIEW-LINEAGE-L2270, SR-2099-01-MD-LINEAGE-PARSE-L2286",
    );
  });
});
