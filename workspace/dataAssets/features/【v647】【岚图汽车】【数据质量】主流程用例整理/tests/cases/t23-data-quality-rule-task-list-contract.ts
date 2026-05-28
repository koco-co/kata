// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7625-L7668
// intent: SR-INTENT-2099-01-DQ-RULE-TASK-LIST-001
// probe: results/20260523-2055-mf-quality-rule-task-list-01/playwright/ui-probe/probe.json
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-23T10:49:54Z
// SourceRefs: SR-2099-01-DQ-RULE-TASK-LIST-001, SR-UI-PROBE-20260523-DQ-RULE-TASK-LIST-001, SR-SELF-RUN-20260523-DQ-RULE-TASK-LIST-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import { expectDataQualityRuleTaskListContract } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0】数据质量规则任务管理列表 API 与首行展示一致可核验", async ({ page, step }) => {
  await step("步骤1: 进入规则任务管理 → 列表加载后首条任务与 monitor/pageQuery 返回一致", async () => {
    await expectDataQualityRuleTaskListContract(page, "SR-2099-01-DQ-RULE-TASK-LIST-001");
  });
});
