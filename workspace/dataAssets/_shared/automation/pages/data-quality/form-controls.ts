import { expect, type Page } from "@playwright/test";

import { waitForUiSettled } from "../../../../../../runtime/automation/playwright";
import { getDefaultDatasource } from "./project-context";

export async function getActiveAntdOptionTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const dropdowns = Array.from(
      document.querySelectorAll<HTMLElement>(".ant-select-dropdown"),
    ).filter((element) => !element.className.includes("ant-select-dropdown-hidden"));
    const activeDropdown = dropdowns.at(-1);
    if (!activeDropdown) return [];
    return Array.from(
      activeDropdown.querySelectorAll<HTMLElement>(".ant-select-item-option"),
    ).flatMap((element) => {
      const values = [element.getAttribute("title")?.trim(), element.textContent?.trim()].filter(
        (value): value is string => Boolean(value),
      );
      return Array.from(new Set(values));
    });
  });
}

export async function clickActiveAntdOption(page: Page, option: string): Promise<boolean> {
  const dropdown = page
    .locator(".ant-select-dropdown:visible:not(.ant-select-dropdown-hidden)")
    .last();
  if (!(await dropdown.isVisible({ timeout: 3000 }).catch(() => false))) return false;

  const exactOption = dropdown
    .locator(".ant-select-item-option")
    .filter({ hasText: exactTextPattern(option) })
    .first();
  if (await exactOption.isVisible({ timeout: 1000 }).catch(() => false)) {
    await exactOption.click({ timeout: 30000 });
    return true;
  }

  const preferredPartialOption =
    option === "SparkThrift2.x"
      ? dropdown
          .locator(".ant-select-item-option")
          .filter({ hasText: getDefaultDatasource().metadata.name })
          .filter({ hasText: option })
          .first()
      : undefined;
  if (
    preferredPartialOption &&
    (await preferredPartialOption.isVisible({ timeout: 1000 }).catch(() => false))
  ) {
    await preferredPartialOption.click({ timeout: 30000 });
    return true;
  }

  const partialOption = dropdown
    .locator(".ant-select-item-option")
    .filter({ hasText: option })
    .first();
  if (await partialOption.isVisible({ timeout: 1000 }).catch(() => false)) {
    await partialOption.click({ timeout: 30000 });
    return true;
  }

  return false;
}

export async function clickDqText(page: Page, label: string, sourceRef: string): Promise<void> {
  await page.getByText(label, { exact: true }).first().click({
    timeout: 30000,
  });
  await expect(
    page.locator("body"),
    `${sourceRef}: 点击「${label}」后页面主体应仍可见`,
  ).toBeVisible({
    timeout: 30000,
  });
}

export async function clickDqCompactButton(
  page: Page,
  label: string,
  sourceRef: string,
): Promise<void> {
  const spacedLabel = label.split("").join("\\s*");
  await page
    .getByRole("button", { name: new RegExp(`^${spacedLabel}$`) })
    .first()
    .click({ timeout: 30000 });
  await expect(
    page.locator("body"),
    `${sourceRef}: 点击「${label}」后页面主体应仍可见`,
  ).toBeVisible({
    timeout: 30000,
  });
}

export async function closeDqOverlay(page: Page, sourceRef: string): Promise<void> {
  const closeButton = page
    .locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible")
    .last()
    .locator(".ant-drawer-close,.ant-modal-close,[aria-label='Close'],[aria-label='close']")
    .first();
  if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await closeButton.click({ timeout: 30000 });
    await expect(
      page.locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible"),
      `${sourceRef}: 弹窗或抽屉应关闭`,
    ).toHaveCount(0, { timeout: 30000 });
    return;
  }
  await page.keyboard.press("Escape");
  await expect(page.locator("body"), `${sourceRef}: 关闭浮层后页面主体应仍可见`).toBeVisible({
    timeout: 30000,
  });
}

export async function closeVisibleDqOverlayIfAny(page: Page, sourceRef: string): Promise<void> {
  const overlay = page
    .locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible")
    .last();
  if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeDqOverlay(page, sourceRef);
  }
}

