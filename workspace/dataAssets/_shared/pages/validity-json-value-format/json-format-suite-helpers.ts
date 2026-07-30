// json-format-suite-helpers.ts — 「有效性-json value格式校验」套件级辅助
//
// 面向 describeByDatasource 参数化用例（t06-t11、t20-t21 等）的高层流程：
// - prepareJsonRuleSetDraft：前置条件 + 校验key 种子 + 规则集草稿一步到位
// - addJsonFormatRule：添加并配置「格式-json格式校验」规则
// - 校验key 下拉/标签/勾选状态读取、value格式预览弹窗
// - openScenarioRuleSetPackage：按场景重开规则集编辑页并定位规则包
// 本目录为 validity-json-value-format feature 绑定目录，场景常量取自该 feature 的 fixtures。

import { expect, type Locator, type Page } from "@playwright/test";

import {
  getCurrentDatasource,
  getJsonValidationDataSourceType,
  JSON_KEY_PRESETS,
  type JsonRuleScenario,
  type JsonValidationSeed,
  runSuitePreconditions,
} from "../../../features/v6.4.10/【岚图汽车】【数据质量】有效性JSONValue格式校验/automation/tests/fixtures/test-data";
import { waitForUiSettled } from "../../helpers/index";
import { selectAntOption } from "../../helpers/test-setup";
import {
  clickCompactButton,
  getRulePackageSection,
  getValidationKeyDropdown,
  getValidationKeySelect,
  gotoDqPage,
  openValidationKeyTreeDropdown,
  pickValidationKeys,
  postDqApi,
  qualityProjectId,
  setRuleStrength,
} from "./rule-editor-base";
import {
  addRuleToPackage,
  createRuleSetDraft,
  JSON_FORMAT_FUNCTION_NAME,
  type MonitorDatasourceConfig,
} from "./json-format-utils";

/** 校验key 预设名（feature fixtures 中 JSON_KEY_PRESETS 的键）。 */
export type JsonKeyPresetName = keyof typeof JSON_KEY_PRESETS;

/** 当前数据源对应的监控数据源选择配置（供 createRuleSetDraft 使用）。 */
export function currentMonitorDatasource(): MonitorDatasourceConfig {
  const datasource = getCurrentDatasource();
  return {
    envKey: datasource.id === "doris3.x" ? "doris" : "sparkthrift",
    optionPattern: datasource.optionPattern,
    database: datasource.database,
  };
}

// ── 校验key 种子 ─────────────────────────────────────────────

type JsonValidationRecord = {
  id?: string | number;
  jsonKey?: string;
  name?: string | null;
  value?: string | null;
  dataSourceType?: number;
  children?: JsonValidationRecord[];
};

type JsonValidationTreePage = {
  data?: JsonValidationRecord[];
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
};

const seededKeyPresets = new Set<string>();

/** 拉取 json格式校验管理 的 key 树（分页直到短页）。 */
async function fetchValidationKeyTree(page: Page): Promise<JsonValidationRecord[]> {
  const records: JsonValidationRecord[] = [];
  for (let currentPage = 1; currentPage <= 20; currentPage += 1) {
    const data = await postDqApi<JsonValidationTreePage>(
      page,
      "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
      { currentPage, pageSize: 100 },
    );
    const pageRecords = data?.data ?? [];
    records.push(...pageRecords);
    if (pageRecords.length < 100) break;
  }
  return records;
}

/** 以「/」连接的路径为键拍平 key 树。 */
function flattenValidationKeyTree(
  records: readonly JsonValidationRecord[],
  parentPath: readonly string[] = [],
): Map<string, JsonValidationRecord> {
  const map = new Map<string, JsonValidationRecord>();
  for (const record of records) {
    const path = [...parentPath, record.jsonKey ?? ""];
    map.set(path.join("/"), record);
    for (const [childPath, child] of flattenValidationKeyTree(record.children ?? [], path)) {
      map.set(childPath, child);
    }
  }
  return map;
}

/**
 * 按预设种子确保校验key 已配置（已存在的层级跳过；缺失的逐级创建，叶子带上 value格式）。
 * 创建接口的请求体按调用点契约重建，未经 live 验证。
 */
