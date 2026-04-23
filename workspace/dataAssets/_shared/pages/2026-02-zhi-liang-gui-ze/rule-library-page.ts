import { expect, type Page } from "@playwright/test";

import {
  buildDataAssetsUrl,
  getEnvConfig,
} from "../../helpers/test-setup";
import { MONITOR_OBJECT, SOURCE_REFS } from "../data/rule-library-contract";

export async function gotoRuleBaseCandidate(page: Page): Promise<void> {
  const projectId = getEnvConfig().projects.quality.id;
  await page.goto(buildDataAssetsUrl("/dq/ruleBase", projectId), {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
}

async function selectSearchableAntOption(page: Page, label: string, optionText: string): Promise<void> {
  const formItem = page.locator(".ant-form-item").filter({ hasText: label }).first();
  await expect(formItem, `${SOURCE_REFS.ruleAdd}: 表单项「${label}」应可见`).toBeVisible({
    timeout: 15000,
  });
  await formItem.locator(".ant-select").first().click();

  const searchInput = page
    .locator(
      ".ant-select-open input.ant-select-selection-search-input, .ant-select-focused input.ant-select-selection-search-input",
    )
    .last();
  if (await searchInput.isEditable().catch(() => false)) {
    await searchInput.fill(optionText);
  }

  const option = page
    .locator(".ant-select-dropdown:visible .ant-select-item-option")
    .filter({ hasText: optionText })
    .first();
  await expect(option, `${SOURCE_REFS.ruleAdd}: 下拉选项「${optionText}」应可选`).toBeVisible({
    timeout: 15000,
  });
  await option.click();
  await page.waitForTimeout(500);
}

export async function gotoMonitorRuleStep2(page: Page): Promise<void> {
  const projectId = getEnvConfig().projects.quality.id;
  await page.goto(buildDataAssetsUrl("/dq/rule/add", projectId), {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);

  await expect(page.locator("body"), SOURCE_REFS.ruleAdd).toContainText("新建单表校验规则", {
    timeout: 30000,
  });

  const ruleName = `qa_builtin_rule_contract_${Date.now()}`;
  await page.locator(".ant-form-item").filter({ hasText: "规则名称" }).locator("input").first().fill(ruleName);
  await selectSearchableAntOption(page, "选择数据源", MONITOR_OBJECT.datasourceKeyword);
  await selectSearchableAntOption(page, "选择数据库", MONITOR_OBJECT.schemaName);
  await selectSearchableAntOption(page, "选择数据表", MONITOR_OBJECT.tableName);
  await page.getByRole("button", { name: "下一步" }).click();

  await expect(page.getByRole("button", { name: "添加规则" }), SOURCE_REFS.ruleAdd).toBeVisible({
    timeout: 20000,
  });
}

export async function readAddRuleMenu(page: Page): Promise<string[]> {
  await page.getByRole("button", { name: "添加规则" }).click();
  const dropdown = page.locator(".ant-dropdown:visible, .ant-popover:visible").last();
  await expect(dropdown, SOURCE_REFS.addRuleMenu).toBeVisible({ timeout: 10000 });

  return dropdown
    .locator(".ant-dropdown-menu-title-content, .ant-popover-inner-content")
    .evaluateAll((nodes) =>
      nodes
        .map((node) => node.textContent?.trim() ?? "")
        .flatMap((text) => text.split(/\s+/))
        .filter(Boolean),
    );
}
