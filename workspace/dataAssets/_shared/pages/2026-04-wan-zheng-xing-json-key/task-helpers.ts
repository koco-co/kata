import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  applyRuntimeCookies,
  buildDataAssetsUrl,
  navigateViaMenu,
  selectAntOption,
} from "../../helpers";
import { enableCompatibleMonitorDatasourceRouting } from "../2026-04-you-xiao-xing-duo-gui-ze/rule-editor-helpers";
import {
  executeTaskFromList as executeSharedTaskFromList,
  getQualityReportRuleRow,
  getTaskDetailRuleCard,
  gotoQualityReport,
  gotoRuleTaskList,
  gotoValidationResults,
  openQualityReportDetail,
  openQualityReportRuleDetail,
  openTaskRuleDetailDataDrawer,
  waitForQualityReportRow as waitForSharedQualityReportRow,
  waitForTaskInstanceFinished as waitForSharedTaskInstanceFinished,
} from "../2026-04-you-xiao-xing-duo-gui-ze/rule-task-helpers";
import {
  getCurrentDatasource,
  injectProjectContext,
  resolveEffectiveQualityProjectId,
  resolveVariantName,
} from "../data/test-data";
import {
  FAIL_LOG_TASK_NAME,
  MAIN_TASK_NAME,
  METHOD_SWITCH_TASK_NAME,
  NOT_INCLUDE_TASK_NAME,
  PASS_TASK_NAME,
  removeDeletedReferenceKey,
  SCENARIOS,
  ensureSavedScenarioRuleSet,
} from "./suite-helpers";

export {
  FAIL_LOG_TASK_NAME,
  MAIN_TASK_NAME,
  METHOD_SWITCH_TASK_NAME,
  NOT_INCLUDE_TASK_NAME,
  PASS_TASK_NAME,
};

export const SPARK_COMPAT_TASK_NAME = "task_spark_test";
const TABLE_ROWS = ".ant-table-tbody tr:not(.ant-table-measure-row)";

type TaskScenario = {
  readonly taskName: string;
  readonly tableName: string;
  readonly packageName: string;
  readonly ruleSetScenario: (typeof SCENARIOS)[keyof typeof SCENARIOS];
  readonly afterCreate?: (page: Page) => Promise<void>;
};

type MonitorListRow = {
  id?: number | string;
  ruleName?: string;
  monitorName?: string;
  name?: string;
};

type ProjectDatasourceRow = {
  id?: number | string;
  dataSourceName?: string;
  dtCenterSourceName?: string;
  sourceTypeValue?: string;
};

type RulePackageRow = {
  id?: number | string;
  packageId?: number | string;
  packageName?: string;
  tableId?: number | string;
};

type RuleTypeRow = number | string | { ruleType?: number | string };

type ImportedRuleRow = Record<string, unknown> & {
  standardRules?: Array<Record<string, unknown>>;
  standardRuleList?: Array<Record<string, unknown>>;
  customSql?: string;
  selectDataSql?: string;
  customizeSql?: string;
  ruleStrength?: number | string;
};

const TASK_SCENARIOS: Record<string, TaskScenario> = {
  [MAIN_TASK_NAME]: {
    taskName: MAIN_TASK_NAME,
    tableName: SCENARIOS.main.tableName,
    packageName: SCENARIOS.main.packageName,
    ruleSetScenario: SCENARIOS.main,
  },
  [PASS_TASK_NAME]: {
    taskName: PASS_TASK_NAME,
    tableName: SCENARIOS.pass.tableName,
    packageName: SCENARIOS.pass.packageName,
    ruleSetScenario: SCENARIOS.pass,
  },
  [METHOD_SWITCH_TASK_NAME]: {
    taskName: METHOD_SWITCH_TASK_NAME,
    tableName: SCENARIOS.methodSwitch.tableName,
    packageName: SCENARIOS.methodSwitch.packageName,
    ruleSetScenario: SCENARIOS.methodSwitch,
  },
  [NOT_INCLUDE_TASK_NAME]: {
    taskName: NOT_INCLUDE_TASK_NAME,
    tableName: SCENARIOS.notInclude.tableName,
    packageName: SCENARIOS.notInclude.packageName,
    ruleSetScenario: SCENARIOS.notInclude,
  },
  [FAIL_LOG_TASK_NAME]: {
    taskName: FAIL_LOG_TASK_NAME,
    tableName: SCENARIOS.failLog.tableName,
    packageName: SCENARIOS.failLog.packageName,
    ruleSetScenario: SCENARIOS.failLog,
    afterCreate: async (page) => {
      await removeDeletedReferenceKey(page);
    },
  },
  [SPARK_COMPAT_TASK_NAME]: {
    taskName: SPARK_COMPAT_TASK_NAME,
    tableName: SCENARIOS.main.tableName,
    packageName: "spark兼容性测试包",
    ruleSetScenario: {
      ...SCENARIOS.main,
      packageName: "spark兼容性测试包",
    },
  },
};

