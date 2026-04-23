import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  applyRuntimeCookies,
  selectAntOption,
  waitForTableLoaded,
} from "../../helpers";
import {
  addRuleToPackage,
  clearAllRules,
  deleteRuleSetsByTableNames,
  getRuleForm,
  getRulePackage,
  getRuleSetListRow,
  getSelectOptions,
  gotoRuleBase,
  gotoRuleSetList,
  keepOnlyRulePackages,
  openRuleSetEditor,
  saveRuleSet,
} from "../2026-04-you-xiao-xing-duo-gui-ze/rule-editor-helpers";
import {
  addKey,
  deleteKey,
  gotoJsonConfigPage,
  searchKey,
} from "../2026-04-tong-yong-j-s/json-config-helpers";
import {
  createRuleSetDraft,
  DORIS_MONITOR_DATASOURCE,
  SPARKTHRIFT_MONITOR_DATASOURCE,
} from "./key-range-utils";
import { uniqueName } from "../../helpers/test-setup";
import {
  getCurrentDatasource,
  KEY_NAMES,
  MAIN_TABLE_NAME,
  METHOD_SWITCH_TABLE_NAME,
  NOT_INCLUDE_TABLE_NAME,
  PASS_TABLE_NAME,
  runPreconditions,
  SUITE_KEYS,
} from "../data/test-data";

export const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验";
export const KEY_RANGE_RULE_NAME = "key范围校验";
// 任务名使用 MD 用例表名 + _task 后缀，确保与归档用例可关联排查。
// 不追加 _sparkthrift2_x 后缀——uniqueName timestamp 已保证唯一性。
export const MAIN_TASK_NAME = uniqueName("test_json_key_range_task");
export const PASS_TASK_NAME = uniqueName("test_json_key_range_pass_task");
export const METHOD_SWITCH_TASK_NAME = uniqueName("test_json_key_range_ms_task");
export const NOT_INCLUDE_TASK_NAME = uniqueName("test_json_key_range_ni_task");
export const FAIL_LOG_TASK_NAME = uniqueName("test_json_key_range_fail_task");

export type KeyRangeMethod = "包含" | "不包含";

export interface KeyRangeRuleConfig {
  readonly field: string;
  readonly method: KeyRangeMethod;
  readonly keyNames: readonly string[];
  readonly description?: string;
  readonly filterSql?: string;
  readonly ruleStrength?: "强规则" | "弱规则";
}

export interface RuleSetScenario {
  readonly tableName: string;
  readonly packageName: string;
  readonly baseRule?: KeyRangeRuleConfig;
}

// KEY_LABELS 键用 unique 化的 key 名（与 SUITE_KEYS / SQL JSON 内容一致）
const KEY_LABELS: Record<string, string> = {
  [KEY_NAMES.k1]: "姓名",
  [KEY_NAMES.k2]: "年龄",
  [KEY_NAMES.k3]: "性别",
  [KEY_NAMES.k11]: "省份",
  [KEY_NAMES.k22]: "城市",
  [KEY_NAMES.k33]: "区县",
  [KEY_NAMES.kDeletedRef]: "删除引用key",
};

export const SCENARIOS = {
  main: {
    tableName: MAIN_TABLE_NAME,
    packageName: uniqueName("test_json_key_range_pkg"),
    baseRule: {
      field: "info",
      method: "包含",
      keyNames: [KEY_NAMES.k1, KEY_NAMES.k2],
      ruleStrength: "强规则",
    },
  },
  fieldType: {
    tableName: MAIN_TABLE_NAME,
    packageName: uniqueName("test_json_key_range_ft_pkg"),
  },
  methodSwitch: {
    tableName: METHOD_SWITCH_TABLE_NAME,
    packageName: uniqueName("test_json_key_range_ms_pkg"),
    baseRule: {
      field: "info",
      method: "包含",
      keyNames: [KEY_NAMES.k1, KEY_NAMES.k2],
      ruleStrength: "强规则",
    },
  },
  pass: {
    tableName: PASS_TABLE_NAME,
    packageName: uniqueName("test_json_key_range_pass_pkg"),
    baseRule: {
      field: "info",
      method: "包含",
      keyNames: [KEY_NAMES.k1, KEY_NAMES.k2],
      ruleStrength: "强规则",
    },
  },
  notInclude: {
    tableName: NOT_INCLUDE_TABLE_NAME,
    packageName: uniqueName("test_json_key_range_ni_pkg"),
    baseRule: {
      field: "info",
      method: "不包含",
      keyNames: [KEY_NAMES.k1, KEY_NAMES.k2],
      ruleStrength: "强规则",
    },
  },
  failLog: {
    tableName: MAIN_TABLE_NAME,
    packageName: uniqueName("test_json_key_range_fl_pkg"),
    baseRule: {
      field: "info",
      method: "包含",
      keyNames: [KEY_NAMES.kDeletedRef],
      ruleStrength: "强规则",
    },
  },
  contentFull: {
    tableName: MAIN_TABLE_NAME,
    packageName: uniqueName("test_json_key_range_full_pkg"),
    baseRule: {
      field: "info",
      method: "包含",
      keyNames: [KEY_NAMES.k1, KEY_NAMES.k2, KEY_NAMES.k11, KEY_NAMES.k22],
      ruleStrength: "强规则",
    },
  },
} satisfies Record<string, RuleSetScenario>;

