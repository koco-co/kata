// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8919,#L8938
// intent: SR-INTENT-2099-01-DQ-PROJECT-MANAGEMENT-L8919-L8938
// probe: SR-UI-PROBE-20260526-DQ-PROJECT-MANAGEMENT-001
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-26T00:00:00Z
// SourceRefs: SR-2099-01-DQ-PROJECT-L8919, SR-2099-01-DQ-PROJECT-L8938, SR-UI-PROBE-20260526-DQ-PROJECT-MANAGEMENT-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataQualityDirtyDataManagementContract,
  expectDataQualityDirtyDataStorageEditContract,
  expectDataQualityProjectCreateEditContract,
  expectDataQualityProjectDefaultMonitorDatabaseContract,
  expectDataQualityProjectPinDeleteContract,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0】数据质量项目管理项目信息创建与编辑可核验", async ({ page }) => {
  await expectDataQualityProjectCreateEditContract(page, "SR-2099-01-DQ-PROJECT-L8919");
});

test("【P1】数据质量项目管理项目信息置顶与删除可核验", async ({ page }) => {
  await expectDataQualityProjectPinDeleteContract(page, "SR-2099-01-DQ-PROJECT-L8938");
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8957
// SourceRefs: SR-2099-01-DQ-PROJECT-DEFAULT-MONITOR-DB-L8957, SR-UI-PROBE-20260527-DQ-PROJECT-DEFAULT-MONITOR-DB-L8957-001
test("【P0】数据质量项目管理默认监控数据源库设置生效", async ({ page }) => {
  await expectDataQualityProjectDefaultMonitorDatabaseContract(
    page,
    "SR-2099-01-DQ-PROJECT-DEFAULT-MONITOR-DB-L8957",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8976
// SourceRefs: SR-2099-01-DQ-PROJECT-DIRTY-DATA-MANAGE-L8976, SR-UI-PROBE-20260527-DQ-PROJECT-DIRTY-DATA-MANAGE-L8976-001
test("【P1】数据质量项目管理脏数据管理设置正常", async ({ page }) => {
  await expectDataQualityDirtyDataManagementContract(page, "SR-2099-01-DQ-PROJECT-DIRTY-DATA-MANAGE-L8976");
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8996
// SourceRefs: SR-2099-01-DQ-PROJECT-DIRTY-DATA-STORAGE-EDIT-L8996, SR-UI-PROBE-20260527-DQ-PROJECT-DIRTY-DATA-STORAGE-EDIT-L8996-001
test("【P1】数据质量项目管理编辑独立存储功能正常", async ({ page }) => {
  await expectDataQualityDirtyDataStorageEditContract(
    page,
    "SR-2099-01-DQ-PROJECT-DIRTY-DATA-STORAGE-EDIT-L8996",
  );
});
