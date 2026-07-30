/**
 * key-range-utils.ts — 「完整性 JSON Key 范围校验」规则集编辑页对象（基础层）
 *
 * 覆盖【数据质量 → 规则集管理】的新建规则集 Step1/Step2、key范围校验规则表单配置与保存。
 * 本层不依赖 feature fixtures（数据源由调用方显式传入），suite-helpers / task-helpers 在其上组合。
 *
 * 说明：本文件按调用点契约重建（目录曾整体缺失），选择器对齐同平台 Ant Design 既有页对象，
 * 部分交互细节未经 live 验证，已在各函数注释中标注。
 */
import { expect, type Locator, type Page } from "@playwright/test";
import { getEnvConfig } from "../../../../../../_shared/automation/runtime/env-profile";
import {
  applyRuntimeCookies,
  buildDataAssetsUrl,
} from "../../../../../../_shared/automation/runtime/env-setup";
import {
  expectAntMessage,
  selectAntOption,
  waitForUiSettled,
} from "../../../../../../../../runtime/automation/playwright/index";

/** 规则集管理路由 */
const RULE_SET_PATH = "/dq/ruleSet";

/** 内置统计函数名：key范围校验 */
export const KEY_RANGE_RULE_NAME = "key范围校验";

/** 监控任务数据源配置（规则集/监控任务 Step1 基础信息用） */
export interface MonitorDatasourceConfig {
  /** 数据源标识，对齐 feature fixtures 的 DatasourceConfig.id */
  readonly id: "sparkthrift2.x" | "doris3.x";
  /** 展示标签（步骤描述拼接用） */
  readonly label: string;
  /** 数据库名（选择数据库下拉用） */
  readonly database: string;
  /** 下拉搜索关键字 */
  readonly keyword: {
    /** 选择数据源下拉的搜索关键字（数据源显示名前缀） */
    readonly source: string;
  };
  /** 前置条件数据源类型（建表 SQL 方言选择用） */
  readonly preconditionType: "SparkThrift" | "Doris";
}

/** 读取 env-profile 数据源配置；缺失时给出明确错误 */
function datasourceProfile(key: "sparkthrift" | "doris") {
  const profile = getEnvConfig().datasources[key];
  if (!profile) {
    throw new Error(`当前环境未配置 ${key} 数据源（env-profile.datasources.${key} 缺失）`);
  }
  return profile;
}

/** SparkThrift2.x 监控数据源配置（本需求默认数据源） */
export const SPARKTHRIFT_MONITOR_DATASOURCE: MonitorDatasourceConfig = {
  id: "sparkthrift2.x",
  label: "SparkThrift2.x",
  // env 派生字段用 getter 惰性求值：用例收集（discovery）阶段无 env profile，不得顶层触 env
  get database() {
    return datasourceProfile("sparkthrift").sql.database;
  },
  get keyword() {
    return {
      source:
        datasourceProfile("sparkthrift").batch?.name ??
        datasourceProfile("sparkthrift").aliases[0] ??
        "sparkthrift",
    };
  },
  preconditionType: "SparkThrift",
};

/** Doris3.x 监控数据源配置 */
export const DORIS_MONITOR_DATASOURCE: MonitorDatasourceConfig = {
  id: "doris3.x",
  label: "Doris3.x",
  get database() {
    return datasourceProfile("doris").sql.database;
  },
  get keyword() {
    return {
      source: datasourceProfile("doris").aliases[0] ?? "doris",
    };
  },
  preconditionType: "Doris",
};

/** 按 label 定位容器内的第一个表单项 */
function locateRuleFormItem(container: Page | Locator, label: RegExp): Locator {
  return container.locator(".ant-form-item").filter({ hasText: label }).first();
}

/**
 * 带输入搜索的下拉选择（含重试）。
 * 数据源/数据库/数据表等长列表下拉必须先输入关键字过滤，直接翻列表不稳定。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function selectWithSearchRetry(
  page: Page,
  trigger: Locator,
  text: string,
  attempts = 3,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await trigger.click();
      await waitForUiSettled(page);
      await page.keyboard.type(text, { delay: 50 });
      await waitForUiSettled(page);
      const option = page.locator(".ant-select-dropdown:visible .ant-select-item-option").first();
      await option.click({ timeout: 5000 });
      await waitForUiSettled(page);
      return;
    } catch (error) {
      lastError = error;
      await page.keyboard.press("Escape").catch(() => undefined);
      await waitForUiSettled(page);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** 打开【数据质量 → 规则集管理】列表页 */