const preparedRuleSetScenarios = new Set<string>();

function getDatasourceTypeName(): string {
  return getCurrentDatasource().id === "doris3.x" ? "Doris3.x" : "SparkThrift2.x";
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getExpectedFieldType(): string {
  return getCurrentDatasource().primaryFieldType;
}

export async function ensureJsonKeys(
  page: Page,
  keys: readonly string[] = [...SUITE_KEYS],
): Promise<void> {
  await applyRuntimeCookies(page);
  await gotoJsonConfigPage(page);
  const table = page.locator(".ant-table");
  await table.waitFor({ state: "visible", timeout: 15000 });
  await waitForTableLoaded(page, table);

  for (const keyName of keys) {
    await searchKey(page, keyName);
    const existingRow = page.locator(".ant-table-row").filter({ hasText: keyName }).first();
    if (await existingRow.isVisible({ timeout: 1500 }).catch(() => false)) {
      continue;
    }
    try {
      await addKey(page, keyName, {
        chineseName: KEY_LABELS[keyName] ?? keyName,
        dataSourceType: getDatasourceTypeName(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("对应层级已经存在相同名称的Key")) {
        continue;
      }
      if (
        message.includes("locator.fill: Timeout") ||
        message.includes("locator.clear: Timeout") ||
        message.includes("locator.waitFor: Timeout")
      ) {
        process.stderr.write(
          `[json-config] WARN: adding key "${keyName}" did not reach editable form, continuing with existing key config. ${message.slice(0, 300)}\n`,
        );
        await page.keyboard.press("Escape").catch(() => undefined);
        continue;
      }
      throw error;
    }
  }
}

export async function ensureDeletedReferenceKey(page: Page): Promise<void> {
  await ensureJsonKeys(page, ["key_deleted_ref"]);
}

export async function removeDeletedReferenceKey(page: Page): Promise<void> {
  await gotoJsonConfigPage(page);
  await deleteKey(page, "key_deleted_ref");
}

export async function startRuleSetDraft(page: Page, scenario: RuleSetScenario): Promise<void> {
  await runPreconditions(page);
  await ensureJsonKeys(page);
  if (scenario.baseRule?.keyNames.includes("key_deleted_ref")) {
    await ensureDeletedReferenceKey(page);
  }
  // 根据当前数据源动态选择对应的 monitor datasource 配置
  const datasource =
    getCurrentDatasource().id === "doris3.x"
      ? DORIS_MONITOR_DATASOURCE
      : SPARKTHRIFT_MONITOR_DATASOURCE;
  await gotoRuleSetList(page);
  await deleteRuleSetsByTableNames(page, [scenario.tableName]);
  await createRuleSetDraft(page, scenario.tableName, [scenario.packageName], datasource);
  await keepOnlyRulePackages(page, [scenario.packageName]);
  await clearAllRules(page);
}

function getRuleLevelSelect(ruleForm: Locator): Locator {
  return getFormItemByLabel(ruleForm, "生效范围").locator(".ant-select").first();
}

function getFieldSelect(ruleForm: Locator): Locator {
  return getFormItemByLabel(ruleForm, "字段").locator(".ant-select").first();
}

function getMethodSelect(ruleForm: Locator): Locator {
  return getFormItemByLabel(ruleForm, "校验方法").locator(".ant-select").first();
}

function getFunctionFormItem(ruleForm: Locator): Locator {
  return getFormItemByLabel(ruleForm, "统计函数");
}

async function getFunctionSelect(ruleForm: Locator): Promise<Locator> {
  const legacyFunctionSelect = ruleForm.locator(".rule__function-list__item .ant-select").first();
  const inlineFunctionSelect = getFunctionFormItem(ruleForm).locator(".ant-select").first();

  await expect
    .poll(
      async () =>
        (await legacyFunctionSelect.isVisible().catch(() => false)) ||
        (await inlineFunctionSelect.isVisible().catch(() => false)),
      { timeout: 10000, message: "waiting for function select to render" },
    )
    .toBe(true);

  return (await legacyFunctionSelect.isVisible().catch(() => false))
    ? legacyFunctionSelect
    : inlineFunctionSelect;
}

async function ensureFieldLevelControlsReady(ruleForm: Locator): Promise<void> {
  await expect(getFieldSelect(ruleForm)).toBeVisible({ timeout: 10000 });
  await expect(await getFunctionSelect(ruleForm)).toBeVisible({
    timeout: 10000,
  });
}

function getContentSelect(ruleForm: Locator): Locator {
  return getFormItemByLabel(ruleForm, "校验内容").locator(".ant-select, .ant-tree-select").first();
}

function getFormItemByLabel(ruleForm: Locator, label: string): Locator {
  return ruleForm
    .locator(`xpath=.//*[contains(@class,'ant-form-item')][.//label[@title="${label}"]]`)
    .first();
}

function getFilterConfigTypeSelect(ruleForm: Locator): Locator {
  return ruleForm.locator(".filterCondition .ant-select").first();
}

function getFilterInput(ruleForm: Locator): Locator {
  return ruleForm.locator(".filterCondition input").last();
}

async function openDropdown(selectLocator: Locator): Promise<Locator> {
  await selectLocator.locator(".ant-select-selector").first().click({ timeout: 5000 });
  const page = selectLocator.page();
  const dropdown = page
    .locator(".ant-select-dropdown:visible, .ant-tree-select-dropdown:visible")
    .last();
  await dropdown.waitFor({ state: "visible", timeout: 10000 });
  return dropdown;
}

async function expandVerificationTree(page: Page, dropdown: Locator): Promise<void> {
  for (let pass = 0; pass < 3; pass += 1) {
    const switchers = dropdown.locator(".ant-select-tree-switcher, .ant-tree-switcher");
    const count = await switchers.count().catch(() => 0);
    let expandedAny = false;

    for (let index = 0; index < count; index += 1) {
      const switcher = switchers.nth(index);
      if (!(await switcher.isVisible({ timeout: 500 }).catch(() => false))) {
        continue;
      }

      const className = (await switcher.getAttribute("class")) ?? "";
      if (/open|noop/.test(className)) {
        continue;
      }

      await switcher.scrollIntoViewIfNeeded().catch(() => undefined);
      await switcher.click({ force: true }).catch(async () => {
        await switcher.evaluate((node) => {
          (node as HTMLElement).click();
        });
      });
      await page.waitForTimeout(200);
      expandedAny = true;
    }

    if (!expandedAny) {
      break;
    }
  }
}

async function selectAntOptionWithRetry(
  page: Page,
  triggerLocator: Locator,
  optionText: string | RegExp,
  attempts = 4,
): Promise<void> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await selectAntOption(page, triggerLocator, optionText);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await page.keyboard.press("Escape").catch(() => undefined);
      await page.waitForTimeout(800 * (attempt + 1));
    }
  }
  throw lastError ?? new Error(`Ant Select option not found: ${String(optionText)}`);
}

