// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8248,#L8267
// intent: SR-INTENT-2099-01-DQ-PROJECT-MANAGEMENT-L8248-L8267
// probe: SR-UI-PROBE-20260526-DQ-PROJECT-MANAGEMENT-001
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-26T00:00:00Z
// SourceRefs: SR-2099-01-DQ-PROJECT-L8248, SR-2099-01-DQ-PROJECT-L8267, SR-UI-PROBE-20260526-DQ-PROJECT-MANAGEMENT-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataQualityDirtyDataManagementContract,
  expectDataQualityDirtyDataStorageEditContract,
  expectDataQualityProjectCreateEditContract,
  expectDataQualityProjectDefaultMonitorDatabaseContract,
  expectDataQualityProjectPinDeleteContract,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";

test.setTimeout(3 * 60 * 1000);

// archive-title: 验证【项目管理-项目信息】项目列表、创建与编辑功能正常
test("【P0】数据质量项目管理项目信息创建与编辑可核验", async ({ page }) => {
  await expectDataQualityProjectCreateEditContract(page, "SR-2099-01-DQ-PROJECT-L8248");
});

// archive-title: 验证【项目管理-项目信息】项目删除与置顶功能正常
test("【P1】数据质量项目管理项目信息置顶与删除可核验", async ({ page }) => {
  await expectDataQualityProjectPinDeleteContract(page, "SR-2099-01-DQ-PROJECT-L8267");
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8286
// SourceRefs: SR-2099-01-DQ-PROJECT-DEFAULT-MONITOR-DB-L8286, SR-UI-PROBE-20260527-DQ-PROJECT-DEFAULT-MONITOR-DB-L8286-001
test("【P0】数据质量项目管理默认监控数据源库设置生效", async ({ page }) => {
  await expectDataQualityProjectDefaultMonitorDatabaseContract(
    page,
    "SR-2099-01-DQ-PROJECT-DEFAULT-MONITOR-DB-L8286",
  );
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8305
// SourceRefs: SR-2099-01-DQ-PROJECT-DIRTY-DATA-MANAGE-L8305, SR-UI-PROBE-20260527-DQ-PROJECT-DIRTY-DATA-MANAGE-L8305-001
test("【P1】数据质量项目管理脏数据管理设置正常", async ({ page }) => {
  await expectDataQualityDirtyDataManagementContract(page, "SR-2099-01-DQ-PROJECT-DIRTY-DATA-MANAGE-L8305");
});

// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8325
// SourceRefs: SR-2099-01-DQ-PROJECT-DIRTY-DATA-STORAGE-EDIT-L8325, SR-UI-PROBE-20260527-DQ-PROJECT-DIRTY-DATA-STORAGE-EDIT-L8325-001
test("【P1】数据质量项目管理编辑独立存储功能正常", async ({ page }) => {
  await expectDataQualityDirtyDataStorageEditContract(
    page,
    "SR-2099-01-DQ-PROJECT-DIRTY-DATA-STORAGE-EDIT-L8325",
  );
});
