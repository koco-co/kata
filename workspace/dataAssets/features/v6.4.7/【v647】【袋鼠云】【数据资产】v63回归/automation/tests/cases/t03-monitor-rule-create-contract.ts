// spec: features/assets-v63-regression/archive.md#case=t03-monitor-rule-create-contract
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t03","priority":"P0","title":"新建单表校验规则的监控对象步骤字段可见"}
// SourceRefs: SR-INTENT-001, SR-UI-PROBE-002, SR-SELF-RUN-001
import { expect, test } from "../../../../_shared/fixtures/step-screenshot";
import { SOURCE_REFS, V63_REGRESSION_SCOPE } from "../data/v63-regression-contract";
import { expectDataQualityShell, expectTexts, gotoDataQualityPage } from "../../../../_shared/pages/assets-v63-regression/v63-regression-page";

test.setTimeout(90000);

test("【P0】新建监控规则页面展示监控对象配置字段", async ({ page, step }) => {
  await step("步骤1: 进入新建单表校验规则页 → 表单渲染完成", async () => {
    await gotoDataQualityPage(page, "/dq/rule/add", { reload: true });
    await expectDataQualityShell(page, SOURCE_REFS.probeProject);
    await expect(page.locator("body"), SOURCE_REFS.probeProject).toContainText("新建单表校验规则");
  });

  await step("步骤2: 检查监控对象字段 → 可选择数据源、数据库和数据表", async () => {
    await expectTexts(page, V63_REGRESSION_SCOPE.monitorObjectLabels, SOURCE_REFS.probeProject);
    await expect(page.getByRole("button", { name: "下一步" }), SOURCE_REFS.probeProject).toBeVisible();
  });
});