async function selectAntOptionBySearch(
  page: Page,
  triggerLocator: Locator,
  optionText: string | RegExp,
  searchText?: string,
): Promise<void> {
  await page.keyboard.press("Escape").catch(() => undefined);
  await triggerLocator.locator(".ant-select-selector").first().click({ timeout: 10000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await dropdown.waitFor({ state: "visible", timeout: 10000 });

  const searchInput = triggerLocator
    .locator("input.ant-select-selection-search-input")
    .or(page.locator(".ant-select-open input.ant-select-selection-search-input"))
    .last();
  if (searchText) {
    await searchInput.click().catch(() => undefined);
    await page.keyboard.press("Meta+A").catch(() => undefined);
    await page.keyboard.press("Control+A").catch(() => undefined);
    await page.keyboard.press("Backspace").catch(() => undefined);
    if (await searchInput.isEditable().catch(() => false)) {
      await searchInput.fill(searchText);
    } else {
      await page.keyboard.type(searchText, { delay: 20 }).catch(() => undefined);
    }
    await page.waitForTimeout(300);
  }

  const option =
    typeof optionText === "string"
      ? dropdown
          .locator(".ant-select-item-option")
          .filter({ hasText: new RegExp(`^${escapeRegExp(optionText)}$`) })
          .first()
      : dropdown.locator(".ant-select-item-option").filter({ hasText: optionText }).first();

  if (!(await option.isVisible({ timeout: 30000 }).catch(() => false))) {
    const visibleOptions = await dropdown
      .locator(".ant-select-item-option-content, .ant-select-item-option")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean))
      .catch(() => [] as string[]);
    throw new Error(
      `下拉选项 "${String(optionText)}" 未找到。搜索词="${searchText ?? ""}"，当前可见项: ${
        visibleOptions.join(" | ") || "none"
      }`,
    );
  }
  await option.click();
  await page.waitForTimeout(300);
}

