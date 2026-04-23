/**
 * key 值范围校验 — 规则编辑辅助函数
 *
 * 为「完整性-json中key值范围校验（KEY_SCOPE_VERIFICATION = '46'）」
 * 测试用例提供独立的 helper，不依赖其他 rule-editor-helpers.ts。
 *
 * UI 结构说明：
 *   - 统计函数：在规则表单中选择"完整性校验"规则后，选择"key范围校验"
 *   - 选择字段后，字段选择器变为单选（单字段约束）
 *   - 校验方法：包含 / 不包含（IntegrityJsonKeyVerifyType 组件，Ant Design Select）
 *   - 校验内容：TreeSelect（JsonFormatConfiguration 组件），从 JSON key 树中勾选 keys
 */

import { expect, type Locator, type Page } from "@playwright/test";

import {
  applyRuntimeCookies,
  buildDataAssetsUrl,
  confirmAntModal,
  selectAntOption,
} from "../../helpers/test-setup";
import { getEnvConfig } from "../../runtime/env-profile";
import { injectProjectContext } from "../data/key-range-data";

const ENV = getEnvConfig();

// ── 类型定义 ──────────────────────────────────────────────────

export interface KeyRangeRuleConfig {
  /** 要校验的字段名（单选） */
  field: string;
  /** 校验方法：包含 / 不包含 */
  method: "包含" | "不包含";
  /**
   * 要选择的 JSON key 名称列表（在 TreeSelect 中勾选）
   * 传 "全部" 时尝试勾选全部根节点
   */
  keyNames: string[] | "全部";
  /** 规则强弱，默认"强规则" */
  ruleStrength?: "强规则" | "弱规则";
  /** 规则描述（可选） */
  description?: string;
}

export interface MonitorDatasourceConfig {
  keyword: RegExp;
  database: string;
  label: string;
}

// ── 内部工具 ──────────────────────────────────────────────────

// 数据源名称规律：${database}_HADOOP
// 用 word boundary (\b) 而非 ^...$ 锚字符——keyword 会被 .test() 在拼接字符串
// (`${dataSourceName} ${dtCenterSourceName}`) 上调用，^$ 永远不命中。
// \b 既能精确匹配 pw_test_HADOOP 又能避免 pw_test2_HADOOP 误中（_2 是单词字符）
export const DORIS_MONITOR_DATASOURCE: MonitorDatasourceConfig = {
  keyword: new RegExp(`\\b${ENV.datasources.doris.sql.database}_HADOOP\\b`),
  database: ENV.datasources.doris.sql.database,
  label: "Doris3.x",
};

export const SPARKTHRIFT_MONITOR_DATASOURCE: MonitorDatasourceConfig = {
  keyword: new RegExp(`\\b${ENV.datasources.sparkthrift.sql.database}_HADOOP\\b`),
  database: ENV.datasources.sparkthrift.sql.database,
  label: "SparkThrift2.x",
};

/** 关闭引导弹窗（"知道了" 按钮） */
async function dismissIntroDialog(page: Page): Promise<void> {
  const knowBtn = page.getByRole("button", { name: "知道了" });
  if (await knowBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await knowBtn.click();
    await page.waitForTimeout(500);
  }
}

/**
 * 带重试的 selectAntOption（处理下拉选项加载缓慢的情况）
 */
/**
 * 带搜索功能的选择下拉框选项
 */
async function selectAntOptionWithSearch(
  page: Page,
  triggerLocator: Locator,
  searchText: string,
  attempts = 3,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      // 点击下拉框
      await triggerLocator.click();
      await page.waitForTimeout(500);

      // 输入搜索文本
      await page.keyboard.type(searchText, { delay: 50 });
      await page.waitForTimeout(1000);

      // 选择第一个匹配的选项
      const dropdown = page.locator(".ant-select-dropdown:visible").last();
      const option = dropdown.locator(".ant-select-item-option").first();
      await option.click({ timeout: 5000 });
      await page.waitForTimeout(300);
      return;
    } catch (error) {
      await page.keyboard.press("Escape").catch(() => undefined);
      await page.waitForTimeout(500);
      if (attempt === attempts - 1) throw error;
    }
  }
}

