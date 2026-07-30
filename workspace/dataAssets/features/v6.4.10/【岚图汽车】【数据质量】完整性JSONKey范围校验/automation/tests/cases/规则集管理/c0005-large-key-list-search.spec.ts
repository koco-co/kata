// spec: features/completeness-json-key-range/archive.md#case=t05-key
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t12","priority":"P1","title":"验证key范围校验表单必填提示"}
import { test } from "../../../../../../../_shared/automation/fixtures/step-screenshot";
import { selectAntOption } from "../../../../../../../../../runtime/automation/playwright";
import { addRuleToPackage } from "../../../../../../../_shared/automation/pages/data-quality/rule-set-editor";
import {
  ACTIVE_DATASOURCES,
  clearCurrentDatasource,
  setCurrentDatasource,
} from "../../fixtures/test-data";
import {
  expectRuleError,
  SCENARIOS,
  saveInvalidRuleSet,
  selectRuleFunction,
  setVerificationContent,
  startRuleSetDraft,
} from "../../flows/rule-set-flow";

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 表单校验"} - ${datasource.reportName}`, () => {
    test.describe.configure({ timeout: 600000 });
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证未选择字段时保存key范围校验规则提示必填", async ({ page }) => {
      await startRuleSetDraft(page, SCENARIOS.main);
      const ruleForm = await addRuleToPackage(page, SCENARIOS.main.packageName, "完整性校验");
      const levelSelect = ruleForm
        .locator(".ant-form-item")
        .filter({ hasText: /规则类型/ })
        .locator(".ant-select")
        .first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      await selectRuleFunction(ruleForm, "key范围校验");
      await selectAntOption(
        page,
        ruleForm
          .locator(".ant-form-item")
          .filter({ hasText: /校验方法/ })
          .locator(".ant-select")
          .first(),
        "包含",
      );
      await setVerificationContent(page, ruleForm, ["key1"]);
      await saveInvalidRuleSet(page);
      await expectRuleError(ruleForm, "请选择字段");
    });

    test("验证未选择校验内容时保存key范围校验规则提示必填", async ({ page }) => {
      await startRuleSetDraft(page, SCENARIOS.main);
      const ruleForm = await addRuleToPackage(page, SCENARIOS.main.packageName, "完整性校验");
      const levelSelect = ruleForm
        .locator(".ant-form-item")
        .filter({ hasText: /规则类型/ })
        .locator(".ant-select")
        .first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      await selectAntOption(
        page,
        ruleForm
          .locator(".ant-form-item")
          .filter({ hasText: /^字段/ })
          .locator(".ant-select")
          .first(),
        "info",
      );
      await selectRuleFunction(ruleForm, "key范围校验");
      await selectAntOption(
        page,
        ruleForm
          .locator(".ant-form-item")
          .filter({ hasText: /校验方法/ })
          .locator(".ant-select")
          .first(),
        "包含",
      );
      await saveInvalidRuleSet(page);
      await expectRuleError(ruleForm, "请选择校验内容");
    });

    test("验证未选择校验方法时保存key范围校验规则提示必填", async ({ page }) => {
      await startRuleSetDraft(page, SCENARIOS.main);
      const ruleForm = await addRuleToPackage(page, SCENARIOS.main.packageName, "完整性校验");
      const levelSelect = ruleForm
        .locator(".ant-form-item")
        .filter({ hasText: /规则类型/ })
        .locator(".ant-select")
        .first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      await selectAntOption(
        page,
        ruleForm
          .locator(".ant-form-item")
          .filter({ hasText: /^字段/ })
          .locator(".ant-select")
          .first(),
        "info",
      );
      await selectRuleFunction(ruleForm, "key范围校验");
      await setVerificationContent(page, ruleForm, ["key1"]);
      await saveInvalidRuleSet(page);
      await expectRuleError(ruleForm, "请选择校验方法");
    });
  });
}