export async function selectDqFormOptions(
  page: Page,
  label: string,
  options: readonly string[],
  sourceRef: string,
): Promise<void> {
  const formItem = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  for (const option of options) {
    await formItem.locator(".ant-select").first().click({ timeout: 30000 });
    const dropdown = page.locator(".ant-select-dropdown:visible").last();
    await expect(dropdown, `${sourceRef}: 「${label}」下拉应包含「${option}」`).toContainText(
      option,
      {
        timeout: 30000,
      },
    );
    await dropdown.getByText(option, { exact: true }).click({ timeout: 30000 });
  }
  for (const option of options) {
    await expect(formItem, `${sourceRef}: 「${label}」应选中「${option}」`).toContainText(option, {
      timeout: 30000,
    });
  }
}

export async function fillDqFormItemInput(
  page: Page,
  label: string,
  value: string,
  sourceRef: string,
): Promise<void> {
  const formItem = page.locator(".ant-form-item:visible").filter({ hasText: label }).last();
  if (label === "过滤条件") {
    const filterButton = formItem.getByRole("button", { name: "过滤条件" }).last();
    await expect(filterButton, `${sourceRef}: 「过滤条件」应通过配置按钮打开`).toBeVisible({
      timeout: 30000,
    });
    await filterButton.click({ timeout: 30000 });
    await configureDqFilterCondition(page, sourceRef, value);
    return;
  }
  const editableInput = formItem
    .locator(
      [
        'input[placeholder*="请填写"]:visible',
        'input[placeholder*="请输入"]:visible',
        "input:not([readonly]):not(.ant-select-selection-search-input):visible",
        "textarea:visible",
      ].join(", "),
    )
    .last();
  if (await editableInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await editableInput.fill(value, { timeout: 30000 });
    await expect(editableInput, `${sourceRef}: 「${label}」输入框应回显「${value}」`).toHaveValue(
      value,
      {
        timeout: 30000,
      },
    );
    return;
  }
  if (label === "期望值") {
    const numericInput = page.locator('input[placeholder="请填写数值"]:visible').last();
    if (await numericInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await numericInput.fill(value, { timeout: 30000 });
      await expect(numericInput, `${sourceRef}: 「${label}」数值框应回显「${value}」`).toHaveValue(
        value,
        {
          timeout: 30000,
        },
      );
      return;
    }
  }
  await selectDqFormOptions(page, label, [value], sourceRef);
}

