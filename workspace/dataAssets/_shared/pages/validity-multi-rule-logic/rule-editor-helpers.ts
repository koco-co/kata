// rule-editor-helpers.ts — 「有效性多规则且或关系(#15695)」规则集编辑器页面对象
//
// 覆盖【数据质量 → 规则集管理】列表、规则集编辑向导（Step1 基础信息 / Step2 监控规则）
// 与【规则库配置】入口。选择器模式对齐同区域既有页面对象
// （2099-01-lt-dq-main-flow/data-quality-page.ts、2026-06-dq-starrocks3x/starrocks3x-quality-page.ts）。
//
// 注意：本文件按 19 个调用点文件的契约重建；其中规则集描述命名映射、缺失规则集自动补建
// 等语义标注为「按调用点契约重建，未经 live 验证」。

import { expect, type Locator, type Page } from "@playwright/test";

import {
  expectAntMessage,
  selectAntOption,
  waitForTableLoaded,
  waitForUiSettled,
} from "../../helpers/index";
import { buildDataAssetsApiUrl, buildDataAssetsUrl, getEnvConfig } from "../../helpers/test-setup";

const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";
const DQ_PROJECT_STORAGE_KEY = "dq_project_id";
const initializedPages = new WeakSet<Page>();

/** 规则集编辑页内规则包区块与规则表单的稳定 class（由前端 ruleSetMonitor/ruleForm 约定）。 */
const PACKAGE_SECTION_SELECTOR = ".ruleSetMonitor__package";
const RULE_FORM_SELECTOR = ".ruleForm";
const FUNCTION_ROW_SELECTOR = ".rule__function-list__item";

type DqApiResponse<T> = {
  code?: number;
  message?: string | null;
  data?: T;
  success?: boolean;
};

/** 规则集列表记录（字段名按接口常见返回兼容取值）。 */
type RuleSetRecord = {
  id?: string | number;
  tableName?: string;
  description?: string;
  ruleSetDesc?: string;
  ruleSetName?: string;
  name?: string;
};

type RuleSetPageData = {
  records?: RuleSetRecord[];
  data?: RuleSetRecord[];
  list?: RuleSetRecord[];
  total?: number;
};

/** 取值范围配置：第一段操作符 + 期望值，可经「且/或」拼接第二段。 */
export interface RangeConditionConfig {
  readonly firstOperator: string;
  readonly firstValue: string;
  readonly condition?: string;
  readonly secondOperator?: string;
  readonly secondValue?: string;
}

/** configureRangeEnumRule 的完整规则配置项（未传的字段保持不填，用于负向用例）。 */
export interface RangeEnumRuleConfig {
  readonly field: string;
  readonly functionName?: string;
  readonly range?: RangeConditionConfig;
  readonly enumOperator?: string;
  readonly enumValues?: readonly string[];
  readonly relation?: string;
  readonly ruleStrength?: string;
  readonly description?: string;
}

/**
 * 包名 → 规则集标识（列表中以「规则集描述」列展示）映射。
 * 实现按调用点契约重建，未经 live 验证：t01/t02 以包名建规则集后断言对应标识行可见。
 */
const PACKAGE_TO_RULESET_NAME: Readonly<Record<string, string>> = {
  且关系校验包: "ruleset_15695_and",
  或关系校验包: "ruleset_15695_or",
};

/**
 * 规则集标识 → 关联表映射（本需求既有场景登记）。
 * 实现按调用点契约重建，未经 live 验证：供 openRuleSetEditor 在规则集缺失时自动补建。
 */
const RULESET_TABLE_BY_NAME: Readonly<Record<string, string>> = {
  ruleset_15695_and: "quality_test_num",
  ruleset_15695_or: "quality_test_num",
  ruleset_15695_range: "quality_test_num",
  ruleset_15695_enum: "quality_test_num",
  ruleset_15695_notin: "quality_test_num",
  ruleset_15695_enum_orig: "quality_test_num",
  ruleset_15695_weak: "quality_test_num",
  ruleset_15695_filter: "quality_test_num",
  ruleset_15695_str: "quality_test_str",
  ruleset_15695_sample: "quality_test_sample",
  ruleset_15695_partition: "quality_test_partition",
  ruleset_15695_enum_pass: "quality_test_enum_pass",
  ruleset_15695_enum_fail: "quality_test_num",
  ruleset_15695_enum_notin_fail: "quality_test_num",
};