const preparedTasks = new Set<string>();
const executedTasks = new Set<string>();
const readyReports = new Set<string>();

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveTaskName(taskName: string): string {
  // 不追加 _sparkthrift2_x 后缀——uniqueName timestamp 已保证全局唯一性，
  // 且平台 "规则名称" 字段限 50 字符，追加后缀易超限。
  return taskName;
}

function getReportName(taskName: string): string {
  return `${resolveTaskName(taskName)}_report`;
}

function resolveNameCandidates(name: string): string[] {
  const datasource = getCurrentDatasource();
  const cacheSuffix = `_${datasource.cacheKey}`;
  const reportSuffix = "_report";

  if (name.endsWith(reportSuffix)) {
    const baseName = name.slice(0, -reportSuffix.length);
    return [
      ...new Set(resolveNameCandidates(baseName).map((candidate) => `${candidate}${reportSuffix}`)),
    ];
  }

  if (name.includes(cacheSuffix)) {
    return [...new Set([name, name.replace(cacheSuffix, "")])];
  }

  return [...new Set([`${name}${cacheSuffix}`, name])];
}

function resolveTaskNameCandidates(taskName: string): string[] {
  return resolveNameCandidates(taskName);
}

function rowNameMatches(rowName: string, nameCandidates: readonly string[]): boolean {
  return nameCandidates.includes(rowName);
}

function parseRuleTypeValue(item: RuleTypeRow): number {
  if (typeof item === "number") return item;
  if (typeof item === "string") return Number(item);
  return Number(item.ruleType);
}

function encodeBase64(input: string): string {
  return Buffer.from(input, "utf8").toString("base64");
}

function serializeImportedRule(rule: ImportedRuleRow): Record<string, unknown> {
  const normalizedRule: ImportedRuleRow = { ...rule };
  const standardRuleList = (normalizedRule.standardRules ?? normalizedRule.standardRuleList)?.map(
    (item) => ({ ...item }),
  );
  if (standardRuleList) {
    normalizedRule.standardRuleList = standardRuleList;
  }
  delete normalizedRule.standardRules;

  const { id, isNew, isTable, percentType, functionName, verifyTypeValue, ...serializedRule } =
    normalizedRule;
  void id;
  void isNew;
  void isTable;
  void percentType;
  void functionName;
  void verifyTypeValue;

  if (typeof serializedRule.customSql === "string" && serializedRule.customSql) {
    serializedRule.customSql = encodeBase64(serializedRule.customSql);
  }
  if (typeof serializedRule.selectDataSql === "string" && serializedRule.selectDataSql) {
    serializedRule.selectDataSql = encodeBase64(serializedRule.selectDataSql);
  }
  if (typeof serializedRule.customizeSql === "string" && serializedRule.customizeSql) {
    serializedRule.customizeSql = encodeBase64(serializedRule.customizeSql);
  }
  if (
    serializedRule.ruleStrength !== undefined &&
    serializedRule.ruleStrength !== null &&
    serializedRule.ruleStrength !== ""
  ) {
    serializedRule.ruleStrength = Number(serializedRule.ruleStrength);
  }

  return serializedRule;
}

