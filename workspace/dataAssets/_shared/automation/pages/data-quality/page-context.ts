// 数据质量跨需求共享的页面交互能力。

import { waitForUiSettled } from "../../../../../../runtime/automation/playwright";
import { expect, type Page } from "@playwright/test";
import { getDqRuleTaskRecords, waitForRuleTaskPageQuery } from "./api";
import type {
  DqRuleTaskRecord,
  SparkThriftQualityRuleValidationScenario,
} from "./contracts";
import {
  getDefaultDatasource,
  getScenarioDatasource,
  gotoDataQualityPage,
  injectDataQualityProjectContext,
} from "./project-context";

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

export async function gotoNewRuleTaskMonitorObjectPageForTable(
  page: Page,
  sourceRef: string,
  ruleName: string,
  tableName: string,
  comparisonTableName?: string,
  datasourceKey?: "sparkthrift" | "doris",
): Promise<ReturnType<Page["locator"]>> {
  await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 30000 });
  await gotoDataQualityPage(page, "/dq/rule/add");
  await expect(page, `${sourceRef}: 新建监控规则应进入 /dq/rule/add`).toHaveURL(/\/dq\/rule\/add/);

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 新建监控规则页面应展示监控对象配置`).toContainText(
    /监控对象|规则名称/,
    {
      timeout: 30000,
    },
  );
  await fillDqPageFormField(page, /规则名称/, ruleName);
  const datasource = getScenarioDatasource({
    datasourceKey,
  } as SparkThriftQualityRuleValidationScenario);
  await selectDqFormOptionBySearch(page, /数据源/, datasource.sourceName, sourceRef);
  await selectDqFormOptionBySearch(page, /数据库/, datasource.database, sourceRef);
  await selectDqFormOptionBySearch(page, /数据表/, tableName, sourceRef);
  if (comparisonTableName) {
    await selectDqFormOptionBySearch(page, /对比表|比较表|关联表/, comparisonTableName, sourceRef);
  }
  return body;
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

export async function clickNextUntilScheduleConfig(page: Page, sourceRef: string): Promise<void> {
  const scheduleField = page.locator(".ant-form-item:visible, .ant-row:visible").filter({
    hasText: /调度周期|调度配置|生效日期|实例生成方式/,
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nextButton = page.getByRole("button", { name: /^下\s*一\s*步$/ }).last();
    await expect(nextButton, `${sourceRef}: 监控规则页应展示下一步入口`).toBeVisible({
      timeout: 30000,
    });
    await nextButton.click({ force: true, timeout: 30000 });
    await page.keyboard.press("Enter").catch(() => {});
    if (
      await scheduleField
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    )
      return;
  }
  await expect(scheduleField.first(), `${sourceRef}: 下一步后应进入调度属性配置表单`).toBeVisible({
    timeout: 30000,
  });
}

export async function clickNextUntilMonitorRuleConfig(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const body = page.locator("body");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await clickDqCompactButton(page, "下一步", sourceRef);
    const monitorRuleEntry = body.getByText(/^(引用规则包|添加规则|新增规则包)$/).first();
    if (await monitorRuleEntry.isVisible({ timeout: 10000 }).catch(() => false)) {
      return;
    }
    await waitForUiSettled(page);
  }
  await expect(body, `${sourceRef}: 监控对象保存成功后应进入监控规则配置页`).toContainText(
    /引用规则包|添加规则|新增规则包/,
    { timeout: 30000 },
  );
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

export async function clickRuleSetPackageAddButton(page: Page, sourceRef: string): Promise<void> {
  const addButton = page.getByRole("button", { name: /增加|添加规则包|新增规则包|添加/ }).first();
  await expect(addButton, `${sourceRef}: 应展示新增规则包入口`).toBeVisible({ timeout: 30000 });
  await addButton.click({ timeout: 30000 });
}

export async function clickRuleSetSubmitButton(page: Page, sourceRef: string): Promise<void> {
  if (await confirmRuleSetSavePromptIfVisible(page, sourceRef)) return;

  const submitButton = page
    .getByRole("button", { name: /完成|提交|确\s*定|保\s*存/ })
    .filter({ hasNotText: /取消|上一步/ })
    .last();
  await expect(submitButton, `${sourceRef}: 规则集配置页应展示提交入口`).toBeVisible({
    timeout: 30000,
  });
  try {
    await submitButton.click({ timeout: 30000 });
  } catch (error) {
    if (await confirmRuleSetSavePromptIfVisible(page, sourceRef, true)) return;
    throw error;
  }
  const savePrompt = page.getByText("保存提示", { exact: true }).last();
  const promptAppeared = await expect
    .poll(async () => savePrompt.isVisible({ timeout: 500 }).catch(() => false), { timeout: 5000 })
    .toBe(true)
    .then(() => true)
    .catch(() => false);
  if (promptAppeared) {
    await page
      .getByRole("button", { name: /^保\s*存$/ })
      .last()
      .click({ force: true, timeout: 30000 });
    await expect(savePrompt, `${sourceRef}: 保存提示确认后应关闭`).toBeHidden({ timeout: 30000 });
  }
  await confirmRuleSetSavePromptIfVisible(page, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 提交规则集后页面主体应保持可见`).toBeVisible({
    timeout: 30000,
  });
}