/** 当前质量项目 id（取自 env profile，随环境切换；勿硬编码）。 */
export function getQualityProjectId(): number {
  return getEnvConfig().projects.quality.id;
}

function getQualityProjectName(): string {
  return getEnvConfig().projects.quality.name;
}

async function ensureProjectInit(page: Page): Promise<void> {
  if (initializedPages.has(page)) return;
  await page.addInitScript(
    ([assetKey, dqKey, id]) => {
      sessionStorage.setItem(assetKey, id);
      sessionStorage.setItem(dqKey, id);
      localStorage.setItem("currentProject", id);
    },
    [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(getQualityProjectId())],
  );
  initializedPages.add(page);
}

async function injectProjectContext(page: Page): Promise<void> {
  await page.evaluate(
    ([assetKey, dqKey, id]) => {
      sessionStorage.setItem(assetKey, id);
      sessionStorage.setItem(dqKey, id);
      localStorage.setItem("currentProject", id);
    },
    [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(getQualityProjectId())],
  );
}

/** 进入数据质量指定路由并完成项目上下文注入（所有页面导航的统一入口）。 */
export async function gotoDataQualityPage(page: Page, path: string): Promise<void> {
  await ensureProjectInit(page);
  await page.goto(buildDataAssetsUrl(path, getQualityProjectId()), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await injectProjectContext(page);
  expect(page.url(), `应保持在 DataAssets ${path} 路由`).toContain(`#${path}`);
  await expect(
    page.locator("body"),
    `项目选择器应显示 ${getQualityProjectName()}`,
  ).toContainText(getQualityProjectName(), { timeout: 30000 });
}

/** 调用数据质量 POST API（统一携带质量项目请求头与中文语言头）。 */
async function postQualityApi<T>(
  page: Page,
  path: string,
  data: Record<string, unknown> = {},
): Promise<DqApiResponse<T>> {
  const response = await page.request.post(buildDataAssetsApiUrl(path), {
    data,
    headers: {
      "Accept-Language": "zh-CN",
      [PROJECT_STORAGE_KEY]: String(getQualityProjectId()),
    },
    timeout: 60000,
  });
  expect(response.ok(), `${path} HTTP 状态应成功`).toBe(true);
  return (await response.json()) as DqApiResponse<T>;
}

/** 分页查询规则集列表记录（容忍 records/data/list 三种返回结构）。 */
async function queryRuleSetRecords(page: Page): Promise<RuleSetRecord[]> {
  const payload = await postQualityApi<RuleSetPageData>(
    page,
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
    { current: 1, size: 100 },
  );
  const data = payload.data;
  return data?.records ?? data?.data ?? data?.list ?? [];
}

/** 按标识（描述/名称）查找规则集记录；未找到返回 null。 */
async function findRuleSetRecordByName(page: Page, ruleSetName: string): Promise<RuleSetRecord | null> {
  const records = await queryRuleSetRecords(page);
  return (
    records.find((record) =>
      [record.description, record.ruleSetDesc, record.ruleSetName, record.name].some(
        (value) => typeof value === "string" && value.includes(ruleSetName),
      ),
    ) ?? null
  );
}

/** 按表名查找规则集记录；未找到返回 null。 */
async function findRuleSetRecordByTable(page: Page, tableName: string): Promise<RuleSetRecord | null> {
  const records = await queryRuleSetRecords(page);
  return records.find((record) => record.tableName === tableName) ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 默认数据源档案（取 env profile 的 defaultDatasource）。 */
function getDefaultDatasourceProfile() {
  const env = getEnvConfig();
  return env.datasources[env.runtime.defaultDatasource];
}

/** 数据源下拉匹配正则：按档案登记的别名（key/name/batch 名）任意命中。 */
function datasourceOptionPattern(): RegExp {
  const profile = getDefaultDatasourceProfile();
  const aliases = (profile?.aliases ?? []).map(escapeRegExp).filter(Boolean);
  return new RegExp(aliases.length > 0 ? aliases.join("|") : ".*", "i");
}

/** 在 Step1 基础信息表单中按标签选择下拉项（已回显目标值时跳过）。 */
async function selectBasicInfoOption(page: Page, label: RegExp, option: string | RegExp): Promise<void> {
  const formItem = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await expect(formItem, `基础信息应展示表单项 ${label}`).toBeVisible({ timeout: 30000 });
  if (typeof option === "string" && (await formItem.textContent({ timeout: 30000 }))?.includes(option)) {
    return;
  }
  await selectAntOption(page, formItem.locator(".ant-select:visible").first(), option);
}

/** 在指定容器内点击文本完全匹配的单选框（且/或），并断言其进入选中态。 */
async function clickRadioByExactText(scope: Locator, label: string, position: "first" | "last"): Promise<void> {
  const radio = scope
    .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
    .filter({ hasText: new RegExp(`^${escapeRegExp(label)}$`) })
    [position]();
  await expect(radio, `应展示单选项「${label}」`).toBeVisible({ timeout: 30000 });
  await radio.click({ timeout: 30000 });
  await expect(radio, `单选「${label}」应被选中`).toHaveClass(/checked/, { timeout: 10000 });
}

/** 进入【数据质量 → 规则集管理】列表页并等待表格加载完成。 */
export async function gotoRuleSetList(page: Page): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  await waitForTableLoaded(page);
  await expect(page.locator("body"), "规则集管理页应展示「新建规则集」入口").toContainText(
    "新建规则集",
    { timeout: 30000 },
  );
}

/** 进入【数据质量 → 规则库配置】页面（默认落在「内置规则」页签）。 */
export async function gotoRuleBase(page: Page): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleBase");
  await waitForTableLoaded(page);
  await expect(page.locator("body"), "规则库配置页应展示「内置规则」页签").toContainText(
    "内置规则",
    { timeout: 30000 },
  );
}

