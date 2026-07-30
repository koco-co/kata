// json-config-helpers.ts — 「通用配置 → json格式校验管理」页面对象
//
// 覆盖数据质量-通用配置下的 JSON key 管理弹窗与列表操作：
// 进页、搜索/清空、展开行、新增/新增子层级/删除 key、填写 key/中文名称/value格式、
// 切换数据源类型、导入弹窗与导入 xlsx 文件构造。
//
// 选择器口径与同平台既有页面对象一致（Ant Design：.ant-modal/.ant-select/.ant-table），
// 路由与列表结构依据 data-quality-page.ts 中 /dq/generalConfig/jsonValidationConfig 合同。
import { getEnvConfig } from "../../runtime/env-profile";
import { buildDataAssetsUrl } from "../../runtime/env-setup";
import {
  selectAntOption,
  waitForUiSettled,
} from "../../../../../../runtime/automation/playwright/index";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";
import ExcelJS from "exceljs";

const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";
const DQ_PROJECT_STORAGE_KEY = "dq_project_id";
const JSON_CONFIG_PATH = "/dq/generalConfig/jsonValidationConfig";
const initializedPages = new WeakSet<Page>();

/** 新增/编辑 key 时可填的可选字段。 */
export type AddKeyOptions = {
  /** 中文名称。 */
  chineseName?: string;
  /** value 格式（正则）。 */
  valueFormat?: string;
  /** 数据源类型显示名，如 "SparkThrift2.x" / "Hive2.x" / "Doris3.x"。 */
  dataSourceType?: string;
};

/** 新增子层级时可填的可选字段（子层级弹窗无数据源类型）。 */
export type AddChildKeyOptions = {
  /** 中文名称。 */
  chineseName?: string;
  /** value 格式（正则）。 */
  valueFormat?: string;
};

/** 删除 key 的可选行为开关。 */
export type DeleteKeyOptions = {
  /** 为 true 时删除与确认点击均使用 force（行操作按钮被遮挡/规则引用场景兜底）。 */
  force?: boolean;
};

/** 当前质量项目 id（取自 env profile，随环境切换；勿硬编码）。 */
function projectId(): number {
  return getEnvConfig().projects.quality.id;
}

async function ensureProjectInit(page: Page): Promise<void> {
  if (initializedPages.has(page)) return;
  await page.addInitScript(
    ([assetKey, dqKey, id]) => {
      sessionStorage.setItem(assetKey, id);
      sessionStorage.setItem(dqKey, id);
      localStorage.setItem("currentProject", id);
    },
    [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(projectId())],
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
    [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(projectId())],
  );
}

/** 等待列表加载稳定（loading 遮罩消失 + UI 静止）。 */
async function waitForTableSettled(page: Page): Promise<void> {
  await page
    .locator(".ant-spin-spinning")
    .first()
    .waitFor({ state: "hidden", timeout: 15000 })
    .catch(() => undefined);
  await waitForUiSettled(page);
}

/** 按 key 文本定位列表行（调用方需保证行已在当前列表视图中）。 */
function rowByKey(page: Page, key: string): Locator {
  return page.locator(".ant-table-row").filter({ hasText: key }).first();
}

/**
 * 进入「数据质量 → 通用配置 → json格式校验管理」页面并等待容器加载。
 *
 * 注入质量项目上下文后跳转路由，等待 .json-format-check 容器可见。
 */
export async function gotoJsonConfigPage(page: Page): Promise<void> {
  await ensureProjectInit(page);
  await page.goto(buildDataAssetsUrl(JSON_CONFIG_PATH, projectId()), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await injectProjectContext(page);
  expect(page.url(), "应保持在 json格式校验管理 路由").toContain(`#${JSON_CONFIG_PATH}`);
  await expect(
    page.locator(".json-format-check").first(),
    "json格式校验管理页面容器应加载完成",
  ).toBeVisible({ timeout: 15000 });
}

/**
 * 在列表搜索框按 key 名称模糊查询。
 *
 * 搜索框不可见（页面未就绪/空白占位）时回退重新进页再查一次。
 */
export async function searchKey(page: Page, keyword: string): Promise<void> {
  const input = page.locator(".dt-search input").first();
  if (!(await input.isVisible({ timeout: 5000 }).catch(() => false))) {
    await gotoJsonConfigPage(page);
  }
  await input.fill(keyword);
  await page.locator(".dt-search .ant-input-search-button").first().click();
  await waitForTableSettled(page);
}

/** 清空搜索框并重新触发查询，使列表恢复全量展示。 */
export async function clearSearch(page: Page): Promise<void> {
  const input = page.locator(".dt-search input").first();
  await input.fill("");
  await page.locator(".dt-search .ant-input-search-button").first().click();
  await waitForTableSettled(page);
}

/**
 * 搜索并确认指定 key 的列表行可见，返回该行 Locator。
 *
 * 最多重试 3 次，重试间隔重新进入页面（列表大数据量/分页场景兜底）。
 */
export async function ensureRowVisibleByKey(
  page: Page,
  key: string,
  timeout = 15000,
): Promise<Locator> {
  const row = rowByKey(page, key);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await searchKey(page, key);
    if (await row.isVisible({ timeout }).catch(() => false)) {
      return row;
    }
    if (attempt < 3) {
      await gotoJsonConfigPage(page);
    }
  }
  await expect(row, `key「${key}」对应列表行应可见`).toBeVisible({ timeout });
  return row;
}

