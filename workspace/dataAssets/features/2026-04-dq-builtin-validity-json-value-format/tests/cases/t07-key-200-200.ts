// spec: features/validity-json-value-format/archive.md#case=t07-key-200-200
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t7","priority":"P1","title":"【P1】验证校验key数据量超过200条时默认加载前200条展示"}
import { expect, test } from "../../../../_shared/fixtures/step-screenshot";
import { uniqueName } from "../../../../_shared/helpers/test-setup";
import {
  addJsonFormatRule,
  getValidationKeyLabels,
  openValidationKeyDropdown,
  prepareJsonRuleSetDraft,
  searchValidationKey,
} from "../../../../_shared/pages/validity-json-value-format/json-format-suite-helpers";
import { describeByDatasource } from "../../../../_shared/pages/validity-json-value-format/suite-case-helpers";

const RULE_CONFIG_TABLE = "quality_test_json_rule_config";

test.use({
  storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc.json",
});
test.setTimeout(600000);

describeByDatasource("规则集管理", () => {
  test("验证校验key数据量超过200条时默认加载前200条展示", async ({ page }) => {
    const packageName = uniqueName("t7_pkg");
    await prepareJsonRuleSetDraft(page, RULE_CONFIG_TABLE, packageName, ["largeKeySet"]);

    const ruleForm = await addJsonFormatRule(page, packageName, {
      field: "info",
    });
    await openValidationKeyDropdown(page, ruleForm);

    const initialLabels = await getValidationKeyLabels(page);
    expect(initialLabels).toEqual(expect.arrayContaining(["test-key-001", "test-key-200"]));
    expect(initialLabels).not.toContain("test-key-205");

    const dropdown = await searchValidationKey(page, "test-key-205");
    await expect(dropdown).toContainText("test-key-205");
    await page.keyboard.press("Escape").catch(() => undefined);
  });
});