/** 在规则集管理列表中按标识（规则集描述）定位数据行（同步返回 Locator）。 */
export function getRuleSetListRow(page: Page, ruleSetName: string): Locator {
  return page
    .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
    .filter({ hasText: ruleSetName })
    .first();
}

/**
 * 删除指定表名下的全部规则集（释放「一表一规则集」占用；无匹配时直接返回）。
 * 通过 pageQuery API 判定存在性，经列表行【删除】入口逐个删除。
 */
export async function deleteRuleSetsByTableNames(
  page: Page,
  tableNames: readonly string[],
): Promise<void> {
  for (const tableName of tableNames) {
    for (let guard = 0; guard < 10; guard += 1) {
      const record = await findRuleSetRecordByTable(page, tableName);
      if (!record) break;
      await gotoRuleSetList(page);
      const row = getRuleSetListRow(page, tableName);
      await expect(row, `规则集列表应展示待删除的 ${tableName} 规则集`).toBeVisible({
        timeout: 15000,
      });
      const deleteEntry = row
        .getByRole("button", { name: /删\s*除/ })
        .or(row.getByText("删除", { exact: true }))
        .first();
      await deleteEntry.click({ timeout: 30000 });
      const confirm = page.locator(".ant-popconfirm:visible, .ant-modal:visible").last();
      if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirm
          .getByRole("button", { name: /确\s*定|确\s*认/ })
          .last()
          .click({ timeout: 30000 });
      }
      await waitForUiSettled(page);
    }
    const leftover = await findRuleSetRecordByTable(page, tableName);
    expect(leftover, `表 ${tableName} 下的规则集应删除干净`).toBeNull();
  }
}

/**
 * 新建规则集草稿：列表 → 新建规则集 → Step1 基础信息（数据源/数据库/数据表/描述/规则包）→ 下一步进入 Step2。
 * ruleSetName 不传时按「包名 → 规则集标识」映射推导描述，未知包名回退为 ruleset_<表名>。
 */
