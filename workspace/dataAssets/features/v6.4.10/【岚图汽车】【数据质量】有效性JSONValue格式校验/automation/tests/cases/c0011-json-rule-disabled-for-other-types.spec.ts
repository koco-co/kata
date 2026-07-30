import { selectAntOption, uniqueName, waitForUiSettled } from "../../../../../../../../runtime/automation/playwright";
// spec: features/validity-json-value-format/archive.md#case=t11-json-string-json
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// META: {"id":"t11","priority":"P1","title":"【P1】验证选择非json或string类型字段时「格式-json格式校验」统计规则选项不可选"}
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../../../../../../_shared/automation/fixtures/step-screenshot";

import { prepareJsonRuleSetDraft } from "../flows/rule-set-flow";
import { addRuleToPackage } from "../pages/rule-set-editor";
import { describeByDatasource } from "../fixtures/suite-matrix";
import { FORMAT_JSON_VERIFICATION_FUNC } from "../fixtures/test-data-15694";

const MULTI_TYPE_TABLE = "quality_test_json_multi_type";
const UNSUPPORTED_FIELDS = ["id", "age", "salary", "created_at"] as const;

test.setTimeout(600000);

function getFieldSelect(ruleForm: Locator): Locator {
  return ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /^字段/ })
    .locator(".ant-select")
    .first();
}

function getFunctionSelect(ruleForm: Locator): Locator {
  return ruleForm.locator(".rule__function-list__item").first().locator(".ant-select").first();
}

async function expectJsonFormatAvailability(
  page: Page,
  ruleForm: Locator,
  fieldName: string,
  shouldBeAvailable: boolean,
): Promise<void> {
  await selectAntOption(page, getFieldSelect(ruleForm), fieldName);
  const functionSelect = getFunctionSelect(ruleForm);
  await functionSelect.locator(".ant-select-selector").click();

  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown).toBeVisible({ timeout: 5000 });

  const option = dropdown
    .locator(".ant-select-item-option")
    .filter({ hasText: FORMAT_JSON_VERIFICATION_FUNC })
    .first();
  const visible = await option.isVisible({ timeout: 1500 }).catch(() => false);

  if (shouldBeAvailable) {
    await expect(option).toBeVisible({ timeout: 5000 });
    const disabled = await option.evaluate((element) =>
      element.classList.contains("ant-select-item-option-disabled"),
    );
    expect(disabled).toBe(false);
  } else if (visible) {
    const disabled = await option.evaluate((element) =>
      element.classList.contains("ant-select-item-option-disabled"),
    );
    expect(disabled).toBe(true);
  }

  await page.keyboard.press("Escape").catch(() => undefined);
  await waitForUiSettled(page);
}

describeByDatasource("规则集管理", () => {
  test("验证选择非json或string类型字段时「格式-json格式校验」统计规则选项不可选", async ({
    page,
  }) => {
    const packageName = uniqueName("t11_pkg");
    await prepareJsonRuleSetDraft(page, MULTI_TYPE_TABLE, packageName);

    const ruleForm = await addRuleToPackage(page, packageName, "有效性校验");
    await expect(ruleForm).toBeVisible({ timeout: 10000 });

    for (const fieldName of UNSUPPORTED_FIELDS) {
      await expectJsonFormatAvailability(page, ruleForm, fieldName, false);
    }

    await expectJsonFormatAvailability(page, ruleForm, "info", true);
  });
});