async function selectTreeOptionBySearch(
  page: Page,
  treeSelect: Locator,
  keyName: string,
): Promise<void> {
  let dropdown = page
    .locator(".ant-select-dropdown:visible, .ant-tree-select-dropdown:visible")
    .last();
  if (!(await dropdown.isVisible({ timeout: 500 }).catch(() => false))) {
    await treeSelect.locator(".ant-select-selector").first().click({ timeout: 10000 });
    dropdown = page
      .locator(".ant-select-dropdown:visible, .ant-tree-select-dropdown:visible")
      .last();
  }
  await dropdown.waitFor({ state: "visible", timeout: 10000 });

  const searchInput = treeSelect
    .locator("input.ant-select-selection-search-input")
    .or(
      page.locator(
        ".ant-select-open input.ant-select-selection-search-input, .ant-select-focused input.ant-select-selection-search-input, .ant-tree-select-dropdown:visible input",
      ),
    )
    .last();
  if (await searchInput.isEditable().catch(() => false)) {
    await searchInput.click();
    await page.keyboard.press("Meta+A").catch(() => undefined);
    await page.keyboard.press("Control+A").catch(() => undefined);
    await page.keyboard.press("Backspace").catch(() => undefined);
    await searchInput.fill(keyName);
  }

  const keyPattern = new RegExp(`^${escapeRegExp(keyName)}(?![0-9A-Za-z_])`);
  const title = dropdown
    .locator(".ant-select-tree-title, .ant-select-item-option-content")
    .filter({ hasText: keyPattern })
    .first();
  if (!(await title.isVisible({ timeout: 30000 }).catch(() => false))) {
    const visibleOptions = await dropdown
      .locator(".ant-select-tree-title, .ant-select-item-option-content")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean))
      .catch(() => [] as string[]);
    throw new Error(
      `校验内容搜索 "${keyName}" 后未找到可选项。当前可见项: ${visibleOptions.join(" | ") || "none"}`,
    );
  }

  const treeNode = title.locator(
    "xpath=ancestor::*[contains(@class,'ant-select-tree-treenode') or @role='treeitem' or contains(@class,'ant-select-item-option')][1]",
  );
  await title.scrollIntoViewIfNeeded().catch(() => undefined);
  const checkbox = treeNode
    .locator(".ant-select-tree-checkbox-inner, .ant-select-tree-checkbox, .ant-checkbox-input")
    .first();
  if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
    await checkbox.click({ timeout: 5000 }).catch(async () => {
      await title.click({ force: true, timeout: 5000 });
    });
  } else {
    await title.click({ force: true, timeout: 5000 });
  }
  await expect(treeNode).toHaveClass(/checked|selected/, { timeout: 5000 });
  await page.waitForTimeout(300);
}

export async function selectFieldValues(
  page: Page,
  ruleForm: Locator,
  fields: readonly string[],
): Promise<void> {
  const fieldSelect = getFieldSelect(ruleForm);
  const dropdown = await openDropdown(fieldSelect);
  for (const field of fields) {
    const option = dropdown
      .locator(".ant-select-item-option")
      .filter({ hasText: new RegExp(`^${field}$`) })
      .first();
    await option.click();
    await page.waitForTimeout(200);
  }
  await page.keyboard.press("Escape").catch(() => undefined);
}

export async function selectRuleFunction(ruleForm: Locator, functionName: string): Promise<void> {
  const functionSelect = await getFunctionSelect(ruleForm);
  await selectAntOptionBySearch(ruleForm.page(), functionSelect, functionName, functionName);
  await ruleForm.page().waitForTimeout(500);
}