export async function createRuleSetDraft(
  page: Page,
  tableName: string,
  packageNames: readonly string[],
  ruleSetName?: string,
): Promise<void> {
  expect(packageNames.length, "新建规则集至少需要一个规则包名称").toBeGreaterThan(0);
  const description =
    ruleSetName ?? PACKAGE_TO_RULESET_NAME[packageNames[0] ?? ""] ?? `ruleset_${tableName}`;

  await gotoRuleSetList(page);
  await page.getByText("新建规则集", { exact: true }).first().click({ timeout: 30000 });
  await expect(page, "新建规则集应进入 /dq/ruleSet/add").toHaveURL(/\/dq\/ruleSet\/add/, {
    timeout: 15000,
  });
  const body = page.locator("body");
  await expect(body, "新建规则集页面应展示「基础信息」").toContainText("基础信息", {
    timeout: 30000,
  });

  await selectBasicInfoOption(page, /数据源/, datasourceOptionPattern());
  const database = getDefaultDatasourceProfile()?.sql.database ?? "pw_test";
  await selectBasicInfoOption(page, /数据库/, new RegExp(escapeRegExp(database), "i"));
  await selectBasicInfoOption(page, /数据表/, tableName);

  const descriptionControl = page
    .locator(".ant-form-item:visible")
    .filter({ hasText: /规则集描述|描述/ })
    .first()
    .locator("textarea, input")
    .first();
  await descriptionControl.fill(description, { timeout: 30000 });
  await expect(descriptionControl, "规则集描述应填入目标值").toHaveValue(description, {
    timeout: 10000,
  });

  const packageInputs = page.getByPlaceholder("请输入规则包名称");
  await expect(packageInputs.first(), "规则包名称输入框应可见").toBeVisible({ timeout: 30000 });
  for (const [index, packageName] of packageNames.entries()) {
    if (index > 0) {
      const addButton = page
        .getByRole("button", { name: /新增规则包|添加规则包|增\s*加|添\s*加/ })
        .first();
      await addButton.click({ timeout: 30000 });
      await expect(packageInputs, `新增规则包后应有 ${index + 1} 个名称输入框`).toHaveCount(
        index + 1,
        { timeout: 10000 },
      );
    }
    await packageInputs.nth(index).fill(packageName, { timeout: 30000 });
    await expect(packageInputs.nth(index), `规则包名称应回显「${packageName}」`).toHaveValue(
      packageName,
      { timeout: 10000 },
    );
  }

  await page
    .getByRole("button", { name: /^下\s*一\s*步$/ })
    .last()
    .click({ timeout: 30000 });
  await expect(body, "下一步后应进入监控规则配置页").toContainText(/添加规则|监控规则/, {
    timeout: 30000,
  });
}

/** 在规则集编辑页定位规则包区块（等待可见后返回 Locator）。 */
export async function getRulePackage(page: Page, packageName: string): Promise<Locator> {
  const section = page
    .locator(PACKAGE_SECTION_SELECTOR)
    .filter({ hasText: packageName })
    .first();
  await expect(section, `应展示规则包「${packageName}」`).toBeVisible({ timeout: 30000 });
  return section;
}

/** 确保编辑页存在指定规则包（缺失时经「新增规则包」补齐）。 */
async function ensureRulePackages(page: Page, packageNames: readonly string[]): Promise<void> {
  for (const packageName of packageNames) {
    const existing = page
      .locator(PACKAGE_SECTION_SELECTOR)
      .filter({ hasText: packageName })
      .first();
    if (await existing.isVisible({ timeout: 3000 }).catch(() => false)) continue;
    const addButton = page
      .getByRole("button", { name: /新增规则包|添加规则包|增\s*加|添\s*加/ })
      .first();
    await expect(addButton, "监控规则配置页应展示新增规则包入口").toBeVisible({ timeout: 30000 });
    await addButton.click({ timeout: 30000 });
    const nameInput = page.getByPlaceholder("请输入规则包名称").last();
    await expect(nameInput, "新增规则包后应出现名称输入框").toBeVisible({ timeout: 10000 });
    await nameInput.fill(packageName, { timeout: 30000 });
    await nameInput.press("Tab", { timeout: 30000 });
    await waitForUiSettled(page);
    await expect(
      page.locator(PACKAGE_SECTION_SELECTOR).filter({ hasText: packageName }).first(),
      `补建后应展示规则包「${packageName}」`,
    ).toBeVisible({ timeout: 10000 });
  }
}

