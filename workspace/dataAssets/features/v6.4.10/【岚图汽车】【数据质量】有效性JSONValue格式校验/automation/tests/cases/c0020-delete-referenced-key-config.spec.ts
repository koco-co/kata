// spec: features/validity-json-value-format/archive.md#case=t20-key
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t20","priority":"P1","title":"【P1】验证删除已被有效性规则引用的key后规则配置页面回显和编辑功能正常"}
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { DELETE_REFERENCE_SCENARIO } from "../fixtures/test-data";
import {
  getSelectedValidationKeyTexts,
  getValidationKeyLabels,
  getValidationKeyState,
  openScenarioRuleSetPackage,
  openValidationKeyDropdown,
} from "../flows/rule-set-flow";
import { ensureJsonFormatTask } from "../flows/rule-task-flow";
import { deleteKey, gotoJsonConfigPage } from "../../../../../../_shared/automation/pages/data-quality/json-configuration";
import { saveRuleSet } from "../pages/rule-set-editor";
import { describeByDatasource } from "../fixtures/suite-matrix";

test.setTimeout(600000);

describeByDatasource("规则集管理", () => {
  test("验证删除已被有效性规则引用的key后规则配置页面回显和编辑功能正常", async ({ page }) => {
    await ensureJsonFormatTask(page, DELETE_REFERENCE_SCENARIO);

    await gotoJsonConfigPage(page);
    await deleteKey(page, "del-key-a", { force: true });

    const rulePackage = await openScenarioRuleSetPackage(page, DELETE_REFERENCE_SCENARIO);
    const ruleForm = rulePackage.locator(".ruleForm").first();
    await expect(ruleForm).toBeVisible({ timeout: 10000 });

    const selectedKeys = await getSelectedValidationKeyTexts(ruleForm);
    expect(selectedKeys).toContain("del-key-b");
    expect(selectedKeys).not.toContain("del-key-a");

    await openValidationKeyDropdown(page, ruleForm);
    const labels = await getValidationKeyLabels(page);
    expect(labels).toContain("del-key-b");
    expect(labels).not.toContain("del-key-a");

    const keyState = await getValidationKeyState(page, "del-key-b");
    expect(keyState.checked).toBe(true);
    await page.keyboard.press("Escape").catch(() => undefined);

    await saveRuleSet(page);

    const reopenedPackage = await openScenarioRuleSetPackage(page, DELETE_REFERENCE_SCENARIO);
    const reopenedRuleForm = reopenedPackage.locator(".ruleForm").first();
    const reopenedKeys = await getSelectedValidationKeyTexts(reopenedRuleForm);
    expect(reopenedKeys).toContain("del-key-b");
    expect(reopenedKeys).not.toContain("del-key-a");
  });
});
