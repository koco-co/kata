import { waitForUiSettled } from "../../../../../../../../runtime/automation/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { attachV6411Screenshot } from "../fixtures/v6411-screenshot";

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

  await attachV6411Screenshot(page, `${sourceRef}-task-rule-import-before`);
  await test.info().attach(`${sourceRef}-task-rule-import-before.txt`, {
    body: ((await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " "),
    contentType: "text/plain",
  });

  const importButtons = page.locator("button:visible").filter({ hasText: /^引\s*入$/ });
  await expect(importButtons, `${sourceRef}: 规则任务编辑页应展示引入按钮`).toHaveCount(1, { timeout: 30_000 });
  // Selecting "全部" in the second multi-select is committed only after the
  // dropdown loses focus. Escape cancels that temporary selection in this UI.
  // Click the blank content area instead of `main`'s top-left corner: the
  // latter overlaps the tenant/project selector and leaves a second dropdown
  // open over the task form.
  await dismissTaskRuleSelectDropdowns(page);
  await expect(page.locator(".ant-select-dropdown:visible"), `${sourceRef}: 选择全部后下拉层应关闭`).toHaveCount(0, {
    timeout: 30_000,
  });
  await expect
    .poll(
      async () => await importButtons.isEnabled().catch(() => false),
      { timeout: 60_000, message: `${sourceRef}: 选择全部后引入按钮应变为可用` },
    )
    .toBe(true);
  await importButtons.nth(0).click({ timeout: 30_000 });

  const dialog = page.locator(".ant-modal-wrap:visible").last();
  await waitForUiSettled(page);
  let hasConfirmDialog = false;
  try {
    // Locator.isVisible() does not wait for a late-mounted Ant Modal. The
    // confirmation is asynchronous on this page, so wait for the actual node.
    await expect(dialog, `${sourceRef}: 引入确认弹窗应出现`).toBeVisible({ timeout: 10_000 });
    hasConfirmDialog = true;
  } catch {
    hasConfirmDialog = false;
  }
  if (hasConfirmDialog) {
    await confirmVisibleTaskRuleImportDialogs(page, sourceRef);
  } else {
    const importedForms = page.locator(".ruleForm__form:visible");
    const importedFormCount = await importedForms.count();
    expect(importedFormCount, `${sourceRef}: 直接引入后应渲染规则表单`).toBeGreaterThan(0);
  }
  await expect(page.locator(".ant-spin-spinning:visible"), `${sourceRef}: 规则重新引入后加载应结束`).toHaveCount(0, {
    timeout: 60_000,
  });
  await expect(page.locator(".ant-modal-wrap:visible"), `${sourceRef}: 引入流程结束后不应残留确认弹窗`).toHaveCount(0, {
    timeout: 30_000,
  });
  await attachV6411Screenshot(page, `${sourceRef}-task-rule-import-after`);
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

async function confirmVisibleTaskRuleImportDialogs(page: Page, sourceRef: string): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const dialogs = page.locator(".ant-modal-wrap:visible");
    const count = await dialogs.count();
    if (count === 0) return;
    let clicked = false;
    for (let index = count - 1; index >= 0; index -= 1) {
      const confirm = dialogs.nth(index).getByRole("button", { name: /^确\s*(定|认)$/ }).last();
      if (!(await confirm.isVisible({ timeout: 1_000 }).catch(() => false))) continue;
      await confirm.click({ force: true, timeout: 30_000 });
      clicked = true;
    }
    if (!clicked) break;
    await waitForUiSettled(page);
    const previousCount = count;
    await expect
      .poll(async () => await page.locator(".ant-modal-wrap:visible").count(), {
        timeout: 5_000,
        message: `${sourceRef}: 引入确认弹窗数量应发生变化`,
      })
      .toBeLessThan(previousCount)
      .catch(() => {});
  }
  if ((await page.locator(".ant-modal-wrap:visible").count().catch(() => 0)) > 0) {
    // The platform can leave a transparent Ant Modal wrapper after the import
    // request completes. The confirmation click above already committed the
    // import; Escape only removes this stale front-end mask.
    await page.keyboard.press("Escape").catch(() => {});
    await waitForUiSettled(page);
  }
  await expect(page.locator(".ant-modal-wrap:visible"), `${sourceRef}: 引入确认弹窗应全部关闭`).toHaveCount(0, {
    timeout: 30_000,
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
    await dismissTaskRuleSelectDropdowns(page);
    await clearExistingTaskRuleSelection(select, page);
    await expect(page.locator(".ant-select-dropdown:visible"), `${sourceRef}: ${label}旧下拉层应关闭`).toHaveCount(0, {
      timeout: 15_000,
    });
    let dropdowns = page.locator(".ant-select-dropdown:visible");
    if ((await dropdowns.count()) === 0) {
      // Clicking the 3px search input inside an empty multi-select only gives
      // it focus on this page; clicking the Ant Select root opens its portal.
      await select.click({ force: true, timeout: 30_000 });
      await expect
        .poll(async () => await page.locator(".ant-select-dropdown:visible").count(), {
          timeout: 15_000,
          message: `${sourceRef}: ${label}下拉选项应展开`,
        })
        .toBeGreaterThan(0);
    }
    dropdowns = page.locator(".ant-select-dropdown:visible");
    const dropdown = await waitForStableTaskRuleDropdown(page, sourceRef, label);
    if (label === "规则类型") {
      await expect
        .poll(
          async () =>
            await dropdown
              .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible, [role='option']:visible")
              .count(),
          {
            timeout: 30_000,
            message: `${sourceRef}: 规则包变更后规则类型选项应完成加载`,
          },
        )
        .toBeGreaterThan(1);
    }
    const hasCommittedSelection = async (): Promise<boolean> => {
      const selectedCount = await select
        .locator(
          ".ant-select-selection-item:visible, .ant-select-selection-item-content:visible, .ant-select-selection-overflow-item:visible",
        )
        .count()
        .catch(() => 0);
      const placeholderCount = await select.locator(".ant-select-selection-placeholder:visible").count().catch(() => 0);
      return selectedCount > 0 && placeholderCount === 0;
    };
    const option = dropdown
      .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible, [role='option']:visible")
      .filter({ hasText: /^全部$/ });
    const optionCount = await option.count();
    if (optionCount > 0) {
      await clickTaskRuleImportOption(option.nth(optionCount - 1));
    } else {
      const treeOption = dropdown
        .locator(".ant-select-tree-node-content-wrapper:visible, .ant-tree-node-content-wrapper:visible")
        .filter({ hasText: /^全部$/ });
      await expect(treeOption, sourceRef + ": " + label + "下拉选项应包含全部").toHaveCount(1, { timeout: 30_000 });
      await clickTaskRuleImportOption(treeOption.nth(0));
    }
    if (!(await hasCommittedSelection())) {
      await selector.focus().catch(() => {});
      await page.keyboard.press("ArrowDown").catch(() => {});
      await page.keyboard.press("Enter").catch(() => {});
      await waitForUiSettled(page);
      if (await hasCommittedSelection()) {
        await page.keyboard.press("Tab").catch(() => {});
        await dismissTaskRuleSelectDropdowns(page);
        return;
      }
    }
    if (await hasCommittedSelection()) {
      await page.keyboard.press("Tab").catch(() => {});
      await waitForUiSettled(page);
      await dismissTaskRuleSelectDropdowns(page);
      return;
    }
    // The platform may leave the clicked multi-select value pending. Commit it
    // by losing focus, then verify the field really has a selection before the
    // next field is touched. Escape is intentionally avoided because it cancels
    // the pending value in this page.
    await page.keyboard.press("Tab").catch(() => {});
    await waitForUiSettled(page);
    await dismissTaskRuleSelectDropdowns(page);
    await expect(page.locator(".ant-select-dropdown:visible"), `${sourceRef}: ${label}下拉层应关闭`).toHaveCount(0, {
      timeout: 15_000,
    });
    await waitForUiSettled(page);
    if (await hasCommittedSelection()) return;

    // Ant Design can keep the option visible after a synthetic click while the
    // controlled value update is still pending. Re-open the same selector and
    // commit the active "全部" option with the native keyboard path once before
    // retrying the full interaction. This is especially important on the rule
    // type selector, whose selection is what enables the import button.
    await select.click({ force: true, timeout: 30_000 });
    await expect
      .poll(async () => await page.locator(".ant-select-dropdown:visible").count(), {
        timeout: 15_000,
        message: `${sourceRef}: ${label}重试时下拉选项应展开`,
      })
      .toBeGreaterThan(0);
    const retryDropdown = await waitForStableTaskRuleDropdown(page, sourceRef, label);
    const retrySearchInput = retryDropdown
      .locator("input[role='combobox'], input.ant-select-selection-search-input")
      .last();
    if (await retrySearchInput.isVisible({ timeout: 500 }).catch(() => false)) {
      await retrySearchInput.fill("全部");
      await waitForUiSettled(page);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
    } else {
      const retryOption = retryDropdown
        .locator(".ant-select-item-option:not(.ant-select-item-option-disabled), [role='option']")
        .filter({ hasText: /^全部$/ })
        .last();
      await expect(retryOption, `${sourceRef}: ${label}重试下拉选项应包含全部`).toBeVisible({ timeout: 30_000 });
      await dispatchTaskRuleOptionClick(retryOption);
    }
    await page.keyboard.press("Tab").catch(() => {});
    await dismissTaskRuleSelectDropdowns(page);
    if (label === "规则类型" && !(await hasCommittedSelection())) {
      await selectAllRuleTypesIndividually(page, selector, sourceRef);
      await page.keyboard.press("Tab").catch(() => {});
      await dismissTaskRuleSelectDropdowns(page);
    }
    try {
      await expect
        .poll(hasCommittedSelection, { timeout: 15_000, message: `${sourceRef}: ${label}重试后应形成选中项` })
        .toBe(true);
    } catch (error) {
      await attachV6411Screenshot(page, `${sourceRef}-${label}-selection-failed`);
      await attachTaskRuleSelectionDiagnostics(page, select, sourceRef, label);
      throw error;
    }
    return;
  }
  await test.info().attach(sourceRef + "-" + label + "-selection-failed.txt", {
    body: ((await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " "),
    contentType: "text/plain",
  });
  await test.info().attach(sourceRef + "-" + label + "-selection-state.json", {
    body: JSON.stringify(
      {
        selectHtml: await select.evaluate((element) => element.outerHTML).catch(() => ""),
        visibleOptions: await page
          .locator(".ant-select-dropdown:visible .ant-select-item-option, .ant-select-dropdown:visible [role='option']")
          .evaluateAll((elements) => elements.map((element) => element.outerHTML))
          .catch(() => []),
        importButtonDisabled: await importButtonsDisabled(page),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  throw new Error(sourceRef + ": " + label + "点击全部后未形成选中项");
}

async function attachTaskRuleSelectionDiagnostics(
  page: Page,
  select: Locator,
  sourceRef: string,
  label: string,
): Promise<void> {
  await test.info().attach(`${sourceRef}-${label}-selection-failed.json`, {
    body: JSON.stringify(
      {
        selectHtml: await select.evaluate((element) => element.outerHTML).catch(() => ""),
        selectText: await select.innerText().catch(() => ""),
        selectAria: await select.getAttribute("aria-label").catch(() => null),
        visibleDropdowns: await page
          .locator(".ant-select-dropdown:visible")
          .evaluateAll((elements) =>
            elements.map((element) => ({
              className: element.className,
              text: (element.textContent ?? "").replace(/\\s+/g, " ").trim(),
              html: element.outerHTML,
            })),
          )
          .catch(() => []),
        visibleSelects: await page
          .locator(".ant-select:visible")
          .evaluateAll((elements) =>
            elements.map((element) => ({
              text: (element.textContent ?? "").replace(/\\s+/g, " ").trim(),
              html: element.outerHTML,
            })),
          )
          .catch(() => []),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
}

async function clearExistingTaskRuleSelection(select: Locator, page: Page): Promise<void> {
  const removeButtons = select.locator(".ant-select-selection-item-remove:visible");
  for (let index = (await removeButtons.count()) - 1; index >= 0; index -= 1) {
    await removeButtons
      .nth(index)
      .click({ force: true, timeout: 5_000 })
      .catch(() => undefined);
    await waitForUiSettled(page);
  }
  const clearButton = select.locator(".ant-select-clear:visible").first();
  if (await clearButton.isVisible({ timeout: 500 }).catch(() => false)) {
    await clearButton.click({ force: true, timeout: 5_000 }).catch(() => undefined);
    await waitForUiSettled(page);
  }
}

async function selectAllRuleTypesIndividually(page: Page, selector: Locator, sourceRef: string): Promise<void> {
  await selector.click({ force: true, timeout: 30_000 });
  const dropdown = await waitForStableTaskRuleDropdown(page, sourceRef, "规则类型逐项兜底");
  const optionTexts = await dropdown
    .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible, [role='option']:visible")
    .evaluateAll((elements) =>
      [...new Set(
        elements
          .map((element) => (element.textContent ?? "").replace(/\s+/g, " ").trim())
          .filter((text) => text && text !== "全部"),
      )],
    );
  for (const optionText of optionTexts) {
    const option = dropdown
      .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible, [role='option']:visible")
      .filter({ hasText: new RegExp(`^${escapeRegExp(optionText)}$`) })
      .last();
    if (await option.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await dispatchTaskRuleOptionClick(option);
      await waitForUiSettled(page);
    }
  }
}

async function waitForStableTaskRuleDropdown(page: Page, sourceRef: string, label: string): Promise<Locator> {
  await expect
    .poll(
      async () => {
        const dropdowns = page.locator(".ant-select-dropdown:visible");
        const count = await dropdowns.count();
        if (count === 0) return false;
        return await dropdowns
          .nth(count - 1)
          .evaluate((element) => {
            const style = getComputedStyle(element);
            const className = String(element.className ?? "");
            const rect = element.getBoundingClientRect();
            return (
              style.opacity !== "0" &&
              style.pointerEvents !== "none" &&
              !/ant-slide-(up|down)-(enter|appear)/.test(className) &&
              rect.width > 0 &&
              rect.height > 0
            );
          })
          .catch(() => false);
      },
      { timeout: 15_000, message: `${sourceRef}: ${label}下拉层应完成动画且可交互` },
    )
    .toBe(true);
  const dropdowns = page.locator(".ant-select-dropdown:visible");
  return dropdowns.nth((await dropdowns.count()) - 1);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function importButtonsDisabled(page: Page): Promise<boolean[]> {
  return await page
    .locator("button:visible")
    .filter({ hasText: /^引\s*入$/ })
    .evaluateAll((buttons) => buttons.map((button) => (button as HTMLButtonElement).disabled))
    .catch(() => []);
}

async function clickTaskRuleImportOption(option: Locator): Promise<void> {
  await expect(option).toBeVisible({ timeout: 30_000 });
  const page = option.page();
  const dropdown = option.locator("xpath=ancestor::div[contains(@class, 'ant-select-dropdown')][1]");
  const searchInput = dropdown
    .locator("input[role='combobox'], input.ant-select-selection-search-input")
    .last();
  if (await searchInput.isVisible({ timeout: 500 }).catch(() => false)) {
    await searchInput.focus();
    await searchInput.fill("全部");
    await waitForUiSettled(page);
    const filteredOption = dropdown
      .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible, [role='option']:visible")
      .filter({ hasText: /^全部$/ })
      .last();
    await expect(filteredOption).toBeVisible({ timeout: 30_000 });
    await dispatchTaskRuleOptionClick(filteredOption);
    return;
  }
  await option.evaluate((element) => {
    (element as HTMLElement).scrollIntoView({ block: "center", inline: "nearest" });
  });
  await waitForUiSettled(page);
  await dispatchTaskRuleOptionClick(option);
}

async function dispatchTaskRuleOptionClick(option: Locator): Promise<void> {
  try {
    await option.scrollIntoViewIfNeeded({ timeout: 30_000 });
    // Ant Design handles selection on the option row. Clicking only the
    // content span can leave TreeSelect/rc-select controlled values empty.
    await option.click({ force: true, timeout: 30_000 });
  } catch {
    // Some portal layers report an invalid box even after scrolling. Keep a
    // DOM-event fallback for that browser/platform-specific case.
    const content = option.locator(".ant-select-item-option-content").first();
    const target = (await content.isVisible({ timeout: 500 }).catch(() => false)) ? content : option;
    await target.evaluate((element) => {
      const target = element as HTMLElement;
      const eventInit: MouseEventInit = { bubbles: true, cancelable: true, view: window };
      target.dispatchEvent(new MouseEvent("mousedown", eventInit));
      target.dispatchEvent(new MouseEvent("mouseup", eventInit));
      target.dispatchEvent(new MouseEvent("click", eventInit));
    });
  }
  await waitForUiSettled(option.page());
}

async function dismissTaskRuleSelectDropdowns(page: Page): Promise<void> {
  // The task form starts below the header; this point is outside both the
  // tenant selector and the rule import dropdown portal.
  await page.mouse.click(450, 90);
  await waitForUiSettled(page);
  if ((await page.locator(".ant-select-dropdown:visible").count().catch(() => 0)) > 0) {
    await page.mouse.click(450, 150);
    await waitForUiSettled(page);
  }
}