async function selectAntOptionWithRetry(
  page: Page,
  triggerLocator: Locator,
  optionText: string | RegExp,
  attempts = 5,
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await selectAntOption(page, triggerLocator, optionText);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Ant Select option not found")) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error(message);
      await page.keyboard.press("Escape").catch(() => undefined);
      await page.waitForTimeout(1000 * (attempt + 1));
    }
  }

  if (lastError) {
    throw lastError;
  }
}

/**
 * 通过 page.evaluate 发送带项目头的 POST 请求
 */
async function postProjectApi<T>(page: Page, path: string, body: unknown): Promise<T> {
  return page.evaluate(
    async ({ requestPath, requestBody, projectId }) => {
      const response = await fetch(requestPath, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "Accept-Language": "zh-CN",
          "X-Valid-Project-ID": String(projectId),
        },
        body: JSON.stringify(requestBody),
      });
      return response.json();
    },
    {
      requestPath: path,
      requestBody: body,
      projectId: ENV.projects.quality.id,
    },
  ) as Promise<T>;
}

/**
 * 确认目标数据源已授权到质量项目；若未授权则执行授权。
 * 返回 true 表示执行了新的授权（调用方可能需要 reload）。
 */
async function ensureMonitorDatasource(
  page: Page,
  datasource: MonitorDatasourceConfig,
): Promise<boolean> {
  type MonitorListResponse = {
    data?: Array<{
      id?: string;
      dataSourceName?: string;
      dtCenterSourceName?: string;
    }>;
  };

  const listMonitorDatasources = () =>
    postProjectApi<MonitorListResponse>(page, "/dmetadata/v1/dataSource/monitor/list", {});

  const findDatasource = async () => {
    const response = await listMonitorDatasources();
    return (response.data ?? []).find((item) =>
      datasource.keyword.test(
        `${String(item.dataSourceName ?? "")} ${String(item.dtCenterSourceName ?? "")}`,
      ),
    );
  };

  if (await findDatasource()) {
    return false;
  }

  const allDatasources = await postProjectApi<{
    data?: Array<{ dataSourceId?: string; dataSourceName?: string }>;
  }>(page, "/dassets/v1/dataSource/getAllDataSourceAndDatabase", {});

  const matchedDatasource = (allDatasources.data ?? []).find((item) =>
    datasource.keyword.test(String(item.dataSourceName ?? "")),
  );

  if (!matchedDatasource?.dataSourceId) {
    throw new Error(`No ${datasource.label} datasource available for current quality project.`);
  }

  const authResponse = await postProjectApi<{
    success?: boolean;
    message?: string;
  }>(page, "/dmetadata/v1/dataSource/authDataSourceToProject", {
    dataSourceId: Number(matchedDatasource.dataSourceId),
    projectList: [ENV.projects.quality.id],
  });

  if (!authResponse.success) {
    // 如果错误是"数据源被规则所依赖"，说明已授权，继续执行
    if (authResponse.message?.includes("被规则所依赖")) {
      return false;
    }
    throw new Error(
      authResponse.message ?? `Authorize ${datasource.label} datasource to project failed.`,
    );
  }

  await expect
    .poll(async () => Boolean(await findDatasource()), {
      timeout: 15000,
      message: `Waiting for ${datasource.label} datasource to appear in monitor datasource list.`,
    })
    .toBe(true);

  return true;
}

// ── 导航函数 ──────────────────────────────────────────────────

/**
 * 导航到规则集列表页（含 cookie 注入 + 项目上下文注入）
 */
export async function gotoRuleSetList(page: Page): Promise<void> {
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/dq/ruleSet", ENV.projects.quality.id));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await injectProjectContext(page, ENV.projects.quality.id);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await dismissIntroDialog(page);
}

/**
 * 导航到新建规则集页面（含 cookie 注入 + 项目上下文注入）
 */
export async function gotoRuleSetCreate(page: Page): Promise<void> {
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/dq/ruleSet/add", ENV.projects.quality.id));
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await injectProjectContext(page, ENV.projects.quality.id);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await dismissIntroDialog(page);
}