async function confirmRuleSetSavePromptIfVisible(
  page: Page,
  sourceRef: string,
  forceClick = false,
): Promise<boolean> {
  const confirm = page.getByRole("dialog").filter({ hasText: "保存提示" }).last();
  const promptTitle = page.getByText("保存提示", { exact: true }).last();
  if (
    !(await confirm.isVisible({ timeout: 5000 }).catch(() => false)) &&
    !(await promptTitle.isVisible({ timeout: 1000 }).catch(() => false))
  ) {
    return false;
  }

  const confirmButton = (await confirm.isVisible({ timeout: 1000 }).catch(() => false))
    ? confirm.getByRole("button", { name: /^保\s*存$|^确\s*定$|^提交$|^完成$/ }).last()
    : page.getByRole("button", { name: /^保\s*存$/ }).last();
  if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmButton.click({ force: forceClick, timeout: 30000 });
  } else {
    await confirm
      .getByRole("button", { name: /^保\s*存$|^确\s*定$|^提交$|^完成$/ })
      .last()
      .click({ force: forceClick, timeout: 30000 });
  }
  await expect(
    page.locator("body"),
    `${sourceRef}: 确认规则集保存后页面主体应保持可见`,
  ).toBeVisible({
    timeout: 30000,
  });
  return true;
}

async function selectVisibleDqOption(
  scope: ReturnType<Page["locator"]>,
  optionText: string,
  sourceRef: string,
): Promise<void> {
  const optionRow = scope
    .locator(".ant-checkbox-wrapper, .ant-select-item, .ant-table-row, tr, label")
    .filter({ hasText: optionText })
    .first();
  if (await optionRow.isVisible({ timeout: 3000 }).catch(() => false)) {
    await optionRow.click({ timeout: 30000 });
    return;
  }
  const option = scope.getByText(optionText, { exact: false }).first();
  await expect(option, `${sourceRef}: 应可选择「${optionText}」`).toBeVisible({ timeout: 30000 });
  await option.click({ timeout: 30000 });
}

