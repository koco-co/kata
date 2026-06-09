// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L3520,#L3535,#L3570,#L3584,#L3606,#L3623,#L3637,#L3653,#L3670,#L3686,#L3705,#L3719,#L3733,#L3747,#L3766,#L3781,#L3799,#L3816,#L3832,#L3849
// intent: SR-INTENT-2099-01-STD-018
// probe: results/20260523-1900-mf-standard-data-standard-detail-01/playwright/ui-probe/snapshot.json
// page: _shared/pages/2099-01-lt-dq-main-flow/standard-page.ts
// generated_at: 2026-05-23T19:00:00+08:00
// META: {"id":"STD-018","priority":"P1/P2/P3","title":"数据标准详情、导入导出入口与新建只读 Shell 可核验"}
// SourceRefs: SR-2099-01-STD-DEFINE-CREATE-L3520, SR-2099-01-STD-DEFINE-DETAIL-L3535, SR-2099-01-STD-DEFINE-EDIT-L3570, SR-2099-01-STD-DEFINE-INPUT-VALIDATION-L3584, SR-2099-01-STD-DEFINE-AUTO-MATCH-L3606, SR-2099-01-STD-DEFINE-REQUIRED-L3623, SR-2099-01-STD-DEFINE-DUPLICATE-L3637, SR-2099-01-STD-DEFINE-ONLINE-L3653, SR-2099-01-STD-DEFINE-OFFLINE-L3670, SR-2099-01-STD-DEFINE-APPROVAL-L3686, SR-2099-01-STD-DEFINE-DELETE-L3705, SR-2099-01-STD-DEFINE-IMPORT-TEMPLATE-L3719, SR-2099-01-STD-DEFINE-IMPORT-REQUIRED-L3733, SR-2099-01-STD-DEFINE-IMPORT-DUPLICATE-L3747, SR-2099-01-STD-DEFINE-EXPORT-L3766, SR-2099-01-STD-DEFINE-CUSTOM-ATTR-L3781, SR-2099-01-STD-DEFINE-LENGTH-FORMAT-L3799, SR-2099-01-STD-DEFINE-PRECISION-FORMAT-L3816, SR-2099-01-STD-DEFINE-VERSION-COMPARE-L3832, SR-2099-01-STD-DEFINE-VERSION-CHANGE-L3849, SR-2099-01-STD-018, SR-UI-PROBE-20260523-MF-STANDARD-DATA-STANDARD-DETAIL-001, SR-SELF-RUN-20260523-MF-STANDARD-DATA-STANDARD-DETAIL-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import { expectDataStandardDetailImportExportShell } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/standard-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(120000);

test("【P1/P2/P3】数据标准详情、导入导出入口与新建只读 Shell 可核验", async ({
  page,
  step,
}) => {
  await step("步骤1: 进入标准定义页面 → 详情抽屉、导入弹窗、导出弹窗与新建表单 Shell 可见", async () => {
    await expectDataStandardDetailImportExportShell(page, "SR-2099-01-STD-018");
  });
});