/**
 * 打开指定规则集的编辑页（Step2 监控规则）。
 * 规则集存在时经 pageQuery API 定位后直接跳转编辑路由；缺失时按登记表自动补建
 * （补建语义按调用点契约重建，未经 live 验证）。packageNames 用于确保目标规则包存在。
 */
export async function openRuleSetEditor(
  page: Page,
  ruleSetName: string,
  packageNames: readonly string[] = [],
): Promise<void> {
  const record = await findRuleSetRecordByName(page, ruleSetName);
  if (!record?.id) {
    const tableName = RULESET_TABLE_BY_NAME[ruleSetName];
    expect(tableName, `未登记的规则集「${ruleSetName}」无法自动补建（缺少关联表映射）`).toBeTruthy();
    await createRuleSetDraft(
      page,
      tableName as string,
      packageNames.length > 0 ? packageNames : [`${ruleSetName}包`],
      ruleSetName,
    );
    return;
  }

  await gotoDataQualityPage(page, `/dq/ruleSet/edit/${record.id}?projectId=${getQualityProjectId()}`);
  const body = page.locator("body");
  await expect(body, `规则集「${ruleSetName}」编辑页应打开`).toContainText(
    /编辑规则集|监控规则|基础信息/,
    { timeout: 30000 },
  );
  if (
    !(await page
      .getByText("添加规则", { exact: true })
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false))
  ) {
    await page
      .getByRole("button", { name: /^下\s*一\s*步$/ })
      .last()
      .click({ timeout: 30000 });
  }
  await expect(body, `规则集「${ruleSetName}」应进入监控规则配置页`).toContainText("添加规则", {
    timeout: 30000,
  });
  await ensureRulePackages(page, packageNames);
}

/**
 * 仅保留指定规则包，删除编辑页中的其他规则包（保留顺序无关）。
 * 删除入口优先取区块内【删除】按钮，兜底删除图标；气泡/弹窗确认统一处理。
 */
export async function keepOnlyRulePackages(page: Page, keepNames: readonly string[]): Promise<void> {
  for (let guard = 0; guard < 10; guard += 1) {
    const sections = page.locator(PACKAGE_SECTION_SELECTOR);
    const count = await sections.count();
    let removed = false;
    for (let index = 0; index < count; index += 1) {
      const section = sections.nth(index);
      const text = (await section.innerText({ timeout: 10000 }).catch(() => "")) ?? "";
      if (keepNames.some((name) => text.includes(name))) continue;
      const deleteEntry = section.getByRole("button", { name: /删\s*除/ }).first();
      if (await deleteEntry.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteEntry.click({ timeout: 30000 });
      } else {
        await section
          .locator(".anticon-delete, [class*='delete']")
          .first()
          .click({ timeout: 30000 });
      }
      const confirm = page.locator(".ant-popconfirm:visible, .ant-modal:visible").last();
      if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirm
          .getByRole("button", { name: /确\s*定|确\s*认/ })
          .last()
          .click({ timeout: 30000 });
      }
      await waitForUiSettled(page);
      removed = true;
      break;
    }
    if (!removed) return;
  }
  throw new Error(`保留规则包 ${keepNames.join("/")} 失败：仍存在未删除的规则包`);
}

/**
 * 在指定规则包中新增一条规则并返回规则表单 Locator。
 * ruleType 为规则分类（默认「有效性校验」），分类菜单项兼容带/不带「校验」后缀两种文案。
 */
