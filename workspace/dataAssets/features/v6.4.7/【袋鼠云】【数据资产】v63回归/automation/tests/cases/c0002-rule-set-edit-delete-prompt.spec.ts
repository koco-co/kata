// spec: features/assets-v63-regression/archive.md#case=t02-rule-task-entry-contract
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// META: {"id":"t02","priority":"P0","title":"规则任务配置页展示规则集与监控规则核心入口"}
// SourceRefs: SR-INTENT-001, SR-UI-PROBE-002, SR-SELF-RUN-001
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { SOURCE_REFS, V63_REGRESSION_SCOPE } from "../fixtures/v63-regression-contract";
import { expectDataQualityShell, expectTexts, gotoDataQualityPage } from "../pages/data-quality-page";

test.setTimeout(90000);

test("【P0】规则任务配置入口、规则集区和监控规则表格可见", async ({ page, step }) => {
  await step("步骤1: 进入规则任务配置页 → 页面不是空壳或异常页", async () => {
    await gotoDataQualityPage(page, "/dq/rule");
    await expectDataQualityShell(page, SOURCE_REFS.probeProject);
  });

  await step("步骤2: 检查规则集与新建入口 → 支持规则集和监控规则主流程", async () => {
    await expect(page.getByRole("button", { name: "新建规则集" }), SOURCE_REFS.probeProject).toBeVisible();
    await expect(page.getByRole("button", { name: "新建监控规则" }), SOURCE_REFS.probeProject).toBeVisible();
    await expectTexts(page, V63_REGRESSION_SCOPE.ruleSetHeaders, SOURCE_REFS.probeProject);
    await expectTexts(page, V63_REGRESSION_SCOPE.ruleTableHeaders, SOURCE_REFS.probeProject);
  });
});
