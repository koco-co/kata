import { waitForUiSettled } from "../../../../../../_shared/helpers/index";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Existing task records can retain stale rule-package/type selections after a
 * platform fix. Re-importing both selectors through the UI makes the edit
 * flow use the current complete rule set before moving to scheduling.
 */
export async function reimportAllTaskRules(page: Page, sourceRef: string): Promise<void> {
  const packageField = await findImportField(page, /规则包/, sourceRef);
  await chooseAll(page, packageField.locator(".ant-select:visible"), sourceRef, "规则包");

  const ruleTypeField = await findImportField(page, /规则类型/, sourceRef);
  await chooseAll(page, ruleTypeField.locator(".ant-select:visible"), sourceRef, "规则类型");

  await test.info().attach(`${sourceRef}-task-rule-import-before.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  await test.info().attach(`${sourceRef}-task-rule-import-before.txt`, {
    body: ((await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " "),
    contentType: "text/plain",
  });

  const importButtons = page.locator("button:visible").filter({ hasText: /^引\s*入$/ });
  await expect(importButtons, `${sourceRef}: 规则任务编辑页应展示引入按钮`).toHaveCount(1, { timeout: 30_000 });
  // Selecting "全部" in the second multi-select is committed only after the
  // dropdown loses focus. Escape cancels that temporary selection in this UI;
  // click a neutral page area instead and wait for the real button state.
  await page.locator("main").click({ position: { x: 24, y: 24 }, force: true, timeout: 30_000 });
  await expect
    .poll(
      async () => await importButtons.isEnabled().catch(() => false),
      { timeout: 60_000, message: `${sourceRef}: 选择全部后引入按钮应变为可用` },
    )
    .toBe(true);
  await importButtons.nth(0).click({ timeout: 30_000 });

  const dialogs = page
    .locator(".ant-modal-wrap:visible, .ant-modal:visible, .ant-popover:visible, [role='dialog']:visible")
    .filter({ hasText: /引入|确定|确认/ });
  await waitForUiSettled(page);
  const dialogCount = await dialogs.count();
  if (dialogCount > 0) {
    const dialog = dialogs.nth(dialogCount - 1);
    const confirmButtons = dialog.locator("button:visible").filter({ hasText: /^确\s*(定|认)$/ });
    await expect(confirmButtons, `${sourceRef}: 引入确认弹窗应展示确定按钮`).toHaveCount(1, { timeout: 15_000 });
    await confirmButtons.nth(0).click({ timeout: 30_000 });
    await expect(dialog, `${sourceRef}: 引入确认弹窗应关闭`).toBeHidden({ timeout: 60_000 });
  } else {
    const importedForms = page.locator(".ruleForm__form:visible");
    const importedFormCount = await importedForms.count();
    expect(importedFormCount, `${sourceRef}: 直接引入后应渲染规则表单`).toBeGreaterThan(0);
  }
  await expect(page.locator(".ant-spin-spinning:visible"), `${sourceRef}: 规则重新引入后加载应结束`).toHaveCount(0, {
    timeout: 60_000,
  });
  await test.info().attach(`${sourceRef}-task-rule-import-after.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  await test.info().attach(`${sourceRef}-task-rule-import-after.txt`, {
    body: ((await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " "),
    contentType: "text/plain",
  });
  await test.info().attach(`${sourceRef}-task-rule-import-after-controls.txt`, {
    body: [
      `buttons=${JSON.stringify(await page.locator("button:visible").allInnerTexts().catch(() => []))}`,
      `links=${JSON.stringify(await page.locator("a:visible").allInnerTexts().catch(() => []))}`,
    ].join("\n"),
    contentType: "text/plain",
  });
}

export async function hasTaskRuleImportFields(page: Page): Promise<boolean> {
  const packageFields = page
    .locator(".ant-form-item:visible")
    .filter({ has: page.locator(".ant-form-item-label:visible").filter({ hasText: /规则包/ }) });
  const ruleTypeFields = page
    .locator(".ant-form-item:visible")
    .filter({ has: page.locator(".ant-form-item-label:visible").filter({ hasText: /规则类型/ }) });
  return (await packageFields.count()) > 0 && (await ruleTypeFields.count()) > 0;
}

async function findImportField(page: Page, label: RegExp, sourceRef: string): Promise<Locator> {
  const fields = page
    .locator(".ant-form-item:visible")
    .filter({ has: page.locator(".ant-form-item-label:visible").filter({ hasText: label }) });
  await expect(fields, `${sourceRef}: 规则任务编辑页应展示 ${label} 下拉项`).toHaveCount(1, { timeout: 30_000 });
  return fields.nth(0);
}

async function chooseAll(page: Page, selects: Locator, sourceRef: string, label: string): Promise<void> {
  await expect(selects, `${sourceRef}: ${label}应只有一个下拉框`).toHaveCount(1, { timeout: 30_000 });
  const select = selects.nth(0);
  const selector = select.locator(".ant-select-selector:visible");
  await expect(selector, `${sourceRef}: ${label}下拉框应可见`).toHaveCount(1, { timeout: 30_000 });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await selector.nth(0).click({ timeout: 30_000 });

    const dropdowns = page.locator(".ant-select-dropdown:visible");
    const dropdownCount = await dropdowns.count();
    expect(dropdownCount, sourceRef + ": " + label + "下拉选项应展开").toBeGreaterThan(0);
    const dropdown = dropdowns.nth(dropdownCount - 1);
    const option = page
      .locator(
        ".ant-select-item-option:not(.ant-select-item-option-disabled):visible, " +
          "[role='option']:visible",
      )
      .filter({ hasText: /^全部$/ });
    const optionCount = await option.count();
    if (optionCount > 0) {
      await option.nth(optionCount - 1).click({ timeout: 30_000 });
    } else {
      const treeOption = page
        .locator(
          ".ant-select-tree-node-content-wrapper:visible, .ant-tree-node-content-wrapper:visible",
        )
        .filter({ hasText: /^全部$/ });
      await expect(treeOption, sourceRef + ": " + label + "下拉选项应包含全部").toHaveCount(1, { timeout: 30_000 });
      await treeOption.nth(0).click({ timeout: 30_000 });
    }
    // The platform may leave the clicked multi-select value pending. Commit it
    // by losing focus, then verify the field really has a selection before the
    // next field is touched. Escape is intentionally avoided because it cancels
    // the pending value in this page.
    await page.keyboard.press("Tab").catch(() => {});
    await waitForUiSettled(page);
    await page.locator("main").click({ position: { x: 24, y: 24 }, force: true, timeout: 30_000 });
    await waitForUiSettled(page);
    const selectedCount = await select.locator(".ant-select-selection-item:visible").count().catch(() => 0);
    const placeholderCount = await select.locator(".ant-select-selection-placeholder:visible").count().catch(() => 0);
    if (selectedCount > 0 && placeholderCount === 0) return;
  }
  await test.info().attach(sourceRef + "-" + label + "-selection-failed.txt", {
    body: ((await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " "),
    contentType: "text/plain",
  });
  throw new Error(sourceRef + ": " + label + "点击全部后未形成选中项");
}
