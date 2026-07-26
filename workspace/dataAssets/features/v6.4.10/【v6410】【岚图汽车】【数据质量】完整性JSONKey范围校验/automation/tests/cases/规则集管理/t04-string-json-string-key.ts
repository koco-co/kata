// spec: features/completeness-json-key-range/archive.md#case=t04-string-json-string-key
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t10","priority":"P1","title":"验证string字段可配置且非json/string字段不可选择key范围校验"}
import { expect, test } from "../../../../../_shared/fixtures/step-screenshot";
import { selectAntOption } from "../../../../../_shared/helpers";
import { addRuleToPackage } from "../../../../../_shared/pages/validity-multi-rule-logic/rule-editor-helpers";
import {
  ACTIVE_DATASOURCES,
  clearCurrentDatasource,
  setCurrentDatasource,
} from "../../fixtures/test-data";
import {
  collectFieldOptions,
  configureKeyRangeRule,
  SCENARIOS,
  selectRuleFunction,
  startRuleSetDraft,
} from "../../../../../_shared/pages/completeness-json-key-range/suite-helpers";

for (const datasource of ACTIVE_DATASOURCES) {
  test.describe(`${"【内置规则丰富】完整性，json中key值范围校验 - 字段类型限制"} - ${datasource.reportName}`, () => {
    test.describe.configure({ timeout: 600000 });
    test.beforeAll(() => setCurrentDatasource(datasource));
    test.beforeEach(() => setCurrentDatasource(datasource));
    test.afterAll(() => clearCurrentDatasource());

    test("验证string类型字段可成功配置key范围校验规则", async ({ page }) => {
      await startRuleSetDraft(page, SCENARIOS.fieldType);
      const ruleForm = await addRuleToPackage(page, SCENARIOS.fieldType.packageName, "完整性校验");
      const levelSelect = ruleForm
        .locator(".ant-form-item")
        .filter({ hasText: /规则类型/ })
        .locator(".ant-select")
        .first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      await configureKeyRangeRule(page, ruleForm, {
        field: "extra_info",
        method: "包含",
        keyNames: ["key1"],
        ruleStrength: "强规则",
      });
      await expect(ruleForm).toContainText("extra_info");
    });

    test("验证非json和string类型字段不可选择key范围校验", async ({ page }) => {
      await startRuleSetDraft(page, SCENARIOS.fieldType);
      const ruleForm = await addRuleToPackage(page, SCENARIOS.fieldType.packageName, "完整性校验");
      const levelSelect = ruleForm
        .locator(".ant-form-item")
        .filter({ hasText: /规则类型/ })
        .locator(".ant-select")
        .first();
      await selectAntOption(page, levelSelect, /字段级|字段/);
      await selectRuleFunction(ruleForm, "key范围校验");
      const options = await collectFieldOptions(page, ruleForm);
      expect(options).not.toEqual(expect.arrayContaining(["age", "create_date", "user_id"]));
    });
  });
}