export async function ensureJsonValidationKeysSeeded(
  page: Page,
  keyPresets: readonly JsonKeyPresetName[],
): Promise<void> {
  const datasource = getCurrentDatasource();
  const dataSourceType = getJsonValidationDataSourceType(datasource);
  for (const preset of keyPresets) {
    const cacheKey = `${datasource.cacheKey}:${preset}`;
    if (seededKeyPresets.has(cacheKey)) continue;
    await seedValidationKeys(page, JSON_KEY_PRESETS[preset], dataSourceType);
    seededKeyPresets.add(cacheKey);
  }
}

async function seedValidationKeys(
  page: Page,
  seeds: readonly JsonValidationSeed[],
  dataSourceType: number,
): Promise<void> {
  // 汇总每个路径层级期望的名称与 value格式（value 仅精确匹配该层级的种子提供）。
  const desired = new Map<string, { name: string; value?: string }>();
  for (const seed of seeds) {
    for (let depth = 1; depth <= seed.path.length; depth += 1) {
      const prefix = seed.path.slice(0, depth);
      const pathKey = prefix.join("/");
      const exactSeed = depth === seed.path.length ? seed : undefined;
      const existing = desired.get(pathKey);
      desired.set(pathKey, {
        name: existing?.name ?? prefix.join("-"),
        value: existing?.value ?? exactSeed?.value,
      });
    }
  }

  const existingTree = flattenValidationKeyTree(await fetchValidationKeyTree(page));
  const createdByPath = new Map<string, JsonValidationRecord>();

  const orderedPaths = [...desired.keys()].sort(
    (left, right) => left.split("/").length - right.split("/").length,
  );
  for (const pathKey of orderedPaths) {
    const segments = pathKey.split("/");
    const parentPath = segments.slice(0, -1).join("/");
    const parent =
      parentPath.length > 0
      ? (createdByPath.get(parentPath) ?? existingTree.get(parentPath))
      : undefined;
    const cached = createdByPath.get(pathKey) ?? existingTree.get(pathKey);
    if (cached) {
      createdByPath.set(pathKey, cached);
      continue;
    }
    const leaf = desired.get(pathKey);
    const created = await postDqApi<JsonValidationRecord>(
      page,
      "/dassets/v1/valid/jsonValidationConfig/add",
      {
        jsonKey: segments[segments.length - 1],
        name: leaf?.name ?? segments.join("-"),
        value: leaf?.value ?? "",
        dataSourceType,
        ...(parent?.id !== undefined ? { parentId: parent.id } : {}),
      },
    );
    createdByPath.set(pathKey, created ?? { jsonKey: segments[segments.length - 1] });
  }
}

// ── 规则集草稿与规则配置 ─────────────────────────────────────

/**
 * 准备 json 规则集草稿：执行套件前置条件（建表）、按预设种子校验key、创建规则集草稿并进入监控规则步骤。
 */
export async function prepareJsonRuleSetDraft(
  page: Page,
  tableName: string,
  packageName: string,
  keyPresets?: readonly JsonKeyPresetName[],
): Promise<void> {
  const datasource = getCurrentDatasource();
  await runSuitePreconditions(page, datasource);
  if (keyPresets && keyPresets.length > 0) {
    await ensureJsonValidationKeysSeeded(page, keyPresets);
  }
  await createRuleSetDraft(page, tableName, [packageName], currentMonitorDatasource());
}

/** addJsonFormatRule 的规则配置项。 */
export interface AddJsonFormatRuleOptions {
  /** 字段名（json/string 类型字段，如 "info"）。 */
  readonly field: string;
  /** 待勾选的校验key 名集合。 */
  readonly selectedKeyPaths?: readonly string[];
  /** 强弱规则；缺省保持编辑器默认。 */
  readonly ruleStrength?: "强规则" | "弱规则";
}

/**
 * 在规则包中添加「有效性校验」规则并配置「格式-json格式校验」（字段/校验key/强弱规则），返回规则表单。
 */
export async function addJsonFormatRule(
  page: Page,
  packageName: string,
  options: AddJsonFormatRuleOptions,
): Promise<Locator> {
  const ruleForm = await addRuleToPackage(page, packageName, "有效性校验");

  const fieldSelect = ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /字段/ })
    .locator(".ant-select")
    .first();
  await selectAntOption(page, fieldSelect, options.field);
  await waitForUiSettled(page);

  const functionRow = ruleForm.locator(".rule__function-list__item").first();
  const functionSelect = functionRow.locator(".ant-select").first();
  await selectAntOption(page, functionSelect, JSON_FORMAT_FUNCTION_NAME);
  await waitForUiSettled(page);

  if (options.selectedKeyPaths && options.selectedKeyPaths.length > 0) {
    await pickValidationKeys(page, ruleForm, options.selectedKeyPaths);
  }
  if (options.ruleStrength) {
    await setRuleStrength(page, ruleForm, options.ruleStrength);
  }
  return ruleForm;
}