// ── 规则集创建 & 存在性保证 ───────────────────────────────────

/**
 * 通过 API 查询并删除指定表的全部规则集（测试前清理）
 */
export async function deleteRuleSetsByTableName(page: Page, tableName: string): Promise<void> {
  const listResponse = await postProjectApi<{
    data?: {
      contentList?: Array<{ id?: number | string; tableName?: string }>;
    };
  }>(page, "/dassets/v1/valid/monitorRuleSet/pageQuery", {
    current: 1,
    size: 50,
    search: tableName,
  });

  const rows = (listResponse.data?.contentList ?? []).filter(
    (item) => String(item.tableName ?? "") === tableName,
  );

  for (const row of rows) {
    if (!row.id) continue;
    await postProjectApi(page, "/dassets/v1/valid/monitorRuleSet/delete", {
      id: Number(row.id),
    });
  }
}

/**
 * 在 Step1（基础信息）中确保规则包名已填入表格
 */
async function ensurePackageNamesInBaseInfo(
  page: Page,
  requiredPackageNames: string[],
): Promise<void> {
  const packageNameInputs = page.locator('input[placeholder="请输入规则包名称"]');
  const addPackageBtn = page
    .locator(".ant-table-footer")
    .getByRole("button", { name: /新增/ })
    .first();

  await packageNameInputs.first().waitFor({ state: "visible", timeout: 10000 });

  const getPackageNameValues = async () =>
    (await packageNameInputs.evaluateAll((inputs) =>
      inputs.map((input) => (input as HTMLInputElement).value.trim()),
    )) as string[];

  for (const packageName of requiredPackageNames) {
    const currentValues = await getPackageNameValues();
    if (currentValues.includes(packageName)) continue;

    let targetIndex = currentValues.findIndex((value) => !value);
    if (targetIndex === -1) {
      const beforeCount = await packageNameInputs.count();
      await addPackageBtn.click();
      await expect(packageNameInputs).toHaveCount(beforeCount + 1, {
        timeout: 10000,
      });
      targetIndex = beforeCount;
    }

    const targetInput = packageNameInputs.nth(targetIndex);
    await targetInput.fill(packageName);
    await targetInput.press("Tab");
    await expect(targetInput).toHaveValue(packageName);
  }

  if (requiredPackageNames.length > 0) {
    await expect
      .poll(
        async () => {
          const vals = (await getPackageNameValues()).filter(Boolean);
          return requiredPackageNames.every((n) => vals.includes(n));
        },
        { timeout: 10000 },
      )
      .toBe(true);
  }
}

/**
 * 切换到 Step2（监控规则）
 */
async function gotoMonitorRulesStep(page: Page): Promise<void> {
  const newPackageBtn = page.getByRole("button", { name: /新增规则包/ }).first();
  const firstPackage = page.locator(".ruleSetMonitor__package").first();

  const isStep2Visible = async () =>
    (await firstPackage.isVisible().catch(() => false)) ||
    (await newPackageBtn.isVisible().catch(() => false));

  if (await isStep2Visible()) return;

  const nextBtn = page.getByRole("button", { name: "下一步" }).first();
  if (await nextBtn.isVisible().catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(1000);
  }

  if (await isStep2Visible()) return;

  await expect.poll(async () => isStep2Visible(), { timeout: 10000 }).toBe(true);
}

/**
 * 在 Step2 中添加规则包 slot 并选择包名
 */
async function addPackageSlot(page: Page, packageName: string): Promise<void> {
  await page
    .getByRole("button", { name: /新增规则包/ })
    .first()
    .click();
  await page.waitForTimeout(300);

  const packageSection = page.locator(".ruleSetMonitor__package").last();
  const packageSelect = packageSection.locator(".ruleSetMonitor__packageSelect").first();
  await packageSelect.waitFor({ state: "visible", timeout: 10000 });

  try {
    await selectAntOption(page, packageSelect, packageName);
  } catch (error) {
    await page.keyboard.press("Escape").catch(() => undefined);
    const deleteBtn = packageSection.locator(".ruleSetMonitor__packageDeleteBtn").first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      await confirmAntModal(page);
      await page.waitForTimeout(300);
    }
    throw error;
  }
  await page.waitForTimeout(300);
}