export async function selectRuleTaskRulePackageOnCurrentPage(
  page: Page,
  sourceRef: string,
  packageNames: readonly string[],
  ruleCategory?: string,
): Promise<void> {
  await expect(page.locator("body"), `${sourceRef}: 监控规则页应展示引用规则包入口`).toContainText(
    /引用规则包|规则包/,
    {
      timeout: 30000,
    },
  );
  if (
    !(await page
      .getByText("引用规则包", { exact: true })
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false))
  ) {
    await selectDqFormOptionBySearch(page, /规则包/, packageNames[0], sourceRef);
    if (ruleCategory) {
      await selectDqFormOptionBySearch(page, /规则类型/, ruleCategory, sourceRef);
    }
    const importButton = page.getByRole("button", { name: /引\s*入/ }).last();
    await expect(importButton, `${sourceRef}: 监控规则页应展示引入入口`).toBeVisible({
      timeout: 30000,
    });
    const importResponse = page
      .waitForResponse(
        (response) =>
          response.url().includes("/dassets/v1/valid/monitorRulePackage/getMonitorRule") &&
          response.request().method() === "POST",
        { timeout: 30000 },
      )
      .catch(() => null);
    await importButton.click({ force: true, timeout: 30000 });
    const response = await importResponse;
    if (response) {
      const payload = await response.json().catch(() => null);
      expect(
        payload?.success ?? payload?.code === 1,
        `${sourceRef}: 引入规则包接口应返回成功`,
      ).toBe(true);
    }
    await expect(
      page
        .locator(".ant-message-notice:visible")
        .filter({ hasText: /引入成功/ })
        .last(),
      `${sourceRef}: 引入规则包后应提示成功`,
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator("body"), `${sourceRef}: 引入规则包后应展示规则明细`).toContainText(
      /生效范围|统计函数|校验方法|强弱规则/,
      { timeout: 30000 },
    );
    for (const packageName of packageNames) {
      await expect(
        page.locator("body"),
        `${sourceRef}: 引入规则包后应展示「${packageName}」`,
      ).toContainText(packageName, { timeout: 30000 });
    }
    return;
  }
  await clickDqText(page, "引用规则包", sourceRef);
  const dialog = page.locator(".ant-modal:visible, [role='dialog']:visible").last();
  const picker = (await dialog.isVisible({ timeout: 3000 }).catch(() => false))
    ? dialog
    : page.locator("body");

  for (const packageName of packageNames) {
    await selectVisibleDqOption(picker, packageName, sourceRef);
  }
  const confirm = picker.getByRole("button", { name: /确\s*定|引\s*用|保\s*存/ }).last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirm.click({ timeout: 30000 });
  }

  for (const packageName of packageNames) {
    await expect(
      page.locator("body"),
      `${sourceRef}: 引用规则包后应展示「${packageName}」`,
    ).toContainText(packageName, { timeout: 30000 });
  }
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

export async function configureManualPartition(
  page: Page,
  sourceRef: string,
  expectedPartition: string,
): Promise<void> {
  const body = page.locator("body");
  const manualRadio = page.getByRole("radio", { name: "手动输入分区" }).first();
  if (!(await manualRadio.isChecked({ timeout: 3000 }).catch(() => false))) {
    await page.getByText("手动输入分区", { exact: true }).last().click({ timeout: 30000 });
  }
  await expect(manualRadio, `${sourceRef}: 分区方式应切换为手动输入分区`).toBeChecked({
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 分区配置应回显手动输入分区`).toContainText(
    /手动输入分区|手动输入/,
    {
      timeout: 30000,
    },
  );

  const partitionArea = page
    .locator(".ant-form-item:visible, .ant-row:visible, div:visible")
    .filter({
      hasText: /选择分区|手动输入分区/,
    })
    .last();
  const manualPartitionInput = page
    .getByRole("textbox", { name: /手动输入分区|分区字段|分区值/ })
    .first();
  if (await manualPartitionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await manualPartitionInput.fill(expectedPartition, { timeout: 30000 });
    await expect(manualPartitionInput, `${sourceRef}: 多级分区表达式应填入`).toHaveValue(
      expectedPartition,
      {
        timeout: 30000,
      },
    );
  } else {
    const fallbackInput = page
      .getByPlaceholder(/请输入.*分区|分区.*表达式|partition/i)
      .or(page.locator("textarea:visible").last())
      .or(partitionArea.locator("textarea:visible, input:not([type='radio']):visible").last())
      .last();
    await expect(fallbackInput, `${sourceRef}: 手动分区应展示可输入控件`).toBeVisible({
      timeout: 30000,
    });
    await fallbackInput.fill(expectedPartition, { timeout: 30000 });
    await expect(fallbackInput, `${sourceRef}: 多级分区表达式应填入`).toHaveValue(
      expectedPartition,
      {
        timeout: 30000,
      },
    );
  }
}

export async function gotoRuleTaskScheduleAttributesPage(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 编辑规则任务应打开配置流程`).toContainText(
    /监控对象|监控规则|调度属性|调度配置/,
    { timeout: 30000 },
  );
  const scheduleField = page.locator(".ant-form-item:visible, .ant-row:visible").filter({
    hasText: /调度周期|调度配置|生效日期|实例生成方式/,
  });

  if (
    await scheduleField
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
  )
    return;

  const scheduleStep = page
    .locator(".ant-steps-item, [class*='step']")
    .filter({ hasText: /调度属性|调度配置/ })
    .last();
  if (await scheduleStep.isVisible({ timeout: 3000 }).catch(() => false)) {
    await scheduleStep.click({ force: true, timeout: 30000 }).catch(() => {});
  }
  if (
    await scheduleField
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
  )
    return;
  await clickNextUntilScheduleConfig(page, sourceRef);

  await expect(body, `${sourceRef}: 调度属性页面应展示环境参数配置入口`).toContainText(
    /环境参数|调度配置|超时时间/,
    { timeout: 30000 },
  );
}

export async function runRuleTaskImmediately(
  page: Page,
  sourceRef: string,
  taskRow: ReturnType<Page["locator"]>,
): Promise<void> {
  let execute = taskRow
    .getByRole("button", { name: /立即执行/ })
    .or(taskRow.getByText("立即执行"))
    .first();
  if (!(await execute.isVisible({ timeout: 3000 }).catch(() => false))) {
    const tableNameCell = taskRow
      .locator("td")
      .nth(1)
      .or(taskRow.locator(".ant-table-cell").nth(1));
    await expect(tableNameCell, `${sourceRef}: 任务行应展示可打开详情的表名单元格`).toBeVisible({
      timeout: 30000,
    });
    await tableNameCell.click({ timeout: 30000 });
    const drawer = page.locator(".ant-drawer:visible, [role='dialog']:visible").last();
    const scope = (await drawer.isVisible({ timeout: 5000 }).catch(() => false))
      ? drawer
      : page.locator("body");
    execute = scope
      .getByRole("button", { name: /立即执行|执行/ })
      .or(scope.getByText("立即执行"))
      .first();
  }
  await expect(execute, `${sourceRef}: 任务行应展示「立即执行」`).toBeVisible({ timeout: 30000 });
  await execute.click({ timeout: 30000 });

  const confirm = page
    .locator(".ant-popover:visible, .ant-modal-confirm:visible, .ant-modal:visible")
    .last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(confirm, `${sourceRef}: 立即执行应展示确认`).toContainText(/立即执行|执行/, {
      timeout: 30000,
    });
    const confirmButton = confirm.getByRole("button", { name: /确\s*定|确\s*认|OK|是/ }).last();
    if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmButton.click({ timeout: 30000 });
    }
  }
  await expect(
    page.locator("body"),
    `${sourceRef}: 点击立即执行后页面应提示提交或保持任务列表`,
  ).toContainText(/成功|提交|执行|规则任务管理/, { timeout: 30000 });
}