async function configureDqFilterCondition(
  page: Page,
  sourceRef: string,
  expression: string,
): Promise<void> {
  const match = /^\s*([A-Za-z_][\w.]*)\s*(<=|>=|<>|!=|=|<|>)\s*(.+?)\s*$/.exec(expression);
  expect(match, `${sourceRef}: 过滤条件应为「字段 操作符 值」格式`).toBeTruthy();
  const [, field, operator, value] = match ?? [];
  const dialog = page.getByRole("dialog", { name: "过滤条件配置" }).last();
  await expect(dialog, `${sourceRef}: 过滤条件配置弹窗应可见`).toBeVisible({ timeout: 30000 });

  const comboboxes = dialog.getByRole("combobox");
  await comboboxes.nth(0).click({ timeout: 30000 });
  await expect
    .poll(
      async () =>
        (await getActiveAntdOptionTexts(page)).some(
          (option) => option === field || option.includes(field),
        ),
      { message: `${sourceRef}: 过滤字段下拉应加载「${field}」`, timeout: 30000 },
    )
    .toBe(true);
  expect(await clickActiveAntdOption(page, field), `${sourceRef}: 过滤字段应可选「${field}」`).toBe(
    true,
  );
  await dialog.locator(".ant-select").nth(1).click({ timeout: 30000 });
  expect(
    await clickActiveAntdOption(page, operator),
    `${sourceRef}: 过滤操作符应可选「${operator}」`,
  ).toBe(true);

  const valueInput = dialog.getByRole("textbox", { name: "请输入" });
  await valueInput.fill(value, { timeout: 30000 });
  await expect(valueInput, `${sourceRef}: 过滤条件值应填入「${value}」`).toHaveValue(value, {
    timeout: 30000,
  });
  await dialog.getByRole("button", { name: "确 定" }).click({ timeout: 30000 });
  await expect(dialog, `${sourceRef}: 过滤条件配置弹窗应关闭`).toBeHidden({ timeout: 30000 });
  const renderedFilter = page
    .locator(".ant-form-item:visible")
    .filter({ hasText: "过滤条件" })
    .last()
    .getByRole("textbox")
    .last();
  await expect(renderedFilter, `${sourceRef}: 过滤条件应回显「${expression}」`).toHaveValue(
    new RegExp(expression.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*")),
    { timeout: 30000 },
  );
}

export async function selectDqFormOptionBySearch(
  page: Page,
  label: RegExp,
  option: string,
  sourceRef: string,
): Promise<void> {
  if (/数据源|数据库|数据表/.test(String(label))) {
    const namedSelect = page.getByRole("combobox", { name: label }).first();
    await expect(namedSelect, `${sourceRef}: 应展示目标表单项 ${label}`).toBeVisible({
      timeout: 30000,
    });
    const selectedContainer = namedSelect.locator("xpath=..").locator("xpath=..");
    if ((await selectedContainer.textContent({ timeout: 30000 }))?.includes(option)) {
      return;
    }
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await namedSelect.click({ force: true, timeout: 30000 });
      await page.keyboard.type(option);
      const loaded = await expect
        .poll(
          async () => {
            const optionTexts = await getActiveAntdOptionTexts(page);
            return optionTexts.some((text) => text === option || text.includes(option));
          },
          { timeout: 10000 },
        )
        .toBe(true)
        .then(() => true)
        .catch(() => false);
      if (loaded) {
        const clicked = await clickActiveAntdOption(page, option);
        expect(clicked, `${sourceRef}: 下拉应包含可点击选项「${option}」`).toBe(true);
        await expect(selectedContainer, `${sourceRef}: 表单项应选中「${option}」`).toContainText(
          option,
          {
            timeout: 30000,
          },
        );
        await waitForUiSettled(page);
        return;
      }
      await page.keyboard.press("Escape").catch(() => {});
      await waitForUiSettled(page);
    }
    throw new Error(`${sourceRef}: 下拉应包含「${option}」`);
  }
  const formItem = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await expect(formItem, `${sourceRef}: 应展示目标表单项 ${label}`).toBeVisible({ timeout: 30000 });
  if ((await formItem.textContent({ timeout: 30000 }))?.includes(option)) {
    return;
  }

  const select = formItem.locator(".ant-select:visible").first();
  await expect(select, `${sourceRef}: 「${label}」下拉应可见`).toBeVisible({ timeout: 30000 });
  await select.click({ force: true, timeout: 30000 });
  await page.keyboard.type(option);
  await expect
    .poll(
      async () => {
        const optionTexts = await getActiveAntdOptionTexts(page);
        return optionTexts.some((text) => text === option || text.includes(option));
      },
      {
        message: `${sourceRef}: 下拉应包含「${option}」`,
        timeout: 30000,
      },
    )
    .toBe(true);
  const clicked = await clickActiveAntdOption(page, option);
  expect(clicked, `${sourceRef}: 下拉应包含可点击选项「${option}」`).toBe(true);
  await expect(formItem, `${sourceRef}: 表单项应选中「${option}」`).toContainText(option, {
    timeout: 30000,
  });
  await waitForUiSettled(page);
}

export async function fillDqPageFormField(page: Page, label: RegExp, value: string): Promise<void> {
  const visibleDialog = page.locator(".ant-modal:visible, [role='dialog']:visible").last();
  const scope = (await visibleDialog.isVisible({ timeout: 1000 }).catch(() => false))
    ? visibleDialog
    : page.locator("body");
  const field = scope.locator(".ant-form-item").filter({ hasText: label }).first();
  const control = field.locator("textarea, input").first();
  await control.fill(value, { timeout: 30000 });
  await expect(control, `表单字段应填入目标值`).toHaveValue(value, { timeout: 30000 });
}

