import { expect, type Locator, type Page } from "@playwright/test";

import {
  buildDataAssetsUrl,
  getEnvConfig,
  selectAntOption,
} from "../../helpers/test-setup";
import { MONITOR_OBJECT, TIMELINESS_RULE } from "../data/timeliness-multi-field-data";

type TableColumn = {
  key?: string;
  type?: string;
};

export async function gotoMonitorRuleCreate(page: Page): Promise<void> {
  const env = getEnvConfig();
  const projectId = env.projects.quality.id;
  await page.goto(buildDataAssetsUrl("/dq/rule/add", projectId), {
    waitUntil: "domcontentloaded",
  });
  await page.evaluate((pid) => {
    sessionStorage.setItem("X-Valid-Project-ID", String(pid));
  }, projectId);
  await expect(page.locator("body")).toContainText("新建单表校验规则", { timeout: 30000 });
  await expect(page.locator(".ant-form-item").filter({ hasText: /规则名称/ })).toBeVisible({
    timeout: 15000,
  });
}

export async function selectSearchableAntOption(
  page: Page,
  triggerLocator: Locator,
  optionText: string | RegExp,
): Promise<void> {
  await triggerLocator.click();
  await page.waitForTimeout(400);

  const searchInput = page
    .locator(
      ".ant-select-open input.ant-select-selection-search-input, .ant-select-focused input.ant-select-selection-search-input",
    )
    .last();
  if (typeof optionText === "string" && (await searchInput.isEditable().catch(() => false))) {
    await searchInput.fill(optionText);
    await page.waitForTimeout(1000);
  }

  const option = page
    .locator(".ant-select-dropdown:visible .ant-select-item-option")
    .filter({ hasText: optionText })
    .first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();
  await page.waitForTimeout(800);
}

export async function fillMonitorObject(page: Page, ruleName: string): Promise<void> {
  const ruleNameInput = page
    .locator(".ant-form-item")
    .filter({ hasText: /规则名称/ })
    .locator("input")
    .first();
  await ruleNameInput.fill(ruleName);

  await selectSearchableAntOption(
    page,
    page.locator(".ant-form-item").filter({ hasText: /选择数据源/ }).locator(".ant-select").first(),
    MONITOR_OBJECT.datasourceName,
  );
  await selectSearchableAntOption(
    page,
    page.locator(".ant-form-item").filter({ hasText: /选择数据库/ }).locator(".ant-select").first(),
    MONITOR_OBJECT.schemaName,
  );
  await selectSearchableAntOption(
    page,
    page.locator(".ant-form-item").filter({ hasText: /选择数据表/ }).locator(".ant-select").first(),
    MONITOR_OBJECT.tableName,
  );
}

export async function fetchMonitorTableColumns(page: Page): Promise<TableColumn[]> {
  const result = await page.evaluate(async (payload) => {
    const response = await fetch("/dassets/v1/valid/monitor/tablecolumn", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
        "X-Valid-Project-ID": String(payload.projectId),
      },
      body: JSON.stringify({
        sourceId: payload.sourceId,
        schemaName: payload.schemaName,
        tableName: payload.tableName,
      }),
    });
    return (await response.json()) as { success?: boolean; data?: TableColumn[]; message?: string };
  }, {
    projectId: getEnvConfig().projects.quality.id,
    sourceId: MONITOR_OBJECT.datasourceId,
    schemaName: MONITOR_OBJECT.schemaName,
    tableName: MONITOR_OBJECT.tableName,
  });

  expect(result.success, result.message ?? "monitor tablecolumn API failed").toBe(true);
  return result.data ?? [];
}

export async function gotoMonitorRulesStep(page: Page): Promise<void> {
  await page.getByRole("button", { name: "下一步" }).click();
  await expect(page.getByRole("button", { name: "添加规则" })).toBeVisible({ timeout: 15000 });
}

export async function openAddRuleMenu(page: Page): Promise<string[]> {
  await page.getByRole("button", { name: "添加规则" }).click();
  const menu = page.locator(".ant-dropdown:visible, .ant-popover:visible").last();
  await expect(menu).toBeVisible({ timeout: 10000 });
  return menu
    .locator(".ant-dropdown-menu-title-content, .ant-popover-inner-content")
    .evaluateAll((nodes) =>
      nodes
        .map((node) => node.textContent?.trim() ?? "")
        .flatMap((text) => text.split(/\s+/))
        .filter(Boolean),
    );
}

export async function expectTimelinessRuleEntry(page: Page): Promise<void> {
  const ruleTypes = await openAddRuleMenu(page);
  expect(
    ruleTypes,
    [
      "SourceRef ui.probe.snapshot@7: ci63 添加规则菜单当前应包含时效性校验。",
      `实际规则类型: ${ruleTypes.join(", ") || "(empty)"}`,
    ].join(" "),
  ).toContain(TIMELINESS_RULE.ruleType);
}

export async function selectTimelinessRule(page: Page): Promise<void> {
  const ruleTypes = await openAddRuleMenu(page);
  expect(
    ruleTypes,
    `SourceRef ui.probe.snapshot@7: 添加规则菜单缺少 ${TIMELINESS_RULE.ruleType}`,
  ).toContain(TIMELINESS_RULE.ruleType);
  await page
    .locator(".ant-dropdown:visible .ant-dropdown-menu-title-content")
    .filter({ hasText: TIMELINESS_RULE.ruleType })
    .first()
    .click();
  await page.waitForTimeout(1000);
}

export async function expectMultiFieldTimelinessContract(page: Page): Promise<void> {
  await expect(page.locator("body")).toContainText(TIMELINESS_RULE.ruleType, { timeout: 10000 });
  await expect(page.locator("body")).toContainText(TIMELINESS_RULE.functionName);
  await expect(page.locator("body")).toContainText(TIMELINESS_RULE.functionDescription);
  for (const label of ["字段", "统计函数", "过滤条件", "选择对比字段组", "时间差", "大小关系", "强弱规则", "规则描述"]) {
    await expect(page.locator("body"), `多字段时间差表单缺少「${label}」`).toContainText(label);
  }
}

export async function chooseAntOptionIfPresent(
  page: Page,
  selectLocator: Locator,
  optionText: string | RegExp,
): Promise<void> {
  await selectAntOption(page, selectLocator, optionText);
  await page.waitForTimeout(300);
}