export async function gotoRuleSetList(page: Page): Promise<void> {
  const projectId = getEnvConfig().projects.quality.id;
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl(RULE_SET_PATH, projectId), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.evaluate((pid) => {
    sessionStorage.setItem("X-Valid-Project-ID", String(pid));
  }, projectId);
  await waitForUiSettled(page);
}

/**
 * 新建规则集草稿：Step1 基础信息（数据源/数据库/数据表/规则包）→ 下一步进入 Step2 监控规则。
 * 调用前默认已打开规则集列表页；不在列表页时会先导航过去。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function createRuleSetDraft(
  page: Page,
  tableName: string,
  packageNames: readonly string[],
  datasource: MonitorDatasourceConfig,
): Promise<void> {
  const createButton = page.getByRole("button", { name: /新建规则集/ }).first();
  if (!(await createButton.isVisible({ timeout: 5000 }).catch(() => false))) {
    await gotoRuleSetList(page);
  }
  await createButton.click();
  await waitForUiSettled(page);

  // Step 1 基础信息：数据源 → 数据库 → 数据表（均为搜索下拉）
  const sourceItem = locateRuleFormItem(page, /选择数据源/);
  await expect(sourceItem, "Step1 应展示「选择数据源」表单项").toBeVisible({ timeout: 15000 });
  await selectWithSearchRetry(
    page,
    sourceItem.locator(".ant-select").first(),
    datasource.keyword.source,
  );
  await selectWithSearchRetry(
    page,
    locateRuleFormItem(page, /选择数据库/)
      .locator(".ant-select")
      .first(),
    datasource.database,
  );
  await selectWithSearchRetry(
    page,
    locateRuleFormItem(page, /选择数据表/)
      .locator(".ant-select")
      .first(),
    tableName,
  );

  // 规则包名称：逐个填写并点击【新增】按钮添加
  for (const packageName of packageNames) {
    const packageItem = locateRuleFormItem(page, /规则包名称|规则包/);
    await packageItem.locator("input").first().fill(packageName);
    await packageItem.getByRole("button", { name: /新增/ }).first().click();
    await waitForUiSettled(page);
  }

  // 下一步 → Step 2 监控规则
  await page.getByRole("button", { name: "下一步" }).first().click();
  await waitForUiSettled(page);
  await expect(
    page.locator(".ruleSetMonitor__package").first(),
    "应进入 Step 2 监控规则并展示规则包区块",
  ).toBeVisible({ timeout: 15000 });
}

/**
 * 选择规则表单的统计函数。
 * 优先按「统计函数」表单项定位下拉；部分页面版本渲染为函数列表项（.rule__function-list__item）。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function selectRuleFunction(ruleForm: Locator, functionName: string): Promise<void> {
  const page = ruleForm.page();
  const byFormItem = locateRuleFormItem(ruleForm, /统计函数/)
    .locator(".ant-select")
    .first();
  const trigger = (await byFormItem.isVisible({ timeout: 3000 }).catch(() => false))
    ? byFormItem
    : ruleForm.locator(".rule__function-list__item .ant-select").first();
  await selectAntOption(page, trigger, functionName);
  await waitForUiSettled(page);
}

/**
 * 在指定规则包下新增一条 key范围校验规则（规则类型=字段级、统计函数=key范围校验）。
 * 返回新增的规则表单 Locator（.ruleForm 最后一个）。
 */
export async function addKeyRangeRule(page: Page, packageName: string): Promise<Locator> {
  const packageSection = page
    .locator(".ruleSetMonitor__package")
    .filter({ hasText: packageName })
    .first();
  await expect(packageSection, `Step2 应展示规则包「${packageName}」`).toBeVisible({
    timeout: 15000,
  });
  await packageSection
    .getByRole("button", { name: /新增规则/ })
    .first()
    .click();
  const ruleForm = page.locator(".ruleForm").last();
  await expect(ruleForm, "新增规则后应展示规则表单").toBeVisible({ timeout: 10000 });
  // 规则类型=字段级（key范围校验仅支持字段级）
  await selectAntOption(
    page,
    locateRuleFormItem(ruleForm, /规则类型/)
      .locator(".ant-select")
      .first(),
    /字段级|字段/,
  );
  // 统计函数=key范围校验
  await selectRuleFunction(ruleForm, KEY_RANGE_RULE_NAME);
  return ruleForm;
}

