import { expect, type Locator, type Page } from "@playwright/test";

import {
  expectAntMessage,
  waitForTableLoaded,
  waitForUiSettled,
} from "../../../../../../runtime/automation/playwright";
import { getEnvConfig } from "../../runtime/env-profile";
import { gotoDataQualityPage } from "./project-context";

const PACKAGE_SECTION_SELECTOR = ".ruleSetMonitor__package";
const RULE_FORM_SELECTOR = ".ruleForm";

function qualityProjectName(): string {
  return getEnvConfig().projects.quality.name;
}

async function gotoRuleSetList(page: Page): Promise<void> {
  const path = "/dq/ruleSet";
  await gotoDataQualityPage(page, path);
  expect(page.url(), `应保持在 DataAssets ${path} 路由`).toContain(`#${path}`);
  await expect(page.locator("body"), `项目选择器应显示 ${qualityProjectName()}`).toContainText(
    qualityProjectName(),
    { timeout: 30_000 },
  );
  await waitForTableLoaded(page);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 定位规则集编辑器中的规则包。 */
export async function getRulePackage(page: Page, packageName: string): Promise<Locator> {
  const section = page.locator(PACKAGE_SECTION_SELECTOR).filter({ hasText: packageName }).first();
  await expect(section, `应展示规则包「${packageName}」`).toBeVisible({ timeout: 30_000 });
  return section;
}

/** 在规则包中新增规则，并返回新建的规则表单。 */
export async function addRuleToPackage(
  page: Page,
  packageName: string,
  ruleType = "有效性校验",
): Promise<Locator> {
  const packageSection = await getRulePackage(page, packageName);
  const beforeCount = await packageSection.locator(RULE_FORM_SELECTOR).count();
  const addEntry = packageSection.getByRole("button", { name: /新增规则|添加规则/ }).first();
  await expect(addEntry, `规则包「${packageName}」应展示新增规则入口`).toBeVisible({
    timeout: 30_000,
  });
  await addEntry.click({ timeout: 30_000 });

  const typePattern = new RegExp(`^${escapeRegExp(ruleType.replace(/校验$/, ""))}(校验)?$`);
  const menuScope = page
    .locator(".ant-select-dropdown:visible, .ant-dropdown:visible, .ant-modal:visible")
    .last();
  const scopedEntry = menuScope.getByText(typePattern).last();
  const typeEntry = (await scopedEntry.isVisible({ timeout: 3_000 }).catch(() => false))
    ? scopedEntry
    : page.getByText(typePattern).last();
  await expect(typeEntry, `新增规则应可选择「${ruleType}」分类`).toBeVisible({
    timeout: 10_000,
  });
  await typeEntry.click({ timeout: 30_000 });

  await expect(
    packageSection.locator(RULE_FORM_SELECTOR),
    `规则包「${packageName}」应新增一个规则表单`,
  ).toHaveCount(beforeCount + 1, { timeout: 10_000 });
  return packageSection.locator(RULE_FORM_SELECTOR).last();
}

/** 保存规则集，并等待成功消息或列表重定向。 */
export async function saveRuleSet(page: Page): Promise<void> {
  const saveButtons = page.getByRole("button", { name: /^保\s*存$/ });
  const count = await saveButtons.count();
  expect(count, "规则集编辑页应展示保存按钮").toBeGreaterThan(0);
  if (count > 1) {
    await saveButtons.first().click({ timeout: 30_000 });
    await waitForUiSettled(page);
  }
  await saveButtons.last().click({ timeout: 30_000 });

  const messageSeen = expectAntMessage(page, /成功/, 20_000)
    .then(() => true)
    .catch(() => false);
  const redirected = page
    .waitForURL(/\/dq\/ruleSet(\?|#|$)/, { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  const saved = await Promise.race([messageSeen, redirected]);
  await Promise.allSettled([messageSeen, redirected]);
  expect(saved, "保存规则集应提示成功或返回规则集列表").toBe(true);

  if (/\/dq\/ruleSet\/(add|edit)/.test(page.url())) {
    await gotoRuleSetList(page);
  }
}