/**
 * 确保规则包在 Step2 中可见；若不存在则先去 Step1 添加，再回来
 */
async function ensureRuleSetPackagesVisible(
  page: Page,
  requiredPackageNames: string[],
): Promise<void> {
  const newPackageBtn = page.getByRole("button", { name: /新增规则包/ }).first();
  const firstPackage = page.locator(".ruleSetMonitor__package").first();
  await expect
    .poll(
      async () =>
        (await firstPackage.isVisible().catch(() => false)) ||
        (await newPackageBtn.isVisible().catch(() => false)),
      { timeout: 10000 },
    )
    .toBe(true);

  for (const packageName of requiredPackageNames) {
    const packageSection = page
      .locator(".ruleSetMonitor__package")
      .filter({ hasText: packageName })
      .first();
    if (await packageSection.isVisible().catch(() => false)) continue;

    try {
      await addPackageSlot(page, packageName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Ant Select option not found")) throw error;

      // 回到 Step1 补充包名
      const prevBtn = page.getByRole("button", { name: "上一步" }).first();
      if (await prevBtn.isVisible().catch(() => false)) {
        await prevBtn.click();
        await page
          .locator('input[placeholder="请输入规则包名称"]')
          .first()
          .waitFor({ state: "visible", timeout: 10000 });
      }
      await ensurePackageNamesInBaseInfo(page, [packageName]);
      await gotoMonitorRulesStep(page);
      await addPackageSlot(page, packageName);
    }

    await expect(
      page.locator(".ruleSetMonitor__package").filter({ hasText: packageName }).first(),
    ).toBeVisible({ timeout: 10000 });
  }
}

/**
 * 创建规则集草稿：选数据源→数据库→数据表→填包名→进入 Step2
 */
export async function createRuleSetDraft(
  page: Page,
  tableName: string,
  requiredPackageNames: string[],
  datasource: MonitorDatasourceConfig = DORIS_MONITOR_DATASOURCE,
): Promise<void> {
  await gotoRuleSetCreate(page);

  const authorized = await ensureMonitorDatasource(page, datasource);
  if (authorized) {
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await dismissIntroDialog(page);
  }

  // 选数据源（使用搜索功能）
  const sourceFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据源/ })
    .first();
  const sourceSearchText =
    typeof datasource.keyword === "string"
      ? datasource.keyword
      : datasource.keyword.source.split("|")[0]; // 取正则的第一部分作为搜索词
  await selectAntOptionWithSearch(
    page,
    sourceFormItem.locator(".ant-select").first(),
    sourceSearchText,
  );

  // 选数据库（使用搜索功能）
  const schemaFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据库/ })
    .first();
  await selectAntOptionWithSearch(
    page,
    schemaFormItem.locator(".ant-select").first(),
    datasource.database,
  );
  await page.waitForTimeout(1000);

  // 选数据表（使用搜索功能）
  const tableFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据表/ })
    .first();
  const tableSelect = tableFormItem.locator(".ant-select").first();
  await selectAntOptionWithSearch(page, tableSelect, tableName);
  await page.waitForTimeout(500);

  // 填规则包名称
  await ensurePackageNamesInBaseInfo(page, requiredPackageNames);

  // 进入监控规则 Step2
  await gotoMonitorRulesStep(page);
  await ensureRuleSetPackagesVisible(page, requiredPackageNames);
}

/**
 * 确保规则集存在（不存在则使用 createRuleSetDraft 模式创建到 Step2）
 *
 * 通过 API 检查是否已有指定表名的规则集；若已存在则打开编辑页，
 * 否则调用 createRuleSetDraft 建立草稿。
 *
 * @returns 是否为新建（true = 新建草稿，false = 已存在并打开编辑）
 */