export async function chooseDqFieldOptionByText(
  page: Page,
  label: RegExp,
  optionText: string,
  sourceRef: string,
): Promise<void> {
  const formField = page.locator(".ant-form-item:visible").filter({ hasText: label }).last();
  const field =
    (await formField.count()) > 0
      ? formField
      : page
          .locator(".ant-radio-group:visible, .ant-row:visible, label:visible")
          .filter({ hasText: label })
          .first();
  await expect(field, `${sourceRef}: 调度属性应展示配置项 ${label}`).toBeVisible({
    timeout: 30000,
  });

  const spinButton = field.getByRole("spinbutton").first();
  if (await spinButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    const currentValue = await spinButton
      .inputValue({ timeout: 3000 })
      .catch(async () => (await spinButton.innerText({ timeout: 3000 })).trim());
    if (currentValue.trim() !== optionText) {
      await spinButton.fill(optionText, { timeout: 30000 });
    }
    await expect(spinButton, `${sourceRef}: 配置项应设置为「${optionText}」`).toHaveValue(
      optionText,
      {
        timeout: 30000,
      },
    );
    return;
  }

  const directOption = field.getByText(optionText, { exact: false }).first();
  if (await directOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await directOption.click({ timeout: 30000 }).catch(async () => {
      await field.click({ timeout: 30000 });
    });
    await expect(field, `${sourceRef}: 配置项应选中「${optionText}」`).toContainText(optionText, {
      timeout: 30000,
    });
    return;
  }

  const select = field.locator(".ant-select").first();
  if (await select.isVisible({ timeout: 3000 }).catch(() => false)) {
    await select.click({ force: true, timeout: 30000 });
    await page.keyboard.type(optionText);
    const dropdown = page.locator(".ant-select-dropdown:visible").last();
    await expect(dropdown, `${sourceRef}: 下拉应包含「${optionText}」`).toContainText(optionText, {
      timeout: 30000,
    });
    const clicked = await clickActiveAntdOption(page, optionText);
    expect(clicked, `${sourceRef}: 下拉应包含可点击选项「${optionText}」`).toBe(true);
    await expect(field, `${sourceRef}: 配置项应选中「${optionText}」`).toContainText(optionText, {
      timeout: 30000,
    });
    return;
  }

  const globalOption = page.getByText(optionText, { exact: false }).last();
  await expect(globalOption, `${sourceRef}: 页面应可选择「${optionText}」`).toBeVisible({
    timeout: 30000,
  });
  await globalOption.click({ timeout: 30000 });
}

export async function chooseFirstDqSelectOption(
  page: Page,
  label: RegExp,
  sourceRef: string,
): Promise<string> {
  const field = page.locator(".ant-form-item:visible").filter({ hasText: label }).last();
  await expect(field, `${sourceRef}: 调度属性应展示配置项 ${label}`).toBeVisible({
    timeout: 30000,
  });
  const select = field.locator(".ant-select").first();
  await expect(select, `${sourceRef}: 配置项 ${label} 应展示下拉选择器`).toBeVisible({
    timeout: 30000,
  });
  await select.click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  const option = dropdown
    .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible")
    .first();
  await expect(option, `${sourceRef}: 配置项 ${label} 应存在可选项`).toBeVisible({
    timeout: 30000,
  });
  const optionText = (await option.innerText()).trim();
  await option.click({ timeout: 30000 });
  await expect(field, `${sourceRef}: 配置项 ${label} 应选中「${optionText}」`).toContainText(
    optionText,
    {
      timeout: 30000,
    },
  );
  return optionText;
}

export async function checkDqNoReport(page: Page, sourceRef: string): Promise<void> {
  const checkboxWrapper = page
    .locator(".ant-checkbox-wrapper:visible, label:visible")
    .filter({ hasText: "无需生成报告" })
    .first();
  await expect(checkboxWrapper, `${sourceRef}: 报告配置应展示「无需生成报告」`).toBeVisible({
    timeout: 30000,
  });
  const checkbox = checkboxWrapper.locator("input[type='checkbox']").first();
  if (!(await checkbox.isChecked({ timeout: 3000 }).catch(() => false))) {
    await checkboxWrapper.click({ timeout: 30000 });
  }
  await expect(checkbox, `${sourceRef}: 应勾选无需生成报告`).toBeChecked({ timeout: 30000 });
}

export async function clickDqSubmitButton(page: Page, sourceRef: string): Promise<void> {
  const submitButton = page.getByRole("button", { name: /保\s*存|新\s*建|确\s*定/ }).last();
  await expect(submitButton, `${sourceRef}: 规则任务表单应展示提交入口`).toBeVisible({
    timeout: 30000,
  });
  await submitButton.click({ force: true, timeout: 30000 });
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function exactTextPattern(value: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(value)}\\s*$`);
}