async function selectRuleFieldWithFunctionFallback(
  page: Page,
  ruleForm: Locator,
  field: string,
): Promise<boolean> {
  try {
    await selectAntOptionBySearch(page, getFieldSelect(ruleForm), field, field);
    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("当前可见项: none")) {
      throw error;
    }
    process.stderr.write(
      `[ruleset] field "${field}" options were empty before function selection; selecting function first and retrying field.\n`,
    );
    await selectRuleFunction(ruleForm, KEY_RANGE_RULE_NAME);
    await page.waitForTimeout(1200);
    await selectAntOptionBySearch(page, getFieldSelect(ruleForm), field, field);
    return true;
  }
}

export async function configureKeyRangeRule(
  page: Page,
  ruleForm: Locator,
  config: KeyRangeRuleConfig,
): Promise<void> {
  const levelSelect = getRuleLevelSelect(ruleForm);
  if (await levelSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    await selectAntOptionBySearch(page, levelSelect, "字段级");
  }
  await ensureFieldLevelControlsReady(ruleForm);

  const functionAlreadySelected = await selectRuleFieldWithFunctionFallback(
    page,
    ruleForm,
    config.field,
  );
  await page.waitForTimeout(500);
  if (!functionAlreadySelected) {
    await selectRuleFunction(ruleForm, KEY_RANGE_RULE_NAME);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(500);
  await selectAntOptionBySearch(page, getMethodSelect(ruleForm), config.method);
  await setVerificationContent(page, ruleForm, config.keyNames);

  if (config.filterSql) {
    const filterTypeSelect = getFilterConfigTypeSelect(ruleForm);
    if (await filterTypeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectAntOptionBySearch(page, filterTypeSelect, /手动输入|手动/);
      await getFilterInput(ruleForm).fill(config.filterSql);
    }
  }

  if (config.ruleStrength) {
    const strengthSelect = ruleForm
      .locator(".ant-form-item")
      .filter({ hasText: /强弱规则/ })
      .locator(".ant-select")
      .first();
    await selectAntOptionBySearch(page, strengthSelect, config.ruleStrength);
  }

  if (config.description !== undefined) {
    await ruleForm.getByPlaceholder("请填写规则描述").first().fill(config.description);
  }
}

export async function setVerificationContent(
  page: Page,
  ruleForm: Locator,
  keyNames: readonly string[],
): Promise<void> {
  const contentSelect = getContentSelect(ruleForm);
  for (const keyName of keyNames) {
    await selectTreeOptionBySearch(page, contentSelect, keyName);
  }

  const confirmButton = page.getByRole("button", { name: /确认|确 定/ }).last();
  if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirmButton.click();
  } else {
    await page.keyboard.press("Escape").catch(() => undefined);
  }
  await page.waitForTimeout(300);
}

export async function searchVerificationContent(
  page: Page,
  ruleForm: Locator,
  keyword: string,
): Promise<Locator> {
  const contentSelect = getContentSelect(ruleForm);
  const dropdown = await openDropdown(contentSelect);
  await expandVerificationTree(page, dropdown);
  const searchInput = dropdown.locator("input").first();
  if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await searchInput.fill(keyword);
    await page.waitForTimeout(500);
  }
  return dropdown;
}

export async function collectVerificationOptions(page: Page, ruleForm: Locator): Promise<string[]> {
  const contentSelect = getContentSelect(ruleForm);
  const dropdown = await openDropdown(contentSelect);
  await expandVerificationTree(page, dropdown);
  const items = await dropdown
    .locator(".ant-select-tree-title, .ant-select-item-option-content")
    .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean));
  await page.keyboard.press("Escape").catch(() => undefined);
  return items;
}

export async function collectFieldOptions(page: Page, ruleForm: Locator): Promise<string[]> {
  return getSelectOptions(page, getFieldSelect(ruleForm));
}

export async function openScenarioEditor(page: Page, scenario: RuleSetScenario): Promise<void> {
  await gotoRuleSetList(page);
  await openRuleSetEditor(page, scenario.tableName, [scenario.packageName]);
}

export async function seedScenarioRule(page: Page, scenario: RuleSetScenario): Promise<Locator> {
  if (!scenario.baseRule) {
    throw new Error(`Scenario ${scenario.tableName} does not declare a base rule.`);
  }
  await startRuleSetDraft(page, scenario);
  const ruleForm = await addRuleToPackage(page, scenario.packageName, "完整性校验");
  await configureKeyRangeRule(page, ruleForm, scenario.baseRule);
  await saveRuleSet(page);
  await openScenarioEditor(page, scenario);
  return getRuleForm(page, new RegExp(scenario.baseRule.field));
}