export async function ensureRuleSetExists(
  page: Page,
  tableName: string,
  packageName: string,
  datasource: MonitorDatasourceConfig = DORIS_MONITOR_DATASOURCE,
): Promise<boolean> {
  // 先确保在列表页
  await gotoRuleSetList(page);

  const dataRows = page.locator(".ant-table-tbody tr:not(.ant-table-measure-row)");
  const existingRow = dataRows.filter({ hasText: tableName }).first();

  if (await existingRow.isVisible({ timeout: 3000 }).catch(() => false)) {
    await existingRow.getByRole("button", { name: "编辑" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await gotoMonitorRulesStep(page);
    await ensureRuleSetPackagesVisible(page, [packageName]);
    return false;
  }

  // 不存在则新建
  await createRuleSetDraft(page, tableName, [packageName], datasource);
  return true;
}

// ── 规则包 & 规则表单操作 ─────────────────────────────────────

/**
 * 获取规则包容器（.ruleSetMonitor__package 筛选包名）
 */
export async function getRulePackageSection(page: Page, packageName: string): Promise<Locator> {
  const packageSection = page
    .locator(".ruleSetMonitor__package")
    .filter({ hasText: packageName })
    .first();
  await expect(packageSection).toBeVisible({ timeout: 10000 });

  // 若规则包已折叠，展开它
  const expandBtn = packageSection.getByRole("button", { name: /展开/ }).first();
  if (await expandBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await expandBtn.click();
    await page.waitForTimeout(300);
  }

  return packageSection;
}

/**
 * 在规则包中添加规则（点击"添加规则" → 选择规则类型），
 * 返回新增的 .ruleForm Locator
 */
export async function addRuleToPackage(
  page: Page,
  packageName: string,
  ruleType: "完整性校验" | "有效性校验" = "完整性校验",
): Promise<Locator> {
  const packageSection = await getRulePackageSection(page, packageName);
  const ruleForms = packageSection.locator(".ruleForm");
  const beforeCount = await ruleForms.count();

  await packageSection
    .getByRole("button", { name: /添加规则/ })
    .first()
    .click();
  await page.waitForTimeout(300);

  const ruleTypeMenu = page.locator(".ant-dropdown:visible, .ant-dropdown-menu:visible");
  await ruleTypeMenu.first().waitFor({ state: "visible", timeout: 10000 });
  await ruleTypeMenu.getByText(ruleType, { exact: false }).first().click();

  await expect(ruleForms).toHaveCount(beforeCount + 1, { timeout: 10000 });
  return ruleForms.nth(beforeCount);
}

/**
 * 在规则包中添加"完整性校验"规则，并选择"key范围校验"统计函数
 * 返回配置好统计函数后的 ruleForm Locator
 */
export async function addKeyRangeRule(page: Page, packageName: string): Promise<Locator> {
  const ruleForm = await addRuleToPackage(page, packageName, "完整性校验");

  // 新版 UI：必须先选「规则类型 = 字段级」才会渲染出「统计函数」下拉
  const ruleTypeSelect = ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /规则类型/ })
    .first()
    .locator(".ant-select")
    .first();
  if (await ruleTypeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await selectAntOption(page, ruleTypeSelect, /字段级|字段/);
    await page.waitForTimeout(300);
  }

  // 双路径定位统计函数 Select：
  //   - legacy DOM：.rule__function-list__item .ant-select
  //   - 新版 inline form-item：含"统计函数"标签的 .ant-form-item 内的 .ant-select
  const legacyFunctionSelect = ruleForm.locator(".rule__function-list__item .ant-select").first();
  const inlineFunctionSelect = ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /统计函数/ })
    .first()
    .locator(".ant-select")
    .first();

  await expect
    .poll(
      async () =>
        (await legacyFunctionSelect.isVisible().catch(() => false)) ||
        (await inlineFunctionSelect.isVisible().catch(() => false)),
      { timeout: 10000, message: "waiting for function select to render" },
    )
    .toBe(true);

  const functionSelect = (await legacyFunctionSelect.isVisible().catch(() => false))
    ? legacyFunctionSelect
    : inlineFunctionSelect;

  await selectAntOption(page, functionSelect, "key范围校验");
  await page.waitForTimeout(500);

  return ruleForm;
}

// ── TreeSelect、规则保存与数据准备 ────────────────────────────

export * from "./key-range-rule-config";
