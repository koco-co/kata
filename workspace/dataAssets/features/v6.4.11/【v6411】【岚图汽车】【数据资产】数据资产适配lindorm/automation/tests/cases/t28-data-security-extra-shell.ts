// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L5049-L5061
// intent: SR-2099-01-SEC-PERMISSION-RECYCLE-028
// ui-probe: results/20260524-mf-security-extra-02/ui-probe.json
// self-run: results/20260524-mf-security-extra-02/self-run.json
// page: _shared/pages/2099-01-lt-dq-main-flow/data-security-page.ts
// generated_at: 2026-05-23T20:30:00+08:00
// META: {"id":"SEC-028","priority":"P2","title":"数据安全-权限回收列表 Shell 可核验"}
// status: ready_for_runner_registration
// SourceRefs: SR-2099-01-SEC-PERMISSION-RECYCLE-028, SR-UI-PROBE-20260524-MF-SECURITY-EXTRA-002, SR-SELF-RUN-20260524-MF-SECURITY-EXTRA-002
import { test } from "../../../../_shared/fixtures/step-screenshot";
import { expectDataPermissionRecycleListShell } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-security-page";

test.setTimeout(3 * 60 * 1000);

const SECURITY_EXTRA_SOURCE_REF = "SR-2099-01-SEC-PERMISSION-RECYCLE-028";

test("【P2】数据安全-权限回收列表 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 进入数据权限管理并切换权限回收 → 筛选区和列表列头可见", async () => {
    await expectDataPermissionRecycleListShell(page, SECURITY_EXTRA_SOURCE_REF);
  });
});