/**
 * 设置校验内容（key 树形多选）。
 * 校验内容为 TreeSelect：逐 key 打开下拉、搜索过滤、点击节点勾选，结束后关闭下拉。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function setVerificationContent(
  page: Page,
  ruleForm: Locator,
  keyNames: readonly string[],
): Promise<void> {
  const treeSelect = locateRuleFormItem(ruleForm, /校验内容/)
    .locator(".ant-tree-select, .ant-select")
    .first();
  for (const keyName of keyNames) {
    await treeSelect.click();
    const dropdown = page
      .locator(".ant-tree-select-dropdown:visible, .ant-select-dropdown:visible")
      .last();
    await expect(dropdown, "校验内容下拉框应展开").toBeVisible({ timeout: 10000 });
    const searchInput = dropdown.locator("input").first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill(keyName);
      await waitForUiSettled(page);
    }
    const node = dropdown
      .locator(
        ".ant-select-tree-node-content-wrapper, .ant-select-tree-title, .ant-select-item-option",
      )
      .filter({ hasText: keyName })
      .first();
    await expect(node, `校验内容下拉应包含 key「${keyName}」`).toBeVisible({ timeout: 10000 });
    await node.click();
    await waitForUiSettled(page);
    // 关闭下拉，避免遮挡下一次操作
    await page.keyboard.press("Escape");
    await waitForUiSettled(page);
  }
}

/** key范围校验规则配置项（对齐调用点传入的对象字面量） */
export interface KeyRangeRuleOptions {
  /** 校验字段（key范围校验字段为单选） */
  readonly field: string;
  /** 校验方法：包含 / 不包含 */
  readonly method: string;
  /** 校验内容 key 列表 */
  readonly keyNames: readonly string[];
  /** 强弱规则（如「强规则」）；可选 */
  readonly ruleStrength?: string;
  /** 规则描述；可选 */
  readonly description?: string;
}

/**
 * 配置 key范围校验规则表单：字段 → 校验方法 → 校验内容 → 强弱规则 → 规则描述。
 * 仅填写表单，不点击保存；保存由 saveRuleSet 完成。
 */
export async function configureKeyRangeRule(
  page: Page,
  ruleForm: Locator,
  options: KeyRangeRuleOptions,
): Promise<void> {
  // 字段（key范围校验为单选）
  await selectAntOption(
    page,
    locateRuleFormItem(ruleForm, /^字段/).locator(".ant-select").first(),
    options.field,
  );
  await waitForUiSettled(page);
  // 校验方法
  await selectAntOption(
    page,
    locateRuleFormItem(ruleForm, /校验方法/)
      .locator(".ant-select")
      .first(),
    options.method,
  );
  await waitForUiSettled(page);
  // 校验内容（key 树形多选）
  await setVerificationContent(page, ruleForm, options.keyNames);
  // 强弱规则（单选）
  if (options.ruleStrength) {
    const strengthRadio = locateRuleFormItem(ruleForm, /强弱规则|规则强度/)
      .locator(".ant-radio-wrapper")
      .filter({ hasText: options.ruleStrength })
      .first();
    const target = (await strengthRadio.isVisible({ timeout: 2000 }).catch(() => false))
      ? strengthRadio
      : ruleForm.locator(".ant-radio-wrapper").filter({ hasText: options.ruleStrength }).first();
    await target.click();
    await waitForUiSettled(page);
  }
  // 规则描述（可选）
  if (options.description) {
    const descriptionInput = locateRuleFormItem(ruleForm, /规则描述|描述/)
      .locator("textarea, input")
      .first();
    if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descriptionInput.fill(options.description);
    }
  }
}

/**
 * 保存规则集：先逐行点击规则表单内【保存】，再点击页面底部【保存】提交整个规则集。
 * 若出现确认弹窗则确认；最后断言成功提示。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function saveRuleSet(page: Page): Promise<void> {
  // 规则行【保存】（若有未保存的规则表单）
  const rowSaveButtons = page.locator(".ruleForm:visible").getByRole("button", { name: /^保存$/ });
  const rowSaveCount = await rowSaveButtons.count();
  for (let index = 0; index < rowSaveCount; index += 1) {
    const button = rowSaveButtons.nth(index);
    if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
      await button.click();
      await waitForUiSettled(page);
    }
  }
  // 页面底部【保存】
  await page
    .getByRole("button", { name: /^保存$/ })
    .last()
    .click();
  await waitForUiSettled(page);
  // 可能出现的二次确认弹窗
  const confirmModal = page.locator(".ant-modal-confirm:visible, .ant-modal:visible").last();
  if (await confirmModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmModal
      .getByRole("button", { name: /确认|确定/ })
      .first()
      .click();
    await waitForUiSettled(page);
  }
  await expectAntMessage(page, /保存成功|操作成功|成功/, 15000);
}