function monitorRecordSearchInput(page: Page): ReturnType<Page["locator"]> {
  return page
    .getByPlaceholder("请输入表名/任务名称搜索")
    .or(page.locator("input[placeholder*='任务名称']"))
    .or(page.locator("input[placeholder*='表名']"))
    .first();
}

export async function gotoMonitorRecordQueryPage(
  page: Page,
  sourceRef: string,
): Promise<ReturnType<Page["locator"]>> {
  await page.keyboard.press("Escape").catch(() => {});
  await gotoDataQualityPage(page, "/dq/taskQuery");

  const menuEntry = page.getByRole("link", { name: "校验结果查询" }).first();
  if (await menuEntry.isVisible({ timeout: 5000 }).catch(() => false)) {
    await menuEntry.click({ timeout: 30000 });
    await injectDataQualityProjectContext(page);
    await waitForUiSettled(page);
  }

  await expect(page, `${sourceRef}: URL 应进入校验结果查询路由`).toHaveURL(/\/dq\/taskQuery/, {
    timeout: 30000,
  });
  await expect(
    page.getByRole("button", { name: "新建监控规则" }),
    `${sourceRef}: 校验结果查询不应停留在规则任务管理主内容`,
  ).not.toBeVisible({ timeout: 10000 });

  const searchInput = monitorRecordSearchInput(page);
  await expect(searchInput, `${sourceRef}: 校验结果查询应展示表名/任务名称搜索框`).toBeVisible({
    timeout: 30000,
  });
  return searchInput;
}

async function gotoRuleTaskManagementPage(page: Page, sourceRef: string): Promise<void> {
  await closeVisibleDqOverlayIfAny(page, sourceRef);
  await gotoDataQualityPage(page, "/dq/rule");

  const menuEntry = page.getByRole("link", { name: "规则任务管理" }).first();
  if (await menuEntry.isVisible({ timeout: 5000 }).catch(() => false)) {
    await menuEntry.click({ timeout: 30000 });
    await injectDataQualityProjectContext(page);
    await waitForUiSettled(page);
  }

  await expect(page, `${sourceRef}: URL 应进入规则任务管理路由`).toHaveURL(/\/dq\/rule(?:\?|$)/, {
    timeout: 30000,
  });
  await expect(
    page.getByRole("button", { name: "新建监控规则" }),
    `${sourceRef}: 规则任务管理应展示新建监控规则入口`,
  ).toBeVisible({ timeout: 30000 });
}

