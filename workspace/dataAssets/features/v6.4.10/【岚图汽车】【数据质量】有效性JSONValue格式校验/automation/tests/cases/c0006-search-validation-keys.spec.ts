import { uniqueName, waitForUiSettled } from "../../../../../../../../runtime/automation/playwright";
// spec: features/validity-json-value-format/archive.md#case=t06-key
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t6","priority":"P1","title":"【P1】验证校验key搜索功能正常"}
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";

import {
  addJsonFormatRule,
  openValidationKeyDropdown,
  prepareJsonRuleSetDraft,
  searchValidationKey,
} from "../flows/rule-set-flow";
import { describeByDatasource } from "../fixtures/suite-matrix";

const RULE_CONFIG_TABLE = "quality_test_json_rule_config";

test.setTimeout(600000);

describeByDatasource("规则集管理", () => {
  test("验证校验key搜索功能正常", async ({ page }) => {
    const packageName = uniqueName("t6_pkg");
    await prepareJsonRuleSetDraft(page, RULE_CONFIG_TABLE, packageName, ["searchBasic"]);

    const ruleForm = await addJsonFormatRule(page, packageName, {
      field: "info",
    });
    const dropdown = await openValidationKeyDropdown(page, ruleForm);

    await searchValidationKey(page, "order");
    await expect(dropdown).toContainText("order-amount");
    await expect(dropdown).toContainText("order-status");
    await expect(dropdown).not.toContainText("user-name");

    const searchInput = dropdown.locator("input").last();
    await searchInput.fill("");
    await waitForUiSettled(page);

    await expect(dropdown).toContainText("order-amount");
    await expect(dropdown).toContainText("order-status");
    await expect(dropdown).toContainText("user-name");
    await page.keyboard.press("Escape").catch(() => undefined);
  });
});