async function postTaskApi<T>(page: Page, path: string, body: unknown): Promise<T> {
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  const requestUrl = /^https?:\/\//.test(path)
    ? path
    : new URL(
        path.startsWith("/") ? path : `/${path}`,
        new URL(buildDataAssetsUrl("/", effectiveProjectId)).origin,
      ).toString();
  const response = await page.evaluate(
    async ({ url, payload, projectId }) => {
      const result = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "Accept-Language": "zh-CN",
          "X-Valid-Project-ID": String(projectId),
        },
        body: JSON.stringify(payload),
      });
      return {
        ok: result.ok,
        text: await result.text(),
        status: result.status,
        statusText: result.statusText,
      };
    },
    {
      url: requestUrl,
      payload: body,
      projectId: effectiveProjectId,
    },
  );
  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText}: ${response.text.slice(0, 200)}`,
    );
  }
  return JSON.parse(response.text) as T;
}

async function getProjectDatasource(
  page: Page,
): Promise<Required<Pick<ProjectDatasourceRow, "id">> & ProjectDatasourceRow> {
  const datasource = getCurrentDatasource();
  const matchesCurrentDatasource = (item: ProjectDatasourceRow) =>
    datasource.optionPattern.test(
      `${String(item.dataSourceName ?? "")} ${String(item.dtCenterSourceName ?? "")}`,
    ) || datasource.sourceTypePattern.test(String(item.sourceTypeValue ?? ""));

  for (const endpoint of [
    "/dmetadata/v1/dataSource/monitor/list",
    "/dassets/v1/dataSource/monitor/list",
  ]) {
    const monitorListResponse = await postTaskApi<{ data?: ProjectDatasourceRow[] }>(
      page,
      endpoint,
      {},
    ).catch(() => null);
    const monitorDatasource = (monitorListResponse?.data ?? []).find(matchesCurrentDatasource);
    if (monitorDatasource?.id) {
      return monitorDatasource as Required<Pick<ProjectDatasourceRow, "id">> & ProjectDatasourceRow;
    }
  }

  const pageQueryResponse =
    (await postTaskApi<{
      data?: { contentList?: ProjectDatasourceRow[] };
    }>(page, "/dassets/v1/dataSource/pageQuery", {
      current: 1,
      size: 200,
      search: "",
    })) ?? {};
  const projectDatasource = (pageQueryResponse.data?.contentList ?? []).find(
    matchesCurrentDatasource,
  );
  if (!projectDatasource?.id) {
    throw new Error(
      `No ${datasource.reportName} datasource available for current quality project.`,
    );
  }
  return projectDatasource as Required<Pick<ProjectDatasourceRow, "id">> & ProjectDatasourceRow;
}

async function importTaskRulesFromPackage(
  page: Page,
  scenario: TaskScenario,
): Promise<{
  dataSourceId: number;
  tableId: number;
  packageIds: number[];
  ruleTypes: number[];
  rules: Record<string, unknown>[];
  effectiveSchemaName: string;
}> {
  const datasource = getCurrentDatasource();
  const primaryDataSourceId = Number((await getProjectDatasource(page)).id);
  if (!Number.isFinite(primaryDataSourceId)) {
    throw new Error(
      `Datasource id for ${datasource.reportName} is invalid: ${primaryDataSourceId}`,
    );
  }

  const candidateDataSourceIds = [primaryDataSourceId];
  for (const endpoint of [
    "/dmetadata/v1/dataSource/monitor/list",
    "/dassets/v1/dataSource/monitor/list",
  ]) {
    const response = await postTaskApi<{ data?: ProjectDatasourceRow[] }>(page, endpoint, {}).catch(
      () => null,
    );
    for (const item of response?.data ?? []) {
      const id = Number(item.id);
      if (Number.isFinite(id) && !candidateDataSourceIds.includes(id)) {
        candidateDataSourceIds.push(id);
      }
    }
  }

  const strippedDbName = datasource.database.replace(/_test$/, "");
  const schemaCandidates = [datasource.database, strippedDbName].filter(
    (value, index, array) => value && array.indexOf(value) === index,
  );

  let packageRow: RulePackageRow | undefined;
  let dataSourceId = primaryDataSourceId;
  let effectiveSchemaName = datasource.database;
  outer: for (let attempt = 1; attempt <= 5; attempt += 1) {
    for (const candidateId of candidateDataSourceIds) {
      for (const schemaCandidate of schemaCandidates) {
        const packageResponse =
          (await postTaskApi<{
            success?: boolean;
            message?: string;
            data?: RulePackageRow[];
          }>(page, "/dassets/v1/valid/monitorRulePackage/ruleSetList", {
            dataSourceId: candidateId,
            tableName: scenario.tableName,
            schemaName: schemaCandidate,
          })) ?? {};
        packageRow = (packageResponse.data ?? []).find(
          (item) => item.packageName === scenario.packageName,
        );
        if (packageRow && (packageRow.packageId ?? packageRow.id)) {
          dataSourceId = candidateId;
          effectiveSchemaName = schemaCandidate;
          break outer;
        }
      }
    }
    await page.waitForTimeout(3000 * attempt);
  }

  const packageIdValue = packageRow?.packageId ?? packageRow?.id;
  const packageId = Number(packageIdValue);
  const tableId = Number(packageRow?.tableId);
  if (!packageRow || !Number.isFinite(packageId) || !Number.isFinite(tableId)) {
    throw new Error(
      `Task package "${scenario.packageName}" for table "${scenario.tableName}" was not found via API.`,
    );
  }

  let ruleTypes: number[] = [];
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const ruleTypeResponse =
      (await postTaskApi<{
        success?: boolean;
        message?: string;
        data?: RuleTypeRow[];
      }>(page, "/dassets/v1/valid/monitorRulePackage/ruleTypes", {
        packageIdList: [packageId],
      })) ?? {};
    ruleTypes = (ruleTypeResponse.data ?? [])
      .map((item) => parseRuleTypeValue(item))
      .filter((value) => Number.isFinite(value));
    if (ruleTypes.length > 0) {
      break;
    }
    await page.waitForTimeout(3000 * attempt);
  }
  if (ruleTypes.length === 0) {
    throw new Error(
      `Task package "${scenario.packageName}" did not expose any rule types via API.`,
    );
  }

  const importResponse =
    (await postTaskApi<{
      success?: boolean;
      message?: string;
      data?: ImportedRuleRow[];
    }>(page, "/dassets/v1/valid/monitorRulePackage/getMonitorRule", {
      packageIdList: [packageId],
      ruleTypeList: ruleTypes,
    })) ?? {};
  if (
    !importResponse.success ||
    !Array.isArray(importResponse.data) ||
    importResponse.data.length === 0
  ) {
    throw new Error(
      `Importing rules from package "${scenario.packageName}" failed: ${importResponse.message ?? "no rules returned"}`,
    );
  }

  return {
    dataSourceId,
    tableId,
    packageIds: [packageId],
    ruleTypes,
    rules: importResponse.data.map((rule) => serializeImportedRule(rule)),
    effectiveSchemaName,
  };
}

function buildMonitorReportParam(taskName: string) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    monitorReport: {
      reportName: getReportName(taskName),
      periodType: 2,
      reportType: 1,
      needCar: 0,
      reportShowResultType: 1,
      reportGenerateType: 2,
      ruleTaskTypesList: [],
      dataContextStart: "1",
      dataContextEnd: "0",
      dispatchConfigDTO: {
        periodType: "2",
        beginDate: today,
        endDate: "2099-12-31",
        hour: "0",
        min: "0",
      },
      isEnable: 1,
    },
  };
}

async function createTaskViaApi(
  page: Page,
  taskName: string,
  scenario: TaskScenario,
): Promise<void> {
  const actualTaskName = resolveTaskName(taskName);
  const importedPackage = await importTaskRulesFromPackage(page, scenario);
  const monitorAddPayload = {
    dataSourceId: importedPackage.dataSourceId,
    tableName: scenario.tableName,
    tableId: importedPackage.tableId,
    schemaName: importedPackage.effectiveSchemaName,
    ruleName: actualTaskName,
    regularType: 0,
    packageCount: 1,
    jobBuildType: 2,
    isRunOn: 0,
    isSubscribe: 0,
    partition: "",
    partitionType: 0,
    associatedTasks: [],
    channelIds: [],
    notifyUser: [],
    webhook: "",
    taskParams: "",
    scheduleConf: "",
    packageIds: importedPackage.packageIds,
    ruleTypes: importedPackage.ruleTypes,
    expansion: JSON.stringify({
      openSample: 0,
      sampleDto: {},
      packageIds: importedPackage.packageIds,
      ruleTypes: importedPackage.ruleTypes,
    }),
    rules: importedPackage.rules,
    monitorReportParam: buildMonitorReportParam(taskName),
  };
  const addResponse =
    (await postTaskApi<{
      success?: boolean;
      message?: string;
    }>(page, "/dassets/v1/valid/monitor/add", monitorAddPayload)) ?? {};
  if (!addResponse.success) {
    if (String(addResponse.message ?? "").includes("已存在")) {
      await getTaskMonitorRowByCandidates(page, taskName);
      return;
    }
    throw new Error(
      `Task API create failed for "${actualTaskName}": ${addResponse.message ?? "unknown error"}`,
    );
  }
}

async function openQualityRoute(page: Page, path: string): Promise<void> {
  await applyRuntimeCookies(page);
  const effectiveProjectId = await resolveEffectiveQualityProjectId(page);
  const targetUrl = buildDataAssetsUrl(path, effectiveProjectId);
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" }).catch(() => undefined);
  await page
    .locator("body")
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => undefined);
  await injectProjectContext(page, effectiveProjectId);
  await page.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(1000);
}

async function gotoRuleTaskCreate(page: Page): Promise<void> {
  await enableCompatibleMonitorDatasourceRouting(page);
  await openQualityRoute(page, "/dq/rule/add");
}

async function listTaskRows(page: Page): Promise<MonitorListRow[]> {
  const rows: MonitorListRow[] = [];
  const pageSize = 200;
  for (let pageIndex = 1; pageIndex <= 5; pageIndex += 1) {
    const payload =
      (await postTaskApi<{
        data?: {
          data?: MonitorListRow[];
          contentList?: MonitorListRow[];
          list?: MonitorListRow[];
        };
      }>(page, "/dassets/v1/valid/monitor/pageQuery", {
        pageIndex,
        pageSize,
      })) ?? {};
    const pageRows = payload.data?.data ?? payload.data?.contentList ?? payload.data?.list ?? [];
    rows.push(...pageRows);
    if (pageRows.length < pageSize) {
      break;
    }
  }
  return rows;
}

async function deleteTasksByNames(page: Page, taskNames: readonly string[]): Promise<void> {
  const actualNames = taskNames.flatMap(resolveTaskNameCandidates);
  const rows = await listTaskRows(page);
  for (const row of rows) {
    const rowName = String(row.ruleName ?? row.monitorName ?? row.name ?? "");
    if (!actualNames.includes(rowName) || row.id === undefined || row.id === null) {
      continue;
    }
    await postTaskApi(page, "/dassets/v1/valid/monitor/delete", {
      monitorId: Number(row.id),
    });
  }
}

async function fillTaskBaseInfo(page: Page, scenario: TaskScenario): Promise<void> {
  const datasource = getCurrentDatasource();
  const ruleNameInput = page
    .locator(".ant-form-item")
    .filter({ hasText: /^规则名称/ })
    .locator("input")
    .first();
  await ruleNameInput.fill(resolveTaskName(scenario.taskName));

  const sourceFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据源/ })
    .first();
  await selectAntOption(
    page,
    sourceFormItem.locator(".ant-select").first(),
    datasource.optionPattern,
  );

  const schemaFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据库/ })
    .first();
  await selectAntOption(page, schemaFormItem.locator(".ant-select").first(), datasource.database);
  await page.waitForTimeout(1000);

  const tableFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /选择数据表/ })
    .first();
  await selectAntOption(page, tableFormItem.locator(".ant-select").first(), scenario.tableName);
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: "下一步" }).first().click();
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
}

async function importRulePackage(
  page: Page,
  packageName: string,
): Promise<void> {
  // 规则包 select（第一个含"规则包"标签的 Form.Item）
  // API 加载异步，需轮询等到 packageName 出现为止（忽略"全部"伪选项）
  const packageSelect = page
    .locator(".ant-form-item")
    .filter({ hasText: /规则包/ })
    .first()
    .locator(".ant-select")
    .first();

  let lastAvailableOptions: string[] = [];
  let found = false;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await packageSelect.locator(".ant-select-selector").click();
    await page.waitForTimeout(800);
    const dropdown = page.locator(".ant-select-dropdown:visible").last();
    const dropdownVisible = await dropdown
      .waitFor({ state: "visible", timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (!dropdownVisible) {
      await page.waitForTimeout(1500);
      continue;
    }

    const packageOption = dropdown
      .locator(".ant-select-item-option")
      .filter({ hasText: new RegExp(`^${packageName}$`) })
      .first();
    if (await packageOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await packageOption.click();
      await page.waitForTimeout(500);
      found = true;
      break;
    }

    lastAvailableOptions = await dropdown
      .locator(".ant-select-item-option")
      .allTextContents()
      .then((items) => items.map((i) => i.trim()).filter(Boolean));
    await page.keyboard.press("Escape").catch(() => undefined);
    // 等待 API 返回（逐步加大等待时间）
    await page.waitForTimeout(1500 * (attempt + 1));
  }

  if (!found) {
    throw new Error(
      `Task package "${packageName}" not found. Last available: ${lastAvailableOptions.join(" | ")}`,
    );
  }

  // 选规则类型（完整性校验）
  const ruleTypeSelect = page
    .locator(".ant-form-item")
    .filter({ hasText: /规则类型/ })
    .first()
    .locator(".ant-select")
    .first();
  if (await ruleTypeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await selectAntOption(page, ruleTypeSelect, /完整性校验|完整性/);
    await page.waitForTimeout(500);
  }

  // 点击「引入」按钮完成导入
  await page.getByRole("button", { name: /引入/ }).click();
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
  await expect(page.locator(".ruleForm").first()).toBeVisible({
    timeout: 10000,
  });
}

async function completeTaskScheduleAndSave(page: Page, taskName: string): Promise<void> {
  const actualTaskName = resolveTaskName(taskName);
  await page.getByRole("button", { name: "下一步" }).last().click();
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(1500);

  const packageCountInput = page
    .locator(".ant-form-item")
    .filter({ hasText: /规则拼接包/ })
    .locator("input")
    .first();
  if (await packageCountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await packageCountInput.fill("1");
  }

  const immediateRadio = page
    .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
    .filter({ hasText: /立即生成/ })
    .first();
  if (await immediateRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
    await immediateRadio.click();
    await page.waitForTimeout(300);
  }

  const reportNameInput = page
    .locator(".ant-form-item")
    .filter({ hasText: /报告名称/ })
    .locator("input")
    .first();
  if (await reportNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await reportNameInput.fill(`${actualTaskName}_report`);
  }

  const dataCycleInputs = page
    .locator(".ant-form-item")
    .filter({ hasText: /数据日期|数据周期/ })
    .locator("input");
  if (
    await dataCycleInputs
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
  ) {
    await dataCycleInputs.nth(0).fill("1");
    if ((await dataCycleInputs.count()) > 1) {
      await dataCycleInputs.nth(1).fill("0");
    }
  }

  const needCarNoRadio = page
    .locator(".ant-form-item")
    .filter({ hasText: /是否需要车辆信息/ })
    .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
    .filter({ hasText: /^否$/ })
    .first();
  if (await needCarNoRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
    await needCarNoRadio.click();
    await page.waitForTimeout(300);
  }

  // 资源组（SparkThrift2x 必选）：若 select 可见且当前为空，选第一个可用选项
  const resourceGroupFormItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /资源组/ })
    .first();
  if (
    await resourceGroupFormItem.isVisible({ timeout: 2000 }).catch(() => false)
  ) {
    const resourceGroupSelect = resourceGroupFormItem
      .locator(".ant-select")
      .first();
    const isAlreadySelected = await resourceGroupSelect
      .locator(".ant-select-selection-item")
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    if (!isAlreadySelected) {
      await resourceGroupSelect.locator(".ant-select-selector").click();
      const resourceDropdown = page
        .locator(".ant-select-dropdown:visible")
        .last();
      await resourceDropdown.waitFor({ state: "visible", timeout: 8000 });
      const firstOption = resourceDropdown
        .locator(".ant-select-item-option:not(.ant-select-item-option-disabled)")
        .first();
      if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstOption.click();
        await page.waitForTimeout(300);
      } else {
        // No options available — press Escape and continue (may fail form validation)
        await page.keyboard.press("Escape");
      }
    }
  }

  const saveResponsePromise = page
    .waitForResponse(
      (response) =>
        response.url().includes("/dassets/v1/valid/monitor/add") ||
        response.url().includes("/dassets/v1/valid/monitor/edit"),
    )
    .catch(() => null);
  const createButton = page.getByRole("button", { name: /新\s*建|保\s*存/ }).last();
  await createButton.click();
  await page.waitForTimeout(1000);
  const confirmModal = page.locator(".ant-modal:visible, .ant-modal-confirm:visible").last();
  if (await confirmModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    const confirmButton = confirmModal.getByRole("button", { name: /确\s*认|确\s*定/ }).first();
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
  }

  const saveResponse = await saveResponsePromise;
  if (!saveResponse) {
    const visibleErrors = await page
      .locator(".ant-form-item-explain-error:visible")
      .allTextContents()
      .catch(() => [] as string[]);
    throw new Error(
      `Task save request was not triggered. Visible errors: ${visibleErrors.join(" | ") || "none"}`,
    );
  }

  const saveResult = (await saveResponse.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
  } | null;
  if (!saveResult?.success) {
    throw new Error(
      `Task save failed via ${saveResponse.url()}: ${saveResult?.message ?? "unknown error"}`,
    );
  }

  await page.waitForURL(/#\/dq\/rule(?:\?|$)/, { timeout: 15000 });
  await page.waitForTimeout(1000);
}

async function createTask(page: Page, taskName: string): Promise<void> {
  const scenario = TASK_SCENARIOS[taskName];
  if (!scenario) {
    throw new Error(`Unsupported task scenario: ${taskName}`);
  }
  await ensureSavedScenarioRuleSet(page, scenario.ruleSetScenario);
  await deleteTasksByNames(page, [taskName]);
  await createTaskViaApi(page, taskName, scenario);
  await getTaskMonitorRowByCandidates(page, taskName);
  if (scenario.afterCreate) {
    await scenario.afterCreate(page);
  }
}

async function getTaskMonitorRowByCandidates(
  page: Page,
  taskName: string,
): Promise<MonitorListRow> {
  const nameCandidates = resolveTaskNameCandidates(taskName);
  const rows = await listTaskRows(page);
  const taskRow = rows.find((row) =>
    rowNameMatches(String(row.ruleName ?? row.monitorName ?? row.name ?? ""), nameCandidates),
  );
  if (taskRow) {
    return taskRow;
  }

  throw new Error(`Task "${nameCandidates[0]}" not found in monitor list`);
}

export async function ensureRuleTasks(page: Page, taskNames: readonly string[]): Promise<void> {
  for (const taskName of taskNames) {
    const actualTaskName = resolveTaskName(taskName);
    if (preparedTasks.has(actualTaskName)) {
      continue;
    }
    await createTask(page, taskName);
    preparedTasks.add(actualTaskName);
    executedTasks.delete(actualTaskName);
    readyReports.delete(actualTaskName);
  }
}

/**
 * 规则集已由调用方通过 key-range-utils.ts 预先创建好，
 * 此函数仅负责创建任务（跳过 seedScenarioRuleSet 步骤）。
 */
export async function ensureRuleTasksWithPreSeededRuleSet(
  page: Page,
  taskNames: readonly string[],
): Promise<void> {
  for (const taskName of taskNames) {
    const actualTaskName = resolveTaskName(taskName);
    if (preparedTasks.has(actualTaskName)) {
      continue;
    }
    const scenario = TASK_SCENARIOS[taskName];
    if (!scenario) {
      throw new Error(`Unsupported task scenario: ${taskName}`);
    }
    // 跳过 seedScenarioRuleSet — 规则集已由调用方创建
    await gotoRuleTaskList(page);
    await deleteTasksByNames(page, [taskName]);
    await gotoRuleTaskCreate(page);
    await fillTaskBaseInfo(page, scenario);
    await importRulePackage(page, scenario.packageName);
    await completeTaskScheduleAndSave(page, taskName);
    if (scenario.afterCreate) {
      await scenario.afterCreate(page);
    }
    preparedTasks.add(actualTaskName);
    executedTasks.delete(actualTaskName);
    readyReports.delete(actualTaskName);
  }
}

/**
 * 规则集已由调用方预先创建，执行任务并等待完成（跳过规则集创建步骤）。
 */
export async function ensureExecutedRuleTasksWithPreSeededRuleSet(
  page: Page,
  taskNames: readonly string[],
): Promise<void> {
  await ensureRuleTasksWithPreSeededRuleSet(page, taskNames);
  for (const taskName of taskNames) {
    const actualTaskName = resolveTaskName(taskName);
    if (executedTasks.has(actualTaskName)) {
      continue;
    }
    await executeTaskFromList(page, taskName);
    await waitForTaskInstanceFinished(page, taskName, 600000);
    executedTasks.add(actualTaskName);
  }
}

/**
 * 规则集已由调用方预先创建，创建并执行任务，等待质量报告就绪（跳过规则集创建步骤）。
 */
export async function ensureQualityReportsReadyWithPreSeededRuleSet(
  page: Page,
  taskNames: readonly string[],
): Promise<void> {
  await ensureExecutedRuleTasksWithPreSeededRuleSet(page, taskNames);
  for (const taskName of taskNames) {
    const actualTaskName = resolveTaskName(taskName);
    if (readyReports.has(actualTaskName)) {
      continue;
    }
    await waitForQualityReportRow(page, taskName, 600000);
    readyReports.add(actualTaskName);
  }
}

export async function ensureExecutedRuleTasks(
  page: Page,
  taskNames: readonly string[],
): Promise<void> {
  await ensureRuleTasks(page, taskNames);
  for (const taskName of taskNames) {
    const actualTaskName = resolveTaskName(taskName);
    if (executedTasks.has(actualTaskName)) {
      continue;
    }
    await executeTaskFromList(page, taskName);
    await waitForTaskInstanceFinished(page, taskName, 1200000);
    executedTasks.add(actualTaskName);
  }
}

export async function ensureQualityReportsReady(
  page: Page,
  taskNames: readonly string[],
): Promise<void> {
  await ensureExecutedRuleTasks(page, taskNames);
  for (const taskName of taskNames) {
    const actualTaskName = resolveTaskName(taskName);
    if (readyReports.has(actualTaskName)) {
      continue;
    }
    await waitForQualityReportRow(page, taskName, 1200000);
    readyReports.add(actualTaskName);
  }
}

export async function openTaskInstanceDetail(page: Page, instanceRow: Locator): Promise<Locator> {
  const detailResponsePromise = page
    .waitForResponse(
      (response) =>
        response.url().includes("/monitorRecord/detailReport") &&
        response.request().method() === "POST",
      { timeout: 15000 },
    )
    .catch(() => null);

  await instanceRow.getByRole("button").first().click();
  await detailResponsePromise;
  const detailDrawer = page.locator(".dtc-drawer:visible, .ant-drawer:visible").last();
  await expect(detailDrawer).toBeVisible({ timeout: 10000 });
  return detailDrawer;
}

export async function openTaskLogDrawer(page: Page, instanceRow: Locator): Promise<Locator> {
  const logButton = instanceRow.getByRole("button", { name: /查看日志|日志/ }).first();
  await expect(logButton).toBeVisible({ timeout: 10000 });
  await logButton.click();
  const drawer = page
    .locator(".ant-drawer:visible, .dtc-drawer:visible, .ant-modal:visible")
    .last();
  await expect(drawer).toBeVisible({ timeout: 10000 });
  return drawer;
}

export async function gotoTaskListAndLocate(taskName: string, page: Page): Promise<Locator> {
  await gotoRuleTaskList(page);
  const row = getTableRowByTaskName(page, taskName);
  await expect(row).toBeVisible({ timeout: 10000 });
  return row;
}

export async function gotoValidationAndLocate(taskName: string, page: Page): Promise<Locator> {
  await gotoValidationResults(page);
  const row = getTableRowByTaskName(page, taskName);
  await expect(row).toBeVisible({ timeout: 10000 });
  return row;
}

export async function gotoQualityAndLocate(taskName: string, page: Page): Promise<Locator> {
  await gotoQualityReport(page);
  const row = getTableRowByTaskName(page, getReportName(taskName));
  await expect(row).toBeVisible({ timeout: 10000 });
  return row;
}

export function getTableRowByTaskName(page: Page, taskName: string): Locator {
  const namePattern = new RegExp(resolveNameCandidates(taskName).map(escapeRegExp).join("|"));
  return page.locator(TABLE_ROWS).filter({ hasText: namePattern }).first();
}

export async function executeTaskFromList(page: Page, taskName: string): Promise<void> {
  try {
    await executeSharedTaskFromList(page, taskName);
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("not found in monitor list")) {
      throw error;
    }
  }

  const taskMonitorRow = await getTaskMonitorRowByCandidates(page, taskName);
  const monitorId =
    taskMonitorRow.id === undefined || taskMonitorRow.id === null
      ? null
      : Number(taskMonitorRow.id);
  if (monitorId !== null) {
    const executeResponse =
      (await postTaskApi<{
        success?: boolean;
        message?: string;
      }>(page, "/dassets/v1/valid/monitor/immediatelyExecuted", {
        monitorId,
      })) ?? {};

    if (executeResponse.success) {
      await page.waitForTimeout(1000);
      return;
    }
  }

  await gotoRuleTaskList(page);
  const targetRow = getTableRowByTaskName(page, taskName);
  await expect(targetRow).toBeVisible({ timeout: 15000 });
  await targetRow.locator("td").nth(1).locator("a").first().click();
  const detailDrawer = page.locator(".dtc-drawer:visible").last();
  await expect(detailDrawer).toBeVisible({ timeout: 10000 });
  await detailDrawer.getByRole("button", { name: "立即执行" }).first().click();
  await page.waitForTimeout(1000);
}

export async function waitForTaskInstanceFinished(
  page: Page,
  taskName: string,
  timeout = 180000,
): Promise<Locator> {
  try {
    return await waitForSharedTaskInstanceFinished(page, taskName, timeout);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      !message.includes("did not finish within") &&
      !message.includes("not found in monitor list")
    ) {
      throw error;
    }
  }

  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    await gotoValidationResults(page);
    const row = getTableRowByTaskName(page, taskName);
    const visible = await row.isVisible({ timeout: 2000 }).catch(() => false);
    const rowText = visible ? await row.innerText().catch(() => "") : "";
    if (
      visible &&
      /校验通过|校验未通过|校验不通过|校验异常|执行失败|失败/.test(rowText) &&
      !/运行中|执行中|排队|等待/.test(rowText)
    ) {
      return row;
    }

    await page.waitForTimeout(5000);
    await page.reload({ waitUntil: "networkidle" }).catch(() => undefined);
    await page.waitForTimeout(1000);
  }

  throw new Error(
    `Task instance "${resolveTaskNameCandidates(taskName)[0]}" did not finish within ${timeout}ms`,
  );
}

export async function waitForQualityReportRow(
  page: Page,
  taskName: string,
  timeout = 180000,
): Promise<Locator> {
  try {
    return await waitForSharedQualityReportRow(page, taskName, timeout);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("did not appear within")) {
      throw error;
    }
  }

  const deadline = Date.now() + timeout;
  const reportName = getReportName(taskName);
  while (Date.now() < deadline) {
    await gotoQualityReport(page);
    const row = getTableRowByTaskName(page, reportName);
    if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
      return row;
    }
    await page.waitForTimeout(5000);
  }

  throw new Error(
    `Quality report row "${resolveNameCandidates(reportName)[0]}" did not appear within ${timeout}ms`,
  );
}

export {
  getQualityReportRuleRow,
  getReportName,
  getTaskDetailRuleCard,
  gotoQualityReport,
  gotoRuleTaskList,
  gotoValidationResults,
  openQualityReportDetail,
  openQualityReportRuleDetail,
  openTaskRuleDetailDataDrawer,
};
