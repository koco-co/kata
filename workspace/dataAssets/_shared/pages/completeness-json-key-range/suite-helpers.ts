/**
 * suite-helpers.ts — 「完整性 JSON Key 范围校验」规则集场景层页对象
 *
 * 在 key-range-utils 基础层之上组合出场景化能力：
 *   - SCENARIOS 场景常量（主场景 / 校验方法切换 / 校验内容全量 / 失败日志）
 *   - 规则集草稿创建、编辑页打开、幂等落库
 *   - 规则表单细粒度交互（统计函数、字段多选、函数提示、表单错误断言）
 *   - 规则库（内置规则）检索与详情标题断言
 *
 * 说明：本文件按调用点契约重建（目录曾整体缺失），场景表名与 key 名直接引用
 * feature fixtures（fixtures/test-data.ts），保证与前置建表数据一致；
 * 部分交互细节未经 live 验证，已在各函数注释中标注。
 */
import { expect, type Locator, type Page } from "@playwright/test";
import {
  applyRuntimeCookies,
  buildDataAssetsUrl,
  getEnvConfig,
  selectAntOption,
  uniqueName,
  waitForUiSettled,
} from "../../helpers/index";
import {
  getCurrentDatasource,
  KEY_NAMES,
  MAIN_TABLE_NAME,
  METHOD_SWITCH_TABLE_NAME,
  runPreconditions,
} from "../../../features/v6.4.10/【v6410】【岚图汽车】【数据质量】完整性JSONKey范围校验/automation/tests/fixtures/test-data";
import {
  addKeyRangeRule,
  configureKeyRangeRule,
  createRuleSetDraft,
  DORIS_MONITOR_DATASOURCE,
  gotoRuleSetList,
  KEY_RANGE_RULE_NAME,
  type MonitorDatasourceConfig,
  saveRuleSet,
  selectRuleFunction,
  setVerificationContent,
  SPARKTHRIFT_MONITOR_DATASOURCE,
} from "./key-range-utils";

// 契约重导出：部分调用点（t01/t02/t04/t05）从本模块引入这些基础层符号
export { configureKeyRangeRule, KEY_RANGE_RULE_NAME, selectRuleFunction, setVerificationContent };

/** key范围校验场景定义（规则集 + 规则配置 + 前置表） */
export interface KeyRangeScenario {
  /** 场景标识 */
  readonly name: string;
  /** 规则集名称（uniqueName 唯一化防止跨 run 冲突；平台「规则名称」限长 50 字符） */
  readonly ruleSetName: string;
  /** 数据表名（来自 feature fixtures，与前置建表一致） */
  readonly tableName: string;
  /** 规则包名称（沿用 MD 用例固定命名） */
  readonly packageName: string;
  /** 校验字段 */
  readonly field: string;
  /** 校验方法 */
  readonly method: "包含" | "不包含";
  /** 校验内容 key 列表（来自 fixtures KEY_NAMES，与建表 JSON 数据对齐） */
  readonly keyNames: readonly string[];
  /** 强弱规则 */
  readonly ruleStrength: string;
}

/** 场景常量集合 */
export const SCENARIOS = {
  /** 主场景：主表 info 字段，包含 key1/key2（对应 task_json_key_range_test 链路） */
  main: {
    name: "main",
    ruleSetName: uniqueName("rule_set_key_range"),
    tableName: MAIN_TABLE_NAME,
    packageName: "key范围校验测试包",
    field: "info",
    method: "包含",
    keyNames: [KEY_NAMES.k1, KEY_NAMES.k2],
    ruleStrength: "强规则",
  } satisfies KeyRangeScenario,
  /** 校验方法切换场景：独立表独立规则集，便于反复切换 包含/不包含（对应 task_json_method_switch 链路） */
  methodSwitch: {
    name: "methodSwitch",
    ruleSetName: uniqueName("rule_set_method_switch"),
    tableName: METHOD_SWITCH_TABLE_NAME,
    packageName: "method_switch包",
    field: "info",
    method: "包含",
    keyNames: [KEY_NAMES.k1, KEY_NAMES.k2],
    ruleStrength: "强规则",
  } satisfies KeyRangeScenario,
  /** 校验内容全量展示场景：4 个 key（含第二层级 key11/key22），验证展示无截断 */
  contentFull: {
    name: "contentFull",
    ruleSetName: uniqueName("rule_set_key_range_full"),
    tableName: MAIN_TABLE_NAME,
    packageName: "key范围校验测试包",
    field: "info",
    method: "包含",
    keyNames: [KEY_NAMES.k1, KEY_NAMES.k2, KEY_NAMES.k11, KEY_NAMES.k22],
    ruleStrength: "强规则",
  } satisfies KeyRangeScenario,
  /**
   * 失败日志场景：规则引用「已被删除的 key」，执行预期失败以验证日志查看。
   * 注意：key 删除动作依赖环境侧前置操作，本实现仅按契约保留该 key 的规则配置；
   * 若环境中该 key 仍存在于校验内容下拉，任务将正常执行而非失败（未经 live 验证）。
   */
  failLog: {
    name: "failLog",
    ruleSetName: uniqueName("rule_set_key_range_flog"),
    tableName: MAIN_TABLE_NAME,
    packageName: "key范围校验测试包",
    field: "info",
    method: "包含",
    keyNames: [KEY_NAMES.kDeletedRef],
    ruleStrength: "强规则",
  } satisfies KeyRangeScenario,
} as const;

