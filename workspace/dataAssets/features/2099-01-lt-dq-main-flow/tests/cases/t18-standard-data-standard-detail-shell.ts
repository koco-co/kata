// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L3520-L3866
// intent: SR-INTENT-2099-01-STD-018
// probe: results/20260523-1900-mf-standard-data-standard-detail-01/playwright/ui-probe/snapshot.json
// page: _shared/pages/2099-01-lt-dq-main-flow/standard-page.ts
// generated_at: 2026-05-23T19:00:00+08:00
// META: {"id":"STD-018","priority":"P1/P2/P3","title":"数据标准详情、导入导出入口与新建只读 Shell 可核验"}
// SourceRefs: SR-2099-01-STD-018, SR-UI-PROBE-20260523-MF-STANDARD-DATA-STANDARD-DETAIL-001, SR-SELF-RUN-20260523-MF-STANDARD-DATA-STANDARD-DETAIL-001
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