export async function submitMonitorRecordSearch(page: Page): Promise<void> {
  const searchButton = page.getByRole("button", { name: /查\s*询|search/i }).first();
  if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchButton.click({ timeout: 30000 });
    return;
  }
  await page.keyboard.press("Enter");
}

export async function selectRuleSetField(
  page: Page,
  fieldName: string,
  sourceRef: string,
): Promise<void> {
  const fieldSelect = page
    .locator(".ant-select")
    .filter({ hasText: /请选择字段|字段/ })
    .last();
  if (!(await fieldSelect.isVisible({ timeout: 3000 }).catch(() => false))) return;
  await fieldSelect.click({ timeout: 30000 });
  await page.keyboard.type(fieldName);
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 字段下拉应包含「${fieldName}」`).toContainText(fieldName, {
    timeout: 30000,
  });
  const clicked = await clickActiveAntdOption(page, fieldName);
  expect(clicked, `${sourceRef}: 字段下拉应包含可点击字段「${fieldName}」`).toBe(true);
}

export async function switchRuleSetStrength(
  page: Page,
  label: "强规则" | "弱规则",
  sourceRef: string,
): Promise<void> {
  const field = page
    .locator(".ant-form-item:visible")
    .filter({ hasText: /强弱规则/ })
    .last();
  await expect(field, `${sourceRef}: 应展示强弱规则配置项`).toBeVisible({ timeout: 30000 });
  if ((await field.textContent({ timeout: 30000 }))?.includes(label)) return;
  await field.locator(".ant-select").first().click({ timeout: 30000 });
  const clicked = await clickActiveAntdOption(page, label);
  expect(clicked, `${sourceRef}: 强弱规则下拉应包含「${label}」`).toBe(true);
  await expect(field, `${sourceRef}: 强弱规则应选中「${label}」`).toContainText(label, {
    timeout: 30000,
  });
}

export async function fillRuleSetRuleDescription(page: Page, value: string): Promise<void> {
  const control = page
    .locator('textarea[placeholder*="规则描述"]:visible, input[placeholder*="规则描述"]:visible')
    .last();
  await control.fill(value, { timeout: 30000 });
  await expect(control, "规则描述应填入目标值").toHaveValue(value, { timeout: 30000 });
}

export async function saveRuleSetRuleRow(
  page: Page,
  sourceRef: string,
  action: string,
): Promise<void> {
  await page
    .getByRole("button", { name: /^保\s*存$/ })
    .last()
    .click({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: ${action}后页面应保持可见`).toBeVisible({
    timeout: 30000,
  });
}

export async function searchRuleTaskByTableName(
  page: Page,
  tableName: string,
  sourceRef: string,
): Promise<DqRuleTaskRecord[]> {
  await gotoRuleTaskManagementPage(page, sourceRef);
  const responsePromise = waitForRuleTaskPageQuery(page);
  void responsePromise.catch(() => {});
  const searchInput = page
    .getByPlaceholder(/输入表名搜索|请输入表名|表名/)
    .or(page.locator("input[placeholder*='表名']"))
    .first();
  await expect(searchInput, `${sourceRef}: 规则任务管理应展示表名搜索输入框`).toBeVisible({
    timeout: 30000,
  });
  await searchInput.fill(tableName, { timeout: 30000 });
  const searchButton = page.getByRole("button", { name: /查\s*询|search/i }).first();
  await expect(searchButton, `${sourceRef}: 规则任务管理应展示查询入口`).toBeVisible({
    timeout: 30000,
  });
  await searchButton.click({ timeout: 30000 });
  const payload = await responsePromise;
  expect(payload.success ?? payload.code === 1, `${sourceRef}: 规则任务表名搜索应请求成功`).toBe(
    true,
  );
  return getDqRuleTaskRecords(payload);
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function exactTextPattern(value: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(value)}\\s*$`);
}