/**
 * 展开指定 key 的列表行（幂等：已展开或无子层级时不动作）。
 *
 * 仅在展开图标处于 collapsed 状态时点击；Ant Design 固定列会产生影子副本，取第一个。
 */
export async function expandRow(page: Page, key: string): Promise<void> {
  const row = rowByKey(page, key);
  await expect(row, `待展开行「${key}」应可见`).toBeVisible({ timeout: 15000 });
  const collapsedIcon = row.locator(".ant-table-row-expand-icon-collapsed").first();
  if (await collapsedIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
    await collapsedIcon.click();
    await waitForUiSettled(page);
  }
}

/**
 * 等待弹窗出现并返回其 Locator。
 *
 * @param title - 可选，按弹窗标题过滤（如 "新建" / "编辑" / "导入"）；不传时取最后一个可见弹窗。
 */
export async function waitModal(page: Page, title?: string): Promise<Locator> {
  const modals = page.locator(".ant-modal:visible");
  const modal = title
    ? modals.filter({ has: page.locator(".ant-modal-title", { hasText: title }) }).last()
    : modals.last();
  await expect(modal, title ? `「${title}」弹窗应打开` : "弹窗应打开").toBeVisible({
    timeout: 15000,
  });
  return modal;
}

/** 点击页面头部按钮（如 "新增" / "导入"），兼容 Ant Design 按钮字间距。 */
export async function clickHeaderButton(page: Page, name: string): Promise<void> {
  const spacedName = name.split("").join("\\s*");
  const button = page.getByRole("button", { name: new RegExp(`^${spacedName}$`) }).first();
  await expect(button, `页面头部「${name}」按钮应可见`).toBeVisible({ timeout: 15000 });
  await button.click();
}

/** 点击弹窗内【确定】按钮（不等待弹窗关闭，表单校验失败时弹窗保持打开）。 */
export async function clickModalConfirm(modal: Locator): Promise<void> {
  const confirmButton = modal.getByRole("button", { name: /^确\s*定$/ }).first();
  await expect(confirmButton, "弹窗「确定」按钮应可见").toBeVisible({ timeout: 10000 });
  await confirmButton.click();
}

/** 点击弹窗【确定】并等待弹窗关闭、列表刷新完成。 */
export async function confirmAndWaitClose(page: Page, modal: Locator): Promise<void> {
  await clickModalConfirm(modal);
  await expect(modal, "弹窗提交后应关闭").not.toBeVisible({ timeout: 30000 });
  await waitForUiSettled(page);
}

/** 填写弹窗内 key 输入框（Form name=jsonKey）。 */
export async function fillKeyInput(modal: Locator, value: string): Promise<void> {
  const input = modal.locator("input#jsonKey").first();
  await expect(input, "弹窗 key 输入框应可见").toBeVisible({ timeout: 10000 });
  await input.fill(value);
}

/** 填写弹窗内中文名称输入框（Form name=name，input id 以 name 结尾）。 */
export async function fillNameInput(modal: Locator, value: string): Promise<void> {
  const input = modal.locator("input[id$='name']").first();
  await expect(input, "弹窗中文名称输入框应可见").toBeVisible({ timeout: 10000 });
  await input.fill(value);
}

/** 填写弹窗内 value 格式输入框（Form name=value，input id 以 value 结尾）。 */
export async function fillValueFormat(modal: Locator, value: string): Promise<void> {
  const input = modal.locator("input[id$='value']").first();
  await expect(input, "弹窗 value格式 输入框应可见").toBeVisible({ timeout: 10000 });
  await input.fill(value);
}

/**
 * 切换弹窗内「数据源类型」下拉并断言回显。
 *
 * 注意：切换可能清空其他字段，新增场景应先切类型再填其余字段。
 */
export async function selectDataSourceType(
  page: Page,
  modal: Locator,
  typeName: string,
): Promise<void> {
  const dsTypeItem = modal.locator(".ant-form-item").filter({ hasText: "数据源类型" });
  const trigger = dsTypeItem.locator(".ant-select").first();
  await expect(trigger, "数据源类型下拉应可见").toBeVisible({ timeout: 10000 });
  await selectAntOption(page, trigger, typeName);
  await expect(
    dsTypeItem.locator(".ant-select-selection-item").first(),
    `数据源类型应切换为「${typeName}」`,
  ).toContainText(typeName, { timeout: 10000 });
}