export async function addRuleToPackage(
  page: Page,
  packageName: string,
  ruleType = "有效性校验",
): Promise<Locator> {
  const packageSection = await getRulePackage(page, packageName);
  const beforeCount = await packageSection.locator(RULE_FORM_SELECTOR).count();
  const addEntry = packageSection
    .getByRole("button", { name: /新增规则|添加规则/ })
    .first();
  await expect(addEntry, `规则包「${packageName}」应展示新增规则入口`).toBeVisible({
    timeout: 30000,
  });
  await addEntry.click({ timeout: 30000 });

  const typePattern = new RegExp(`^${escapeRegExp(ruleType.replace(/校验$/, ""))}(校验)?$`);
  const menuScope = page
    .locator(".ant-select-dropdown:visible, .ant-dropdown:visible, .ant-modal:visible")
    .last();
  const scopedEntry = menuScope.getByText(typePattern).last();
  const typeEntry = (await scopedEntry.isVisible({ timeout: 3000 }).catch(() => false))
    ? scopedEntry
    : page.getByText(typePattern).last();
  await expect(typeEntry, `新增规则应可选择「${ruleType}」分类`).toBeVisible({ timeout: 10000 });
  await typeEntry.click({ timeout: 30000 });

  await expect(
    packageSection.locator(RULE_FORM_SELECTOR),
    `规则包「${packageName}」应新增一个规则表单`,
  ).toHaveCount(beforeCount + 1, { timeout: 10000 });
  return packageSection.locator(RULE_FORM_SELECTOR).last();
}

/**
 * 在规则表单中选择字段与统计函数，返回统计函数配置行 Locator。
 * functionName 默认为本需求的合并函数「取值范围&枚举范围」。
 */
export async function selectRuleFieldAndFunction(
  page: Page,
  ruleForm: Locator,
  field: string,
  functionName = "取值范围&枚举范围",
): Promise<Locator> {
  const functionRow = ruleForm.locator(FUNCTION_ROW_SELECTOR).first();
  await expect(functionRow, "规则表单应展示统计函数配置行").toBeVisible({ timeout: 30000 });
  const functionSelect = functionRow.locator(".ant-select").first();
  await selectAntOption(page, functionSelect, functionName);
  await expect(functionSelect, `统计函数应选中「${functionName}」`).toContainText(functionName, {
    timeout: 10000,
  });

  const fieldSelect = ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /^字段/ })
    .locator(".ant-select:visible")
    .first();
  await selectAntOption(page, fieldSelect, field);
  await expect(ruleForm, `规则表单应选中字段「${field}」`).toContainText(field, {
    timeout: 10000,
  });
  return functionRow;
}

/**
 * 配置「取值范围&枚举范围」合并规则（也可经 functionName 退化为单取值范围/枚举值规则）。
 * 仅填写传入的配置项，未传字段保持空态（供校验拦截类负向用例使用）；返回统计函数配置行。
 * 统计函数行内下拉序位：0=统计函数，1=取值范围操作符一，2=取值范围操作符二，3=枚举值操作符，4=枚举值。
 */
export async function configureRangeEnumRule(
  page: Page,
  ruleForm: Locator,
  config: RangeEnumRuleConfig,
): Promise<Locator> {
  const functionRow = await selectRuleFieldAndFunction(page, ruleForm, config.field, config.functionName);
  const selects = functionRow.locator(".ant-select");

  if (config.range) {
    await selectAntOption(page, selects.nth(1), config.range.firstOperator);
    await functionRow.getByPlaceholder("请输入数值").first().fill(config.range.firstValue);
    if (config.range.condition) {
      // 取值范围两段之间的「且/或」单选（行内第一组匹配，最后一组为取值范围-枚举值关系）
      await clickRadioByExactText(functionRow, config.range.condition, "first");
      if (config.range.secondOperator) {
        await selectAntOption(page, selects.nth(2), config.range.secondOperator);
      }
      if (config.range.secondValue) {
        await functionRow.getByPlaceholder("请输入数值").nth(1).fill(config.range.secondValue);
      }
    }
  }

  if (config.enumOperator) {
    await selectAntOption(page, selects.nth(3), config.enumOperator);
  }
  if (config.enumValues && config.enumValues.length > 0) {
    const enumInput = selects.nth(4).locator("input").last();
    for (const value of config.enumValues) {
      await enumInput.fill(value);
      await page.keyboard.press("Enter");
      await waitForUiSettled(page);
    }
  }

  if (config.relation) {
    await selectRuleRelation(ruleForm, config.relation);
  }
  if (config.ruleStrength) {
    const strengthField = ruleForm
      .locator(".ant-form-item:visible")
      .filter({ hasText: /强弱规则/ })
      .last();
    await expect(strengthField, "规则表单应展示强弱规则配置项").toBeVisible({ timeout: 30000 });
    if (!(await strengthField.textContent({ timeout: 30000 }))?.includes(config.ruleStrength)) {
      await selectAntOption(page, strengthField.locator(".ant-select").first(), config.ruleStrength);
      await expect(strengthField, `强弱规则应选中「${config.ruleStrength}」`).toContainText(
        config.ruleStrength,
        { timeout: 10000 },
      );
    }
  }
  if (config.description) {
    const descriptionControl = ruleForm
      .locator('textarea[placeholder*="规则描述"]:visible, input[placeholder*="规则描述"]:visible')
      .last();
    await descriptionControl.fill(config.description, { timeout: 30000 });
    await expect(descriptionControl, "规则描述应填入目标值").toHaveValue(config.description, {
      timeout: 10000,
    });
  }
  return functionRow;
}

