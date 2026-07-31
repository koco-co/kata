import { expect, type Page } from "@playwright/test";

import { clickActiveAntdOption } from "./form-controls";

export async function clickRuleSetPackageAddButton(page: Page, sourceRef: string): Promise<void> {
  const addButton = page.getByRole("button", { name: /增加|添加规则包|新增规则包|添加/ }).first();
  await expect(addButton, `${sourceRef}: 应展示新增规则包入口`).toBeVisible({
    timeout: 30000,
  });
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
    await expect(savePrompt, `${sourceRef}: 保存提示确认后应关闭`).toBeHidden({
      timeout: 30000,
    });
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
    ? confirm.getByRole("button", { name: /^保\s*存$|^确\s*定$|^提\s*交$|^完\s*成$/ }).last()
    : page.getByRole("button", { name: /^保\s*存$/ }).last();
  if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmButton.click({ force: forceClick, timeout: 30000 });
  } else {
    await confirm
      .getByRole("button", { name: /^保\s*存$|^确\s*定$|^提\s*交$|^完\s*成$/ })
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
  await expect(dropdown, `${sourceRef}: 字段下拉应包含「${fieldName}」`).toContainText(
    fieldName,
    {
      timeout: 30000,
    },
  );
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
