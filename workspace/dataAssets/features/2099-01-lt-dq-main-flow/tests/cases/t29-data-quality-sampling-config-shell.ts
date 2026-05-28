// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8961,#L10448
// intent: SR-INTENT-2099-01-DQ-SAMPLING-CONFIG-001
// probe: results/20260524-mf-quality-sampling-config-02/playwright/ui-probe/probe.json
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-24T10:22:39Z
// status: ready_for_runner_registration
// SourceRefs: SR-2099-01-DQ-SAMPLING-CONFIG-L8961-L10448, SR-UI-PROBE-20260524-DQ-SAMPLING-CONFIG-002, SR-SELF-RUN-20260524-DQ-SAMPLING-CONFIG-002
import { test } from "../../../../_shared/fixtures/step-screenshot";
import { expectDataQualitySamplingConfigShell } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0】数据质量规则任务新建页抽样检查设置配置壳可核验", async ({ page, step }) => {
  await step("步骤1: 打开新建监控规则壳 → 核验数据预览下抽样检查设置入口可见，不保存", async () => {
    await expectDataQualitySamplingConfigShell(page, "SR-2099-01-DQ-SAMPLING-CONFIG-L8961-L10448");
  });
});