/** 选择取值范围与枚举值之间的且/或关系（行内最后一组匹配单选）。 */
export async function selectRuleRelation(ruleForm: Locator, relation: string): Promise<void> {
  await clickRadioByExactText(ruleForm, relation, "last");
}

/** 展开指定 Select 并收集全部选项文本（读取后按 Escape 收起下拉）。 */
export async function getSelectOptions(page: Page, select: Locator): Promise<string[]> {
  await select.click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown.locator(".ant-select-item-option").first(), "下拉应展示至少一个选项").toBeVisible({
    timeout: 10000,
  });
  const options = await dropdown
    .locator(".ant-select-item-option-content")
    .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean));
  await page.keyboard.press("Escape");
  return options;
}

/** 克隆规则表单（规则区域右上角【克隆】入口），克隆结果由调用方断言。 */
export async function cloneRule(ruleForm: Locator): Promise<void> {
  const cloneEntry = ruleForm.getByRole("button", { name: /克\s*隆/ }).first();
  if (await cloneEntry.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cloneEntry.click({ timeout: 30000 });
  } else {
    await ruleForm
      .locator(".anticon-copy, .anticon-block, [class*='clone'], [class*='copy']")
      .first()
      .click({ timeout: 30000 });
  }
  await waitForUiSettled(ruleForm.page());
}

/** 删除规则表单（【删除】按钮或删除图标），气泡/弹窗确认统一处理。 */
export async function deleteRule(page: Page, ruleForm: Locator): Promise<void> {
  const deleteEntry = ruleForm.getByRole("button", { name: /删\s*除/ }).first();
  if (await deleteEntry.isVisible({ timeout: 3000 }).catch(() => false)) {
    await deleteEntry.click({ timeout: 30000 });
  } else {
    await ruleForm
      .locator(".anticon-delete, [class*='delete']")
      .first()
      .click({ timeout: 30000 });
  }
  const confirm = page.locator(".ant-popconfirm:visible, .ant-modal:visible").last();
  if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirm
      .getByRole("button", { name: /确\s*定|确\s*认/ })
      .last()
      .click({ timeout: 30000 });
  }
  await waitForUiSettled(page);
}

/**
 * 保存规则集：先保存规则表单内的规则行（存在多个保存按钮时），再点击页面底部保存。
 * 成功信号为「保存成功」提示或自动返回规则集列表；未自动返回时显式回到列表页。
 */
export async function saveRuleSet(page: Page): Promise<void> {
  const saveButtons = page.getByRole("button", { name: /^保\s*存$/ });
  const count = await saveButtons.count();
  expect(count, "规则集编辑页应展示保存按钮").toBeGreaterThan(0);
  if (count > 1) {
    await saveButtons.first().click({ timeout: 30000 });
    await waitForUiSettled(page);
  }
  await saveButtons.last().click({ timeout: 30000 });

  const messageSeen = expectAntMessage(page, /成功/, 20000)
    .then(() => true)
    .catch(() => false);
  const redirected = page
    .waitForURL(/\/dq\/ruleSet(\?|#|$)/, { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  const saved = await Promise.race([messageSeen, redirected]);
  await Promise.allSettled([messageSeen, redirected]);
  expect(saved, "保存规则集应提示成功或返回规则集列表").toBe(true);

  if (/\/dq\/ruleSet\/(add|edit)/.test(page.url())) {
    await gotoRuleSetList(page);
  }
}