// ── 校验key 下拉读取 ─────────────────────────────────────────

/** 展开校验key下拉树全部可展开节点（叶子 key 默认折叠在父层级下）。 */
async function expandValidationKeyTreeNodes(page: Page, dropdown: Locator): Promise<void> {
  for (let pass = 0; pass < 3; pass += 1) {
    const switchers = dropdown.locator(".ant-select-tree-switcher, .ant-tree-switcher");
    const count = await switchers.count().catch(() => 0);
    let expanded = false;
    for (let index = 0; index < count; index += 1) {
      const switcher = switchers.nth(index);
      const className = (await switcher.getAttribute("class")) ?? "";
      if (/open|noop/.test(className)) continue;
      await switcher.click({ force: true }).catch(() => undefined);
      await waitForUiSettled(page);
      expanded = true;
    }
    if (!expanded) break;
  }
}

/**
 * 打开规则表单的校验key下拉并展开全部层级，返回下拉浮层。
 */
export async function openValidationKeyDropdown(page: Page, ruleForm: Locator): Promise<Locator> {
  const dropdown = await openValidationKeyTreeDropdown(page, ruleForm);
  await expandValidationKeyTreeNodes(page, dropdown);
  return dropdown;
}

/**
 * 在已打开的校验key下拉中输入关键字搜索，返回下拉浮层。
 */
export async function searchValidationKey(page: Page, keyword: string): Promise<Locator> {
  const dropdown = getValidationKeyDropdown(page);
  await expect(dropdown, "校验key下拉应处于打开状态").toBeVisible({ timeout: 30000 });
  const searchInput = dropdown.locator("input:visible").last();
  await expect(searchInput, "校验key下拉应展示搜索输入框").toBeVisible({ timeout: 30000 });
  await searchInput.fill(keyword, { timeout: 30000 });
  await waitForUiSettled(page);
  return dropdown;
}

/**
 * 读取校验key下拉中全部可见节点标签（配合虚拟列表滚动收集，默认仅渲染前 200 条）。
 */
export async function getValidationKeyLabels(page: Page): Promise<string[]> {
  const dropdown = getValidationKeyDropdown(page);
  await expect(dropdown, "校验key下拉应处于打开状态").toBeVisible({ timeout: 30000 });
  const labels = new Set<string>();
  const holder = dropdown.locator(".rc-virtual-list-holder").first();
  for (let pass = 0; pass < 30; pass += 1) {
    const sizeBefore = labels.size;
    const texts = await dropdown
      .locator(".ant-select-tree-title, .ant-tree-title")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.textContent?.trim() ?? "").filter((text) => text.length > 0),
      );
    for (const text of texts) labels.add(text);
    if (!(await holder.isVisible({ timeout: 1000 }).catch(() => false))) break;
    await holder.evaluate((el) => {
      el.scrollTop += 240;
    });
    await waitForUiSettled(page);
    if (labels.size === sizeBefore) break;
  }
  return [...labels];
}

/**
 * 读取规则表单中已勾选校验key 的回显标签（含折叠的「+N」溢出标签）。
 */
export async function getSelectedValidationKeyTexts(ruleForm: Locator): Promise<string[]> {
  const keySelect = getValidationKeySelect(ruleForm);
  return keySelect
    .locator(".ant-select-selection-item, .ant-select-selection-overflow-item-suffix")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.textContent?.trim() ?? "").filter((text) => text.length > 0),
    );
}

/** 校验key 在下拉树中的勾选/禁用状态。 */
export interface ValidationKeyState {
  readonly checked: boolean;
  readonly disabled: boolean;
}

/**
 * 读取指定校验key 在已打开下拉中的勾选状态（先按 key 名搜索以穿透 200 条渲染上限）。
 */