/**
 * 新增第一层 key：打开【新增】弹窗 → 填表 → 提交 → 搜索确认记录落库。
 *
 * 数据源类型先于其他字段切换（切换可能清空已填内容）；提交后通过搜索确认行可见。
 */
export async function addKey(page: Page, key: string, options: AddKeyOptions = {}): Promise<void> {
  await clickHeaderButton(page, "新增");
  const modal = await waitModal(page, "新建");
  if (options.dataSourceType) {
    await selectDataSourceType(page, modal, options.dataSourceType);
  }
  await fillKeyInput(modal, key);
  if (options.chineseName !== undefined) {
    await fillNameInput(modal, options.chineseName);
  }
  if (options.valueFormat !== undefined) {
    await fillValueFormat(modal, options.valueFormat);
  }
  await confirmAndWaitClose(page, modal);
  await ensureRowVisibleByKey(page, key);
}

/**
 * 在指定父 key 行点击【新增子层级】并提交子层级表单。
 *
 * 实现按调用点契约重建，未经 live 验证：父行通过行文本定位，
 * 嵌套父行需调用方先搜索/展开使其进入列表视图；可选中文字段调用点未使用。
 */
export async function addChildKey(
  page: Page,
  parentKey: string,
  childKey: string,
  options: AddChildKeyOptions = {},
): Promise<void> {
  const parentRow = rowByKey(page, parentKey);
  await expect(parentRow, `父行「${parentKey}」应可见（嵌套场景需先展开其上层节点）`).toBeVisible({
    timeout: 15000,
  });
  await parentRow.locator(".ant-btn-link").filter({ hasText: "新增子层级" }).first().click();
  const modal = await waitModal(page);
  await fillKeyInput(modal, childKey);
  if (options.chineseName !== undefined) {
    await fillNameInput(modal, options.chineseName);
  }
  if (options.valueFormat !== undefined) {
    await fillValueFormat(modal, options.valueFormat);
  }
  await confirmAndWaitClose(page, modal);
}

/**
 * 删除指定 key：搜索定位 → 点击行内【删除】→ 确认弹窗点主按钮 → 等待关闭。
 *
 * 实现按调用点契约重建，未经 live 验证：options.force 语义按「删除与确认点击均
 * 使用 force 点击」重建（用于行按钮被遮挡或 key 已被规则引用的场景）。
 */
export async function deleteKey(
  page: Page,
  key: string,
  options: DeleteKeyOptions = {},
): Promise<void> {
  const force = options.force ?? false;
  await searchKey(page, key);
  const row = rowByKey(page, key);
  await expect(row, `待删除行「${key}」应可见`).toBeVisible({ timeout: 15000 });
  await row.locator(".ant-btn-link").filter({ hasText: "删除" }).first().click({ force });
  const confirmModal = page.locator(".ant-modal-confirm:visible, .ant-modal:visible").last();
  await expect(confirmModal, "删除确认弹窗应打开").toBeVisible({ timeout: 10000 });
  await confirmModal.locator(".ant-btn-primary").first().click({ force });
  await expect(confirmModal, "删除确认弹窗应关闭").not.toBeVisible({ timeout: 15000 });
  await waitForTableSettled(page);
}

/** 导入模板 Sheet 名（固定 5 层）。 */
const IMPORT_SHEET_NAMES = ["一层", "二层", "三层", "四层", "五层"] as const;

/** 各层 Sheet 的上级 key 前缀列名（二层起逐层累加）。 */
const IMPORT_PARENT_KEY_HEADERS = [
  "第一层级key名",
  "第二层级key名",
  "第三层级key名",
  "第四层级key名",
] as const;

/**
 * 构造符合导入模板结构的 xlsx 文件（固定 5 个 Sheet：一层~五层）。
 *
 * 表头与平台下载模板一致：一层为「* key / 中文名称 / value格式」，N 层（N≥2）在前
 * 追加 N-1 个「* 第N层级key名」前缀列。未传数据的层仅写表头。
 *
 * @param filePath - 目标文件路径（父目录不存在时自动创建）
 * @param levelRows - 逐层数据行；第 1 层每行 [key, 中文名称, value格式]，
 *   第 N 层每行在前追加 N-1 个上级 key 列。
 */
export async function buildImportXlsx(filePath: string, ...levelRows: string[][][]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  IMPORT_SHEET_NAMES.forEach((sheetName, index) => {
    const worksheet = workbook.addWorksheet(sheetName);
    const parentHeaders = IMPORT_PARENT_KEY_HEADERS.slice(0, index).map((name) => `* ${name}`);
    worksheet.addRow([...parentHeaders, "* key", "中文名称", "value格式"]);
    for (const row of levelRows[index] ?? []) {
      worksheet.addRow(row);
    }
  });
  mkdirSync(dirname(filePath), { recursive: true });
  await workbook.xlsx.writeFile(filePath);
}
