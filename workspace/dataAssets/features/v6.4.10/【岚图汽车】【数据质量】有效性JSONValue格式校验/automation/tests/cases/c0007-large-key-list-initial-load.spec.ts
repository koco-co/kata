// spec: features/validity-json-value-format/archive.md#case=t07-key-200-200
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// META: {"id":"t7","priority":"P1","title":"【P1】验证校验key数据量超过200条时默认加载前200条展示"}
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { uniqueName } from "../../../../../../../../runtime/automation/playwright";
import {
  addJsonFormatRule,
  getValidationKeyLabels,
  openValidationKeyDropdown,
  prepareJsonRuleSetDraft,
  searchValidationKey,
} from "../flows/rule-set-flow";
import { describeByDatasource } from "../fixtures/suite-matrix";

const RULE_CONFIG_TABLE = "quality_test_json_rule_config";

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