export async function seedScenarioRuleSet(page: Page, scenario: RuleSetScenario): Promise<void> {
  await seedScenarioRule(page, scenario);
}

export async function ensureSavedScenarioRuleSet(
  page: Page,
  scenario: RuleSetScenario,
  options: { readonly force?: boolean } = {},
): Promise<void> {
  const cacheKey = `${getCurrentDatasource().cacheKey}:${scenario.tableName}:${scenario.packageName}`;
  if (!options.force && preparedRuleSetScenarios.has(cacheKey)) {
    return;
  }
  await seedScenarioRuleSet(page, scenario);
  preparedRuleSetScenarios.add(cacheKey);
}

export async function ensureMainScenarioRuleSet(
  page: Page,
  options: { readonly force?: boolean } = {},
): Promise<void> {
  await ensureSavedScenarioRuleSet(page, SCENARIOS.main, options);
}

export async function addEmptyKeyRangeRule(
  page: Page,
  scenario: RuleSetScenario,
): Promise<Locator> {
  await startRuleSetDraft(page, scenario);
  return addRuleToPackage(page, scenario.packageName, "完整性校验");
}

export async function saveInvalidRuleSet(page: Page): Promise<void> {
  await saveRuleSet(page);
  await page.waitForTimeout(500);
}

export async function expectRuleError(ruleForm: Locator, message: string): Promise<void> {
  await expect(
    ruleForm.locator(".ant-form-item-explain-error").filter({ hasText: message }).first(),
  ).toBeVisible({
    timeout: 5000,
  });
}

export async function openRuleContentTooltip(page: Page, ruleForm: Locator): Promise<Locator> {
  const contentNode = ruleForm
    .locator(".ant-select-selection-item, .ant-select-selection-overflow")
    .first();
  await contentNode.hover();
  const tooltip = page.locator(".ant-tooltip:visible, .ant-popover:visible").last();
  await expect(tooltip).toBeVisible({ timeout: 5000 });
  return tooltip;
}

export async function openFunctionTooltip(page: Page, ruleForm: Locator): Promise<Locator> {
  const tooltipIcon = ruleForm
    .locator(".ant-form-item-label")
    .filter({ hasText: /统计函数/ })
    .locator(".anticon, svg")
    .first();
  await tooltipIcon.hover();
  const tooltip = page.locator(".ant-tooltip:visible, .ant-popover:visible").last();
  await expect(tooltip).toBeVisible({ timeout: 5000 });
  return tooltip;
}

export async function gotoBuiltInRuleBase(page: Page): Promise<void> {
  await gotoRuleBase(page);
  const builtinTab = page.getByRole("tab", { name: /内置规则/ }).first();
  if (await builtinTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await builtinTab.click();
  }
}

export async function searchRuleBaseRule(page: Page, keyword: string): Promise<Locator> {
  const searchBox = page.getByPlaceholder("请输入规则名称进行搜索").first();
  await searchBox.fill(keyword);
  await page.getByRole("button", { name: /search/i }).click();
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
  const row = page.locator(".ant-table-row").filter({ hasText: keyword }).first();
  await expect(row).toBeVisible({ timeout: 10000 });
  return row;
}

export async function assertOnlyTheseDetailRows(
  dataDrawer: Locator,
  expectedIds: readonly number[],
): Promise<void> {
  const rows = dataDrawer.locator(".ant-table-tbody tr:not(.ant-table-measure-row)");
  await expect(rows).toHaveCount(expectedIds.length, { timeout: 10000 });
  const rowTexts = await rows.allInnerTexts();
  for (const id of expectedIds) {
    expect(rowTexts.some((text) => text.includes(String(id)))).toBe(true);
  }
}

export async function expectHighlightedColumn(
  pageOrDrawer: Locator,
  columnName: string,
): Promise<void> {
  const header = pageOrDrawer.locator("th").filter({ hasText: columnName }).first();
  await expect(header).toBeVisible({ timeout: 5000 });
  await expect(header.locator("span").first()).toHaveAttribute("style", /rgb\(249, 108, 91\)/);
}

export async function expectDetailTitle(page: Page, titleText: string): Promise<void> {
  const drawer = page.locator(".ant-drawer:visible, .dtc-drawer:visible").last();
  await expect(drawer).toContainText(titleText, { timeout: 5000 });
}

export { getRulePackage, getRuleSetListRow, saveRuleSet };