export async function getValidationKeyState(
  page: Page,
  keyName: string,
): Promise<ValidationKeyState> {
  const dropdown = getValidationKeyDropdown(page);
  await expect(dropdown, "校验key下拉应处于打开状态").toBeVisible({ timeout: 30000 });
  const searchInput = dropdown.locator("input:visible").last();
  if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await searchInput.fill(keyName);
    await waitForUiSettled(page);
  }
  const node = dropdown
    .locator(".ant-select-tree-treenode, .ant-tree-treenode")
    .filter({ hasText: keyName })
    .first();
  await expect(node, `校验key下拉应包含「${keyName}」`).toBeVisible({ timeout: 30000 });
  const checkbox = node.locator(".ant-select-tree-checkbox, .ant-tree-checkbox").first();
  const checked = await checkbox
    .evaluate((el) => el.className.includes("-checked"))
    .catch(() => false);
  const disabled = await node.evaluate((el) => el.className.includes("-disabled")).catch(() => false);
  return { checked, disabled };
}

/**
 * 点击规则表单中的「value格式预览」入口，返回预览弹窗。
 * 实现按调用点契约重建，未经 live 验证。
 */
export async function openValueFormatPreview(page: Page, ruleForm: Locator): Promise<Locator> {
  const entry = ruleForm
    .getByRole("button", { name: /value格式预览/ })
    .first()
    .or(ruleForm.getByText(/value格式预览/).first())
    .or(page.getByText(/value格式预览/).first());
  await expect(entry, "规则表单应展示「value格式预览」入口").toBeVisible({ timeout: 30000 });
  await entry.click({ timeout: 30000 });
  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, "「value格式预览」弹窗应打开").toBeVisible({ timeout: 30000 });
  return modal;
}

// ── 场景级规则集/规则库入口 ──────────────────────────────────

type RuleSetPageData = {
  contentList?: Array<{ id?: string | number; tableName?: string }>;
  data?: Array<{ id?: string | number; tableName?: string }>;
};

/** 按表名查询规则集 id（规则集与表一一对应）。 */
async function findRuleSetIdByTableName(page: Page, tableName: string): Promise<string | number> {
  const data = await postDqApi<RuleSetPageData>(page, "/dassets/v1/valid/monitorRuleSet/pageQuery", {
    current: 1,
    size: 100,
  });
  const records = data?.contentList ?? data?.data ?? [];
  const target = records.find((record) => record.tableName === tableName);
  if (!target || target.id === undefined || target.id === null) {
    throw new Error(`规则集列表不存在表「${tableName}」对应的规则集`);
  }
  return target.id;
}

/**
 * 打开场景对应规则集的编辑页并进入监控规则步骤，返回规则包区块（规则呈摘要态时自动展开）。
 * 实现按调用点契约重建，未经 live 验证。
 */
export async function openScenarioRuleSetPackage(
  page: Page,
  scenario: JsonRuleScenario,
): Promise<Locator> {
  const ruleSetId = await findRuleSetIdByTableName(page, scenario.tableName);
  await gotoDqPage(page, `/dq/ruleSet/edit/${ruleSetId}?projectId=${qualityProjectId()}`);
  const body = page.locator("body");
  await expect(body, "规则集编辑页应打开").toContainText("编辑规则集", { timeout: 30000 });
  if (
    !(await page
      .getByText("添加规则", { exact: true })
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false))
  ) {
    await clickCompactButton(page, "下一步");
  }
  await expect(body, "规则集应进入监控规则配置页").toContainText("添加规则", { timeout: 30000 });

  const section = await getRulePackageSection(page, scenario.packageName);
  if (!(await section.locator(".ruleForm").first().isVisible({ timeout: 3000 }).catch(() => false))) {
    const editEntry = section.getByRole("button", { name: /编\s*辑/ }).first();
    if (await editEntry.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editEntry.click({ timeout: 30000 });
      await waitForUiSettled(page);
    }
  }
  return section;
}

/**
 * 打开规则库配置页（/dq/ruleBase）并按规则名称搜索。
 * 实现按调用点契约重建，未经 live 验证。
 */
export async function gotoRuleBaseAndSearch(page: Page, keyword: string): Promise<void> {
  await gotoDqPage(page, "/dq/ruleBase");
  await expect(page.locator("body"), "规则库配置页应展示「导出规则库」").toContainText("导出规则库", {
    timeout: 30000,
  });
  const searchInput = page
    .getByPlaceholder(/规则名称|请输入/)
    .or(page.locator("input[placeholder*='规则']"))
    .first();
  if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await searchInput.fill(keyword, { timeout: 30000 });
    const searchButton = page.getByRole("button", { name: /查\s*询|search/i }).first();
    if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchButton.click({ timeout: 30000 });
    } else {
      await page.keyboard.press("Enter");
    }
    await waitForUiSettled(page);
  }
}
