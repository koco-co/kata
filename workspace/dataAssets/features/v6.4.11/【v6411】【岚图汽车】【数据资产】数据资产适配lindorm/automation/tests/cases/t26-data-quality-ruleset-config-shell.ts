// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7671-L7861
// intent: SR-INTENT-2099-01-DQ-RULESET-CONFIG-001
// probe: results/20260523-1930-mf-quality-ruleset-config-01/playwright/ui-probe/probe.json
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-23T11:40:49Z
// SourceRefs: SR-2099-01-DQ-RULESET-CONFIG-001, SR-UI-PROBE-20260523-DQ-RULESET-CONFIG-001
// SourceRefs: SR-SELF-RUN-20260523-DQ-RULESET-CONFIG-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import { expectDataQualityRuleSetConfigShell } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0】数据质量规则集配置-取值范围枚举与key范围配置壳可核验", async ({ page, step }) => {
  await step("步骤1: 打开规则集编辑壳 → 核验取值范围&枚举范围与key范围校验配置控件，不保存", async () => {
    await expectDataQualityRuleSetConfigShell(page, "SR-2099-01-DQ-RULESET-CONFIG-001");
  });
});