/** 按当前 fixtures 数据源上下文选择监控数据源配置（对齐调用点 t16 的 monitorDs 逻辑） */
function monitorDatasource(): MonitorDatasourceConfig {
  return getCurrentDatasource().id === "doris3.x"
    ? DORIS_MONITOR_DATASOURCE
    : SPARKTHRIFT_MONITOR_DATASOURCE;
}

/**
 * 新建规则集草稿并进入 Step2 监控规则页。
 * 会先执行前置建表（runPreconditions 幂等），再按场景配置走 Step1 基础信息。
 */
export async function startRuleSetDraft(page: Page, scenario: KeyRangeScenario): Promise<void> {
  await runPreconditions(page);
  await gotoRuleSetList(page);
  await createRuleSetDraft(page, scenario.tableName, [scenario.packageName], monitorDatasource());
}

/** 在规则集列表中按名称搜索并返回行 Locator（找不到时返回的 Locator 不可见，由调用方断言） */
async function findRuleSetRow(page: Page, ruleSetName: string): Promise<Locator> {
  const searchInput = page.locator(".ant-input-search input, input[placeholder]").first();
  if (await searchInput.isEditable({ timeout: 3000 }).catch(() => false)) {
    await searchInput.fill(ruleSetName);
    await searchInput.press("Enter");
    await waitForUiSettled(page);
  }
  return page
    .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
    .filter({ hasText: ruleSetName })
    .first();
}

/**
 * 打开已保存场景规则集的编辑页（列表 → 编辑 → Step2 监控规则）。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function openScenarioEditor(page: Page, scenario: KeyRangeScenario): Promise<void> {
  await gotoRuleSetList(page);
  const row = await findRuleSetRow(page, scenario.ruleSetName);
  await expect(row, `规则集列表应存在「${scenario.ruleSetName}」`).toBeVisible({ timeout: 15000 });
  await row
    .getByRole("button", { name: /编辑/ })
    .first()
    .click();
  await waitForUiSettled(page);
  await expect(
    page.locator(".ruleSetMonitor__package, .ruleForm").first(),
    "规则集编辑页应进入 Step 2 监控规则",
  ).toBeVisible({ timeout: 15000 });
}

/**
 * 幂等确保场景规则集已创建并保存（含一条配置完整的 key范围校验规则）。
 * 已存在则直接返回；不存在则走完整 UI 流程：前置建表 → 新建草稿 → 新增规则 → 配置 → 保存。
 */
export async function ensureSavedScenarioRuleSet(
  page: Page,
  scenario: KeyRangeScenario,
): Promise<void> {
  await runPreconditions(page);
  await gotoRuleSetList(page);
  const existing = await findRuleSetRow(page, scenario.ruleSetName);
  if (await existing.isVisible({ timeout: 5000 }).catch(() => false)) {
    return;
  }
  await startRuleSetDraft(page, scenario);
  const ruleForm = await addKeyRangeRule(page, scenario.packageName);
  await configureKeyRangeRule(page, ruleForm, {
    field: scenario.field,
    method: scenario.method,
    keyNames: scenario.keyNames,
    ruleStrength: scenario.ruleStrength,
    description: scenario.ruleSetName,
  });
  await saveRuleSet(page);
  await gotoRuleSetList(page);
  const saved = await findRuleSetRow(page, scenario.ruleSetName);
  await expect(saved, `规则集「${scenario.ruleSetName}」保存后应在列表可见`).toBeVisible({
    timeout: 15000,
  });
}

/**
 * seedScenarioRuleSet 与 ensureSavedScenarioRuleSet 语义一致（幂等准备场景规则集），
 * 保留两个导出名以匹配不同调用点（t02 用 seed*，t15/t36 用 ensureSaved*）。
 */
export async function seedScenarioRuleSet(page: Page, scenario: KeyRangeScenario): Promise<void> {
  await ensureSavedScenarioRuleSet(page, scenario);
}

/**
 * 主场景规则集准备。
 * - force: true 时（t03 步骤2 契约）：先幂等确保规则集已保存，再打开编辑页停留在 Step2 监控规则；
 * - 否则仅幂等确保已保存。
 * （force 分支语义按调用点契约重建，未经 live 验证）
 */
export async function ensureMainScenarioRuleSet(
  page: Page,
  options?: { force?: boolean },
): Promise<void> {
  await ensureSavedScenarioRuleSet(page, SCENARIOS.main);
  if (options?.force) {
    await openScenarioEditor(page, SCENARIOS.main);
  }
}

