// spec: features/2026-04-you-xiao-xing-json-value/archive.md#case=t06-key
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t6","priority":"P1","title":"【P1】验证校验key搜索功能正常"}
import { expect, test } from "../../../../_shared/fixtures/step-screenshot";
import { uniqueName } from "../../../../_shared/helpers/test-setup";
import {
  addJsonFormatRule,
  openValidationKeyDropdown,
  prepareJsonRuleSetDraft,
  searchValidationKey,
} from "../../../../_shared/pages/2026-04-you-xiao-xing-json-value/json-format-suite-helpers";
import { describeByDatasource } from "../../../../_shared/pages/2026-04-you-xiao-xing-json-value/suite-case-helpers";

const RULE_CONFIG_TABLE = "quality_test_json_rule_config";

test.use({
  storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc.json",
});
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
    await page.waitForTimeout(400);

    await expect(dropdown).toContainText("order-amount");
    await expect(dropdown).toContainText("order-status");
    await expect(dropdown).toContainText("user-name");
    await page.keyboard.press("Escape").catch(() => undefined);
  });
});
