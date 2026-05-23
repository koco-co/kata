// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L1995-L2010
// intent: SR-INTENT-2099-01-MD-002
// probe: SR-UI-PROBE-20260522-METADATA-003, SR-UI-PROBE-20260523-MF-METADATA-001
// page: _shared/pages/2099-01-lt-dq-main-flow/metadata-sync-page.ts
// generated_at: 2026-05-22T03:12:41Z
// META: {"id":"MD-002","priority":"P1","title":"元数据同步与元模型管理 Shell 可核验"}
// SourceRefs: SR-2099-01-MD-002, SR-2099-01-MD-003, SR-UI-PROBE-20260522-METADATA-003, SR-UI-PROBE-20260523-MF-METADATA-001, SR-SELF-RUN-METADATA-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectMetaModelShell,
  expectMetadataSyncShell,
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
    await expectSyncTaskCreateEntry(page, SR_2099_01_MD_003);
  });
});