/**
 * 字段多选：依次在「字段」下拉中选择多个字段（普通统计函数支持多选字段）。
 */
export async function selectFieldValues(
  page: Page,
  ruleForm: Locator,
  fields: readonly string[],
): Promise<void> {
  const fieldSelect = locateFormItemSelect(ruleForm, /^字段/);
  for (const field of fields) {
    await selectAntOption(page, fieldSelect, field);
    await waitForUiSettled(page);
  }
}

/** 按 label 定位规则表单内的下拉 */
function locateFormItemSelect(ruleForm: Locator, label: RegExp): Locator {
  return ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: label })
    .first()
    .locator(".ant-select")
    .first();
}

/**
 * 打开统计函数的提示气泡（hover 表单项旁的问号图标）。
 * 返回可见的 tooltip/popover Locator，由调用方断言提示文案。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function openFunctionTooltip(page: Page, ruleForm: Locator): Promise<Locator> {
  const formItem = ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /统计函数/ })
    .first();
  const icon = formItem
    .locator(".anticon-question-circle, .anticon-info-circle, .anticon")
    .first();
  if (await icon.isVisible({ timeout: 3000 }).catch(() => false)) {
    await icon.hover();
  } else {
    await formItem.hover();
  }
  const tooltip = page.locator(".ant-tooltip:visible, .ant-popover:visible").last();
  await expect(tooltip, "统计函数提示气泡应展开").toBeVisible({ timeout: 5000 });
  return tooltip;
}

/**
 * 断言规则表单出现指定校验错误文案（Ant Design 表单错误区）。
 */
export async function expectRuleError(ruleForm: Locator, message: string): Promise<void> {
  await expect(
    ruleForm
      .locator(".ant-form-item-explain-error, .ant-form-item-has-error .ant-form-item-explain")
      .filter({ hasText: message })
      .first(),
    `规则表单应提示「${message}」`,
  ).toBeVisible({ timeout: 10000 });
}

/**
 * 保存一个预期校验不通过的规则集：仅点击页面底部【保存】触发表单校验，不期望成功提示。
 * 配合 expectRuleError 使用。
 */
export async function saveInvalidRuleSet(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: /^保存$/ })
    .last()
    .click();
  await waitForUiSettled(page);
}

/**
 * 断言失败明细抽屉中恰好只有指定 id 的数据行（按首列 id 比对，顺序无关）。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function assertOnlyTheseDetailRows(
  dataDrawer: Locator,
  ids: readonly number[],
): Promise<void> {
  const rows = dataDrawer.locator(".ant-table-tbody tr:not(.ant-table-measure-row)");
  await expect(rows, `失败明细应恰好 ${ids.length} 行`).toHaveCount(ids.length, {
    timeout: 10000,
  });
  const actual: number[] = [];
  for (let index = 0; index < ids.length; index += 1) {
    const firstCellText = await rows.nth(index).locator("td").first().innerText();
    actual.push(Number(firstCellText.trim()));
  }
  const ascending = (a: number, b: number) => a - b;
  expect([...actual].sort(ascending), "失败明细行 id 集合应与预期一致").toEqual(
    [...ids].sort(ascending),
  );
}

/**
 * 打开【数据质量 → 规则库配置】并切换到「内置规则」页签。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function gotoBuiltInRuleBase(page: Page): Promise<void> {
  const projectId = getEnvConfig().projects.quality.id;
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/dq/ruleBase", projectId), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.evaluate((pid) => {
    sessionStorage.setItem("X-Valid-Project-ID", String(pid));
  }, projectId);
  await waitForUiSettled(page);
  const tab = page.locator(".ant-tabs-tab").filter({ hasText: /内置规则/ }).first();
  if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await tab.click();
    await waitForUiSettled(page);
  }
}

/**
 * 在规则库中按关键字检索规则，返回首个匹配行 Locator。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function searchRuleBaseRule(page: Page, keyword: string): Promise<Locator> {
  const searchInput = page.locator(".ant-input-search input, input[placeholder]").first();
  if (await searchInput.isEditable({ timeout: 3000 }).catch(() => false)) {
    await searchInput.fill(keyword);
    await searchInput.press("Enter");
    await waitForUiSettled(page);
  }
  const row = page
    .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
    .filter({ hasText: keyword })
    .first();
  await expect(row, `规则库应检索到「${keyword}」`).toBeVisible({ timeout: 10000 });
  return row;
}

/**
 * 断言当前打开的详情抽屉标题包含指定文案；抽屉无独立标题区时退化为断言抽屉内容。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function expectDetailTitle(page: Page, text: string): Promise<void> {
  const drawer = page.locator(".ant-drawer:visible, .dtc-drawer:visible").last();
  await expect(drawer, "实例详情抽屉应打开").toBeVisible({ timeout: 10000 });
  const title = drawer.locator(".ant-drawer-title").first();
  if (await title.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(title, `详情标题应包含「${text}」`).toContainText(text);
  } else {
    await expect(drawer, `详情内容应包含「${text}」`).toContainText(text);
  }
}
