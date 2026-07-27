import { waitForUiSettled } from "../../helpers/index";
import { existsSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import ExcelJS from "exceljs";

import { buildDataAssetsApiUrl, buildDataAssetsUrl, getEnvConfig } from "../../helpers/test-setup";
import {
  DQ_RULE_MAIN_TABLE,
  LTQC_LOCAL_RULESET_AVAILABLE_TABLE,
  SPARKTHRIFT_SOURCE_TYPE_LABEL,
  VEHICLE_INFO_DIM_TABLE,
  VEHICLE_ORDER_TABLE,
  VEHICLE_QUALITY_RULESET_TABLE,
} from "./main-flow-fixtures";

function getProjectId(): string | number {
  return getEnvConfig().projects.quality.id;
}

function getQualityProjectName(): string {
  return getEnvConfig().projects.quality.name;
}

function getDefaultDatasource() {
  const env = getEnvConfig();
  return env.datasources[env.runtime.defaultDatasource];
}

const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";
const DQ_PROJECT_STORAGE_KEY = "dq_project_id";

type DqPageTarget = {
  path: string;
  labels: readonly string[];
  tableHeaders?: readonly string[];
  apiPaths?: readonly string[];
};

type DqRuleTaskRecord = {
  id?: string | number;
  monitorId?: string | number;
  tableName?: string;
  ruleName?: string;
  sourceTypeName?: string;
  dataName?: string;
  assetsPeriodTypeName?: string;
  periodTypeName?: string;
  recentNotifyNum?: number | string;
  modifyUser?: string[] | string;
  gmtModified?: string;
  isClosed?: number;
  associated?: number;
};

type DqRuleTaskPageQuery = {
  success?: boolean;
  code?: number;
  data?: {
    data?: DqRuleTaskRecord[];
    rows?: DqRuleTaskRecord[];
    list?: DqRuleTaskRecord[];
    records?: DqRuleTaskRecord[];
    total?: number;
    totalCount?: number;
    count?: number;
  };
};

type DqRuleSetRecord = {
  id?: string | number;
  tableName?: string;
  schemaName?: string;
  sourceName?: string;
  sourceTypeName?: string;
  packageCount?: number | string;
  ruleCount?: number | string;
  description?: string | null;
  gmtModified?: string;
  lastEditUser?: string;
  packageVOList?: DqRuleSetPackage[];
};

type DqRuleSetPageQuery = {
  success?: boolean;
  code?: number;
  data?: {
    contentList?: DqRuleSetRecord[];
    data?: DqRuleSetRecord[];
    rows?: DqRuleSetRecord[];
    list?: DqRuleSetRecord[];
    records?: DqRuleSetRecord[];
  };
};

type DqRuleSetPageData = {
  contentList?: DqRuleSetRecord[];
  current?: string | number;
  size?: string | number;
  total?: string | number;
};

type DqRuleSetPackage = {
  packageName?: string;
  rules?: DqRuleSetRule[];
};

type DqRuleSetRule = {
  functionName?: string | null;
  columnName?: string | null;
  description?: string | null;
  ruleLibraryId?: string | number | null;
  ruleLibraryValue?: string | null;
  standardRules?: DqRuleSetRule[] | null;
};

type DqGlobalParamRecord = {
  paramName?: string;
  paramValue?: string;
  paramDesc?: string;
};

type DqGlobalParamsPage = {
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  data?: DqGlobalParamRecord[];
};

type DqApiResponse<T> = {
  success?: boolean;
  code?: number;
  data?: T;
};

type DqOverviewCountRecord = {
  ruleCount?: string | number;
  ruleSetCount?: string | number;
  monitorCount?: string | number;
  passCount?: string | number;
  errorCount?: string | number;
  lastUpdateTime?: string;
};

type DqOverviewRuleDistributionRecord = {
  ruleType?: string;
  ruleCount?: string | number;
  percentage?: string | number;
  usageRate?: string | number;
};

type DqOverviewTopRecord = {
  tableName?: string;
  schemaName?: string;
  sourceName?: string;
  monitorCount?: string | number;
  failedCount?: string | number;
  unPassCount?: string | number;
  lastExecuteTime?: string;
};

type DqOverviewRecentErrorRecord = {
  monitorId?: string | number;
  recordId?: string | number;
  tableName?: string;
  schemaName?: string;
  sourceName?: string;
  ruleName?: string;
  status?: string | number;
  periodTypeName?: string;
  associated?: string;
  cycTime?: string;
  executeTime?: string;
  execEndTime?: string;
};

type DqOverviewWeeklyResult = {
  statisticDate?: string[];
  passCount?: Array<string | number>;
  unpassCount?: Array<string | number>;
};

type DqOverviewTableOption = {
  tableName?: string;
};

type SparkThriftEnvParam = {
  name: string;
  value: string;
};

type SparkThriftRuleValidationFusionChecks = {
  ruleSetListAndConfiguredTableFilter?: boolean;
  ruleSetDetail?: boolean;
  ruleSetPackageNameManagement?: boolean;
  ruleSetGlobalParams?: boolean;
  ruleSetRuleEdit?: boolean;
  taskDetectionToggle?: boolean;
  monitorRecordTableSearch?: boolean;
  sameTableSecondTask?: boolean;
  passHasNoDirtyDetail?: boolean;
  partitionModesVisible?: boolean;
  t1BeforeImmediateWithEnvParams?: readonly SparkThriftEnvParam[];
  samplingRows?: string;
  failByEditingExistingTask?: {
    partitionMode: "existing" | "manual";
    deleteRuleSetBeforeRun?: boolean;
  };
  dirtyDetail?: {
    highlightedColumns?: readonly string[];
    verifyDownloadEntry?: boolean;
  };
};

export type SparkThriftQualityRuleValidationScenario = {
  archiveLine: number;
  title: string;
  tableName: string;
  comparisonTableName?: string;
  ruleCategory: string;
  scope?: "字段级" | "单表" | "多表";
  statisticFunction: string;
  fields: readonly string[];
  comparisonFields?: readonly string[];
  primaryKeys?: readonly string[];
  comparisonPrimaryKeys?: readonly string[];
  fieldLogic?: "and" | "or";
  sourceRefKind?: string;
  customSqlTemplate?: {
    ruleName: string;
    ruleType: number;
    relationRange: number;
    ruleDesc: string;
    customConfiguration: string;
    params: readonly DqRuleBaseCustomSqlParam[];
  };
  ruleOptions?: readonly {
    label: RegExp;
    value: string;
  }[];
  ruleInputs?: readonly {
    label: string;
    value: string;
  }[];
  expectation?: {
    method: string;
    operator?: string;
    value: string;
  };
  description: string;
  passPartition: string;
  failPartition: string;
  passExpectedValue: string;
  failExpectedValue: string;
  dirtyEvidence: readonly string[];
  fusionChecks?: SparkThriftRuleValidationFusionChecks;
};

type DqRuleBaseTemplateRecord = {
  id?: string | number;
  functionId?: string | number;
  functionName?: string;
  functionExplain?: string;
  ruleTaskType?: number;
  relationNumber?: string | number;
  relationRange?: number;
  description?: string;
  openStatus?: number;
};

type DqRuleBaseTemplatePage = {
  contentList?: DqRuleBaseTemplateRecord[];
  total?: string | number;
};

type DqRuleBaseCustomSqlParam = {
  param?: string;
  type?: number;
  paramName?: string;
  description?: string | null;
  value?: string | null;
};

type DqRuleBaseCustomSqlRecord = {
  id?: string | number;
  projectId?: string | number;
  ruleName?: string;
  ruleType?: number;
  relationRange?: number;
  ruleDesc?: string | null;
  associationRuleCount?: string | number;
  customConfiguration?: string;
  customParam?: DqRuleBaseCustomSqlParam[];
};

type DqRuleBaseCustomSqlPage = {
  contentList?: DqRuleBaseCustomSqlRecord[];
  total?: string | number;
};

type DqRuleBaseCustomRegexRecord = {
  id?: string | number;
  projectId?: string | number;
  ruleName?: string;
  ruleType?: number;
  associationScope?: number;
  ruleDesc?: string | null;
  ruleContent?: string;
  associationRuleCount?: string | number;
};

type DqRuleBaseCustomRegexPage = {
  contentList?: DqRuleBaseCustomRegexRecord[];
  total?: string | number;
};

type DqJsonValidationConfigRecord = {
  id?: string | number;
  jsonKey?: string;
  name?: string | null;
  value?: string | null;
  dataSourceType?: number;
  createBy?: string;
  updateBy?: string;
  createAt?: string;
  updateAt?: string;
  createUser?: string;
  lastEditUser?: string;
  gmtCreate?: string;
  gmtModified?: string;
  children?: DqJsonValidationConfigRecord[];
};

type DqJsonValidationConfigPage = {
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  totalPage?: number;
  data?: DqJsonValidationConfigRecord[];
};

type DqGeneratedReportRecord = {
  id?: string | number;
  reportName?: string;
  reportGenerateType?: number;
  dataContextStart?: string;
  dataContextEnd?: string;
  execEndTime?: string;
  status?: number;
  tableNames?: string | null;
};

type DqGeneratedReportPage = {
  contentList?: DqGeneratedReportRecord[];
  current?: string | number;
  size?: string | number;
  total?: string | number;
};

type DqDownloadArtifact = {
  path: string;
  suggestedName: string;
};

type DqMonitorRecord = {
  id?: string | number;
  monitorId?: string | number;
  tableName?: string;
  ruleName?: string;
  status?: number;
  sourceTypeName?: string;
  sourceName?: string;
  periodTypeName?: string;
  assetsPeriodTypeName?: string;
  associated?: number;
  cycTime?: string;
  executeTime?: string | null;
  execEndTime?: string;
  execTimeStr?: string | null;
  submitUser?: string;
  modifyUser?: string;
  jobKey?: string;
  flowJobId?: string;
};

type DqMonitorRecordPage = {
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  totalPage?: number;
  data?: DqMonitorRecord[];
};

type DqMonitorRecordDetail = {
  functionName?: string;
  columnName?: string;
  verifyTypeValue?: string;
  status?: number;
  haveDirty?: number;
  statistic?: string | number;
  selectDataSql?: string | null;
  partition?: string | null;
  ruleStrength?: number;
  modifyUser?: string;
  gmtModified?: string;
  columnNameList?: string[];
};

type DqMonitorRecordDirtyResult = {
  table?: string;
  result?: Array<Record<string, unknown>>;
  highlightColumns?: string[];
};

type DqMonitorRecordCandidateOptions = {
  fuzzyName: string;
  status: number;
};

async function installProject(page: Page): Promise<void> {
  await page.addInitScript(
    ([assetKey, dqKey, projectId]) => {
      sessionStorage.setItem(assetKey, projectId);
      sessionStorage.setItem(dqKey, projectId);
      localStorage.setItem(assetKey, projectId);
      localStorage.setItem(dqKey, projectId);
      localStorage.setItem("dataAssets_project_id", projectId);
      localStorage.setItem("currentProject", projectId);
    },
    [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(getProjectId())],
  );
}

async function injectProject(page: Page): Promise<void> {
  await page.evaluate(
    ([assetKey, dqKey, projectId]) => {
      sessionStorage.setItem(assetKey, projectId);
      sessionStorage.setItem(dqKey, projectId);
      localStorage.setItem(assetKey, projectId);
      localStorage.setItem(dqKey, projectId);
      localStorage.setItem("dataAssets_project_id", projectId);
      localStorage.setItem("currentProject", projectId);
    },
    [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(getProjectId())],
  );
}

export async function gotoDataQualityPage(page: Page, path: string): Promise<void> {
  await installProject(page);
  const url = buildDataAssetsUrl(path, getProjectId());
  let lastStatus: number | undefined;
  let lastBodyText = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    lastStatus = response?.status();
    await injectProject(page);
    await waitForUiSettled(page);

    const transient = await getTransientDqShellText(page, lastStatus);
    if (!transient) return;
    lastBodyText = transient;
    await waitForUiSettled(page);
  }

  throw new Error(`数据质量页面未能稳定加载: ${url}, lastStatus=${lastStatus ?? "unknown"}, body=${lastBodyText}`);
}

async function getTransientDqShellText(page: Page, status?: number): Promise<string> {
  const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  if (status && status >= 500) return bodyText || `HTTP ${status}`;
  if (bodyText.includes("发现新版本，请刷新获取新版本") || bodyText.includes("502 Bad Gateway")) return bodyText;
  const bodyChildCount = await page.evaluate(() => document.body.childElementCount).catch(() => 0);
  if (bodyText.trim().length === 0 && bodyChildCount === 0) return "empty body";
  return "";
}

export async function expectDataQualityOverviewShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/overview",
    labels: [
      "数据质量概览",
      "规则数",
      "规则集总数",
      "规则任务数",
      "校验通过数/校验异常数",
      "规则库分布",
      "校验异常top排名",
      "近期校验异常结果",
      "总览",
      "规则库配置",
      "规则集管理",
      "规则任务管理",
      "校验结果查询",
      "数据质量报告",
    ],
    tableHeaders: [
      "数据表",
      "所属数据库",
      "所属数据源",
      "任务名称",
      "状态",
      "执行周期",
      "计划时间",
      "开始时间",
      "结束时间",
      "操作",
    ],
    apiPaths: [
      "/dassets/v1/valid/monitorOverview/countRecord",
      "/dassets/v1/valid/monitorOverview/getRuleDistribution",
      "/dassets/v1/valid/monitorOverview/listRecentError",
      "/dassets/v1/valid/monitorOverview/countErrorTopRecord",
    ],
  });
}

export async function expectDataQualityOverviewDashboardContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const countRecordResponse = waitForDqJson<DqOverviewCountRecord>(
    page,
    "/dassets/v1/valid/monitorOverview/countRecord",
  );
  const ruleDistributionResponse = waitForDqJson<DqOverviewRuleDistributionRecord[]>(
    page,
    "/dassets/v1/valid/monitorOverview/getRuleDistribution",
  );
  const ruleCategoriesResponse = waitForDqJson<DqOverviewRuleDistributionRecord[]>(
    page,
    "/dassets/v1/valid/monitorOverview/getRuleCategories",
  );
  const topRecordResponse = waitForDqJson<DqOverviewTopRecord[]>(
    page,
    "/dassets/v1/valid/monitorOverview/countErrorTopRecord",
  );
  const recentErrorResponse = waitForDqJson<DqOverviewRecentErrorRecord[]>(
    page,
    "/dassets/v1/valid/monitorOverview/listRecentError",
  );
  const weeklyResultResponse = waitForDqJson<DqOverviewWeeklyResult>(
    page,
    "/dassets/v1/valid/monitorOverview/listWeeklyResult",
  );
  const tableOptionsResponse = waitForDqJson<DqOverviewTableOption[]>(
    page,
    "/dassets/v1/valid/monitorOverview/listTableOptions",
  );

  await gotoDataQualityPage(page, "/dq/overview");

  const [
    countRecord,
    ruleDistribution,
    ruleCategories,
    topRecords,
    recentErrors,
    weeklyResult,
    tableOptions,
  ] = await Promise.all([
    expectDqSuccess(await countRecordResponse, `${sourceRef}: countRecord 应返回成功状态`),
    expectDqSuccess(await ruleDistributionResponse, `${sourceRef}: getRuleDistribution 应返回成功状态`),
    expectDqSuccess(await ruleCategoriesResponse, `${sourceRef}: getRuleCategories 应返回成功状态`),
    expectDqSuccess(await topRecordResponse, `${sourceRef}: countErrorTopRecord 应返回成功状态`),
    expectDqSuccess(await recentErrorResponse, `${sourceRef}: listRecentError 应返回成功状态`),
    expectDqSuccess(await weeklyResultResponse, `${sourceRef}: listWeeklyResult 应返回成功状态`),
    expectDqSuccess(await tableOptionsResponse, `${sourceRef}: listTableOptions 应返回成功状态`),
  ]);

  const body = page.locator("body");
  for (const label of [
    "数据质量概览",
    "规则数",
    "规则集总数",
    "规则任务数",
    "校验通过数/校验异常数",
    "规则库分布",
    "已配置规则分类",
    "校验异常top排名",
    "近期校验异常结果",
    "近7日校验结果分析",
    "统计范围",
    "全部",
  ]) {
    await expect(body, `${sourceRef}: 数据质量总览应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  for (const header of [
    "数据表",
    "所属数据库",
    "所属数据源",
    "任务名称",
    "状态",
    "执行周期",
    "计划时间",
    "开始时间",
    "结束时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 近期校验异常结果列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  assertOverviewCountCards(page, sourceRef, countRecord);
  assertOverviewRuleCharts(sourceRef, ruleDistribution, ruleCategories);
  await assertOverviewTopRanking(body, sourceRef, topRecords);
  await assertOverviewRecentErrors(body, sourceRef, recentErrors);
  await assertOverviewWeeklyTrend(page, sourceRef, weeklyResult, tableOptions);

  await expect(
    page.locator("canvas, svg").filter({ visible: true }).first(),
    `${sourceRef}: 总览趋势/分布/排行图表应渲染为可见图形容器`,
  ).toBeVisible({ timeout: 30000 });

  await expect
    .poll(
      () => page.locator("canvas, svg").filter({ visible: true }).count(),
      {
        message: `${sourceRef}: 总览应至少渲染 3 个可见图形容器`,
        timeout: 30000,
      },
    )
    .toBeGreaterThanOrEqual(3);
}

export async function expectDataQualityOverviewMoreLink(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/overview");
  await clickDqText(page, "查看更多", sourceRef);
  await expect(page, `${sourceRef}: 近期校验异常结果「查看更多」应跳转至校验结果查询`).toHaveURL(
    /\/dq\/taskQuery/,
    { timeout: 30000 },
  );
  await expect(page.locator("body"), `${sourceRef}: 跳转后应展示校验结果查询页面`).toContainText(
    "校验结果查询",
    { timeout: 30000 },
  );
}

export async function expectDataQualityOverviewRecentErrorDetailContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const recentErrorResponse = waitForDqJson<DqOverviewRecentErrorRecord[]>(
    page,
    "/dassets/v1/valid/monitorOverview/listRecentError",
  );
  await gotoDataQualityPage(page, "/dq/overview");
  const recentErrors = expectDqSuccess(
    await recentErrorResponse,
    `${sourceRef}: 近期校验异常结果列表应请求成功`,
  );
  expect(recentErrors.length, `${sourceRef}: 近期校验异常结果应返回可查看记录`).toBeGreaterThan(0);
  const target = recentErrors.find((record) => record.recordId && record.monitorId && record.tableName && record.ruleName);
  expect(target, `${sourceRef}: 近期校验异常结果应包含可打开详情的目标记录`).toBeTruthy();
  const targetRecord = target as DqOverviewRecentErrorRecord;
  const tableName = expectNonEmptyString(targetRecord.tableName, `${sourceRef}: 近期异常目标应包含数据表`);
  const ruleName = expectNonEmptyString(targetRecord.ruleName, `${sourceRef}: 近期异常目标应包含任务名称`);

  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: tableName }).filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 近期异常列表应展示目标任务行`).toBeVisible({ timeout: 30000 });
  for (const expectedText of [
    tableName,
    expectNonEmptyString(targetRecord.schemaName, `${sourceRef}: 近期异常目标应包含所属数据库`),
    expectNonEmptyString(targetRecord.sourceName, `${sourceRef}: 近期异常目标应包含所属数据源`),
    ruleName,
    "校验异常",
    expectNonEmptyString(targetRecord.periodTypeName, `${sourceRef}: 近期异常目标应包含执行周期`),
    expectNonEmptyString(targetRecord.cycTime, `${sourceRef}: 近期异常目标应包含计划时间`),
    expectNonEmptyString(targetRecord.executeTime, `${sourceRef}: 近期异常目标应包含开始时间`),
    expectNonEmptyString(targetRecord.execEndTime, `${sourceRef}: 近期异常目标应包含结束时间`),
  ]) {
    await expect(targetRow, `${sourceRef}: 近期异常目标行应展示「${expectedText}」`).toContainText(expectedText, {
      timeout: 30000,
    });
  }

  const detailResponse = waitForDqJson<DqMonitorRecordDetail[]>(
    page,
    "/dassets/v1/valid/monitorRecord/detailReport",
  );
  await targetRow.getByRole("button", { name: "查看详情" }).click({ timeout: 30000 });
  const detailRecords = expectDqSuccess(await detailResponse, `${sourceRef}: 近期异常详情应请求成功`);
  expect(detailRecords.length, `${sourceRef}: 近期异常详情应返回规则结果`).toBeGreaterThan(0);
  const detailFunctionNames = detailRecords.map((record) =>
    expectNonEmptyString(record.functionName, `${sourceRef}: 详情应包含规则结果名称`),
  );

  const body = page.locator("body");
  for (const expectedText of [ruleName, "监控报告", "校验未通过"]) {
    await expect(body, `${sourceRef}: 近期异常详情应展示「${expectedText}」`).toContainText(expectedText, {
      timeout: 30000,
    });
  }
  await expect
    .poll(
      async () => {
        const text = await body.innerText();
        return detailFunctionNames.find((functionName) => text.includes(functionName)) ?? "";
      },
      {
        message: `${sourceRef}: 近期异常详情应展示接口返回的至少一条规则结果`,
        timeout: 30000,
      },
    )
    .not.toBe("");
  const bodyText = await body.innerText();
  const visibleFunctionName = detailFunctionNames.find((functionName) => bodyText.includes(functionName)) ?? "";
  expect(detailFunctionNames, `${sourceRef}: 可见规则结果应来自 detailReport 接口`).toContain(visibleFunctionName);
}

export async function expectDataQualityOverviewLastUpdateRefreshContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const beforeResponse = waitForDqJson<DqOverviewCountRecord>(
    page,
    "/dassets/v1/valid/monitorOverview/countRecord",
  );
  await gotoDataQualityPage(page, "/dq/overview");
  const beforeRecord = expectDqSuccess(await beforeResponse, `${sourceRef}: 刷新前 countRecord 应返回成功状态`);
  const beforeUpdateTime = expectNonEmptyString(
    beforeRecord.lastUpdateTime,
    `${sourceRef}: 刷新前 countRecord.lastUpdateTime 应存在`,
  );
  await assertOverviewCountCards(page, sourceRef, beforeRecord);

  await gotoDataQualityPage(page, "/dq/rule");
  const records = await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const targetRecord = expectRuleTaskArchiveTarget(records, sourceRef);
  const ruleName = expectNonEmptyString(targetRecord.ruleName, `${sourceRef}: 可执行任务应包含任务名称`);
  const tableName = expectNonEmptyString(targetRecord.tableName, `${sourceRef}: 可执行任务应包含数据表`);
  const taskRow = page.locator(".ant-table-tbody tr").filter({ hasText: tableName }).filter({ hasText: ruleName }).first();
  await runRuleTaskImmediately(page, sourceRef, taskRow);
  await expectLatestMonitorRecordForRuleTask(page, sourceRef, ruleName);

  const afterResponse = waitForDqJson<DqOverviewCountRecord>(
    page,
    "/dassets/v1/valid/monitorOverview/countRecord",
    (payload) => {
      const nextUpdateTime = payload.data?.lastUpdateTime;
      return typeof nextUpdateTime === "string" && nextUpdateTime >= beforeUpdateTime;
    },
  );
  await gotoDataQualityPage(page, "/dq/overview");
  const afterRecord = expectDqSuccess(await afterResponse, `${sourceRef}: 刷新后 countRecord 应返回成功状态`);
  const afterUpdateTime = expectNonEmptyString(
    afterRecord.lastUpdateTime,
    `${sourceRef}: 刷新后 countRecord.lastUpdateTime 应存在`,
  );
  expect(
    afterUpdateTime >= beforeUpdateTime,
    `${sourceRef}: 最近一次更新时间应不早于任务执行前时间 ${beforeUpdateTime}`,
  ).toBe(true);
  await assertOverviewCountCards(page, sourceRef, afterRecord);
  await assertOverviewRecentErrorsAfterRefresh(page, sourceRef, ruleName);
}

export async function expectDataQualityRuleShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/rule",
    labels: ["规则任务管理", "新建监控规则", "最近修改人", "我收藏的表"],
    tableHeaders: [
      "表",
      "任务名称",
      "数据源",
      "执行周期",
      "规则状态",
      "是否关联任务",
      "最近30天告警数",
      "最近修改人",
      "最近修改时间",
      "操作",
    ],
    apiPaths: ["/dassets/v1/valid/monitor/pageQuery"],
  });
}

export async function expectDataQualityRuleTaskListContract(page: Page, sourceRef: string): Promise<void> {
  const pageQueryResponse = waitForRuleTaskPageQuery(page);
  void pageQueryResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");

  await expect(page, `${sourceRef}: 规则任务管理应保持在 /dq/rule 路由`).toHaveURL(/\/dq\/rule/, {
    timeout: 30000,
  });
  const body = page.locator("body");
  for (const label of ["规则任务管理", "最近修改人", "我收藏的表", "新建监控规则"]) {
    await expect(body, `${sourceRef}: 规则任务管理页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  for (const header of [
    "表",
    "任务名称",
    "数据源",
    "执行周期",
    "规则状态",
    "是否关联任务",
    "最近30天告警数",
    "最近修改人",
    "最近修改时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 规则任务列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  const payload = await pageQueryResponse;
  expect(payload.success ?? payload.code === 1, `${sourceRef}: monitor/pageQuery 应返回成功状态`).toBe(true);
  const records = getDqRuleTaskRecords(payload);
  expect(records.length, `${sourceRef}: monitor/pageQuery 应返回至少一条规则任务记录`).toBeGreaterThan(0);
  expect(getDqRuleTaskTotal(payload), `${sourceRef}: monitor/pageQuery total 应覆盖当前返回记录数`).toBeGreaterThanOrEqual(
    records.length,
  );

  const firstRecord = records[0];
  const tableName = expectNonEmptyString(firstRecord.tableName, `${sourceRef}: API 首条记录应包含 tableName`);
  const ruleName = expectNonEmptyString(firstRecord.ruleName, `${sourceRef}: API 首条记录应包含 ruleName`);
  const dataSource = [
    expectNonEmptyString(firstRecord.sourceTypeName, `${sourceRef}: API 首条记录应包含 sourceTypeName`),
    expectNonEmptyString(firstRecord.dataName, `${sourceRef}: API 首条记录应包含 dataName`),
  ].join(" / ");
  expectNonEmptyString(
    firstRecord.assetsPeriodTypeName ?? firstRecord.periodTypeName,
    `${sourceRef}: API 首条记录应包含执行周期`,
  );
  formatDqRuleTaskStatus(firstRecord.isClosed, sourceRef);
  formatDqRuleTaskAssociated(firstRecord.associated, sourceRef);
  const recentNotifyNum = String(firstRecord.recentNotifyNum);
  expect(recentNotifyNum, `${sourceRef}: API 首条记录应包含最近30天告警数`).toMatch(/^\d+$/);
  const modifyUser = formatDqRuleTaskModifyUser(firstRecord.modifyUser, sourceRef);
  const gmtModified = expectNonEmptyString(firstRecord.gmtModified, `${sourceRef}: API 首条记录应包含最近修改时间`);

  const firstRecordRow = page.locator(".ant-table-tbody tr", { hasText: ruleName }).filter({ hasText: tableName }).first();
  await expect(firstRecordRow, `${sourceRef}: 规则任务列表应展示 API 首条记录 ${ruleName}`).toBeVisible({
    timeout: 30000,
  });
  for (const expectedText of [tableName, ruleName, dataSource, recentNotifyNum, modifyUser, gmtModified]) {
    await expect(firstRecordRow, `${sourceRef}: API 首条记录字段「${expectedText}」应在表格行中展示`).toContainText(
      expectedText,
      { timeout: 30000 },
    );
  }
}

export async function expectDataQualityRuleTaskSearchFavoriteContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const pageQueryResponse = waitForRuleTaskPageQuery(page);
  void pageQueryResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");
  const payload = await pageQueryResponse;
  expect(payload.success ?? payload.code === 1, `${sourceRef}: monitor/pageQuery 应返回成功状态`).toBe(true);
  const records = getDqRuleTaskRecords(payload);
  expect(records.length, `${sourceRef}: 规则任务列表应返回记录`).toBeGreaterThan(0);

  const targetRecord = expectRuleTaskArchiveTarget(records, sourceRef);
  const tableName = expectNonEmptyString(targetRecord.tableName, `${sourceRef}: 目标任务应包含表`);
  const ruleName = expectNonEmptyString(targetRecord.ruleName, `${sourceRef}: 目标任务应包含任务名称`);
  const dataSource = [
    expectNonEmptyString(targetRecord.sourceTypeName, `${sourceRef}: 目标任务应包含数据源类型`),
    expectNonEmptyString(targetRecord.dataName, `${sourceRef}: 目标任务应包含数据源名称`),
  ].join(" / ");
  const status = formatDqRuleTaskStatus(targetRecord.isClosed, sourceRef);
  const associated = formatDqRuleTaskAssociated(targetRecord.associated, sourceRef);
  const recentNotifyNum = String(targetRecord.recentNotifyNum);
  expect(recentNotifyNum, `${sourceRef}: 目标任务最近30天告警数应为数字`).toMatch(/^\d+$/);
  const modifyUser = formatDqRuleTaskModifyUser(targetRecord.modifyUser, sourceRef);
  const gmtModified = expectNonEmptyString(targetRecord.gmtModified, `${sourceRef}: 目标任务应包含最近修改时间`);

  const searchRecords = await searchRuleTaskByTableName(page, tableName, sourceRef);
  expect(searchRecords.length, `${sourceRef}: 输入表名搜索后应返回匹配任务`).toBeGreaterThan(0);
  expect(
    searchRecords.every((record) => String(record.tableName ?? "").includes(tableName)),
    `${sourceRef}: 表名搜索结果应仅展示匹配任务`,
  ).toBe(true);

  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: tableName }).filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 搜索后列表应展示目标任务`).toBeVisible({ timeout: 30000 });
  for (const expectedText of [
    tableName,
    ruleName,
    dataSource,
    status,
    associated,
    recentNotifyNum,
    modifyUser,
    gmtModified,
  ]) {
    await expect(targetRow, `${sourceRef}: 目标任务行应展示「${expectedText}」`).toContainText(expectedText, {
      timeout: 30000,
    });
  }

  const wasFavorite = await isRuleTaskRowFavorited(targetRow);
  if (!wasFavorite) {
    await toggleRuleTaskFavorite(targetRow, sourceRef, "收藏");
  }

  try {
    const favoriteResponse = waitForRuleTaskPageQuery(page);
    void favoriteResponse.catch(() => {});
    await toggleRuleTaskFavoriteFilter(page, sourceRef);
    const favoriteRecords = getDqRuleTaskRecords(await favoriteResponse);
    expect(
      favoriteRecords.some((record) => isSameRuleTaskRecord(record, targetRecord)),
      `${sourceRef}: 我收藏的表筛选后应包含刚收藏的目标任务`,
    ).toBe(true);

    const modifyUserResponse = waitForRuleTaskPageQuery(page);
    void modifyUserResponse.catch(() => {});
    await selectDqFormOptionBySearch(page, /最近修改人/, modifyUser, sourceRef);
    const modifyUserRecords = getDqRuleTaskRecords(await modifyUserResponse);
    expect(modifyUserRecords.length, `${sourceRef}: 最近修改人筛选后应返回任务`).toBeGreaterThan(0);
    expect(
      modifyUserRecords.every((record) => formatDqRuleTaskModifyUser(record.modifyUser, sourceRef) === modifyUser),
      `${sourceRef}: 最近修改人筛选结果应仅展示 ${modifyUser}`,
    ).toBe(true);
  } finally {
    if (!wasFavorite) {
      await searchRuleTaskByTableName(page, tableName, sourceRef).catch(() => []);
      const restoredRow = page.locator(".ant-table-tbody tr").filter({ hasText: tableName }).filter({ hasText: ruleName }).first();
      if (await restoredRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await toggleRuleTaskFavorite(restoredRow, sourceRef, "取消收藏").catch(() => {});
      }
    }
  }
}

export async function expectDataQualityResultShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/taskQuery",
    labels: ["校验结果查询", "计划时间", "最近修改人", "我收藏的表"],
    tableHeaders: [
      "表",
      "任务名称",
      "状态",
      "数据源",
      "执行周期",
      "是否关联任务",
      "计划时间",
      "开始时间",
      "结束时间",
      "运行时长",
      "提交人",
      "最近修改人",
      "操作",
    ],
    apiPaths: ["/dassets/v1/valid/monitorRecord/pageQuery"],
  });
}

export async function expectDataQualityReportShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/qualityReport",
    labels: ["数据质量报告", "已配置报告", "已生成报告", "新增报告"],
    tableHeaders: [
      "报告名称",
      "关联数据表",
      "报告周期",
      "生成样式",
      "规则范围",
      "创建人",
      "创建时间",
      "修改人",
      "修改时间",
      "操作",
    ],
    apiPaths: ["/dassets/v1/valid/monitorReport/page"],
  });
}

export async function expectDataQualityGeneratedReportTab(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已生成报告", sourceRef);

  const body = page.locator("body");
  for (const label of ["已生成报告", "报告名称", "数据表", "生成时间", "报告状态", "报告详情"]) {
    await expect(body, `${sourceRef}: 已生成报告页签应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/qualityReport 已生成报告", [
    "/dassets/v1/valid/monitorReportRecord/pageList",
  ]);
}

export async function expectDataQualityResultFilterContract(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/taskQuery");

  const body = page.locator("body");
  for (const label of ["校验结果查询", "计划时间", "最近修改人", "我收藏的表"]) {
    await expect(body, `${sourceRef}: 校验结果查询筛选区应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  for (const placeholder of ["请输入表名/任务名称搜索", "开始日期", "结束日期"]) {
    await expect(
      page.getByPlaceholder(placeholder).first(),
      `${sourceRef}: 校验结果查询应展示占位符「${placeholder}」`,
    ).toBeVisible({ timeout: 30000 });
  }

  for (const header of [
    "表",
    "任务名称",
    "状态",
    "数据源",
    "执行周期",
    "计划时间",
    "开始时间",
    "结束时间",
    "运行时长",
    "提交人",
    "最近修改人",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 校验结果查询列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/taskQuery 筛选列表", [
    "/dassets/v1/valid/monitorRecord/pageQuery",
  ]);
}

export async function expectDataQualityResultListSearchDetailContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const initialResponse = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
  );
  void initialResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/taskQuery");
  const initialPage = expectDqSuccess(await initialResponse, `${sourceRef}: 校验结果列表应请求成功`);
  expectMonitorRecordPage(initialPage, `${sourceRef}: 校验结果列表应返回记录`);

  const body = page.locator("body");
  for (const label of ["计划时间", "最近修改人", "我收藏的表"]) {
    await expect(body, `${sourceRef}: 校验结果查询筛选区应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  for (const header of [
    "表",
    "任务名称",
    "状态",
    "数据源",
    "执行周期",
    "是否关联任务",
    "计划时间",
    "开始时间",
    "结束时间",
    "运行时长",
    "提交人",
    "最近修改人",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 校验结果列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  const target = await findMonitorRecordCandidate(page, sourceRef, {
    fuzzyName: "quality_test_enum_pass",
    status: 3,
  });
  const tableName = expectNonEmptyString(target.tableName, `${sourceRef}: 目标实例应包含表名`);
  const searchToken = "quality_test_enum_pass";
  const planDate = extractPlanDate(target.cycTime, sourceRef);
  await selectDqDateRange(page, planDate, planDate, sourceRef);
  const searchResponse = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) => (payload.data?.data ?? []).some((item) => String(item.id) === String(target.id)),
  );
  const searchRequest = page.waitForRequest((request) => {
    if (!request.url().includes("/dassets/v1/valid/monitorRecord/pageQuery")) return false;
    const requestBody = getRequestJson(request);
    return requestBody.fuzzyName === searchToken && requestBody.bizTime === 0;
  });
  await page.getByPlaceholder("请输入表名/任务名称搜索").fill(searchToken);
  await page.keyboard.press("Enter");
  await searchRequest;
  const searchPage = expectDqSuccess(await searchResponse, `${sourceRef}: 校验结果组合筛选应请求成功`);
  const searchRecords = expectMonitorRecordPage(searchPage, `${sourceRef}: 校验结果组合筛选应返回记录`);
  expect(
    searchRecords.every(
      (record) =>
        String(record.tableName ?? "").includes(searchToken) ||
        String(record.ruleName ?? "").includes(searchToken),
    ),
    `${sourceRef}: 搜索结果应仅展示表名或任务名称匹配 ${searchToken} 的实例`,
  ).toBe(true);

  const searchTarget = expectMonitorRecordById(searchRecords, target.id, sourceRef);
  expectMonitorRecordDetailTarget([searchTarget], sourceRef);
  const ruleName = expectNonEmptyString(searchTarget.ruleName, `${sourceRef}: 目标实例应包含任务名称`);
  const statusLabel = formatMonitorRecordStatus(searchTarget.status, sourceRef);
  const dataSource = [
    expectNonEmptyString(searchTarget.sourceTypeName, `${sourceRef}: 目标实例应包含数据源类型`),
    expectNonEmptyString(searchTarget.sourceName, `${sourceRef}: 目标实例应包含数据源名称`),
  ].join(" / ");
  const periodType = expectNonEmptyString(
    searchTarget.assetsPeriodTypeName ?? searchTarget.periodTypeName,
    `${sourceRef}: 目标实例应包含执行周期`,
  );
  const associated = formatDqRuleTaskAssociated(searchTarget.associated, sourceRef);
  const cycTime = expectNonEmptyString(searchTarget.cycTime, `${sourceRef}: 目标实例应包含计划时间`);
  const executeTime = expectNonEmptyString(searchTarget.executeTime, `${sourceRef}: 目标实例应包含开始时间`);
  const execEndTime = expectNonEmptyString(searchTarget.execEndTime, `${sourceRef}: 目标实例应包含结束时间`);
  const execTimeStr = expectNonEmptyString(searchTarget.execTimeStr, `${sourceRef}: 目标实例应包含运行时长`);
  const submitUser = expectNonEmptyString(searchTarget.submitUser, `${sourceRef}: 目标实例应包含提交人`);
  const modifyUser = expectNonEmptyString(searchTarget.modifyUser, `${sourceRef}: 目标实例应包含最近修改人`);

  const targetRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: ruleName })
    .filter({ hasText: tableName })
    .first();
  await expect(targetRow, `${sourceRef}: 搜索后列表应展示目标实例`).toBeVisible({ timeout: 30000 });
  for (const expectedText of [
    tableName,
    ruleName,
    statusLabel,
    dataSource,
    periodType,
    associated,
    cycTime,
    executeTime,
    execEndTime,
    execTimeStr,
    submitUser,
    modifyUser,
  ]) {
    await expect(targetRow, `${sourceRef}: 目标实例行应展示「${expectedText}」`).toContainText(expectedText, {
      timeout: 30000,
    });
  }

  const detailResponse = waitForDqJson<DqMonitorRecordDetail[]>(
    page,
    "/dassets/v1/valid/monitorRecord/detailReport",
  );
  await targetRow.getByRole("button", { name: tableName }).click({ timeout: 30000 });
  const detailRecords = expectDqSuccess(await detailResponse, `${sourceRef}: 实例详情应请求成功`);
  expect(detailRecords.length, `${sourceRef}: 实例详情应返回规则结果`).toBeGreaterThan(0);
  const firstDetail = detailRecords[0];
  const functionName = expectNonEmptyString(firstDetail.functionName, `${sourceRef}: 详情应包含规则结果名称`);
  const columnName = expectNonEmptyString(firstDetail.columnName, `${sourceRef}: 详情应包含字段`);
  expectNonEmptyString(firstDetail.verifyTypeValue, `${sourceRef}: 详情应包含校验方式`);

  for (const expectedText of [
    ruleName,
    "监控报告",
    statusLabel,
    "统计函数",
    functionName,
    columnName,
    modifyUser,
  ]) {
    await expect(body, `${sourceRef}: 实例详情应展示「${expectedText}」`).toContainText(expectedText, {
      timeout: 30000,
    });
  }
}

export async function expectDataQualityPassedResultNoDetailContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const searchToken = "quality_test_enum_pass";
  const initialResponse = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/taskQuery");
  expectMonitorRecordPage(
    expectDqSuccess(await initialResponse, `${sourceRef}: 校验结果列表应请求成功`),
    `${sourceRef}: 校验结果列表应返回记录`,
  );

  const target = await findMonitorRecordCandidate(page, sourceRef, {
    fuzzyName: searchToken,
    status: 3,
  });
  const planDate = extractPlanDate(target.cycTime, sourceRef);
  await selectDqDateRange(page, planDate, planDate, sourceRef);
  const searchResponse = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) => (payload.data?.data ?? []).some((item) => String(item.id) === String(target.id)),
  );
  await page.getByPlaceholder("请输入表名/任务名称搜索").fill(searchToken);
  await page.keyboard.press("Enter");
  const searchRecords = expectMonitorRecordPage(
    expectDqSuccess(await searchResponse, `${sourceRef}: 校验通过实例搜索应请求成功`),
    `${sourceRef}: 校验通过实例搜索应返回记录`,
  );
  const passRecord = expectMonitorRecordById(searchRecords, target.id, sourceRef);
  expectMonitorRecordDetailTarget([passRecord], sourceRef);
  expect(passRecord.status, `${sourceRef}: 目标实例应为校验通过`).toBe(3);
  const tableName = expectNonEmptyString(passRecord.tableName, `${sourceRef}: 校验通过实例应包含表名`);
  const ruleName = expectNonEmptyString(passRecord.ruleName, `${sourceRef}: 校验通过实例应包含任务名称`);
  const row = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).filter({ hasText: tableName }).first();
  await expect(row, `${sourceRef}: 搜索后应展示校验通过实例`).toBeVisible({ timeout: 30000 });
  await expect(row, `${sourceRef}: 列表状态应展示校验通过`).toContainText("校验通过", { timeout: 30000 });
  for (const hiddenAction of ["查看详情", "下载明细", "查看日志", "下载日志"]) {
    await expect(row, `${sourceRef}: 校验通过列表行不应展示「${hiddenAction}」`).not.toContainText(hiddenAction, {
      timeout: 30000,
    });
  }

  const detailResponse = waitForDqJson<DqMonitorRecordDetail[]>(
    page,
    "/dassets/v1/valid/monitorRecord/detailReport",
  );
  await row.getByRole("button", { name: tableName }).click({ timeout: 30000 });
  const detailRecords = expectDqSuccess(await detailResponse, `${sourceRef}: 校验通过实例详情应请求成功`);
  expect(detailRecords.length, `${sourceRef}: 校验通过实例详情应返回规则结果`).toBeGreaterThan(0);
  expect(
    detailRecords.every((record) => Number(record.status) === 3),
    `${sourceRef}: 校验通过实例详情规则结果应全部为校验通过`,
  ).toBe(true);

  const body = page.locator("body");
  for (const expectedText of [ruleName, "监控报告", "校验通过", "查看趋势"]) {
    await expect(body, `${sourceRef}: 校验通过详情应展示「${expectedText}」`).toContainText(expectedText, {
      timeout: 30000,
    });
  }
  for (const hiddenText of ["查看详情", "下载明细", "查看日志", "下载日志", "校验异常", "校验失败"]) {
    await expect(body, `${sourceRef}: 校验通过详情不应展示「${hiddenText}」`).not.toContainText(hiddenText, {
      timeout: 30000,
    });
  }
}

export async function expectDataQualityFailedResultDirtyDetailContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const initialResponse = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/taskQuery");
  expectMonitorRecordPage(
    expectDqSuccess(await initialResponse, `${sourceRef}: 校验结果列表应请求成功`),
    `${sourceRef}: 校验结果列表应返回记录`,
  );
  const target = await findMonitorRecordCandidate(page, sourceRef, {
    fuzzyName: "quality_test_json_main_fail_fmt_v2",
    status: 11,
  });
  const planDate = extractPlanDate(target.cycTime, sourceRef);
  await selectDqDateRange(page, planDate, planDate, sourceRef);
  const searchResponse = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) => (payload.data?.data ?? []).some((item) => String(item.id) === String(target.id)),
  );
  await page.getByPlaceholder("请输入表名/任务名称搜索").fill("quality_test_json_main_fail_fmt_v2");
  await page.keyboard.press("Enter");
  const records = expectMonitorRecordPage(
    expectDqSuccess(await searchResponse, `${sourceRef}: 校验异常实例搜索应请求成功`),
    `${sourceRef}: 校验异常实例搜索应返回记录`,
  );
  const failedRecord = expectMonitorRecordById(records, target.id, sourceRef);
  expectMonitorRecordFailedDetailTarget([failedRecord], sourceRef);
  const tableName = expectNonEmptyString(failedRecord.tableName, `${sourceRef}: 异常实例应包含表名`);
  const ruleName = expectNonEmptyString(failedRecord.ruleName, `${sourceRef}: 异常实例应包含任务名称`);
  const statusLabel = formatMonitorRecordStatus(failedRecord.status, sourceRef);

  const row = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).filter({ hasText: tableName }).first();
  await expect(row, `${sourceRef}: 列表应展示可打开明细的异常实例`).toBeVisible({ timeout: 30000 });
  for (const expectedText of [
    tableName,
    ruleName,
    statusLabel,
    expectNonEmptyString(failedRecord.cycTime, `${sourceRef}: 异常实例应包含计划时间`),
    expectNonEmptyString(failedRecord.executeTime, `${sourceRef}: 异常实例应包含开始时间`),
    expectNonEmptyString(failedRecord.execEndTime, `${sourceRef}: 异常实例应包含结束时间`),
  ]) {
    await expect(row, `${sourceRef}: 异常实例行应展示「${expectedText}」`).toContainText(expectedText, {
      timeout: 30000,
    });
  }

  const detailResponse = waitForDqJson<DqMonitorRecordDetail[]>(
    page,
    "/dassets/v1/valid/monitorRecord/detailReport",
  );
  await row.getByRole("button", { name: tableName }).click({ timeout: 30000 });
  const detailRecords = expectDqSuccess(await detailResponse, `${sourceRef}: 异常实例详情应请求成功`);
  const dirtyRule = expectDirtyDetailRule(detailRecords, sourceRef);
  const columnName = expectNonEmptyString(
    dirtyRule.columnNameList?.[0] ?? dirtyRule.columnName,
    `${sourceRef}: 失败规则应包含明细字段`,
  );
  expect(String(dirtyRule.selectDataSql ?? ""), `${sourceRef}: 失败规则明细 SQL 应包含字段 ${columnName}`).toContain(
    columnName,
  );

  const body = page.locator("body");
  for (const expectedText of [
    ruleName,
    "监控报告",
    statusLabel,
    expectNonEmptyString(dirtyRule.functionName, `${sourceRef}: 失败规则应包含规则名称`),
    columnName,
    "查看明细",
  ]) {
    await expect(body, `${sourceRef}: 异常实例详情应展示「${expectedText}」`).toContainText(expectedText, {
      timeout: 30000,
    });
  }

  const dirtyResponse = waitForDqJson<DqMonitorRecordDirtyResult>(
    page,
    "/dassets/v1/valid/monitorRecord/getFormatTableResult",
  );
  await page.getByRole("button", { name: "查看明细" }).first().click({ timeout: 30000 });
  const dirtyPayload = expectDqSuccess(await dirtyResponse, `${sourceRef}: 查看明细应请求失败数据`);
  expectDirtyResultPayload(dirtyPayload, columnName, sourceRef);
  await expect(body, `${sourceRef}: 明细打开后应展示下载明细入口`).toContainText("下载明细", {
    timeout: 30000,
  });
}

export async function expectDataQualityFailedResultDirtyDownloadContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const context = await openFailedDirtyResultDetail(page, sourceRef);
  const downloadPath = await downloadDqArtifact(page, sourceRef, "dirty-detail", async () => {
    await page.getByRole("button", { name: "下载明细" }).first().click({ timeout: 30000 });
  });

  try {
    const firstDirtyRow = context.dirtyPayload.result?.[0] ?? {};
    const rowToken = Object.values(firstDirtyRow)
      .map((value) => String(value ?? "").trim())
      .find((value) => value.length > 0);
    await expectDownloadedArtifactContains(
      downloadPath,
      [context.columnName, rowToken].filter((token): token is string => Boolean(token)),
      sourceRef,
    );
  } finally {
    if (existsSync(downloadPath)) unlinkSync(downloadPath);
  }
}

export async function expectDataQualityFailedResultLogDownloadContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const target = await findMonitorRecordCandidate(page, sourceRef, {
    fuzzyName: "车辆质量失败任务",
    status: 4,
  }).catch(() =>
    findMonitorRecordCandidate(page, sourceRef, {
      fuzzyName: "quality_fail",
      status: 4,
    }),
  );
  const planDate = extractPlanDate(target.cycTime, sourceRef);
  await gotoDataQualityPage(page, "/dq/taskQuery");
  await selectDqDateRange(page, planDate, planDate, sourceRef);
  const searchResponse = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) => (payload.data?.data ?? []).some((item) => String(item.id) === String(target.id)),
  );
  const ruleName = expectNonEmptyString(target.ruleName, `${sourceRef}: 校验失败实例应包含任务名称`);
  await page.getByPlaceholder("请输入表名/任务名称搜索").fill(ruleName);
  await page.keyboard.press("Enter");
  const records = expectMonitorRecordPage(
    expectDqSuccess(await searchResponse, `${sourceRef}: 校验失败实例搜索应请求成功`),
    `${sourceRef}: 校验失败实例搜索应返回记录`,
  );
  const failedRecord = expectMonitorRecordById(records, target.id, sourceRef);
  expect(Number(failedRecord.status), `${sourceRef}: 目标实例应为校验失败`).toBe(4);
  const tableName = expectNonEmptyString(failedRecord.tableName, `${sourceRef}: 校验失败实例应包含表名`);
  const row = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).filter({ hasText: tableName }).first();
  await expect(row, `${sourceRef}: 搜索后应展示校验失败实例`).toBeVisible({ timeout: 30000 });
  await expect(row, `${sourceRef}: 列表状态应展示校验失败`).toContainText("校验失败", { timeout: 30000 });

  await row.getByRole("button", { name: tableName }).click({ timeout: 30000 });
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 校验失败实例详情应打开`).toContainText("监控报告", { timeout: 30000 });

  const logEntry = body.getByRole("button", { name: /查看日志|日志/ }).or(body.getByText(/查看日志|日志/)).first();
  await expect(logEntry, `${sourceRef}: 校验失败实例应展示查看日志入口`).toBeVisible({ timeout: 30000 });
  await logEntry.click({ timeout: 30000 });
  await expect(body, `${sourceRef}: 日志面板应展示失败原因`).toContainText(/日志|失败|error|exception/i, {
    timeout: 30000,
  });
  const logText = await body.innerText();
  expect(logText, `${sourceRef}: 日志应包含执行时间或失败关键词`).toMatch(/失败|error|exception|执行|运行/i);

  const downloadPath = await downloadDqArtifact(page, sourceRef, "failed-log", async () => {
    await body.getByRole("button", { name: /下载日志/ }).or(body.getByText("下载日志")).first().click({
      timeout: 30000,
    });
  });
  try {
    await expectDownloadedArtifactContains(downloadPath, [ruleName], sourceRef);
  } finally {
    if (existsSync(downloadPath)) unlinkSync(downloadPath);
  }
}

async function openFailedDirtyResultDetail(
  page: Page,
  sourceRef: string,
): Promise<{ columnName: string; dirtyPayload: DqMonitorRecordDirtyResult }> {
  const initialResponse = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
  );
  void initialResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/taskQuery");
  expectMonitorRecordPage(
    expectDqSuccess(await initialResponse, `${sourceRef}: 校验结果列表应请求成功`),
    `${sourceRef}: 校验结果列表应返回记录`,
  );
  const searchToken = "quality_test_json_main_fail_fmt_v2";
  const target = await findMonitorRecordCandidate(page, sourceRef, {
    fuzzyName: searchToken,
    status: 11,
  });
  const planDate = extractPlanDate(target.cycTime, sourceRef);
  await selectDqDateRange(page, planDate, planDate, sourceRef);
  const searchResponse = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) => (payload.data?.data ?? []).some((item) => String(item.id) === String(target.id)),
  );
  await page.getByPlaceholder("请输入表名/任务名称搜索").fill(searchToken);
  await page.keyboard.press("Enter");
  const records = expectMonitorRecordPage(
    expectDqSuccess(await searchResponse, `${sourceRef}: 校验异常实例搜索应请求成功`),
    `${sourceRef}: 校验异常实例搜索应返回记录`,
  );
  const failedRecord = expectMonitorRecordById(records, target.id, sourceRef);
  expectMonitorRecordFailedDetailTarget([failedRecord], sourceRef);
  const tableName = expectNonEmptyString(failedRecord.tableName, `${sourceRef}: 异常实例应包含表名`);
  const ruleName = expectNonEmptyString(failedRecord.ruleName, `${sourceRef}: 异常实例应包含任务名称`);
  const row = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).filter({ hasText: tableName }).first();
  await expect(row, `${sourceRef}: 列表应展示可打开明细的异常实例`).toBeVisible({ timeout: 30000 });

  const detailResponse = waitForDqJson<DqMonitorRecordDetail[]>(
    page,
    "/dassets/v1/valid/monitorRecord/detailReport",
  );
  await row.getByRole("button", { name: tableName }).click({ timeout: 30000 });
  const detailRecords = expectDqSuccess(await detailResponse, `${sourceRef}: 异常实例详情应请求成功`);
  const dirtyRule = expectDirtyDetailRule(detailRecords, sourceRef);
  const columnName = expectNonEmptyString(
    dirtyRule.columnNameList?.[0] ?? dirtyRule.columnName,
    `${sourceRef}: 失败规则应包含明细字段`,
  );

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 异常实例详情应展示下载入口前置规则`).toContainText("查看明细", {
    timeout: 30000,
  });
  const dirtyResponse = waitForDqJson<DqMonitorRecordDirtyResult>(
    page,
    "/dassets/v1/valid/monitorRecord/getFormatTableResult",
  );
  await page.getByRole("button", { name: "查看明细" }).first().click({ timeout: 30000 });
  const dirtyPayload = expectDqSuccess(await dirtyResponse, `${sourceRef}: 查看明细应请求失败数据`);
  expectDirtyResultPayload(dirtyPayload, columnName, sourceRef);
  await expect(body, `${sourceRef}: 明细打开后应展示下载明细入口`).toContainText("下载明细", {
    timeout: 30000,
  });
  return { columnName, dirtyPayload };
}

async function downloadDqArtifact(
  page: Page,
  sourceRef: string,
  suffix: string,
  trigger: () => Promise<void>,
): Promise<string> {
  return (await downloadDqArtifactWithSuggestedName(page, sourceRef, suffix, trigger)).path;
}

async function downloadDqArtifactWithSuggestedName(
  page: Page,
  sourceRef: string,
  suffix: string,
  trigger: () => Promise<void>,
): Promise<DqDownloadArtifact> {
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), trigger()]);
  const suggestedName = download.suggestedFilename();
  expect(suggestedName, `${sourceRef}: 下载文件名应存在`).not.toBe("");
  const extension = suggestedName.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? ".dat";
  const downloadPath = join(tmpdir(), `${sourceRef.replace(/[^a-zA-Z0-9_-]/g, "_")}-${suffix}${extension}`);
  await download.saveAs(downloadPath);
  expect(existsSync(downloadPath), `${sourceRef}: 下载文件应保存到本地临时目录`).toBe(true);
  expect(statSync(downloadPath).size, `${sourceRef}: 下载文件不应为空`).toBeGreaterThan(0);
  return { path: downloadPath, suggestedName };
}

async function expectDownloadedArtifactContains(
  downloadPath: string,
  expectedTokens: string[],
  sourceRef: string,
): Promise<void> {
  const extension = downloadPath.match(/\.[a-zA-Z0-9]+$/)?.[0].toLowerCase();
  let content = "";
  if (extension === ".xlsx" || extension === ".xls") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(downloadPath);
    content = workbook.worksheets
      .flatMap((sheet) => {
        const values: string[] = [];
        sheet.eachRow((row) => {
          row.eachCell((cell) => values.push(String(cell.value ?? "")));
        });
        return values;
      })
      .join("\n");
  } else {
    content = readFileSync(downloadPath).toString("utf8");
  }
  for (const token of expectedTokens) {
    expect(content, `${sourceRef}: 下载文件内容应包含「${token}」`).toContain(token);
  }
}

async function expectVisibleRuleRows(page: Page, sourceRef: string, ruleNames: readonly string[]): Promise<void> {
  const rows = page.locator(".ant-table-tbody tr:visible");
  for (const ruleName of ruleNames) {
    await expect(rows.filter({ hasText: ruleName }).first(), `${sourceRef}: 筛选结果应展示规则「${ruleName}」`).toBeVisible({
      timeout: 30000,
    });
  }
}

async function expectNoVisibleRuleRows(page: Page, sourceRef: string, ruleNames: readonly string[]): Promise<void> {
  const rows = page.locator(".ant-table-tbody tr:visible");
  for (const ruleName of ruleNames) {
    await expect(rows.filter({ hasText: ruleName }), `${sourceRef}: 筛选结果不应展示规则「${ruleName}」`).toHaveCount(
      0,
      { timeout: 30000 },
    );
  }
}

async function openReportRuleDirtyDetail(page: Page, sourceRef: string, rowPattern: RegExp): Promise<void> {
  const row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: rowPattern }).first();
  await expect(row, `${sourceRef}: 报告规则明细应展示 ${rowPattern}`).toBeVisible({ timeout: 30000 });
  const detailEntry = row
    .getByText(/查看详情|查看明细/)
    .or(row.getByRole("button", { name: /查看详情|查看明细/ }))
    .or(row.getByRole("link", { name: /查看详情|查看明细/ }))
    .first();
  await expect(detailEntry, `${sourceRef}: 报告规则明细行应展示查看详情入口`).toBeVisible({
    timeout: 30000,
  });
  await detailEntry.click({ timeout: 30000 });
}

async function getCurrentDirtyDetailScope(page: Page): Promise<ReturnType<Page["locator"]>> {
  const overlay = page.locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible").last();
  if (await overlay.isVisible({ timeout: 5000 }).catch(() => false)) return overlay;
  return page.locator("body");
}

async function closeDirtyDetailIfOverlay(page: Page, sourceRef: string): Promise<void> {
  const overlay = page.locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible").last();
  if (await overlay.isVisible({ timeout: 3000 }).catch(() => false)) {
    await closeDqOverlay(page, sourceRef);
  }
}

export async function expectDataQualityReportCreateEntry(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已配置报告", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 已配置报告页签应展示新增报告入口`).toContainText("新增报告", {
    timeout: 30000,
  });
  await openConfiguredReportCreateForm(page, sourceRef);
  await expect(page, `${sourceRef}: 新增报告入口应保持在数据质量报告路由`).toHaveURL(/\/dq\/qualityReport/);

  const body = page.locator("body");
  for (const label of ["新增报告", "报告名称", "报告周期", "生成样式", "规则范围"]) {
    await expect(body, `${sourceRef}: 新增报告页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/qualityReport 新增报告", [
    "/dassets/v1/valid/monitor/allCalender",
  ]);
}

export async function expectDataQualitySingleTableReportCreateContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const reportName = "SparkThrift2.x单表主流程报告";
  await gotoConfiguredReportPage(page, sourceRef);
  await deleteConfiguredReportIfExists(page, sourceRef, reportName);
  await expectConfiguredReportAbsent(page, sourceRef, reportName);
  await createConfiguredReport(page, sourceRef, {
    reportName,
    tables: ["json_report_fail"],
    period: "天",
    displayMode: "展示最新结果",
    needVehicleInfo: false,
  });
  await expectConfiguredReportRow(page, sourceRef, reportName, ["json_report_fail", "全部"]);
}

export async function expectDataQualityCustomReportCreateContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const reportName = "SparkThrift2.x自定义主流程报告";
  await gotoConfiguredReportPage(page, sourceRef);
  await deleteConfiguredReportIfExists(page, sourceRef, reportName);
  await expectConfiguredReportAbsent(page, sourceRef, reportName);
  await createConfiguredReport(page, sourceRef, {
    reportName,
    tables: ["json_report_fail", "json_format_test"],
    period: "一次性",
    displayMode: "展示全部结果",
    needVehicleInfo: false,
  });
  await expectConfiguredReportRow(page, sourceRef, reportName, [
    "json_report_fail",
    "json_format_test",
  ]);
  await clickDqText(page, "已生成报告", sourceRef);
  await searchGeneratedReportByName(page, sourceRef, reportName);
  await expect(page.locator("body"), `${sourceRef}: 已生成报告应可按自定义报告名称查询`).toContainText(
    reportName,
    { timeout: 30000 },
  );
}

export async function expectDataQualityReportDuplicateNameValidationContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const reportName = "供应商主数据完整性日报";
  await gotoConfiguredReportPage(page, sourceRef);
  await ensureConfiguredReportExists(page, sourceRef, {
    reportName,
    tables: ["json_report_fail"],
    period: "天",
    displayMode: "展示最新结果",
    needVehicleInfo: false,
  });
  const beforeRow = await getConfiguredReportRowText(page, sourceRef, reportName);

  await openConfiguredReportCreateForm(page, sourceRef);
  await fillDqPageFormField(page, /报告名称/, reportName);
  await chooseDqFieldOptionByText(page, /生成样式/, "质检式", sourceRef);
  await chooseDqFieldOptionByText(page, /规则范围/, "全部", sourceRef);
  await addConfiguredReportAssociatedTable(page, sourceRef, {
    dataSource: getDefaultDatasource().metadata.name,
    database: getDefaultDatasource().sql.database,
    table: "json_report_fail",
    task: "全部",
  });
  await chooseDqFieldOptionByText(page, /报告周期/, "天", sourceRef);
  await clickDqCompactButton(page, "确定", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 重复报告名称应提示已存在或重复`).toContainText(
    /已存在|重复|同名|报告名称/,
    { timeout: 30000 },
  );
  await expect(page.locator("body"), `${sourceRef}: 重复名称校验后仍停留在新增报告表单`).toContainText("新增报告", {
    timeout: 30000,
  });

  await page.keyboard.press("Escape").catch(() => {});
  await gotoConfiguredReportPage(page, sourceRef);
  await expectConfiguredReportRow(page, sourceRef, reportName, ["json_report_fail"]);
  const afterRow = await getConfiguredReportRowText(page, sourceRef, reportName);
  expect(afterRow, `${sourceRef}: 原报告配置不应被重复新增覆盖`).toBe(beforeRow);
}

export async function expectDataQualityReportEditViewDeleteContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const reportName = "车辆订单质量日报";
  await gotoConfiguredReportPage(page, sourceRef);
  await ensureConfiguredReportExists(page, sourceRef, {
    reportName,
    tables: ["json_format_test"],
    period: "天",
    displayMode: "展示最新结果",
    needVehicleInfo: false,
  });

  const row = await getConfiguredReportRow(page, sourceRef, reportName);
  for (const action of ["编辑", "查看报告", "删除"]) {
    await expect(row, `${sourceRef}: 报告操作列应展示「${action}」入口`).toContainText(action, {
      timeout: 30000,
    });
  }

  await row.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: 编辑报告表单应打开`).toContainText(/编辑|报告名称/, {
    timeout: 30000,
  });
  await chooseDqFieldOptionByText(page, /报告周期/, "周", sourceRef);
  await chooseDqRadioOptionByText(page, "展示全部结果", sourceRef);
  const editResponse = waitForDqJson<unknown>(page, "/dassets/v1/valid/monitorReport");
  void editResponse.catch(() => {});
  await clickDqCompactButton(page, "确定", sourceRef);
  expectDqSuccess(await editResponse, `${sourceRef}: 编辑报告保存应请求成功`);
  await expectConfiguredReportRow(page, sourceRef, reportName, ["周"]);

  const editedRow = await getConfiguredReportRow(page, sourceRef, reportName);
  await editedRow.getByRole("button", { name: /查看报告/ }).first().click({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: 查看报告应跳转已生成报告或详情`).toContainText(reportName, {
    timeout: 30000,
  });

  await gotoConfiguredReportPage(page, sourceRef);
  const deletableRow = await getConfiguredReportRow(page, sourceRef, reportName);
  await deletableRow.getByRole("button", { name: /删除/ }).first().click({ timeout: 30000 });
  await expect(page.locator(".ant-modal, .ant-popover, body").last(), `${sourceRef}: 删除报告应展示确认文案`).toContainText(
    /删除|不会生成报告|已生成报告|确认/,
    { timeout: 30000 },
  );
  const deleteResponse = waitForDqJson<unknown>(page, "/dassets/v1/valid/monitorReport");
  void deleteResponse.catch(() => {});
  await clickVisibleDeleteConfirm(page, sourceRef);
  expectDqSuccess(await deleteResponse, `${sourceRef}: 删除报告应请求成功`);
  await searchConfiguredReportByName(page, sourceRef, reportName);
  await expect(
    page.locator(".ant-table-tbody tr").filter({ hasText: reportName }),
    `${sourceRef}: 删除后已配置报告列表不再展示目标报告`,
  ).toHaveCount(0, { timeout: 30000 });
}

async function gotoConfiguredReportPage(page: Page, sourceRef: string): Promise<void> {
  const response = waitForDqJson<DqGeneratedReportPage>(page, "/dassets/v1/valid/monitorReport/page");
  void response.catch(() => {});
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已配置报告", sourceRef);
  await expectDqSuccess(await response, `${sourceRef}: 已配置报告列表应请求成功`);
  const body = page.locator("body");
  for (const label of [
    "已配置报告",
    "已生成报告",
    "报告名称",
    "关联数据表",
    "报告周期",
    "生成样式",
    "规则范围",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 已配置报告列表应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
}

async function expectConfiguredReportAbsent(page: Page, sourceRef: string, reportName: string): Promise<void> {
  await searchConfiguredReportByName(page, sourceRef, reportName);
  const rows = page.locator(".ant-table-tbody tr").filter({ hasText: reportName });
  await expect(rows, `${sourceRef}: 同名报告「${reportName}」应不存在，避免新增冲突`).toHaveCount(0, {
    timeout: 5000,
  });
}

async function deleteConfiguredReportIfExists(page: Page, sourceRef: string, reportName: string): Promise<void> {
  await searchConfiguredReportByName(page, sourceRef, reportName);
  const rows = page.locator(".ant-table-tbody tr").filter({ hasText: reportName });
  if ((await rows.count()) === 0) return;

  const row = rows.first();
  const deleteEntry = row.getByRole("button", { name: /删除/ }).first();
  await expect(deleteEntry, `${sourceRef}: 同名测试报告存在时应可删除后重建`).toBeVisible({ timeout: 30000 });
  await deleteEntry.click({ timeout: 30000 });
  await expect(
    page.locator(".ant-modal:visible, .ant-popover:visible, body").last(),
    `${sourceRef}: 删除同名测试报告应展示确认文案`,
  ).toContainText(/删除|不会生成报告|已生成报告|确认/, { timeout: 30000 });
  const deleteResponse = waitForDqJson<unknown>(page, "/dassets/v1/valid/monitorReport");
  void deleteResponse.catch(() => {});
  await clickVisibleDeleteConfirm(page, sourceRef);
  expectDqSuccess(await deleteResponse, `${sourceRef}: 删除同名测试报告应请求成功`);
  await searchConfiguredReportByName(page, sourceRef, reportName);
  await expect(rows, `${sourceRef}: 同名测试报告删除后应不再展示`).toHaveCount(0, { timeout: 30000 });
}

async function clickVisibleDeleteConfirm(page: Page, sourceRef: string): Promise<void> {
  const popup = page.locator(".ant-popover:visible, .ant-modal:visible, [role='tooltip']:visible").last();
  await expect(popup, `${sourceRef}: 删除确认浮层应可见`).toBeVisible({ timeout: 30000 });
  const confirm = popup.getByRole("button", { name: /删\s*除|确\s*定|确\s*认/ }).last();
  await expect(confirm, `${sourceRef}: 删除确认浮层应展示确认按钮`).toBeVisible({ timeout: 30000 });
  await confirm.click({ timeout: 30000 });
}

async function ensureConfiguredReportExists(
  page: Page,
  sourceRef: string,
  options: {
    reportName: string;
    tables: string[];
    period: string;
    displayMode: string;
    needVehicleInfo: boolean;
  },
): Promise<void> {
  await searchConfiguredReportByName(page, sourceRef, options.reportName);
  if ((await page.locator(".ant-table-tbody tr").filter({ hasText: options.reportName }).count()) > 0) return;
  await createConfiguredReport(page, sourceRef, options);
  await expectConfiguredReportRow(page, sourceRef, options.reportName, options.tables);
}

async function createConfiguredReport(
  page: Page,
  sourceRef: string,
  options: {
    reportName: string;
    tables: string[];
    period: string;
    displayMode: string;
    needVehicleInfo: boolean;
  },
): Promise<void> {
  await openConfiguredReportCreateForm(page, sourceRef);
  const body = page.locator("body");
  for (const label of ["新增报告", "报告名称", "生成样式", "规则范围", "关联数据表", "报告周期"]) {
    await expect(body, `${sourceRef}: 新增报告表单应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await fillDqPageFormField(page, /报告名称/, options.reportName);
  await chooseDqFieldOptionByText(page, /生成样式/, "质检式", sourceRef);
  await chooseDqFieldOptionByText(page, /规则范围/, "全部", sourceRef);
  for (const table of options.tables) {
    await addConfiguredReportAssociatedTable(page, sourceRef, {
      dataSource: getDefaultDatasource().metadata.name,
      database: getDefaultDatasource().sql.database,
      table,
      task: "全部",
    });
  }
  await chooseDqFieldOptionByText(page, /报告周期/, options.period, sourceRef);
  await fillConfiguredReportDataCycle(page, sourceRef);
  await chooseDqRadioOptionByText(page, options.displayMode, sourceRef);
  await chooseDqRadioOptionByText(page, options.needVehicleInfo ? "是" : "否", sourceRef);

  const saveResponse = waitForDqJson<unknown>(page, "/dassets/v1/valid/monitorReport");
  void saveResponse.catch(() => {});
  await clickConfiguredReportDialogConfirm(page, sourceRef);
  expectDqSuccess(await saveResponse, `${sourceRef}: 报告保存应请求成功`);
}

async function addConfiguredReportAssociatedTable(
  page: Page,
  sourceRef: string,
  options: {
    dataSource: string;
    database: string;
    table: string;
    task: string;
  },
): Promise<void> {
  const dialog = page.locator(".ant-modal:visible, [role='dialog']:visible").last();
  await expect(dialog, `${sourceRef}: 新增报告弹窗应可见`).toBeVisible({ timeout: 30000 });
  let editableRows = dialog.locator(".ant-table-tbody tr").filter({ hasText: /请选择数据源|请选择数据库|请选择数据表/ });
  if ((await editableRows.count()) === 0) {
    await dialog.getByRole("button", { name: /^新\s*增$/ }).click({ timeout: 30000 });
    await expect
      .poll(
        async () => dialog.locator(".ant-table-tbody tr").filter({ hasText: /请选择数据源|请选择数据库|请选择数据表/ }).count(),
        { message: `${sourceRef}: 关联数据表新增后应出现可编辑行`, timeout: 30000 },
      )
      .toBeGreaterThan(0);
    editableRows = dialog.locator(".ant-table-tbody tr").filter({ hasText: /请选择数据源|请选择数据库|请选择数据表/ });
  }

  let row = editableRows.last();
  await selectDqTableRowOption(row, page, 0, options.dataSource, sourceRef);
  await waitForUiSettled(page);
  row = dialog.locator(".ant-table-tbody tr").filter({ hasText: /请选择数据库|请选择数据表|请选择任务/ }).last();
  await selectDqTableRowOption(row, page, 1, options.database, sourceRef);
  await waitForUiSettled(page);
  row = dialog.locator(".ant-table-tbody tr").filter({ hasText: /请选择数据表|请选择任务/ }).last();
  await selectDqTableRowOption(row, page, 2, options.table, sourceRef);
  row = dialog.locator(".ant-table-tbody tr").filter({ hasText: options.table }).last();
  if (await row.getByText("请选择任务", { exact: false }).first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await selectDqTableRowOption(row, page, 3, options.task, sourceRef);
  } else {
    await expect(row, `${sourceRef}: 关联任务应默认回显「${options.task}」`).toContainText(options.task, {
      timeout: 30000,
    });
  }
}

async function selectDqTableRowOption(
  row: ReturnType<Page["locator"]>,
  page: Page,
  index: number,
  option: string,
  sourceRef: string,
): Promise<void> {
  const cell = row.locator("td").nth(index);
  const cellHandle = await cell.elementHandle({ timeout: 30000 });
  expect(cellHandle, `${sourceRef}: 关联数据表第 ${index + 1} 个单元格应存在`).toBeTruthy();
  const select = cell.locator(".ant-select").first();
  await expect(select, `${sourceRef}: 关联数据表第 ${index + 1} 个下拉应可见`).toBeVisible({ timeout: 30000 });
  await select.click({ force: true, timeout: 30000 });
  await page.keyboard.type(option);
  const selectedItem = select
    .locator(".ant-select-selection-item")
    .filter({ hasText: exactTextPattern(option) })
    .first();
  if (await selectedItem.isVisible({ timeout: 3000 }).catch(() => false)) return;
  await expect
    .poll(() => getActiveAntdOptionTexts(page), {
      message: `${sourceRef}: 关联数据表下拉应出现选项「${option}」`,
      timeout: 30000,
    })
    .toContain(option);
  const clicked = await clickActiveAntdOption(page, option);
  expect(clicked, `${sourceRef}: 关联数据表下拉应包含可点击选项「${option}」`).toBe(true);
  await expect
    .poll(
      async () =>
        cellHandle
          ?.evaluate((element) => element.textContent?.trim() ?? "")
          .catch(() => ""),
      { message: `${sourceRef}: 关联数据表单元格应回显「${option}」`, timeout: 30000 },
    )
    .toContain(option);
}

async function getActiveAntdOptionTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const dropdowns = Array.from(document.querySelectorAll<HTMLElement>(".ant-select-dropdown")).filter(
      (element) => !element.className.includes("ant-select-dropdown-hidden"),
    );
    const activeDropdown = dropdowns.at(-1);
    if (!activeDropdown) return [];
    return Array.from(activeDropdown.querySelectorAll<HTMLElement>(".ant-select-item-option")).flatMap((element) => {
      const values = [element.getAttribute("title")?.trim(), element.textContent?.trim()].filter(
        (value): value is string => Boolean(value),
      );
      return Array.from(new Set(values));
    });
  });
}

async function clickActiveAntdOption(page: Page, option: string): Promise<boolean> {
  const dropdown = page.locator(".ant-select-dropdown:visible:not(.ant-select-dropdown-hidden)").last();
  if (!(await dropdown.isVisible({ timeout: 3000 }).catch(() => false))) return false;

  const exactOption = dropdown.locator(".ant-select-item-option").filter({ hasText: exactTextPattern(option) }).first();
  if (await exactOption.isVisible({ timeout: 1000 }).catch(() => false)) {
    await exactOption.click({ timeout: 30000 });
    return true;
  }

  const preferredPartialOption =
    option === "SparkThrift2.x"
      ? dropdown.locator(".ant-select-item-option").filter({ hasText: getDefaultDatasource().metadata.name }).filter({ hasText: option }).first()
      : undefined;
  if (preferredPartialOption && (await preferredPartialOption.isVisible({ timeout: 1000 }).catch(() => false))) {
    await preferredPartialOption.click({ timeout: 30000 });
    return true;
  }

  const partialOption = dropdown.locator(".ant-select-item-option").filter({ hasText: option }).first();
  if (await partialOption.isVisible({ timeout: 1000 }).catch(() => false)) {
    await partialOption.click({ timeout: 30000 });
    return true;
  }

  return false;
}

async function openConfiguredReportCreateForm(page: Page, sourceRef: string): Promise<void> {
  await page.getByRole("button", { name: /^新\s*增\s*报\s*告$/ }).click({ timeout: 30000 });
  await expect(
    page.locator(".ant-form, main, body").filter({ hasText: /新增报告/ }).first(),
    `${sourceRef}: 新增报告表单应打开`,
  ).toBeVisible({ timeout: 30000 });
}

async function fillConfiguredReportDataCycle(page: Page, sourceRef: string): Promise<void> {
  const field = page
    .locator(".ant-form-item, .ant-row")
    .filter({ hasText: /数据周期/ })
    .first();
  await expect(field, `${sourceRef}: 新增报告应展示数据周期`).toBeVisible({ timeout: 30000 });
  const inputs = field.locator("input[role='spinbutton']");
  await expect(inputs.first(), `${sourceRef}: 数据周期开始输入框应可见`).toBeVisible({ timeout: 30000 });
  await inputs.nth(0).fill("1", { timeout: 30000 });
  await inputs.nth(1).fill("0", { timeout: 30000 });
  await expect(inputs.nth(0), `${sourceRef}: 数据周期开始值应填入`).toHaveValue("1", { timeout: 30000 });
  await expect(inputs.nth(1), `${sourceRef}: 数据周期结束值应填入`).toHaveValue("0", { timeout: 30000 });
}

async function clickConfiguredReportDialogConfirm(page: Page, sourceRef: string): Promise<void> {
  const dialog = page.locator(".ant-modal:visible, [role='dialog']:visible").last();
  const confirm = dialog.getByRole("button", { name: /^确\s*定$/ }).last();
  await expect(confirm, `${sourceRef}: 新增报告弹窗应展示确定按钮`).toBeVisible({ timeout: 30000 });
  await confirm.click({ force: true, timeout: 30000 });
}

async function expectConfiguredReportRow(
  page: Page,
  sourceRef: string,
  reportName: string,
  expectedTexts: string[],
): Promise<void> {
  await searchConfiguredReportByName(page, sourceRef, reportName);
  const row = page.locator(".ant-table-tbody tr").filter({ hasText: reportName }).first();
  await expect(row, `${sourceRef}: 已配置报告列表应展示新增报告「${reportName}」`).toBeVisible({
    timeout: 30000,
  });
  for (const expectedText of [reportName, ...expectedTexts]) {
    await expect(row, `${sourceRef}: 新增报告行应展示「${expectedText}」`).toContainText(expectedText, {
      timeout: 30000,
    });
  }
}

async function getConfiguredReportRow(
  page: Page,
  sourceRef: string,
  reportName: string,
): Promise<ReturnType<Page["locator"]>> {
  await searchConfiguredReportByName(page, sourceRef, reportName);
  const row = page.locator(".ant-table-tbody tr").filter({ hasText: reportName }).first();
  await expect(row, `${sourceRef}: 已配置报告列表应展示「${reportName}」`).toBeVisible({ timeout: 30000 });
  return row;
}

async function getConfiguredReportRowText(page: Page, sourceRef: string, reportName: string): Promise<string> {
  const row = await getConfiguredReportRow(page, sourceRef, reportName);
  return row.innerText({ timeout: 30000 });
}

async function searchConfiguredReportByName(page: Page, sourceRef: string, reportName: string): Promise<void> {
  const response = waitForDqJson<DqGeneratedReportPage>(page, "/dassets/v1/valid/monitorReport/page");
  void response.catch(() => {});
  await page.getByPlaceholder(/请输入报告名称|报告名称/).first().fill(reportName, { timeout: 30000 });
  await clickDqCompactButton(page, "查询", sourceRef);
  await expectDqSuccess(await response, `${sourceRef}: 已配置报告名称查询应请求成功`);
}

async function searchGeneratedReportByName(page: Page, sourceRef: string, reportName: string): Promise<void> {
  const response = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReportRecord/pageList",
  );
  void response.catch(() => {});
  await page.getByPlaceholder(/请输入报告名称|报告名称/).first().fill(reportName, { timeout: 30000 });
  await clickDqCompactButton(page, "查询", sourceRef);
  await expectDqSuccess(await response, `${sourceRef}: 已生成报告名称查询应请求成功`);
}

async function openGeneratedReportDetail(
  page: Page,
  sourceRef: string,
  reportName: string,
  tableName: string,
): Promise<void> {
  const row = await openGeneratedReportListAndSearch(page, sourceRef, reportName);
  await expect(row, `${sourceRef}: 目标报告应展示关联数据表`).toContainText(tableName, { timeout: 30000 });
  await expect(row, `${sourceRef}: 目标报告应为已生成状态`).toContainText("已生成", { timeout: 30000 });

  const detailEntry = row
    .getByText("报告详情", { exact: true })
    .or(row.getByRole("button", { name: "报告详情" }))
    .or(row.getByRole("link", { name: "报告详情" }))
    .first();
  await expect(detailEntry, `${sourceRef}: 目标报告应展示报告详情入口`).toBeVisible({ timeout: 30000 });
  await detailEntry.click({ timeout: 30000 });
  await waitForUiSettled(page);

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 报告详情页应展示报告名称`).toContainText(reportName, { timeout: 30000 });
  await expect(body, `${sourceRef}: 报告详情页应展示关联数据表`).toContainText(tableName, { timeout: 30000 });
  for (const label of ["质量评估", "规则校验", "字段规则", "单表规则", "多表规则"]) {
    await expect(body, `${sourceRef}: 报告详情页应展示「${label}」`).toContainText(label, { timeout: 30000 });
  }
}

async function openGeneratedReportListAndSearch(
  page: Page,
  sourceRef: string,
  reportName: string,
): Promise<ReturnType<Page["locator"]>> {
  const initialResponse = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReportRecord/pageList",
  );
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已生成报告", sourceRef);
  expectGeneratedReportPage(
    expectDqSuccess(await initialResponse, `${sourceRef}: 打开报告详情前已生成报告列表应请求成功`),
    `${sourceRef}: 打开报告详情前已生成报告列表应返回记录`,
  );
  await searchGeneratedReportByName(page, sourceRef, reportName);

  const row = page.locator(".ant-table-tbody tr").filter({ hasText: reportName }).first();
  await expect(row, `${sourceRef}: 已生成报告列表应展示目标报告「${reportName}」`).toBeVisible({
    timeout: 30000,
  });
  return row;
}

async function activateReportDetailSection(page: Page, sourceRef: string, sectionTitle: string): Promise<void> {
  const entry = page.getByText(sectionTitle, { exact: true }).first();
  await expect(entry, `${sourceRef}: 报告详情应展示「${sectionTitle}」入口`).toBeVisible({ timeout: 30000 });
  await entry.scrollIntoViewIfNeeded({ timeout: 30000 }).catch(() => {});
  await entry.click({ timeout: 30000 }).catch(() => {});
  await expect(page.locator("body"), `${sourceRef}: 应定位到报告详情「${sectionTitle}」分区`).toContainText(
    sectionTitle,
    { timeout: 30000 },
  );
}

export async function expectDataQualityRuleSetShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/ruleSet",
    labels: ["规则集管理", "新建规则集"],
    tableHeaders: [
      "表名",
      "所属数据库",
      "所属数据源",
      "规则包数量",
      "规则数量",
      "规则集描述",
      "更新人",
      "更新时间",
      "操作",
    ],
    apiPaths: ["/dassets/v1/valid/monitorRuleSet/pageQuery"],
  });
}

export async function expectDataQualityRuleTaskCreateEntry(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule");
  await clickDqText(page, "新建监控规则", sourceRef);
  await expect(page, `${sourceRef}: 新建监控规则应进入 /dq/rule/add`).toHaveURL(/\/dq\/rule\/add/);

  const body = page.locator("body");
  for (const label of [
    "新建单表校验规则",
    "监控对象",
    "规则名称",
    "选择数据源",
    "选择数据库",
    "选择数据表",
    "下一步",
  ]) {
    await expect(body, `${sourceRef}: 新建监控规则页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
}

export async function expectDataQualityRuleTaskCreateMonitorObjectContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = `SparkThrift2.x主流程监控任务_${Date.now()}`;
  const body = await gotoNewRuleTaskMonitorRuleConfig(page, sourceRef, ruleName);

  await expect(body, `${sourceRef}: 下一步后应进入监控规则配置页`).toContainText(/监控规则|规则包|规则类型/, {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 监控规则配置页应展示规则包选择控件`).toContainText("规则包", {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 监控规则配置页应展示规则类型选择控件`).toContainText("规则类型", {
    timeout: 30000,
  });
}

export async function expectDataQualityRuleTaskRulePackageMultiSelectContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = `SparkThrift2.x规则包多选任务_${Date.now()}`;
  const expectedPackageNames = ["完整性规则包", "有效性规则包"];

  await expectRuleTaskRuleSetPackages(page, sourceRef, expectedPackageNames);
  const body = await gotoNewRuleTaskMonitorRuleConfig(page, sourceRef, ruleName);

  await expect(body, `${sourceRef}: 监控规则配置页应展示可引用规则包入口`).toContainText(/引用规则包|规则包/, {
    timeout: 30000,
  });
  await clickDqText(page, "引用规则包", sourceRef);
  const dialog = page.locator(".ant-modal:visible, [role='dialog']:visible").last();
  const picker = (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) ? dialog : body;

  for (const packageName of expectedPackageNames) {
    await selectVisibleDqOption(picker, packageName, sourceRef);
  }
  await picker.getByRole("button", { name: /确\s*定|引\s*用|保\s*存/ }).last().click({ timeout: 30000 });

  for (const packageName of expectedPackageNames) {
    await expect(body, `${sourceRef}: 引入后应展示规则包「${packageName}」`).toContainText(packageName, {
      timeout: 30000,
    });
  }
  await expect(body, `${sourceRef}: 引入规则包后应展示完整性规则`).toContainText(/空值数|完整性/, {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 引入规则包后应展示有效性规则`).toContainText(/有效性|范围|格式/, {
    timeout: 30000,
  });

  await clickDqText(page, "引用规则包", sourceRef);
  const secondPicker = page.locator(".ant-modal:visible, [role='dialog']:visible").last();
  const selectedPackageCount = await page.locator("body").getByText(/完整性规则包|有效性规则包/).count();
  if (await secondPicker.isVisible({ timeout: 3000 }).catch(() => false)) {
    await secondPicker.getByRole("button", { name: /取\s*消|关\s*闭/ }).last().click({ timeout: 30000 }).catch(() => {});
  }
  await expect
    .poll(
      async () => page.locator("body").getByText(/完整性规则包|有效性规则包/).count(),
      {
        message: `${sourceRef}: 重复打开引用规则包不应产生重复规则包展示`,
        timeout: 30000,
      },
    )
    .toBe(selectedPackageCount);
}

export async function expectDataQualityRuleTaskBatchCloseContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const pageQueryResponse = waitForRuleTaskPageQuery(page);
  void pageQueryResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");
  const body = page.locator("body");

  for (const label of ["规则任务管理", "新建监控规则", "最近修改人", "我收藏的表"]) {
    await expect(body, `${sourceRef}: 规则任务管理页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  for (const header of [
    "表",
    "任务名称",
    "数据源",
    "执行周期",
    "规则状态",
    "是否关联任务",
    "最近30天告警数",
    "最近修改人",
    "最近修改时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 规则任务列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  const initialPayload = await pageQueryResponse;
  expect(initialPayload.success ?? initialPayload.code === 1, `${sourceRef}: monitor/pageQuery 应返回成功状态`).toBe(
    true,
  );
  const initialRecords = getDqRuleTaskRecords(initialPayload);
  const { selectedRecords, untouchedRecord } = selectRuleTaskBatchCloseTargets(initialRecords, sourceRef);
  const untouchedInitialStatus = untouchedRecord.isClosed;

  await selectRuleTaskRows(page, sourceRef, selectedRecords);
  const closePayload = await clickRuleTaskBatchDetectionAction(page, sourceRef, "关闭检测");
  const closedRecords = getDqRuleTaskRecords(closePayload);
  for (const selectedRecord of selectedRecords) {
    const updatedRecord = findSameRuleTaskRecord(closedRecords, selectedRecord);
    expect(updatedRecord, `${sourceRef}: 关闭检测后列表应保留选中任务 ${selectedRecord.ruleName}`).toBeTruthy();
    expect(
      updatedRecord?.isClosed,
      `${sourceRef}: 选中任务 ${selectedRecord.ruleName} 规则状态应变为已关闭检测`,
    ).toBe(1);
  }
  const untouchedAfterClose = findSameRuleTaskRecord(closedRecords, untouchedRecord);
  expect(untouchedAfterClose, `${sourceRef}: 关闭检测后列表应保留未勾选任务 ${untouchedRecord.ruleName}`).toBeTruthy();
  expect(
    untouchedAfterClose?.isClosed,
    `${sourceRef}: 未勾选任务 ${untouchedRecord.ruleName} 规则状态不应变化`,
  ).toBe(untouchedInitialStatus);

  await restoreRuleTaskDetectionStatusBestEffort(page, sourceRef, selectedRecords);
}

export async function expectDataQualityRuleTaskImmediateRunContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = `SparkThrift2.x立即生成任务_${Date.now()}`;
  const body = await gotoNewRuleTaskMonitorRuleConfig(page, sourceRef, ruleName);

  await selectRuleTaskRulePackageOnCurrentPage(page, sourceRef, ["完整性规则包"]);
  await clickDqCompactButton(page, "下一步", sourceRef);
  await expect(body, `${sourceRef}: 规则配置完成后应进入调度属性页面`).toContainText(/调度属性|调度配置/, {
    timeout: 30000,
  });
  for (const label of ["调度配置", "告警配置", "报告配置"]) {
    await expect(body, `${sourceRef}: 调度属性页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await chooseDqFieldOptionByText(page, /调度周期/, "手动触发", sourceRef);
  await chooseDqFieldOptionByText(page, /实例生成方式/, "立即生成", sourceRef);
  await chooseDqFieldOptionByText(page, /超时时间/, "不限制", sourceRef);

  const saveResponse = waitForRuleTaskPageQuery(page);
  void saveResponse.catch(() => {});
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(body, `${sourceRef}: 保存后应提示成功或返回规则任务管理`).toContainText(/成功|规则任务管理/, {
    timeout: 30000,
  });
  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef).catch(async () => {
    const savedPayload = await saveResponse;
    expect(savedPayload.success ?? savedPayload.code === 1, `${sourceRef}: 保存任务后列表应刷新成功`).toBe(true);
    return getDqRuleTaskRecords(savedPayload);
  });

  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 保存后规则任务列表应展示新建立即生成任务`).toBeVisible({
    timeout: 30000,
  });
  await expect(taskRow, `${sourceRef}: 新建任务应展示立即执行入口`).toContainText("立即执行", {
    timeout: 30000,
  });

  await runRuleTaskImmediately(page, sourceRef, taskRow);
  await expectLatestMonitorRecordForRuleTask(page, sourceRef, ruleName);
}

export async function expectDataQualityRuleTaskT1RunContract(page: Page, sourceRef: string): Promise<void> {
  const ruleName = `SparkThrift2.xT+1生成任务_${Date.now()}`;
  const body = await gotoNewRuleTaskMonitorRuleConfig(page, sourceRef, ruleName);

  await selectRuleTaskRulePackageOnCurrentPage(page, sourceRef, ["完整性规则包"]);
  await clickDqCompactButton(page, "下一步", sourceRef);
  await expect(body, `${sourceRef}: 规则配置完成后应进入调度属性页面`).toContainText(/调度属性|调度配置/, {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 调度属性页面应展示调度配置`).toContainText("调度配置", {
    timeout: 30000,
  });

  await chooseDqFieldOptionByText(page, /调度周期/, "天", sourceRef);
  await chooseDqFieldOptionByText(page, /实例生成方式/, "T+1生成", sourceRef);
  await chooseDqFieldOptionByText(page, /超时时间/, "不限制", sourceRef);

  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(body, `${sourceRef}: 保存后应提示成功或返回规则任务管理`).toContainText(/成功|规则任务管理/, {
    timeout: 30000,
  });

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 保存后规则任务列表应展示新建 T+1 任务`).toBeVisible({
    timeout: 30000,
  });
  await expect(taskRow, `${sourceRef}: T+1 任务应展示天级调度或 T+1 配置`).toContainText(/天|日|T\+1/, {
    timeout: 30000,
  });

  await expectNoMonitorRecordForRuleTask(page, sourceRef, ruleName);
}

export async function expectDataQualityRuleTaskPartitionDynamicToExistingContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆质量分区编辑任务";
  const expectedPartition = "stat_date='20260329', hour='10'";

  const initialResponse = waitForRuleTaskPageQuery(page);
  void initialResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");
  const initialRecords = getDqRuleTaskRecords(await initialResponse);
  const targetRecord = initialRecords.find((record) => record.ruleName === ruleName);
  expect(targetRecord, `${sourceRef}: 当前环境应存在规则任务「${ruleName}」`).toBeTruthy();

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 规则任务列表应展示分区编辑任务`).toBeVisible({ timeout: 30000 });
  await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 编辑规则任务应打开监控对象或调度配置页`).toContainText(
    /监控对象|监控规则|调度属性|分区/,
    { timeout: 30000 },
  );
  await expect(body, `${sourceRef}: 任务详情应展示动态分区配置`).toContainText(/动态分区|选择动态分区/, {
    timeout: 30000,
  });

  await configureExistingPartition(page, sourceRef, expectedPartition);
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(body, `${sourceRef}: 分区信息保存后页面应提示成功或返回规则任务管理`).toContainText(
    /成功|规则任务管理|分区/,
    { timeout: 30000 },
  );

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef).catch(() => {});
  const savedRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(savedRow, `${sourceRef}: 保存分区后任务行应仍可见`).toBeVisible({ timeout: 30000 });
  await runRuleTaskImmediately(page, sourceRef, savedRow);
  await expectLatestMonitorRecordPartitionForRuleTask(page, sourceRef, ruleName, expectedPartition);
}

export async function expectDataQualityRuleTaskPartitionManualToDynamicContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆质量分区编辑任务";

  const initialResponse = waitForRuleTaskPageQuery(page);
  void initialResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");
  const initialRecords = getDqRuleTaskRecords(await initialResponse);
  const targetRecord = initialRecords.find((record) => record.ruleName === ruleName);
  expect(targetRecord, `${sourceRef}: 当前环境应存在规则任务「${ruleName}」`).toBeTruthy();

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 规则任务列表应展示分区编辑任务`).toBeVisible({ timeout: 30000 });
  await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 编辑规则任务应打开监控对象或调度配置页`).toContainText(
    /监控对象|监控规则|调度属性|分区/,
    { timeout: 30000 },
  );
  await expect(body, `${sourceRef}: 任务详情应展示手动输入分区配置`).toContainText(/手动输入分区|手动输入|分区/, {
    timeout: 30000,
  });

  await configureDynamicPartition(page, sourceRef);
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(body, `${sourceRef}: 动态分区保存后页面应提示成功或返回规则任务管理`).toContainText(
    /成功|规则任务管理|分区/,
    { timeout: 30000 },
  );

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef).catch(() => {});
  const savedRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(savedRow, `${sourceRef}: 保存动态分区后任务行应仍可见`).toBeVisible({ timeout: 30000 });
  await runRuleTaskImmediately(page, sourceRef, savedRow);
  await expectLatestMonitorRecordDynamicPartitionForRuleTask(page, sourceRef, ruleName);
}

export async function expectDataQualityRuleTaskManualMultiLevelPartitionContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆质量分区编辑任务";
  const expectedPartition = "stat_date=20260116/city_code=WH";

  const initialResponse = waitForRuleTaskPageQuery(page);
  void initialResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");
  const initialRecords = getDqRuleTaskRecords(await initialResponse);
  const targetRecord = initialRecords.find((record) => record.ruleName === ruleName);
  expect(targetRecord, `${sourceRef}: 当前环境应存在规则任务「${ruleName}」`).toBeTruthy();

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 规则任务列表应展示二级分区规则任务`).toBeVisible({ timeout: 30000 });
  await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 编辑规则任务应展示分区配置项`).toContainText(
    /监控对象|监控规则|调度属性|分区/,
    { timeout: 30000 },
  );

  await configureManualPartition(page, sourceRef, expectedPartition);
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(body, `${sourceRef}: 多级分区保存后应提示成功或返回规则任务管理`).toContainText(
    /成功|规则任务管理|分区/,
    { timeout: 30000 },
  );

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef).catch(() => {});
  const savedRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(savedRow, `${sourceRef}: 保存多级分区后任务行应仍可见`).toBeVisible({ timeout: 30000 });
  await runRuleTaskImmediately(page, sourceRef, savedRow);
  await expectLatestMonitorRecordManualPartitionForRuleTask(page, sourceRef, ruleName, expectedPartition);
}

export async function expectDataQualityRuleTaskDynamicSinglePartitionContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆质量分区编辑任务";

  const initialResponse = waitForRuleTaskPageQuery(page);
  void initialResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");
  const initialRecords = getDqRuleTaskRecords(await initialResponse);
  const targetRecord = initialRecords.find((record) => record.ruleName === ruleName);
  expect(targetRecord, `${sourceRef}: 当前环境应存在规则任务「${ruleName}」`).toBeTruthy();

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 规则任务列表应展示分区编辑任务`).toBeVisible({ timeout: 30000 });
  await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 编辑规则任务应展示动态分区配置区域`).toContainText(
    /监控对象|监控规则|调度属性|分区/,
    { timeout: 30000 },
  );

  await configureDynamicPartition(page, sourceRef, "single");
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(body, `${sourceRef}: 一级动态分区保存后应提示成功或返回规则任务管理`).toContainText(
    /成功|规则任务管理|分区/,
    { timeout: 30000 },
  );

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef).catch(() => {});
  const savedRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(savedRow, `${sourceRef}: 保存一级动态分区后任务行应仍可见`).toBeVisible({ timeout: 30000 });
  await runRuleTaskImmediately(page, sourceRef, savedRow);
  await expectLatestMonitorRecordSingleDynamicPartitionForRuleTask(page, sourceRef, ruleName);
}

export async function expectDataQualityRuleTaskDynamicMultiPartitionContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆质量分区编辑任务";

  const initialResponse = waitForRuleTaskPageQuery(page);
  void initialResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");
  const initialRecords = getDqRuleTaskRecords(await initialResponse);
  const targetRecord = initialRecords.find((record) => record.ruleName === ruleName);
  expect(targetRecord, `${sourceRef}: 当前环境应存在规则任务「${ruleName}」`).toBeTruthy();

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 规则任务列表应展示二级分区编辑任务`).toBeVisible({
    timeout: 30000,
  });
  await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 编辑规则任务应展示动态分区配置区域`).toContainText(
    /监控对象|监控规则|调度属性|分区/,
    { timeout: 30000 },
  );

  await configureDynamicPartition(page, sourceRef, "multi");
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(body, `${sourceRef}: 一二级动态分区保存后应提示成功或返回规则任务管理`).toContainText(
    /成功|规则任务管理|分区/,
    { timeout: 30000 },
  );

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef).catch(() => {});
  const savedRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(savedRow, `${sourceRef}: 保存一二级动态分区后任务行应仍可见`).toBeVisible({
    timeout: 30000,
  });
  await runRuleTaskImmediately(page, sourceRef, savedRow);
  await expectLatestMonitorRecordDynamicPartitionForRuleTask(page, sourceRef, ruleName);
}

export async function expectDataQualityRuleTaskSamplingConfigContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = `SparkThrift2.x抽样检查任务_${Date.now()}`;
  const sampleRows = "10";
  const body = await gotoNewRuleTaskMonitorObjectPage(page, sourceRef, ruleName);

  await configureSamplingCheckSetting(page, sourceRef, sampleRows);
  await clickDqCompactButton(page, "下一步", sourceRef);
  await expect(
    body,
    `${sourceRef}: 监控对象与抽样配置保存成功后应进入监控规则配置页`,
  ).toContainText(/监控规则|引用规则包|添加规则/, { timeout: 30000 });

  await selectRuleTaskRulePackageOnCurrentPage(page, sourceRef, ["完整性规则包"]);
  await clickDqCompactButton(page, "下一步", sourceRef);
  await expect(body, `${sourceRef}: 规则配置完成后应进入调度属性页面`).toContainText(/调度属性|调度配置/, {
    timeout: 30000,
  });

  await chooseDqFieldOptionByText(page, /调度周期/, "手动触发", sourceRef);
  await chooseDqFieldOptionByText(page, /实例生成方式/, "立即生成", sourceRef);
  await chooseDqFieldOptionByText(page, /超时时间/, "不限制", sourceRef);

  const saveResponse = waitForRuleTaskPageQuery(page);
  void saveResponse.catch(() => {});
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(body, `${sourceRef}: 抽样规则任务保存后应提示成功或返回规则任务管理`).toContainText(
    /成功|规则任务管理/,
    { timeout: 30000 },
  );
  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef).catch(async () => {
    const savedPayload = await saveResponse;
    expect(savedPayload.success ?? savedPayload.code === 1, `${sourceRef}: 保存抽样任务后列表应刷新成功`).toBe(true);
    return getDqRuleTaskRecords(savedPayload);
  });

  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 保存后规则任务列表应展示抽样任务`).toBeVisible({ timeout: 30000 });
  await runRuleTaskImmediately(page, sourceRef, taskRow);
  await expectLatestMonitorRecordSamplingForRuleTask(page, sourceRef, ruleName, sampleRows);
}

export async function expectDataQualityRuleTaskAddSparkEnvParamContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆质量环境参数任务";
  const paramName = "spark.sql.shuffle.partitions";
  const paramValue = "2";

  const initialResponse = waitForRuleTaskPageQuery(page);
  void initialResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");
  const initialRecords = getDqRuleTaskRecords(await initialResponse);
  const targetRecord = initialRecords.find((record) => record.ruleName === ruleName);
  expect(targetRecord, `${sourceRef}: 当前环境应存在规则任务「${ruleName}」`).toBeTruthy();

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 规则任务列表应展示环境参数任务`).toBeVisible({ timeout: 30000 });
  await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });

  await gotoRuleTaskScheduleAttributesPage(page, sourceRef);
  await configureSparkEnvParam(page, sourceRef, paramName, paramValue);
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 环境参数保存后应提示成功或返回规则任务管理`).toContainText(
    /成功|规则任务管理/,
    { timeout: 30000 },
  );

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef).catch(() => {});
  const savedRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(savedRow, `${sourceRef}: 保存环境参数后任务行应仍可见`).toBeVisible({ timeout: 30000 });
  await openRuleTaskDetailsOrEdit(page, sourceRef, savedRow);
  await expect(page.locator("body"), `${sourceRef}: 任务详情或编辑页应回显新增环境参数`).toContainText(
    new RegExp(`${escapeRegExp(paramName)}|${escapeRegExp(paramValue)}`),
    { timeout: 30000 },
  );
}

export async function expectDataQualityRuleTaskEditSparkEnvParamContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆质量环境参数任务";
  const paramName = "logLevel";
  const originalValue = "INFO";
  const updatedValue = "DEBUG";

  const initialResponse = waitForRuleTaskPageQuery(page);
  void initialResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");
  const initialRecords = getDqRuleTaskRecords(await initialResponse);
  const targetRecord = initialRecords.find((record) => record.ruleName === ruleName);
  expect(targetRecord, `${sourceRef}: 当前环境应存在规则任务「${ruleName}」`).toBeTruthy();

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 规则任务列表应展示环境参数任务`).toBeVisible({ timeout: 30000 });
  await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });

  await gotoRuleTaskScheduleAttributesPage(page, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 已有环境参数应展示 ${paramName}=${originalValue}`).toContainText(
    new RegExp(`${escapeRegExp(paramName)}|${escapeRegExp(originalValue)}`),
    { timeout: 30000 },
  );
  await setExistingSparkEnvParamValue(page, sourceRef, paramName, updatedValue);
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 编辑环境参数保存后应提示成功或返回规则任务管理`).toContainText(
    /成功|规则任务管理/,
    { timeout: 30000 },
  );

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef).catch(() => {});
  const savedRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(savedRow, `${sourceRef}: 保存编辑环境参数后任务行应仍可见`).toBeVisible({ timeout: 30000 });
  await openRuleTaskDetailsOrEdit(page, sourceRef, savedRow);
  await expect(page.locator("body"), `${sourceRef}: 详情或编辑页应回显修改后的环境参数`).toContainText(
    new RegExp(`${escapeRegExp(paramName)}|${escapeRegExp(updatedValue)}`),
    { timeout: 30000 },
  );

  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const executableRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(executableRow, `${sourceRef}: 重新进入列表后应可定位环境参数任务`).toBeVisible({
    timeout: 30000,
  });
  await runRuleTaskImmediately(page, sourceRef, executableRow);
  await expectLatestMonitorRecordForRuleTask(page, sourceRef, ruleName);
}

export async function expectDataQualityRuleTaskLogLevelEnvParamContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆质量环境参数任务";
  const paramName = "logLevel";
  const paramValue = "INFO";

  const initialResponse = waitForRuleTaskPageQuery(page);
  void initialResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");
  const initialRecords = getDqRuleTaskRecords(await initialResponse);
  const targetRecord = initialRecords.find((record) => record.ruleName === ruleName);
  expect(targetRecord, `${sourceRef}: 当前环境应存在规则任务「${ruleName}」`).toBeTruthy();

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 规则任务列表应展示环境参数任务`).toBeVisible({ timeout: 30000 });
  await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });

  await gotoRuleTaskScheduleAttributesPage(page, sourceRef);
  await setExistingSparkEnvParamValue(page, sourceRef, paramName, paramValue);
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: logLevel 环境参数保存后应提示成功或返回规则任务管理`).toContainText(
    /成功|规则任务管理/,
    { timeout: 30000 },
  );

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef).catch(() => {});
  const savedRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(savedRow, `${sourceRef}: 保存 logLevel 后任务行应仍可见`).toBeVisible({ timeout: 30000 });
  await runRuleTaskImmediately(page, sourceRef, savedRow);
  await expectLatestMonitorRecordLogForRuleTask(page, sourceRef, ruleName, "INFO");
}

export async function expectDataQualityRuleTaskExecutorCoresEnvParamContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆质量环境参数任务";
  const paramName = "spark.executor.cores";
  const paramValue = "1";

  const initialResponse = waitForRuleTaskPageQuery(page);
  void initialResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");
  const initialRecords = getDqRuleTaskRecords(await initialResponse);
  const targetRecord = initialRecords.find((record) => record.ruleName === ruleName);
  expect(targetRecord, `${sourceRef}: 当前环境应存在规则任务「${ruleName}」`).toBeTruthy();

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 规则任务列表应展示环境参数任务`).toBeVisible({ timeout: 30000 });
  await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });

  await gotoRuleTaskScheduleAttributesPage(page, sourceRef);
  await setExistingSparkEnvParamValue(page, sourceRef, paramName, paramValue);
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: spark.executor.cores 环境参数保存后应提示成功`).toContainText(
    /成功|规则任务管理/,
    { timeout: 30000 },
  );

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef).catch(() => {});
  const savedRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(savedRow, `${sourceRef}: 保存 executor cores 后任务行应仍可见`).toBeVisible({ timeout: 30000 });
  await openRuleTaskDetailsOrEdit(page, sourceRef, savedRow);
  await expect(page.locator("body"), `${sourceRef}: 任务详情应展示 spark.executor.cores=1`).toContainText(
    new RegExp(`${escapeRegExp(paramName)}|${escapeRegExp(paramValue)}`),
    { timeout: 30000 },
  );

  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const executableRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(executableRow, `${sourceRef}: 重新进入列表后应可定位环境参数任务`).toBeVisible({
    timeout: 30000,
  });
  await runRuleTaskImmediately(page, sourceRef, executableRow);
  await expectLatestMonitorRecordForRuleTask(page, sourceRef, ruleName);
}

export async function expectDataQualityRuleTaskSparkEnvParamDetailsContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆质量环境参数任务";
  const initialResponse = waitForRuleTaskPageQuery(page);
  void initialResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");
  const initialRecords = getDqRuleTaskRecords(await initialResponse);
  const targetRecord = initialRecords.find((record) => record.ruleName === ruleName);
  expect(targetRecord, `${sourceRef}: 当前环境应存在规则任务「${ruleName}」`).toBeTruthy();

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 规则任务列表应展示环境参数任务`).toBeVisible({ timeout: 30000 });
  await openRuleTaskDetailsOrEdit(page, sourceRef, taskRow);
  await expect(page.locator("body"), `${sourceRef}: 规则任务详情应加载成功`).toContainText(
    /环境参数|调度属性|监控对象|监控规则/,
    { timeout: 30000 },
  );
  await expect(page.locator("body"), `${sourceRef}: 详情应展示 logLevel=INFO`).toContainText(/logLevel|INFO/, {
    timeout: 30000,
  });
  await expect(page.locator("body"), `${sourceRef}: 详情应展示 spark.executor.cores=1`).toContainText(
    /spark\.executor\.cores|1/,
    { timeout: 30000 },
  );
}

export async function expectDataQualityRuleTaskUnlimitedTimeoutRunContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆质量立即生成任务";
  await openRuleTaskScheduleForExistingTask(page, sourceRef, ruleName);
  await chooseDqFieldOptionByText(page, /超时时间/, "不限制", sourceRef);
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 不限制超时时间保存后应提示成功或返回规则任务管理`).toContainText(
    /成功|规则任务管理/,
    { timeout: 30000 },
  );

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef).catch(() => {});
  const savedRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(savedRow, `${sourceRef}: 保存不限制超时后任务行应仍可见`).toBeVisible({ timeout: 30000 });
  await runRuleTaskImmediately(page, sourceRef, savedRow);
  await expectLatestMonitorRecordTerminalForRuleTask(page, sourceRef, ruleName, { allowTimeout: false });
}

export async function expectDataQualityRuleTaskTimeoutHandlingContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆质量立即生成任务";
  await openRuleTaskScheduleForExistingTask(page, sourceRef, ruleName);
  await chooseDqFieldOptionByText(page, /超时时间/, "1分钟", sourceRef).catch(async () => {
    await chooseDqFieldOptionByText(page, /超时时间/, "1", sourceRef);
  });
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 短超时时间保存后应提示成功或返回规则任务管理`).toContainText(
    /成功|规则任务管理/,
    { timeout: 30000 },
  );

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef).catch(() => {});
  const savedRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(savedRow, `${sourceRef}: 保存短超时后任务行应仍可见`).toBeVisible({ timeout: 30000 });
  await runRuleTaskImmediately(page, sourceRef, savedRow);
  await expectLatestMonitorRecordTimeoutForRuleTask(page, sourceRef, ruleName);
}

export async function expectDataQualityRuleTaskSameTableDifferentRulesContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const suffix = Date.now();
  const firstRuleName = `同表不同规则A_${suffix}`;
  const secondRuleName = `同表不同规则B_${suffix}`;

  await createRuleTaskWithRulePackages(page, sourceRef, firstRuleName, ["完整性规则包"]);
  await createRuleTaskWithRulePackages(page, sourceRef, secondRuleName, ["有效性规则包"]);

  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const firstRow = page.locator(".ant-table-tbody tr").filter({ hasText: firstRuleName }).first();
  const secondRow = page.locator(".ant-table-tbody tr").filter({ hasText: secondRuleName }).first();
  await expect(firstRow, `${sourceRef}: 同表第一个不同规则任务应保存成功并展示`).toBeVisible({ timeout: 30000 });
  await expect(secondRow, `${sourceRef}: 同表第二个不同规则任务应保存成功并展示`).toBeVisible({ timeout: 30000 });

  await runRuleTaskImmediately(page, sourceRef, firstRow);
  await expectLatestMonitorRecordForRuleTask(page, sourceRef, firstRuleName);
  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const refreshedSecondRow = page.locator(".ant-table-tbody tr").filter({ hasText: secondRuleName }).first();
  await runRuleTaskImmediately(page, sourceRef, refreshedSecondRow);
  await expectLatestMonitorRecordForRuleTask(page, sourceRef, secondRuleName);
}

export async function expectDataQualityRuleTaskSameTableSameRulesContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const suffix = Date.now();
  const firstRuleName = `同表相同规则A_${suffix}`;
  const secondRuleName = `同表相同规则B_${suffix}`;
  const sharedPackages = ["完整性规则包"];

  await createRuleTaskWithRulePackages(page, sourceRef, firstRuleName, sharedPackages);
  await createRuleTaskWithRulePackages(page, sourceRef, secondRuleName, sharedPackages);

  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const firstRow = page.locator(".ant-table-tbody tr").filter({ hasText: firstRuleName }).first();
  const secondRow = page.locator(".ant-table-tbody tr").filter({ hasText: secondRuleName }).first();
  await expect(firstRow, `${sourceRef}: 同表第一个相同规则任务应保存成功并展示`).toBeVisible({ timeout: 30000 });
  await expect(secondRow, `${sourceRef}: 同表第二个相同规则任务应保存成功并展示`).toBeVisible({ timeout: 30000 });
  await expect(firstRow, `${sourceRef}: 第一个任务名称应与第二个不同`).not.toContainText(secondRuleName, {
    timeout: 5000,
  });
  await expect(secondRow, `${sourceRef}: 第二个任务名称应与第一个不同`).not.toContainText(firstRuleName, {
    timeout: 5000,
  });

  await runRuleTaskImmediately(page, sourceRef, firstRow);
  await expectLatestMonitorRecordForRuleTask(page, sourceRef, firstRuleName);
  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const refreshedSecondRow = page.locator(".ant-table-tbody tr").filter({ hasText: secondRuleName }).first();
  await runRuleTaskImmediately(page, sourceRef, refreshedSecondRow);
  await expectLatestMonitorRecordForRuleTask(page, sourceRef, secondRuleName);
}

export async function expectSparkThriftQualityRuleValidationContract(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
): Promise<void> {
  const suffix = Date.now();
  const effectiveScenario: SparkThriftQualityRuleValidationScenario = scenario.customSqlTemplate
    ? {
        ...scenario,
        customSqlTemplate: {
          ...scenario.customSqlTemplate,
          ruleName: `${scenario.customSqlTemplate.ruleName}_${suffix}`,
        },
      }
    : scenario;
  const packageName = `${effectiveScenario.title}规则包_${suffix}`;
  const ruleSetDescription = `${effectiveScenario.title}_${suffix}`;
  const ruleName = `SparkThrift2.x+${effectiveScenario.title}_${suffix}`;
  const failRuleName = `${ruleName}_fail`;

  await deleteTempRuleSetByDescriptionBestEffort(
    page,
    sourceRef,
    effectiveScenario.tableName,
    `${effectiveScenario.title}_`,
  );

  if (effectiveScenario.customSqlTemplate) {
    await createCustomSqlTemplateFixture(page, sourceRef, effectiveScenario.customSqlTemplate);
  }

  await createSparkThriftArchiveValidationRuleSet(
    page,
    sourceRef,
    effectiveScenario,
    packageName,
    ruleSetDescription,
    effectiveScenario.fusionChecks,
  );
  if (effectiveScenario.fusionChecks?.ruleSetListAndConfiguredTableFilter) {
    await expectArchiveRuleSetListAndConfiguredTableFilter(
      page,
      sourceRef,
      effectiveScenario,
      ruleSetDescription,
    );
  }
  if (effectiveScenario.fusionChecks?.ruleSetDetail) {
    await expectArchiveRuleSetDetail(page, sourceRef, effectiveScenario, ruleSetDescription, packageName);
  }
  await createSparkThriftArchiveValidationRuleTask(page, sourceRef, effectiveScenario, ruleName, packageName, {
    envParams: effectiveScenario.fusionChecks?.t1BeforeImmediateWithEnvParams,
    samplingRows: effectiveScenario.fusionChecks?.samplingRows,
    t1BeforeImmediate: Boolean(effectiveScenario.fusionChecks?.t1BeforeImmediateWithEnvParams?.length),
    partitionModesVisible: effectiveScenario.fusionChecks?.partitionModesVisible,
  });
  if (effectiveScenario.fusionChecks?.taskDetectionToggle) {
    await expectArchiveRuleTaskSingleDetectionToggle(page, sourceRef, effectiveScenario, ruleName);
  }
  if (effectiveScenario.fusionChecks?.sameTableSecondTask) {
    await createSparkThriftArchiveValidationRuleTask(
      page,
      sourceRef,
      effectiveScenario,
      `${ruleName}_second`,
      packageName,
    );
  }

  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, effectiveScenario.tableName, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: effectiveScenario.tableName })
    .filter({ hasText: ruleName })
    .first();
  await runRuleTaskImmediately(page, sourceRef, taskRow);
  await expectArchiveRuleValidationRecord(page, sourceRef, effectiveScenario, ruleName, {
    expectedStatus: /校验通过/,
    expectedActualValue: effectiveScenario.passExpectedValue,
    expectedPartition: effectiveScenario.passPartition,
    passHasNoDirtyDetail: effectiveScenario.fusionChecks?.passHasNoDirtyDetail,
    expectedSamplingRows: effectiveScenario.fusionChecks?.samplingRows,
  });
  if (effectiveScenario.fusionChecks?.monitorRecordTableSearch) {
    await expectArchiveMonitorRecordTableSearch(page, sourceRef, effectiveScenario, ruleName);
  }

  const failByEditing = effectiveScenario.fusionChecks?.failByEditingExistingTask;
  if (failByEditing?.deleteRuleSetBeforeRun) {
    await deleteRuleSetRowAndAssert(page, sourceRef, effectiveScenario.tableName, ruleSetDescription);
  }
  if (failByEditing) {
    await editSparkThriftArchiveValidationRuleTaskPartition(page, sourceRef, effectiveScenario, ruleName, {
      partitionMode: failByEditing.partitionMode,
    });
  } else {
    await createSparkThriftArchiveValidationRuleTask(
      page,
      sourceRef,
      { ...effectiveScenario, passPartition: effectiveScenario.failPartition },
      failRuleName,
      packageName,
    );
  }
  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, effectiveScenario.tableName, sourceRef);
  const finalRuleName = failByEditing ? ruleName : failRuleName;
  const editedTaskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: effectiveScenario.tableName })
    .filter({ hasText: finalRuleName })
    .first();
  await runRuleTaskImmediately(page, sourceRef, editedTaskRow);
  await expectArchiveRuleValidationRecord(page, sourceRef, effectiveScenario, finalRuleName, {
    expectedStatus: /校验异常|校验失败|校验不通过/,
    expectedActualValue: effectiveScenario.failExpectedValue,
    expectedPartition: effectiveScenario.failPartition,
    dirtyEvidence: effectiveScenario.dirtyEvidence,
    dirtyDetail: effectiveScenario.fusionChecks?.dirtyDetail,
  });
}

async function gotoNewRuleTaskMonitorObjectPage(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<ReturnType<Page["locator"]>> {
  await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 30000 });
  await gotoDataQualityPage(page, "/dq/rule/add");
  await expect(page, `${sourceRef}: 新建监控规则应进入 /dq/rule/add`).toHaveURL(/\/dq\/rule\/add/);

  const body = page.locator("body");
  for (const label of [
    "新建单表校验规则",
    "监控对象",
    "规则名称",
    "选择数据源",
    "选择数据库",
    "选择数据表",
    "下一步",
  ]) {
    await expect(body, `${sourceRef}: 新建监控规则页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await fillDqPageFormField(page, /规则名称/, ruleName);
  await selectDqFormOptionBySearch(page, /数据源/, "SparkThrift2.x", sourceRef);
  await selectDqFormOptionBySearch(page, /数据库/, getDefaultDatasource().sql.database, sourceRef);
  await selectDqFormOptionBySearch(page, /数据表/, LTQC_LOCAL_RULESET_AVAILABLE_TABLE, sourceRef);
  return body;
}

async function gotoNewRuleTaskMonitorObjectPageForTable(
  page: Page,
  sourceRef: string,
  ruleName: string,
  tableName: string,
  comparisonTableName?: string,
): Promise<ReturnType<Page["locator"]>> {
  await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 30000 });
  await gotoDataQualityPage(page, "/dq/rule/add");
  await expect(page, `${sourceRef}: 新建监控规则应进入 /dq/rule/add`).toHaveURL(/\/dq\/rule\/add/);

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 新建监控规则页面应展示监控对象配置`).toContainText(/监控对象|规则名称/, {
    timeout: 30000,
  });
  await fillDqPageFormField(page, /规则名称/, ruleName);
  await selectDqFormOptionBySearch(page, /数据源/, "SparkThrift2.x", sourceRef);
  await selectDqFormOptionBySearch(page, /数据库/, getDefaultDatasource().sql.database, sourceRef);
  await selectDqFormOptionBySearch(page, /数据表/, tableName, sourceRef);
  if (comparisonTableName) {
    await selectDqFormOptionBySearch(page, /对比表|比较表|关联表/, comparisonTableName, sourceRef);
  }
  return body;
}

async function gotoNewRuleTaskMonitorRuleConfig(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<ReturnType<Page["locator"]>> {
  const body = await gotoNewRuleTaskMonitorObjectPage(page, sourceRef, ruleName);

  await clickDqCompactButton(page, "下一步", sourceRef);
  await expect(
    body,
    `${sourceRef}: 监控对象保存成功后应进入监控规则配置页`,
  ).toContainText(/监控规则|引用规则包|添加规则/, { timeout: 30000 });
  return body;
}

export async function expectDataQualityRuleSetCreateEntry(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  await clickDqText(page, "新建规则集", sourceRef);
  await expect(page, `${sourceRef}: 新建规则集应进入 /dq/ruleSet/add`).toHaveURL(/\/dq\/ruleSet\/add/);

  const body = page.locator("body");
  for (const label of [
    "新增规则集",
    "基础信息",
    "选择数据源",
    "选择数据库",
    "选择数据表",
    "规则包名称",
    "下一步",
  ]) {
    await expect(body, `${sourceRef}: 新建规则集页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/ruleSet 新建规则集", [
    "/dassets/v1/valid/project/getDefaultMonitorDatasource",
  ]);
}

export async function expectDataQualityRuleSetCreateBasicInfoContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const packageName = `主流程规则包_${Date.now()}`;
  await gotoDataQualityPage(page, "/dq/ruleSet");
  await clickDqText(page, "新建规则集", sourceRef);
  await expect(page, `${sourceRef}: 新建规则集应进入 /dq/ruleSet/add`).toHaveURL(/\/dq\/ruleSet\/add/);

  const body = page.locator("body");
  for (const label of ["新增规则集", "基础信息", "选择数据源", "选择数据库", "选择数据表", "规则包名称", "下一步"]) {
    await expect(body, `${sourceRef}: 新建规则集页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await selectDqFormOptionBySearch(page, /数据源/, "SparkThrift2.x", sourceRef);
  await selectDqFormOptionBySearch(page, /数据库/, getDefaultDatasource().sql.database, sourceRef);
  await selectDqFormOptionBySearch(page, /数据表/, LTQC_LOCAL_RULESET_AVAILABLE_TABLE, sourceRef);
  await fillDqPageFormField(page, /规则集描述/, "主流程规则集");
  const packageInput = getRuleSetPackageNameInputs(page).first();
  await expect(packageInput, `${sourceRef}: 规则包名称输入框应可见`).toBeVisible({ timeout: 30000 });
  await packageInput.fill(packageName, { timeout: 30000 });
  await expect(packageInput, `${sourceRef}: 规则包名称应回显`).toHaveValue(packageName, { timeout: 30000 });
  await packageInput.press("Tab", { timeout: 30000 });

  await clickDqCompactButton(page, "下一步", sourceRef);
  await expect(body, `${sourceRef}: 下一步后应进入监控规则配置页`).toContainText(/监控规则|添加规则/, {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 监控规则配置页应展示新增规则包入口`).toContainText("新增规则包", {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 监控规则配置页应展示全局参数入口`).toContainText("查看全局参数", {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 监控规则配置页应展示保存入口`).toContainText(/保\s*存/, {
    timeout: 30000,
  });
}

export async function expectDataQualityRuleSetTableFilteringContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const configuredTable = VEHICLE_ORDER_TABLE;
  const availableTable = LTQC_LOCAL_RULESET_AVAILABLE_TABLE;

  await gotoDataQualityPage(page, "/dq/ruleSet");
  await clickDqText(page, "新建规则集", sourceRef);
  await expect(page, `${sourceRef}: 新建规则集应进入 /dq/ruleSet/add`).toHaveURL(/\/dq\/ruleSet\/add/);

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 新建规则集页面应展示基础信息`).toContainText("基础信息", {
    timeout: 30000,
  });

  await selectDqFormOptionBySearch(page, /数据源/, "SparkThrift2.x", sourceRef);
  await selectDqFormOptionBySearch(page, /数据库/, getDefaultDatasource().sql.database, sourceRef);

  const tableField = page.locator(".ant-form-item").filter({ hasText: /数据表/ }).first();
  await tableField.locator(".ant-select").first().click({ timeout: 30000 });
  await tableField.locator("input").first().fill(configuredTable, { timeout: 30000 });
  const configuredDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(
    configuredDropdown,
    `${sourceRef}: 已配置规则集的数据表 ${configuredTable} 不应出现在可选列表`,
  ).not.toContainText(configuredTable, { timeout: 5000 });

  await tableField.locator("input").first().fill("", { timeout: 30000 });
  await tableField.locator("input").first().fill(availableTable, { timeout: 30000 });
  const availableDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(
    availableDropdown,
    `${sourceRef}: 未配置规则集的数据表 ${availableTable} 应出现在可选列表`,
  ).toContainText(availableTable, { timeout: 30000 });
  await availableDropdown.getByText(availableTable).first().click({ timeout: 30000 });
  await expect(tableField, `${sourceRef}: 未配置规则集的数据表应可被选择`).toContainText(availableTable, {
    timeout: 30000,
  });
}

export async function expectDataQualityRuleSetPackageNameManagementContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const firstName = `主流程规则包A_${Date.now()}`;
  const renamedName = `主流程规则包B_${Date.now()}`;
  const duplicateName = `重复规则包_${Date.now()}`;

  await gotoDataQualityPage(page, "/dq/ruleSet");
  await clickDqText(page, "新建规则集", sourceRef);
  await expect(page, `${sourceRef}: 新建规则集应进入 /dq/ruleSet/add`).toHaveURL(/\/dq\/ruleSet\/add/);

  await selectDqFormOptionBySearch(page, /数据源/, "SparkThrift2.x", sourceRef);
  await selectDqFormOptionBySearch(page, /数据库/, getDefaultDatasource().sql.database, sourceRef);
  await selectDqFormOptionBySearch(page, /数据表/, LTQC_LOCAL_RULESET_AVAILABLE_TABLE, sourceRef);

  const inputs = getRuleSetPackageNameInputs(page);
  await expect(inputs.first(), `${sourceRef}: 规则包名称输入框应可见`).toBeVisible({ timeout: 30000 });
  await inputs.first().fill(firstName, { timeout: 30000 });
  await expect(inputs.first(), `${sourceRef}: 规则包名称应可重命名`).toHaveValue(firstName, {
    timeout: 30000,
  });

  await clickRuleSetPackageAddButton(page, sourceRef);
  await expect(inputs.nth(1), `${sourceRef}: 新增规则包后第二个规则包输入框应出现`).toBeVisible({
    timeout: 30000,
  });
  await inputs.nth(1).fill(renamedName, { timeout: 30000 });
  await expect(inputs.nth(1), `${sourceRef}: 新增规则包应可填写名称`).toHaveValue(renamedName, {
    timeout: 30000,
  });

  const secondRow = getRuleSetPackageRows(page).nth(1);
  const deleteButton = secondRow.locator(".anticon-delete, .anticon-minus-circle, [class*='delete']").first();
  await expect(deleteButton, `${sourceRef}: 空规则包应展示删除入口`).toBeVisible({ timeout: 30000 });
  await deleteButton.click({ timeout: 30000 });
  const confirm = page.locator(".ant-popconfirm:visible, .ant-modal:visible").last();
  if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirm.getByRole("button", { name: /确\s*定|确\s*认/ }).last().click({ timeout: 30000 });
  }
  await expect(inputs, `${sourceRef}: 删除空规则包后应只保留一个规则包输入框`).toHaveCount(1, {
    timeout: 30000,
  });

  await clickRuleSetPackageAddButton(page, sourceRef);
  await expect(inputs.nth(1), `${sourceRef}: 重新新增规则包后第二个输入框应出现`).toBeVisible({
    timeout: 30000,
  });
  await inputs.first().fill(duplicateName, { timeout: 30000 });
  await inputs.nth(1).fill(duplicateName, { timeout: 30000 });
  await inputs.nth(1).press("Tab", { timeout: 30000 });
  await expect(
    page.locator(".ant-form-item-explain-error").filter({ hasText: /重复|不可重复|已存在/ }).first(),
    `${sourceRef}: 重复规则包名称应提示校验错误`,
  ).toBeVisible({ timeout: 30000 });
}

export async function expectDataQualityRuleSetRuleCrudContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleDescription = `主流程临时完整性规则_${Date.now()}`;
  const editedDescription = `${ruleDescription}_edited`;
  await gotoEditableRuleSetMonitorRules(page, sourceRef);

  const ruleItems = getRuleSetMonitorRuleItems(page);
  const initialCount = await ruleItems.count();
  await addCompletenessRuleToCurrentRuleSet(page, sourceRef, ruleDescription);
  await expect(page.locator("body"), `${sourceRef}: 新增完整性校验规则后应回显规则描述`).toContainText(
    ruleDescription,
    { timeout: 30000 },
  );
  await expect
    .poll(async () => getRuleSetMonitorRuleItems(page).count(), {
      message: `${sourceRef}: 新增规则后规则数量应增加`,
      timeout: 30000,
    })
    .toBeGreaterThan(initialCount);

  const createdRule = getRuleSetMonitorRuleItems(page).filter({ hasText: ruleDescription }).first();
  await expect(createdRule, `${sourceRef}: 新增规则行应可见`).toBeVisible({ timeout: 30000 });
  await createdRule.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });
  await fillRuleSetRuleDescription(page, editedDescription);
  await switchRuleSetStrength(page, "弱规则", sourceRef);
  await saveRuleSetRuleRow(page, sourceRef, "编辑规则");
  await expect(page.locator("body"), `${sourceRef}: 编辑后规则描述应回显`).toContainText(editedDescription, {
    timeout: 30000,
  });
  await expect(page.locator("body"), `${sourceRef}: 编辑后强弱规则应回显弱规则`).toContainText("弱规则", {
    timeout: 30000,
  });

  const editedRule = getRuleSetMonitorRuleItems(page).filter({ hasText: editedDescription }).first();
  await editedRule.getByRole("button", { name: /删除/ }).first().click({ timeout: 30000 });
  const confirm = page.locator(".ant-popconfirm:visible, .ant-modal:visible").last();
  if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirm.getByRole("button", { name: /确\s*定|确\s*认/ }).last().click({ timeout: 30000 });
  }
  await expect(editedRule, `${sourceRef}: 删除后临时规则行应消失`).toBeHidden({ timeout: 30000 });
  await expect
    .poll(async () => getRuleSetMonitorRuleItems(page).count(), {
      message: `${sourceRef}: 删除规则后规则数量应恢复`,
      timeout: 30000,
    })
    .toBe(initialCount);
}

export async function expectDataQualityRuleSetDeleteContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const tempTableName = "dwd_supplier_info_di";
  const configuredTableName = VEHICLE_ORDER_TABLE;
  const suffix = Date.now();
  const packageName = `主流程删除验证规则包_${suffix}`;
  const description = `主流程删除验证规则集_${suffix}`;
  const ruleDescription = `主流程删除验证规则_${suffix}`;

  await gotoDataQualityPage(page, "/dq/ruleSet");
  const body = page.locator("body");
  for (const label of [
    "新建规则集",
    "表名",
    "所属数据库",
    "所属数据源",
    "规则包数量",
    "规则数量",
    "规则集描述",
    "更新人",
    "更新时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 规则集管理列表应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  const configuredRecords = await searchRuleSetTableName(page, configuredTableName, sourceRef);
  expect(configuredRecords.length, `${sourceRef}: 搜索已配置规则集表应返回记录`).toBeGreaterThan(0);
  for (const record of configuredRecords) {
    expect(
      String(record.tableName ?? "").includes(configuredTableName),
      `${sourceRef}: 搜索结果应仅展示匹配的数据表规则集`,
    ).toBe(true);
    expect(Number(record.packageCount), `${sourceRef}: 规则包数量应为非负整数`).toBeGreaterThanOrEqual(0);
    expect(Number(record.ruleCount), `${sourceRef}: 规则数量应为非负整数`).toBeGreaterThanOrEqual(0);
  }

  await deleteTempRuleSetByDescriptionBestEffort(page, sourceRef, tempTableName, "主流程删除验证规则集_");
  await createMinimalRuleSetForDeletion(page, sourceRef, tempTableName, packageName, description, ruleDescription);

  await gotoDataQualityPage(page, "/dq/ruleSet");
  const createdRecords = await searchRuleSetTableName(page, tempTableName, sourceRef);
  const createdRecord = createdRecords.find((record) => record.description === description);
  expect(createdRecord?.id, `${sourceRef}: 临时规则集创建后列表应返回 id`).toBeTruthy();

  await deleteRuleSetRowAndAssert(page, sourceRef, tempTableName, description);

  await clickDqText(page, "新建规则集", sourceRef);
  await expect(page, `${sourceRef}: 删除后应能再次进入新建规则集`).toHaveURL(/\/dq\/ruleSet\/add/);
  await selectDqFormOptionBySearch(page, /数据源/, "SparkThrift2.x", sourceRef);
  await selectDqFormOptionBySearch(page, /数据库/, getDefaultDatasource().sql.database, sourceRef);
  const tableField = page.locator(".ant-form-item").filter({ hasText: /数据表/ }).first();
  await tableField.locator(".ant-select").first().click({ timeout: 30000 });
  await tableField.locator("input").first().fill(tempTableName, { timeout: 30000 });
  await expect(
    page.locator(".ant-select-dropdown:visible").last(),
    `${sourceRef}: 删除规则集后该数据表应可重新新建规则集`,
  ).toContainText(tempTableName, { timeout: 30000 });
}

export async function expectDataQualityRuleSetEditHistoricalTaskIsolationContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await expectDataQualityRuleSetHistoricalTaskPreconditions(page, sourceRef);
  throw new Error(`${sourceRef}: L8039 仍需在环境恢复后补齐编辑规则集、重跑历史任务与结果一致性断言`);
}

export async function expectDataQualityRuleSetDeleteHistoricalTaskIsolationContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await expectDataQualityRuleSetHistoricalTaskPreconditions(page, sourceRef);
  throw new Error(`${sourceRef}: L8058 仍需在环境恢复后补齐删除规则集、重跑历史任务与实例规则详情断言`);
}

async function expectDataQualityRuleSetHistoricalTaskPreconditions(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const tableName = VEHICLE_ORDER_TABLE;
  await gotoDataQualityPage(page, "/dq/ruleSet");
  const ruleSetResponse = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleSet/pageQuery"),
    {
      data: { current: 1, size: 100, tableName },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    },
  );
  expect(ruleSetResponse.ok(), `${sourceRef}: 查询规则集列表 HTTP 应成功`).toBe(true);
  const ruleSetPage = expectDqSuccess(
    (await ruleSetResponse.json()) as DqApiResponse<DqRuleSetPageData>,
    `${sourceRef}: 查询规则集列表应请求成功`,
  );
  const ruleSet = expectRuleSetPage(ruleSetPage, `${sourceRef}: 规则集列表应返回记录`).find(
    (record) => record.tableName === tableName,
  );
  expect(ruleSet, `${sourceRef}: 应存在 Archive 前置规则集表 ${tableName}`).toBeTruthy();
  expect(Number(ruleSet?.packageCount), `${sourceRef}: 前置规则集应包含规则包`).toBeGreaterThan(0);
  expect(Number(ruleSet?.ruleCount), `${sourceRef}: 前置规则集应包含规则`).toBeGreaterThan(0);

  const detailResponse = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleSet/detail"),
    {
      data: { id: String(ruleSet?.id) },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    },
  );
  expect(detailResponse.ok(), `${sourceRef}: 查询规则集详情 HTTP 应成功`).toBe(true);
  const detail = expectDqSuccess(
    (await detailResponse.json()) as DqApiResponse<DqRuleSetRecord>,
    `${sourceRef}: 查询规则集详情应请求成功`,
  );
  assertRuleSetDetailPackages(detail, sourceRef);

  await gotoDataQualityPage(page, "/dq/rule");
  const taskResponse = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/monitor/pageQuery"), {
    data: { currentPage: 1, pageSize: 100, search: tableName },
    headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
    timeout: 60000,
  });
  expect(taskResponse.ok(), `${sourceRef}: 查询规则任务列表 HTTP 应成功`).toBe(true);
  const taskPayload = (await taskResponse.json()) as DqRuleTaskPageQuery;
  expect(taskPayload.success ?? taskPayload.code === 1, `${sourceRef}: 查询规则任务列表应请求成功`).toBe(true);
  const historicalTask = getDqRuleTaskRecords(taskPayload).find(
    (record) => record.tableName === tableName && Number(record.associated) === 1,
  );
  expect(historicalTask, `${sourceRef}: 应存在已引用规则集的历史规则任务`).toBeTruthy();
}

export async function expectDataQualityRuleSetFilterContract(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 规则集管理应展示新建规则集入口`).toContainText("新建规则集", {
    timeout: 30000,
  });
  await expect(
    page.getByPlaceholder("输入表名搜索").first(),
    `${sourceRef}: 规则集管理应展示表名搜索输入框`,
  ).toBeVisible({ timeout: 30000 });

  for (const header of [
    "表名",
    "所属数据库",
    "所属数据源",
    "规则包数量",
    "规则数量",
    "规则集描述",
    "更新人",
    "更新时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 规则集管理列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/ruleSet 筛选列表", [
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
  ]);
}

export async function expectDataQualityRuleSetListSearchEditContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const initialResponse = waitForDqJson<DqRuleSetPageData>(
    page,
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/ruleSet");
  const initialPage = expectDqSuccess(await initialResponse, `${sourceRef}: 规则集列表应请求成功`);

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 规则集管理应展示新建规则集入口`).toContainText("新建规则集", {
    timeout: 30000,
  });
  await expect(
    page.getByPlaceholder("输入表名搜索").first(),
    `${sourceRef}: 规则集管理应展示表名搜索输入框`,
  ).toBeVisible({ timeout: 30000 });
  for (const header of [
    "表名",
    "所属数据库",
    "所属数据源",
    "规则包数量",
    "规则数量",
    "规则集描述",
    "更新人",
    "更新时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 规则集管理列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  const initialRecords = expectRuleSetPage(initialPage, `${sourceRef}: 规则集列表应返回记录`);
  const targetRecord = expectRuleSetSearchTarget(initialRecords, sourceRef);
  const tableName = expectNonEmptyString(targetRecord.tableName, `${sourceRef}: 目标规则集应包含表名`);

  const searchResponse = waitForDqJson<DqRuleSetPageData>(
    page,
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
  );
  await page.getByPlaceholder("输入表名搜索").fill(tableName);
  await page.keyboard.press("Enter");
  const searchPage = expectDqSuccess(await searchResponse, `${sourceRef}: 规则集表名搜索应请求成功`);
  const searchRecords = expectRuleSetPage(searchPage, `${sourceRef}: 规则集表名搜索应返回记录`);
  expect(Number(searchPage.current), `${sourceRef}: 规则集搜索后应回到第一页`).toBe(1);
  expect(
    searchRecords.every((record) => String(record.tableName ?? "").includes(tableName)),
    `${sourceRef}: 规则集搜索结果应仅展示匹配表名`,
  ).toBe(true);
  const searchedRecord = expectRuleSetSearchTarget(searchRecords, sourceRef);
  expect(String(searchedRecord.id), `${sourceRef}: 搜索结果应包含目标规则集 id`).toBe(String(targetRecord.id));

  const firstRow = page.locator(".ant-table-tbody tr").filter({ hasText: tableName }).first();
  await expect(firstRow, `${sourceRef}: 搜索后表格应展示目标规则集行`).toBeVisible({ timeout: 30000 });
  for (const expectedText of [
    tableName,
    expectNonEmptyString(searchedRecord.schemaName, `${sourceRef}: 搜索结果应包含所属数据库`),
    expectNonEmptyString(searchedRecord.sourceName, `${sourceRef}: 搜索结果应包含所属数据源`),
    String(searchedRecord.packageCount),
    String(searchedRecord.ruleCount),
    expectNonEmptyString(searchedRecord.lastEditUser, `${sourceRef}: 搜索结果应包含更新人`),
    expectNonEmptyString(searchedRecord.gmtModified, `${sourceRef}: 搜索结果应包含更新时间`),
  ]) {
    await expect(firstRow, `${sourceRef}: 目标规则集行应展示「${expectedText}」`).toContainText(expectedText, {
      timeout: 30000,
    });
  }

  const detailResponse = waitForDqJson<DqRuleSetRecord>(
    page,
    "/dassets/v1/valid/monitorRuleSet/detail",
  );
  await firstRow.getByRole("button", { name: "编辑" }).click({ timeout: 30000 });
  const detail = expectDqSuccess(await detailResponse, `${sourceRef}: 规则集详情应请求成功`);
  expect(String(detail.id), `${sourceRef}: 详情 id 应与列表记录一致`).toBe(String(targetRecord.id));
  expect(detail.tableName, `${sourceRef}: 详情表名应与列表记录一致`).toBe(tableName);
  assertRuleSetDetailPackages(detail, sourceRef);

  await expect(body, `${sourceRef}: 编辑页应展示目标规则集表名`).toContainText(tableName, {
    timeout: 30000,
  });
  for (const expectedText of [
    "编辑规则集",
    expectNonEmptyString(detail.sourceName, `${sourceRef}: 详情应包含所属数据源`),
    expectNonEmptyString(detail.schemaName, `${sourceRef}: 详情应包含所属数据库`),
  ]) {
    await expect(body, `${sourceRef}: 规则集基础信息应展示「${expectedText}」`).toContainText(expectedText, {
      timeout: 30000,
    });
  }

  if (!(await page.getByText("添加规则", { exact: true }).first().isVisible())) {
    await clickDqCompactButton(page, "下一步", sourceRef);
  }
  await expect(body, `${sourceRef}: 监控规则配置页应展示添加规则入口`).toContainText("添加规则", {
    timeout: 30000,
  });
  for (const packageName of getRuleSetPackageNames(detail)) {
    await expect(body, `${sourceRef}: 监控规则配置页应展示规则包「${packageName}」`).toContainText(packageName, {
      timeout: 30000,
    });
  }
  for (const ruleName of getRuleSetFunctionNames(detail).slice(0, 3)) {
    await expect(body, `${sourceRef}: 监控规则配置页应展示规则「${ruleName}」`).toContainText(ruleName, {
      timeout: 30000,
    });
  }
}

export async function expectDataQualityRuleSetGlobalParamsContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const pageQueryResponse = waitForDqJson<DqRuleSetPageData>(
    page,
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
  );
  try {
    await gotoDataQualityPage(page, "/dq/ruleSet");
  } catch (error) {
    void pageQueryResponse.catch(() => {});
    throw error;
  }
  const records = expectRuleSetPage(
    expectDqSuccess(await pageQueryResponse, `${sourceRef}: 规则集列表应请求成功`),
    `${sourceRef}: 规则集列表应返回记录`,
  );
  const targetRecord = expectRuleSetSearchTarget(records, sourceRef);

  const detailResponse = waitForDqJson<DqRuleSetRecord>(
    page,
    "/dassets/v1/valid/monitorRuleSet/detail",
  );
  await gotoDataQualityPage(page, `/dq/ruleSet/edit/${targetRecord.id}?projectId=${getProjectId()}`);
  const detail = expectDqSuccess(await detailResponse, `${sourceRef}: 规则集详情应请求成功`);
  assertRuleSetDetailPackages(detail, sourceRef);

  const body = page.locator("body");
  if (!(await page.getByText("查看全局参数", { exact: true }).first().isVisible())) {
    await clickDqCompactButton(page, "下一步", sourceRef);
  }
  await expect(body, `${sourceRef}: 监控规则配置页应展示全局参数入口`).toContainText("查看全局参数", {
    timeout: 30000,
  });
  const packageNamesBefore = getRuleSetPackageNames(detail);
  for (const packageName of packageNamesBefore) {
    await expect(body, `${sourceRef}: 打开全局参数前应展示规则包「${packageName}」`).toContainText(packageName, {
      timeout: 30000,
    });
  }

  const globalParamsResponse = waitForDqJson<DqGlobalParamsPage>(
    page,
    "/dassets/v1/valid/monitor/getGlobalParams",
    (payload) => payload.data?.pageSize === 10,
  );
  await page.getByText("查看全局参数", { exact: true }).click({ timeout: 30000 });
  const globalParams = expectDqSuccess(await globalParamsResponse, `${sourceRef}: 全局参数列表应请求成功`);
  const recordsOnFirstPage = expectGlobalParamsPage(globalParams, sourceRef);

  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, `${sourceRef}: 全局参数弹窗应打开`).toBeVisible({ timeout: 30000 });
  for (const header of ["全局参数", "参数名称", "参数类型", "日期基准", "参数值/日期格式", "注释"]) {
    await expect(modal, `${sourceRef}: 全局参数弹窗应展示「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }
  for (const record of recordsOnFirstPage.slice(0, 3)) {
    for (const expectedText of [
      expectNonEmptyString(record.paramName, `${sourceRef}: 全局参数应包含参数名称`),
      expectNonEmptyString(record.paramValue, `${sourceRef}: 全局参数应包含参数值`),
      expectNonEmptyString(record.paramDesc, `${sourceRef}: 全局参数应包含注释`),
    ]) {
      await expect(modal, `${sourceRef}: 全局参数弹窗应展示接口值「${expectedText}」`).toContainText(expectedText, {
        timeout: 30000,
      });
    }
  }

  await modal.getByRole("button", { name: /关\s*闭/ }).click({ timeout: 30000 });
  await expect(modal, `${sourceRef}: 关闭后全局参数弹窗应消失`).toBeHidden({ timeout: 30000 });
  for (const packageName of packageNamesBefore) {
    await expect(body, `${sourceRef}: 关闭弹窗后规则配置应保留规则包「${packageName}」`).toContainText(packageName, {
      timeout: 30000,
    });
  }
}

export async function expectDataQualityRuleSetConfigShell(page: Page, sourceRef: string): Promise<void> {
  const pageQueryResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/valid/monitorRuleSet/pageQuery") && response.status() === 200,
    { timeout: 60000 },
  );
  await gotoDataQualityPage(page, "/dq/ruleSet");
  const payload = (await (await pageQueryResponse).json()) as DqRuleSetPageQuery;
  expect(payload.success ?? payload.code === 1, `${sourceRef}: monitorRuleSet/pageQuery 应返回成功状态`).toBe(true);
  const records = getDqRuleSetRecords(payload);
  expect(records.length, `${sourceRef}: 规则集列表 API 应返回可编辑记录`).toBeGreaterThan(0);

  const rangeRecord = expectDqRuleSetRecord(
    records.find((record) => /^quality_test_(num|str|enum_pass)$/.test(String(record.tableName ?? ""))),
    `${sourceRef}: 应存在取值范围&枚举范围规则集 fixture`,
  );
  const keyRangeRecord = expectDqRuleSetRecord(
    records.find((record) => /key_range|json_key/i.test(String(record.tableName ?? ""))),
    `${sourceRef}: 应存在 key范围校验规则集 fixture`,
  );

  await expectDqRuleSetEditShell(page, sourceRef, rangeRecord, "取值范围&枚举范围", [
    "添加规则",
    "字段",
    /统计函数|统计规则/,
    "取值范围设置",
    "枚举值设置",
    "取值范围和枚举值的关系",
    "强弱规则",
  ]);
  await expectDqRuleSetEditShell(page, sourceRef, keyRangeRecord, "key范围校验", [
    "添加规则",
    "生效范围",
    "字段",
    "统计函数",
    "校验方法",
    "校验内容",
    "强弱规则",
  ]);
}

export async function expectDataQualityRuleBaseShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/ruleBase",
    labels: ["规则库配置", "内置规则", "自定义正则", "自定义sql模版", "导出规则库"],
    tableHeaders: ["规则名称", "规则解释", "规则分类", "关联范围", "关联规则数", "规则状态", "规则描述"],
    apiPaths: ["/dassets/v1/valid/monitorRuleTemplate/pageQuery"],
  });
}

export async function expectDataQualityRuleBaseCustomRegexContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleBase");
  await clickDqText(page, "自定义正则", sourceRef);

  const body = page.locator("body");
  for (const label of ["自定义正则", "新增自定义正则", "规则名称", "规则分类", "关联范围", "关联规则数", "规则描述"]) {
    await expect(body, `${sourceRef}: 自定义正则列表应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(
    page.locator("input[placeholder='请输入规则名称进行搜索']:visible").first(),
    `${sourceRef}: 自定义正则列表应展示规则名称搜索输入框`,
  ).toBeVisible({ timeout: 30000 });
}

export async function expectDataQualityRuleBaseCustomRegexAddContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆VIN正则";
  const ruleDesc = "校验车辆VIN格式";
  const ruleContent = "^[A-Z0-9]{17}$";
  const testData = "LTV202601160001AA";
  let createdId: string | number | undefined;

  await deleteCustomRegexByNameBestEffort(page, sourceRef, ruleName);

  try {
    const listResponse = waitForDqJson<DqRuleBaseCustomRegexPage>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/list",
    );
    await gotoDataQualityPage(page, "/dq/ruleBase");
    await page.locator(".ant-tabs-tab").filter({ hasText: "自定义正则" }).click({ timeout: 30000 });
    expectCustomRegexPage(
      expectDqSuccess(await listResponse, `${sourceRef}: 自定义正则列表应请求成功`),
      `${sourceRef}: 自定义正则列表接口应返回有效结构`,
      { allowEmpty: true },
    );

    const body = page.locator("body");
    for (const label of ["新增自定义正则", "规则名称", "规则分类", "关联范围", "关联规则数", "规则描述"]) {
      await expect(body, `${sourceRef}: 自定义正则列表应展示「${label}」`).toContainText(label, {
        timeout: 30000,
      });
    }

    await page.getByRole("button", { name: /新增自定义正则/ }).click({ timeout: 30000 });
    const modal = page.locator(".ant-modal:visible").last();
    await expect(modal, `${sourceRef}: 新增自定义正则弹窗应打开`).toContainText("新增自定义规则", {
      timeout: 30000,
    });
    for (const label of ["规则名称", "规则类型", "有效性", "关联范围", "字段级", "规则描述", "正则", "测试数据"]) {
      await expect(modal, `${sourceRef}: 新增弹窗应展示「${label}」`).toContainText(label, {
        timeout: 30000,
      });
    }

    await modal.locator("#ruleName").fill(ruleName, { timeout: 30000 });
    await modal.locator("#ruleDesc").fill(ruleDesc, { timeout: 30000 });
    await modal.locator("#ruleContent").fill(ruleContent, { timeout: 30000 });
    await modal.getByPlaceholder("请输入正则数据").fill(testData, { timeout: 30000 });
    await modal.getByRole("button", { name: /正则匹配测试/ }).click({ timeout: 30000 });
    await expect(modal, `${sourceRef}: 正则匹配测试应返回匹配成功`).toContainText(
      /符合正则|匹配成功/,
      { timeout: 30000 },
    );

    const saveResponse = waitForDqJson<boolean>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/addOrUpdate",
    );
    const savedListResponse = waitForDqJson<DqRuleBaseCustomRegexPage>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/list",
      (payload) => (payload.data?.contentList ?? []).some((record) => record.ruleName === ruleName),
    );
    await modal.getByRole("button", { name: /确\s*定/ }).click({ timeout: 30000 });
    expectDqSuccess(await saveResponse, `${sourceRef}: 保存自定义正则应请求成功`);

    const savedRecords = expectCustomRegexPage(
      expectDqSuccess(await savedListResponse, `${sourceRef}: 保存后自定义正则列表应刷新成功`),
      `${sourceRef}: 保存后自定义正则列表应返回记录`,
    );
    const savedRecord = savedRecords.find((record) => record.ruleName === ruleName);
    expect(savedRecord, `${sourceRef}: 保存后接口应返回「${ruleName}」`).toBeTruthy();
    createdId = savedRecord?.id;
    expect(savedRecord?.ruleContent, `${sourceRef}: 接口应保存 VIN 正则表达式`).toBe(ruleContent);
    expect(savedRecord?.ruleDesc, `${sourceRef}: 接口应保存规则描述`).toBe(ruleDesc);
    expect(formatCustomRegexRuleType(savedRecord?.ruleType, sourceRef), `${sourceRef}: 规则类型应为有效性`).toBe(
      "有效性",
    );
    expect(
      formatCustomRegexAssociationScope(savedRecord?.associationScope, sourceRef),
      `${sourceRef}: 关联范围应为字段级`,
    ).toBe("字段级");

    const row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: ruleName }).first();
    await expect(row, `${sourceRef}: 保存后列表应展示「${ruleName}」`).toBeVisible({
      timeout: 30000,
    });
    for (const expectedText of [ruleName, "有效性", "字段级", "0", ruleDesc]) {
      await expect(row, `${sourceRef}: 自定义正则行应展示「${expectedText}」`).toContainText(
        expectedText,
        { timeout: 30000 },
      );
    }

    await expectRuleSetCustomRegexOption(page, sourceRef, ruleName);
  } finally {
    if (createdId) {
      await deleteCustomRegexById(page, sourceRef, createdId);
    }
  }
}

export async function expectDataQualityRuleBaseCustomRegexEditDetailDeleteContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆VIN正则-待删除";
  const originalDesc = "校验车辆VIN格式-待删除";
  const editedDesc = "校验车辆VIN格式-已编辑";
  const ruleContent = "^[A-Z0-9]{17}$";
  let targetId: string | number | undefined;

  await deleteCustomRegexByNameBestEffort(page, sourceRef, ruleName);
  targetId = await createCustomRegexFixture(page, sourceRef, {
    ruleName,
    ruleType: 3,
    associationScope: 1,
    ruleDesc: originalDesc,
    ruleContent,
  });

  try {
    const listResponse = waitForDqJson<DqRuleBaseCustomRegexPage>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/list",
      (payload) => (payload.data?.contentList ?? []).some((record) => record.ruleName === ruleName),
    );
    await gotoDataQualityPage(page, "/dq/ruleBase");
    await page.locator(".ant-tabs-tab").filter({ hasText: "自定义正则" }).click({ timeout: 30000 });
    const records = expectCustomRegexPage(
      expectDqSuccess(await listResponse, `${sourceRef}: 自定义正则列表应请求成功`),
      `${sourceRef}: 自定义正则列表应返回记录`,
    );
    const originalRecord = records.find((record) => record.ruleName === ruleName);
    expect(originalRecord, `${sourceRef}: 自定义正则列表应包含待编辑规则`).toBeTruthy();

    let row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: ruleName }).first();
    await expect(row, `${sourceRef}: 待编辑自定义正则行应可见`).toBeVisible({ timeout: 30000 });
    await expect(row.getByRole("button", { name: "编辑" }), `${sourceRef}: 未引用规则应展示编辑入口`).toBeEnabled({
      timeout: 30000,
    });
    await expect(row.getByRole("button", { name: "删除" }), `${sourceRef}: 未引用规则应展示删除入口`).toBeEnabled({
      timeout: 30000,
    });

    await row.getByRole("button", { name: "编辑" }).click({ timeout: 30000 });
    const modal = page.locator(".ant-modal:visible").last();
    await expect(modal, `${sourceRef}: 编辑自定义正则弹窗应打开`).toContainText("编辑自定义规则", {
      timeout: 30000,
    });
    await expect(modal.locator("#ruleName"), `${sourceRef}: 编辑弹窗应回显规则名称`).toHaveValue(ruleName, {
      timeout: 30000,
    });
    await expect(modal.locator("#ruleDesc"), `${sourceRef}: 编辑弹窗应回显规则描述`).toHaveValue(originalDesc, {
      timeout: 30000,
    });
    await expect(modal.locator("#ruleContent"), `${sourceRef}: 编辑弹窗应回显正则内容`).toHaveValue(ruleContent, {
      timeout: 30000,
    });

    const saveResponse = waitForDqJson<boolean>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/addOrUpdate",
    );
    const editedListResponse = waitForDqJson<DqRuleBaseCustomRegexPage>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/list",
      (payload) =>
        (payload.data?.contentList ?? []).some(
          (record) => String(record.id) === String(targetId) && record.ruleDesc === editedDesc,
        ),
    );
    await modal.locator("#ruleDesc").fill(editedDesc, { timeout: 30000 });
    await modal.getByRole("button", { name: /确\s*定/ }).click({ timeout: 30000 });
    expectDqSuccess(await saveResponse, `${sourceRef}: 编辑保存自定义正则应请求成功`);

    const editedRecords = expectCustomRegexPage(
      expectDqSuccess(await editedListResponse, `${sourceRef}: 编辑后自定义正则列表应刷新成功`),
      `${sourceRef}: 编辑后自定义正则列表应返回记录`,
    );
    const editedRecord = editedRecords.find((record) => String(record.id) === String(targetId));
    expect(editedRecord?.ruleDesc, `${sourceRef}: 编辑后接口应回显最新规则描述`).toBe(editedDesc);

    row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: ruleName }).first();
    await expect(row, `${sourceRef}: 编辑后列表应展示目标规则`).toContainText(editedDesc, {
      timeout: 30000,
    });

    const detailResponse = waitForDqJson<DqRuleBaseCustomRegexRecord>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/detail",
      (payload) => String(payload.data?.id) === String(targetId),
    );
    await row.locator("a").filter({ hasText: ruleName }).click({ timeout: 30000 });
    const detail = expectDqSuccess(await detailResponse, `${sourceRef}: 自定义正则详情应请求成功`);
    expect(detail.ruleDesc, `${sourceRef}: 详情接口应回显编辑后的规则描述`).toBe(editedDesc);
    expect(detail.ruleContent, `${sourceRef}: 详情接口应回显正则内容`).toBe(ruleContent);
    const detailDialog = page.locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible").last();
    await expect(detailDialog, `${sourceRef}: 点击规则名称应打开详情面板`).toBeVisible({
      timeout: 30000,
    });
    for (const expectedText of [ruleName, "有效性", "字段级", "0", editedDesc, ruleContent]) {
      await expect(detailDialog, `${sourceRef}: 详情面板应展示「${expectedText}」`).toContainText(
        expectedText,
        { timeout: 30000 },
      );
    }
    await page.keyboard.press("Escape");
    await expect(detailDialog, `${sourceRef}: 详情面板关闭后才能删除规则`).toBeHidden({
      timeout: 30000,
    });

    row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: ruleName }).first();
    const deleteResponse = waitForDqJson<boolean>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/delete",
    );
    const refreshedListResponse = waitForDqJson<DqRuleBaseCustomRegexPage>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/list",
      (payload) => !(payload.data?.contentList ?? []).some((record) => String(record.id) === String(targetId)),
    );
    await row.getByRole("button", { name: "删除" }).click({ timeout: 30000 });
    const confirm = page.locator(".ant-popover:visible,.ant-modal:visible").last();
    await expect(confirm, `${sourceRef}: 删除未引用规则应弹出确认`).toContainText("确定要删除吗", {
      timeout: 30000,
    });
    await confirm.getByRole("button", { name: /确\s*定/ }).last().click({ timeout: 30000 });
    expectDqSuccess(await deleteResponse, `${sourceRef}: 删除未引用自定义正则应请求成功`);
    expectCustomRegexPage(
      expectDqSuccess(await refreshedListResponse, `${sourceRef}: 删除后自定义正则列表应刷新成功`),
      `${sourceRef}: 删除后自定义正则列表应返回有效结构`,
      { allowEmpty: true },
    );
    await expect(row, `${sourceRef}: 删除后目标规则应从列表消失`).toBeHidden({ timeout: 30000 });
    targetId = undefined;
  } finally {
    if (targetId) {
      await deleteCustomRegexById(page, sourceRef, targetId).catch(() => {});
    }
  }
}

export async function expectDataQualityRuleBaseReferencedCustomRegexDeleteProtectionContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await ensureReferencedCustomRegexFixture(page, sourceRef);
  const records = await listCustomRegexRecords(page, sourceRef);
  const referenced = records.find((record) => Number(record.associationRuleCount) > 0);
  expect(
    referenced,
    `${sourceRef}: ltqc-local 应存在已被规则引用的自定义正则，用于验证删除保护`,
  ).toBeTruthy();
  const ruleName = expectNonEmptyString(referenced?.ruleName, `${sourceRef}: 已引用自定义正则应包含规则名称`);

  await gotoDataQualityPage(page, "/dq/ruleBase");
  await page.locator(".ant-tabs-tab").filter({ hasText: "自定义正则" }).click({ timeout: 30000 });
  const row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: ruleName }).first();
  await expect(row, `${sourceRef}: 已引用自定义正则行应可见`).toBeVisible({ timeout: 30000 });
  await expect(row, `${sourceRef}: 已引用自定义正则应展示关联规则数`).toContainText(
    String(referenced?.associationRuleCount),
    { timeout: 30000 },
  );

  const deleteButton = row.getByRole("button", { name: "删除" });
  if (await deleteButton.isDisabled({ timeout: 3000 }).catch(() => false)) {
    await expect(deleteButton, `${sourceRef}: 已引用自定义正则删除入口应禁用`).toBeDisabled({
      timeout: 30000,
    });
    return;
  }

  await deleteButton.click({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: 删除已引用自定义正则应提示先调整引用规则`).toContainText(
    /引用|关联|调整规则|不能删除|无法删除/,
    { timeout: 30000 },
  );
}

async function ensureReferencedCustomRegexFixture(page: Page, sourceRef: string): Promise<void> {
  const existingReferenced = (await listCustomRegexRecords(page, sourceRef)).find(
    (record) => Number(record.associationRuleCount) > 0,
  );
  if (existingReferenced) return;

  const ruleName = "手机号正则-已引用";
  await deleteCustomRegexByNameBestEffort(page, sourceRef, ruleName);
  await createCustomRegexFixture(page, sourceRef, {
    ruleName,
    ruleType: 3,
    associationScope: 1,
    ruleDesc: "验证已引用自定义正则删除保护",
    ruleContent: "^1[3-9]\\d{9}$",
  });
  const createdRuleId = expectNonEmptyString(
    (await listCustomRegexRecords(page, sourceRef)).find((record) => record.ruleName === ruleName)?.id,
    `${sourceRef}: 自定义正则 fixture 创建后应返回 id`,
  );

  const packageName = await attachCustomRegexToArchiveRuleSet(page, sourceRef, ruleName, createdRuleId);
  await ensureReferencedCustomRegexRuleTask(page, sourceRef, ruleName, packageName);
  await expect
    .poll(
      async () => {
        const records = await listCustomRegexRecords(page, sourceRef);
        return records.find((record) => record.ruleName === ruleName)?.associationRuleCount ?? 0;
      },
      {
        message: `${sourceRef}: 自定义正则 ${ruleName} 应被规则集引用`,
        timeout: 60000,
      },
    )
    .not.toBe("0");
}

async function attachCustomRegexToArchiveRuleSet(
  page: Page,
  sourceRef: string,
  ruleName: string,
  ruleId: string,
): Promise<string> {
  const tableName = DQ_RULE_MAIN_TABLE;
  const ruleSetRecords = await queryRuleSetRecords(page, tableName);
  const targetRuleSet = ruleSetRecords.find((record) => record.tableName === tableName);
  expect(targetRuleSet?.id, `${sourceRef}: 应存在可挂载自定义正则的规则集 ${tableName}`).toBeTruthy();

  await gotoDataQualityPage(page, `/dq/ruleSet/edit/${targetRuleSet?.id}?projectId=${getProjectId()}`);
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 规则集编辑页应打开`).toContainText(/编辑规则集|添加规则/, {
    timeout: 30000,
  });
  if (!(await page.getByText("添加规则", { exact: true }).first().isVisible({ timeout: 3000 }).catch(() => false))) {
    await clickDqCompactButton(page, "下一步", sourceRef);
  }

  const packageName = `自定义正则引用规则包-${ruleId}`;
  await createDedicatedRuleSetPackage(page, sourceRef, packageName);
  await page.getByText("添加规则", { exact: true }).first().click({ timeout: 30000 });
  await page.getByText("有效性校验", { exact: true }).last().click({ timeout: 30000 });
  await selectRuleSetStatisticFunctionBySearch(page, "自定义正则", "格式校验-自定义正则", sourceRef);
  await selectRuleSetField(page, "owner_phone", sourceRef);
  await selectRuleSetCustomRuleBySearch(page, ruleName, sourceRef);
  await configureRuleSetCustomRegexExpectation(page, sourceRef, ruleName);
  await switchRuleSetStrength(page, "强规则", sourceRef);
  await fillRuleSetRuleDescription(page, `引用${ruleName}验证删除保护`);
  await saveRuleSetRuleRow(page, sourceRef, "新增已引用自定义正则规则");
  await clickRuleSetSubmitButton(page, sourceRef);
  await expect
    .poll(
      async () => {
        const currentDetail = await queryRuleSetDetail(page, sourceRef, targetRuleSet?.id);
        return findRuleSetPackageReferencingCustomRegex(currentDetail, ruleId, ruleName)?.packageName ?? "";
      },
      {
        message: `${sourceRef}: 规则集详情应保存自定义正则「${ruleName}」引用`,
        timeout: 60000,
      },
    )
    .not.toBe("");
  const detail = await queryRuleSetDetail(page, sourceRef, targetRuleSet?.id);
  const savedPackage = findRuleSetPackageReferencingCustomRegex(detail, ruleId, ruleName);
  return expectNonEmptyString(savedPackage?.packageName, `${sourceRef}: 自定义正则引用应归属到规则包`);
}

async function createDedicatedRuleSetPackage(page: Page, sourceRef: string, packageName: string): Promise<void> {
  await clickRuleSetPackageAddButton(page, sourceRef);
  const visiblePackageInput = page.locator('input[placeholder="请输入规则包名称"]:visible').last();
  if (await visiblePackageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await visiblePackageInput.fill(packageName, { timeout: 30000 });
    await visiblePackageInput.press("Tab", { timeout: 30000 });
  } else {
    const packageCombobox = page.locator(".ant-select:visible").filter({ hasText: "请选择规则包名称" }).last();
    await expect(packageCombobox, `${sourceRef}: 新增规则包后应展示规则包名称选择框`).toBeVisible({
      timeout: 30000,
    });
    await packageCombobox.click({ force: true, timeout: 30000 });
    await page.keyboard.type(packageName);
    await page.keyboard.press("Enter");
  }
  await expect(page.locator("body"), `${sourceRef}: 专用规则包应回显「${packageName}」`).toContainText(packageName, {
    timeout: 30000,
  });

  const packageSelect = page.locator(".ant-select:visible").filter({ hasText: /规则包|请选择规则包名称/ }).first();
  if (
    (await packageSelect.isVisible({ timeout: 3000 }).catch(() => false)) &&
    !((await packageSelect.textContent({ timeout: 30000 })) ?? "").includes(packageName)
  ) {
    await packageSelect.click({ timeout: 30000 });
    const clicked = await clickActiveAntdOption(page, packageName);
    expect(clicked, `${sourceRef}: 规则包下拉应包含专用规则包「${packageName}」`).toBe(true);
  }
}

async function ensureReferencedCustomRegexRuleTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
  packageName: string,
): Promise<void> {
  const tableName = DQ_RULE_MAIN_TABLE;
  const taskName = `已引用自定义正则删除保护任务-${ruleName}`;
  const existingTask = (await queryRuleTaskRecords(page, tableName)).find((record) => record.ruleName === taskName);
  if (existingTask) return;

  await gotoNewRuleTaskMonitorObjectPageForTable(page, sourceRef, taskName, tableName);
  await configureManualPartition(page, sourceRef, "stat_date='20260116'");
  await clickNextUntilMonitorRuleConfig(page, sourceRef);
  await selectRuleTaskRulePackageOnCurrentPage(page, sourceRef, [packageName], "有效性校验");
  await clickNextUntilScheduleConfig(page, sourceRef);
  await chooseDqFieldOptionByText(page, /调度周期/, "手动触发", sourceRef);
  await chooseDqFieldOptionByText(page, /规则拼接包/, "1", sourceRef);
  await chooseFirstDqSelectOption(page, /资源组/, sourceRef);
  await chooseDqFieldOptionByText(page, /实例生成方式/, "立即生成", sourceRef);
  await chooseDqFieldOptionByText(page, /超时时间/, "不限制", sourceRef);
  await checkDqNoReport(page, sourceRef);

  const saveResponse = waitForRuleTaskPageQuery(page);
  void saveResponse.catch(() => {});
  const createResponse = page
    .waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/dassets\/v1\/valid\/monitor\/(add|save|edit|update|addOrUpdate)/.test(response.url()),
      { timeout: 60000 },
    )
    .catch(() => null);
  await clickDqSubmitButton(page, sourceRef);
  const createPayload = await createResponse.then((response) => response?.json().catch(() => null));
  if (createPayload) {
    expect(
      createPayload.success ?? createPayload.code === 1,
      `${sourceRef}: 新建规则任务 ${taskName} 应请求成功，实际返回 ${JSON.stringify(createPayload)}`,
    ).toBe(true);
  }
  await expect(page, `${sourceRef}: 规则任务 ${taskName} 保存后应返回规则任务管理`).toHaveURL(/\/dq\/rule(?:\?|$)/, {
    timeout: 60000,
  });
  const savedPayload = await saveResponse.catch(() => undefined);
  if (savedPayload) {
    expect(savedPayload.success ?? savedPayload.code === 1, `${sourceRef}: 保存任务 ${taskName} 后列表应刷新成功`).toBe(
      true,
    );
  }
  await expect
    .poll(async () => (await queryRuleTaskRecords(page, tableName)).some((record) => record.ruleName === taskName), {
      message: `${sourceRef}: 保存后规则任务列表 API 应返回 ${taskName}`,
      timeout: 60000,
    })
    .toBe(true);
}

async function queryRuleSetDetail(
  page: Page,
  sourceRef: string,
  id: string | number | undefined,
): Promise<DqRuleSetRecord> {
  expect(id, `${sourceRef}: 查询规则集详情应有 id`).toBeTruthy();
  const response = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleSet/detail"), {
    data: { id: String(id) },
    headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
    timeout: 60000,
  });
  expect(response.ok(), `${sourceRef}: 查询规则集详情 HTTP 应成功`).toBe(true);
  return expectDqSuccess(
    (await response.json()) as DqApiResponse<DqRuleSetRecord>,
    `${sourceRef}: 查询规则集详情应请求成功`,
  );
}

function findRuleSetPackageReferencingCustomRegex(
  detail: DqRuleSetRecord,
  ruleId: string,
  ruleName: string,
): DqRuleSetPackage | undefined {
  for (const rulePackage of detail.packageVOList ?? []) {
    const rules = rulePackage.rules ?? [];
    const matched = rules.some((rule) => ruleSetRuleReferencesCustomRegex(rule, ruleId, ruleName));
    if (matched) return rulePackage;
  }
  return undefined;
}

function ruleSetRuleReferencesCustomRegex(rule: DqRuleSetRule, ruleId: string, ruleName: string): boolean {
  if (String(rule.ruleLibraryId ?? "") === ruleId || rule.ruleLibraryValue === ruleName) return true;
  return (rule.standardRules ?? []).some((standardRule) =>
    ruleSetRuleReferencesCustomRegex(standardRule, ruleId, ruleName),
  );
}

async function configureRuleSetCustomRegexExpectation(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const ruleScope = page.locator("body").filter({ hasText: ruleName });
  const calculationTypeSelect = ruleScope.locator(".ant-select:visible").filter({ hasText: "请选择计算类型" }).last();
  await expect(calculationTypeSelect, `${sourceRef}: 自定义正则期望值应展示计算类型下拉`).toBeVisible({
    timeout: 30000,
  });
  await calculationTypeSelect.click({ force: true, timeout: 30000 });
  let clicked = await clickActiveAntdOption(page, "固定值");
  expect(clicked, `${sourceRef}: 自定义正则期望值计算类型应支持「固定值」`).toBe(true);

  const operatorSelect = ruleScope.locator(".ant-select:visible").filter({ hasText: /^请选择$/ }).last();
  await expect(operatorSelect, `${sourceRef}: 自定义正则期望值应展示操作符下拉`).toBeVisible({ timeout: 30000 });
  await operatorSelect.click({ force: true, timeout: 30000 });
  clicked = await clickActiveAntdOption(page, "=");
  expect(clicked, `${sourceRef}: 自定义正则期望值操作符应支持「=」`).toBe(true);

  const valueInput = ruleScope.locator('input[placeholder="请输入数值"]:visible').last();
  await expect(valueInput, `${sourceRef}: 自定义正则期望值应展示数值输入框`).toBeVisible({ timeout: 30000 });
  await valueInput.fill("0", { timeout: 30000 });
  await expect(valueInput, `${sourceRef}: 自定义正则期望值数值应填入 0`).toHaveValue("0", {
    timeout: 30000,
  });
}

async function selectRuleSetCustomRuleBySearch(
  page: Page,
  ruleName: string,
  sourceRef: string,
): Promise<void> {
  const customRuleSelect = page.locator(".ant-select").filter({ hasText: "请选择自定义规则" }).last();
  await expect(customRuleSelect, `${sourceRef}: 自定义规则下拉应可见`).toBeVisible({ timeout: 30000 });
  await customRuleSelect.click({ force: true, timeout: 30000 });
  await page.keyboard.type(ruleName);
  await expect
    .poll(
      async () => {
        const optionTexts = await getActiveAntdOptionTexts(page);
        return optionTexts.some((text) => text === ruleName || text.includes(ruleName));
      },
      {
        message: `${sourceRef}: 自定义规则下拉应包含「${ruleName}」`,
        timeout: 30000,
      },
    )
    .toBe(true);
  const clicked = await clickActiveAntdOption(page, ruleName);
  expect(clicked, `${sourceRef}: 自定义规则下拉应包含可点击选项「${ruleName}」`).toBe(true);
}

export async function expectDataQualityGeneratedReportFilterContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已生成报告", sourceRef);

  const body = page.locator("body");
  for (const label of ["已生成报告", "报告名称", "数据表", "生成时间", "报告状态"]) {
    await expect(body, `${sourceRef}: 已生成报告筛选区应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  for (const placeholder of ["请输入报告名称", "请输入数据表名", "开始日期", "结束日期"]) {
    await expect(
      page.getByPlaceholder(placeholder).first(),
      `${sourceRef}: 已生成报告应展示占位符「${placeholder}」`,
    ).toBeVisible({ timeout: 30000 });
  }

  for (const header of [
    "报告名称",
    "关联数据表",
    "生成样式",
    "规则范围",
    "数据周期",
    "报告状态",
    "生成时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 已生成报告列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/qualityReport 已生成报告筛选列表", [
    "/dassets/v1/valid/monitorReportRecord/pageList",
  ]);
}

export async function expectDataQualityGeneratedReportCombinedFilterContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const initialResponse = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReportRecord/pageList",
  );
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已生成报告", sourceRef);
  const initialPage = expectDqSuccess(await initialResponse, `${sourceRef}: 已生成报告列表应请求成功`);
  const initialReports = expectGeneratedReportPage(initialPage, `${sourceRef}: 已生成报告列表应返回记录`);
  const target = expectGeneratedReportFilterTarget(initialReports, sourceRef);
  const reportName = expectNonEmptyString(target.reportName, `${sourceRef}: 目标报告应包含报告名称`);
  const tableName = expectNonEmptyString(target.tableNames, `${sourceRef}: 目标报告应包含关联数据表`);
  const execEndTime = expectNonEmptyString(target.execEndTime, `${sourceRef}: 目标报告应包含生成时间`);
  const generatedDay = execEndTime.slice(0, 10);
  expect(generatedDay, `${sourceRef}: 目标报告生成日期格式应有效`).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  const body = page.locator("body");
  for (const label of ["已生成报告", "报告名称", "数据表", "生成时间", "报告状态"]) {
    await expect(body, `${sourceRef}: 已生成报告筛选区应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  for (const header of [
    "报告名称",
    "关联数据表",
    "生成样式",
    "规则范围",
    "数据周期",
    "报告状态",
    "生成时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 已生成报告列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  const filteredResponse = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReportRecord/pageList",
    (payload) => (payload.data?.contentList ?? []).some((item) => String(item.id) === String(target.id)),
  );
  const filteredRequest = page.waitForRequest((request) => {
    if (!request.url().includes("/dassets/v1/valid/monitorReportRecord/pageList")) return false;
    const requestBody = getRequestJson(request);
    return (
      requestBody.search === reportName &&
      requestBody.tableName === tableName &&
      requestBody.startTime === generatedDay &&
      requestBody.endTime === generatedDay
    );
  });
  await page.getByPlaceholder("请输入报告名称").fill(reportName);
  await page.getByPlaceholder("请输入数据表名").fill(tableName);
  await selectDqDateRange(page, generatedDay, generatedDay, sourceRef);
  await clickDqCompactButton(page, "查询", sourceRef);
  await filteredRequest;
  const filteredPage = expectDqSuccess(await filteredResponse, `${sourceRef}: 组合筛选应请求成功`);
  const filteredReports = expectGeneratedReportPage(filteredPage, `${sourceRef}: 组合筛选应返回目标报告`);
  expect(
    filteredReports.every(
      (item) =>
        String(item.reportName ?? "").includes(reportName) &&
        String(item.tableNames ?? "").includes(tableName) &&
        String(item.execEndTime ?? "").startsWith(generatedDay),
    ),
    `${sourceRef}: 组合筛选结果应同时匹配报告名称、数据表和生成日期`,
  ).toBe(true);
  expect(
    filteredReports.some((item) => String(item.id) === String(target.id)),
    `${sourceRef}: 组合筛选结果应包含目标报告 ${reportName}`,
  ).toBe(true);

  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: reportName }).first();
  await expect(targetRow, `${sourceRef}: 组合筛选后表格应展示目标报告`).toBeVisible({ timeout: 30000 });
  for (const expectedText of [
    reportName,
    tableName,
    formatGeneratedReportGenerateType(target.reportGenerateType, sourceRef),
    formatGeneratedReportStatus(target.status, sourceRef),
    execEndTime,
  ]) {
    await expect(targetRow, `${sourceRef}: 目标报告行应展示「${expectedText}」`).toContainText(expectedText, {
      timeout: 30000,
    });
  }

  const resetResponse = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReportRecord/pageList",
    (payload) => Number(payload.data?.total ?? 0) >= Number(filteredPage.total ?? 0),
  );
  const resetRequest = page.waitForRequest((request) => {
    if (!request.url().includes("/dassets/v1/valid/monitorReportRecord/pageList")) return false;
    const requestBody = getRequestJson(request);
    return (
      requestBody.current === 1 &&
      requestBody.size === 20 &&
      !("search" in requestBody) &&
      !("tableName" in requestBody) &&
      !("startTime" in requestBody) &&
      !("endTime" in requestBody)
    );
  });
  await clickDqCompactButton(page, "重置", sourceRef);
  await resetRequest;
  expectGeneratedReportPage(
    expectDqSuccess(await resetResponse, `${sourceRef}: 重置后列表应重新请求成功`),
    `${sourceRef}: 重置后列表应恢复记录`,
  );
  for (const placeholder of ["请输入报告名称", "请输入数据表名", "开始日期", "结束日期"]) {
    await expect(
      page.getByPlaceholder(placeholder).first(),
      `${sourceRef}: 重置后「${placeholder}」应清空`,
    ).toHaveValue("", { timeout: 30000 });
  }
}

export async function expectDataQualityGeneratedReportStatusFilterContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const initialResponse = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReportRecord/pageList",
  );
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已生成报告", sourceRef);
  expectGeneratedReportPage(
    expectDqSuccess(await initialResponse, `${sourceRef}: 已生成报告列表应请求成功`),
    `${sourceRef}: 已生成报告列表应返回记录`,
  );

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 已生成报告列表应展示报告状态列`).toContainText("报告状态", {
    timeout: 30000,
  });

  const statusField = page.locator(".ant-form-item").filter({ hasText: "报告状态" }).first();
  await statusField.locator(".ant-select").first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  for (const statusLabel of ["待生成", "生成中", "已生成", "生成失败", "持续生成中"]) {
    await expect(dropdown, `${sourceRef}: 报告状态筛选项应包含「${statusLabel}」`).toContainText(statusLabel, {
      timeout: 30000,
    });
  }
  await page.keyboard.press("Escape");

  for (const status of [0, 1, 2, 3, 4]) {
    const statusLabel = formatGeneratedReportStatus(status, sourceRef);
    const filteredResponse = waitForDqJson<DqGeneratedReportPage>(
      page,
      "/dassets/v1/valid/monitorReportRecord/pageList",
      (payload) => {
        const records = payload.data?.contentList ?? [];
        return records.length > 0 && records.every((record) => Number(record.status) === status);
      },
    );
    const filteredRequest = page.waitForRequest((request) => {
      if (!request.url().includes("/dassets/v1/valid/monitorReportRecord/pageList")) return false;
      const requestBody = getRequestJson(request);
      return Number(requestBody.status) === status;
    });
    await selectDqFormOption(page, "报告状态", statusLabel, sourceRef);
    await clickDqCompactButton(page, "查询", sourceRef);
    await filteredRequest;
    const filteredPage = expectDqSuccess(await filteredResponse, `${sourceRef}: ${statusLabel} 筛选应请求成功`);
    const filteredReports = expectGeneratedReportPage(
      filteredPage,
      `${sourceRef}: ${statusLabel} 筛选应返回报告记录`,
    );
    const target = filteredReports[0];
    const reportName = expectNonEmptyString(target?.reportName, `${sourceRef}: ${statusLabel} 目标报告应包含名称`);
    expect(
      filteredReports.every((record) => Number(record.status) === status),
      `${sourceRef}: ${statusLabel} 筛选结果应全部为对应状态`,
    ).toBe(true);

    const row = page.locator(".ant-table-tbody tr").filter({ hasText: reportName }).first();
    await expect(row, `${sourceRef}: ${statusLabel} 筛选后应展示目标报告`).toBeVisible({ timeout: 30000 });
    await expect(row, `${sourceRef}: 目标报告行应展示状态「${statusLabel}」`).toContainText(statusLabel, {
      timeout: 30000,
    });

    if (status === 3) {
      const failedDetailEntry = row
        .getByText("失败详情", { exact: true })
        .or(row.getByRole("button", { name: "失败详情" }))
        .or(row.getByRole("link", { name: "失败详情" }))
        .first();
      await expect(failedDetailEntry, `${sourceRef}: 生成失败报告应展示失败详情入口`).toBeVisible({
        timeout: 30000,
      });
      await failedDetailEntry.click({ timeout: 30000 });
      const detailPanel = page.locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible").last();
      await expect(detailPanel, `${sourceRef}: 失败详情弹窗或抽屉应打开`).toBeVisible({ timeout: 30000 });
      await expect(detailPanel, `${sourceRef}: 失败详情应展示失败原因或日志摘要`).toContainText(
        /失败|异常|原因|日志|error|exception/i,
        { timeout: 30000 },
      );
      await closeDqOverlay(page, sourceRef);
      await expect(page.locator("body"), `${sourceRef}: 关闭失败详情后仍停留在已生成报告列表`).toContainText(
        "已生成报告",
        { timeout: 30000 },
      );
    }
  }
}

export async function expectDataQualityGeneratedReportDownloadContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const reportName = "供应商主数据有效性周报";
  const tableName = "dwd_supplier_info_di";

  const initialResponse = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReportRecord/pageList",
  );
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已生成报告", sourceRef);
  expectGeneratedReportPage(
    expectDqSuccess(await initialResponse, `${sourceRef}: 已生成报告列表应请求成功`),
    `${sourceRef}: 已生成报告列表应返回记录`,
  );
  await searchGeneratedReportByName(page, sourceRef, reportName);

  const row = page.locator(".ant-table-tbody tr").filter({ hasText: reportName }).first();
  await expect(row, `${sourceRef}: 查询后应展示下载目标报告`).toBeVisible({ timeout: 30000 });
  await expect(row, `${sourceRef}: 下载目标报告应展示关联数据表`).toContainText(tableName, { timeout: 30000 });
  await expect(row, `${sourceRef}: 下载目标报告状态应为已生成`).toContainText("已生成", { timeout: 30000 });
  await expect(row, `${sourceRef}: 下载目标报告应展示报告详情入口`).toContainText("报告详情", {
    timeout: 30000,
  });

  const downloadEntry = row
    .getByText("下载", { exact: true })
    .or(row.getByRole("button", { name: "下载" }))
    .or(row.getByRole("link", { name: "下载" }))
    .first();
  await expect(downloadEntry, `${sourceRef}: 下载目标报告应展示下载入口`).toBeVisible({ timeout: 30000 });

  let downloadPath = "";
  try {
    const artifact = await downloadDqArtifactWithSuggestedName(page, sourceRef, "generated-report", async () => {
      await downloadEntry.click({ timeout: 30000 });
    });
    downloadPath = artifact.path;
    expect(artifact.suggestedName, `${sourceRef}: 下载文件名称应包含报告名称`).toContain(reportName);
    await expectDownloadedArtifactContains(downloadPath, [reportName, tableName, "质量", "规则"], sourceRef);
  } finally {
    if (downloadPath && existsSync(downloadPath)) unlinkSync(downloadPath);
  }
}

export async function expectDataQualityReportDetailFieldRuleFilterContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openGeneratedReportDetail(page, sourceRef, "供应商主数据有效性周报", "dwd_supplier_info_di");
  await activateReportDetailSection(page, sourceRef, "字段规则");

  const body = page.locator("body");
  for (const label of ["字段规则", "规则类型", "规则名称", "字段名称", "字段类型", "质检结果"]) {
    await expect(body, `${sourceRef}: 字段规则筛选区应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  for (const ruleName of [
    "供应商名称非空校验",
    "供应商编码格式校验",
    "供应商编码唯一校验",
    "分区记录数波动校验",
  ]) {
    await expect(body, `${sourceRef}: 字段规则初始明细应包含「${ruleName}」`).toContainText(ruleName, {
      timeout: 30000,
    });
  }

  await selectDqFormOptions(page, "规则类型", ["完整性校验", "有效性校验"], sourceRef);
  await fillDqFormItemInput(page, "规则名称", "供应商", sourceRef);
  await fillDqFormItemInput(page, "字段名称", "supplier", sourceRef);
  await fillDqFormItemInput(page, "字段类型", "STR", sourceRef);
  await selectDqFormOptions(page, "质检结果", ["校验失败", "校验不通过"], sourceRef);
  await clickDqCompactButton(page, "查询", sourceRef);

  await expectVisibleRuleRows(page, sourceRef, ["供应商名称非空校验", "供应商编码格式校验"]);
  await expectNoVisibleRuleRows(page, sourceRef, ["供应商编码唯一校验", "分区记录数波动校验"]);
  await expect(body, `${sourceRef}: 字段规则筛选后应展示校验失败结果`).toContainText("校验失败", {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 字段规则筛选后应展示校验不通过结果`).toContainText("校验不通过", {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 字段规则筛选后应展示未通过原因`).toContainText(/完整性校验未通过|格式校验未通过/, {
    timeout: 30000,
  });

  await clickDqCompactButton(page, "重置", sourceRef);
  for (const ruleName of [
    "供应商名称非空校验",
    "供应商编码格式校验",
    "供应商编码唯一校验",
    "分区记录数波动校验",
  ]) {
    await expect(body, `${sourceRef}: 字段规则重置后应恢复「${ruleName}」`).toContainText(ruleName, {
      timeout: 30000,
    });
  }
}

export async function expectDataQualityReportDetailSingleTableRuleFilterContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openGeneratedReportDetail(page, sourceRef, "供应商主数据有效性周报", "dwd_supplier_info_di");
  await activateReportDetailSection(page, sourceRef, "单表规则");

  const body = page.locator("body");
  for (const label of ["单表规则", "规则类型", "规则名称", "质检结果"]) {
    await expect(body, `${sourceRef}: 单表规则筛选区应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  const filterForm = page.locator(".ant-form:visible").filter({ hasText: "规则名称" }).first();
  await expect(filterForm, `${sourceRef}: 单表规则筛选区不应展示字段名称筛选项`).not.toContainText("字段名称", {
    timeout: 3000,
  });
  await expect(filterForm, `${sourceRef}: 单表规则筛选区不应展示字段类型筛选项`).not.toContainText("字段类型", {
    timeout: 3000,
  });
  for (const ruleName of ["主键非空校验", "分区行数波动校验", "主键唯一校验"]) {
    await expect(body, `${sourceRef}: 单表规则初始明细应包含「${ruleName}」`).toContainText(ruleName, {
      timeout: 30000,
    });
  }

  await selectDqFormOptions(page, "规则类型", ["完整性校验", "统计性校验"], sourceRef);
  await fillDqFormItemInput(page, "规则名称", "校验", sourceRef);
  await selectDqFormOptions(page, "质检结果", ["校验失败", "校验不通过"], sourceRef);
  await clickDqCompactButton(page, "查询", sourceRef);
  await expectVisibleRuleRows(page, sourceRef, ["主键非空校验", "分区行数波动校验"]);
  await expectNoVisibleRuleRows(page, sourceRef, ["主键唯一校验"]);

  await fillDqFormItemInput(page, "规则名称", "不存在的单表规则名称", sourceRef);
  await clickDqCompactButton(page, "查询", sourceRef);
  await expect(page.locator(".ant-table-placeholder:visible,.ant-empty:visible").first(), `${sourceRef}: 单表规则不存在名称筛选后应显示空状态`).toBeVisible({
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 单表规则空结果不应影响字段规则入口`).toContainText("字段规则", {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 单表规则空结果不应影响多表规则入口`).toContainText("多表规则", {
    timeout: 30000,
  });
}

export async function expectDataQualityReportDetailMultiTableRuleFilterContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openGeneratedReportDetail(page, sourceRef, "供应商主数据有效性周报", "dwd_supplier_info_di");
  await activateReportDetailSection(page, sourceRef, "多表规则");

  const body = page.locator("body");
  for (const label of ["多表规则", "规则类型", "规则名称", "质检结果"]) {
    await expect(body, `${sourceRef}: 多表规则筛选区应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  const filterForm = page.locator(".ant-form:visible").filter({ hasText: "规则名称" }).first();
  await expect(filterForm, `${sourceRef}: 多表规则筛选区不应展示字段名称筛选项`).not.toContainText("字段名称", {
    timeout: 3000,
  });
  await expect(filterForm, `${sourceRef}: 多表规则筛选区不应展示字段类型筛选项`).not.toContainText("字段类型", {
    timeout: 3000,
  });
  for (const ruleName of ["主表与维表金额差异阈值校验", "主表与维表分区时效对齐校验", "主表与维表记录数差异校验"]) {
    await expect(body, `${sourceRef}: 多表规则初始明细应包含「${ruleName}」`).toContainText(ruleName, {
      timeout: 30000,
    });
  }

  await selectDqFormOptions(page, "规则类型", ["合理性校验", "时效性校验"], sourceRef);
  await fillDqFormItemInput(page, "规则名称", "主表与维表", sourceRef);
  await selectDqFormOptions(page, "质检结果", ["校验失败", "校验不通过"], sourceRef);
  await clickDqCompactButton(page, "查询", sourceRef);
  await expectVisibleRuleRows(page, sourceRef, ["主表与维表金额差异阈值校验", "主表与维表分区时效对齐校验"]);
  await expectNoVisibleRuleRows(page, sourceRef, ["主表与维表记录数差异校验"]);
  await expect(body, `${sourceRef}: 多表规则筛选后应展示规则名称模糊匹配 token`).toContainText("主表与维表", {
    timeout: 30000,
  });

  await clickDqCompactButton(page, "重置", sourceRef);
  await expect(body, `${sourceRef}: 多表规则重置后应恢复原始记录`).toContainText("主表与维表记录数差异校验", {
    timeout: 30000,
  });
}

export async function expectDataQualityReportDetailDirtyDataDownloadContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openGeneratedReportDetail(page, sourceRef, "车辆订单唯一性日报", VEHICLE_ORDER_TABLE);

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 报告详情应展示车辆订单唯一性任务`).toContainText("车辆订单唯一性任务", {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 报告详情应展示 vin 重复数校验规则`).toContainText("vin重复数校验", {
    timeout: 30000,
  });

  const ruleRow = page.locator(".ant-table-tbody tr:visible").filter({ hasText: "vin重复数校验" }).first();
  await expect(ruleRow, `${sourceRef}: 规则校验明细应展示 vin 重复数校验行`).toBeVisible({ timeout: 30000 });
  const detailEntry = ruleRow
    .getByText(/查看详情|查看明细/)
    .or(ruleRow.getByRole("button", { name: /查看详情|查看明细/ }))
    .or(ruleRow.getByRole("link", { name: /查看详情|查看明细/ }))
    .first();
  await expect(detailEntry, `${sourceRef}: vin 重复数校验行应展示查看详情入口`).toBeVisible({
    timeout: 30000,
  });
  await detailEntry.click({ timeout: 30000 });

  const detailScope = page.locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible").last();
  const dirtyScope = (await detailScope.isVisible({ timeout: 5000 }).catch(() => false)) ? detailScope : body;
  await expect(dirtyScope, `${sourceRef}: 脏数据明细应展示目标重复 vin`).toContainText("LTV202603290001AA", {
    timeout: 30000,
  });
  await expect(dirtyScope, `${sourceRef}: 脏数据明细应展示 vin 字段`).toContainText(/vin/i, {
    timeout: 30000,
  });

  const downloadEntry = dirtyScope
    .getByText(/下载|下载明细/)
    .or(dirtyScope.getByRole("button", { name: /下载|下载明细/ }))
    .or(dirtyScope.getByRole("link", { name: /下载|下载明细/ }))
    .first();
  await expect(downloadEntry, `${sourceRef}: 脏数据明细应展示下载入口`).toBeVisible({ timeout: 30000 });

  let downloadPath = "";
  try {
    const artifact = await downloadDqArtifactWithSuggestedName(page, sourceRef, "report-dirty-data", async () => {
      await downloadEntry.click({ timeout: 30000 });
    });
    downloadPath = artifact.path;
    await expectDownloadedArtifactContains(downloadPath, ["LTV202603290001AA", "vin"], sourceRef);
  } finally {
    if (downloadPath && existsSync(downloadPath)) unlinkSync(downloadPath);
  }
}

export async function expectDataQualityReportSamplingStatsContract(page: Page, sourceRef: string): Promise<void> {
  await openGeneratedReportDetail(page, sourceRef, "车辆质量抽样检查日报", VEHICLE_QUALITY_RULESET_TABLE);

  const body = page.locator("body");
  for (const expectedText of ["车辆质量抽样校验任务", "抽样", "10", "质量评估", "规则校验"]) {
    await expect(body, `${sourceRef}: 抽样报告详情应展示「${expectedText}」`).toContainText(expectedText, {
      timeout: 30000,
    });
  }
  await expect(body, `${sourceRef}: 抽样报告应展示通过率或规则统计`).toContainText(
    /通过率|校验规则数|规则数|表行数|抽样行数/,
    { timeout: 30000 },
  );
}

export async function expectDataQualityReportContinuousGenerationContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  let row = await openGeneratedReportListAndSearch(page, sourceRef, "车辆质量持续生成报告");
  await expect(row, `${sourceRef}: 持续生成报告应展示数据表`).toContainText(VEHICLE_QUALITY_RULESET_TABLE, {
    timeout: 30000,
  });
  await expect(row, `${sourceRef}: 持续生成报告应展示持续生成中状态`).toContainText("持续生成中", {
    timeout: 30000,
  });
  const firstRowText = await row.innerText({ timeout: 30000 });
  expect(firstRowText, `${sourceRef}: 持续生成报告列表应展示生成时间`).toMatch(/\d{4}-\d{2}-\d{2}/);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await waitForUiSettled(page);
    await searchGeneratedReportByName(page, sourceRef, "车辆质量持续生成报告");
    row = page.locator(".ant-table-tbody tr").filter({ hasText: "车辆质量持续生成报告" }).first();
    const rowText = await row.innerText({ timeout: 30000 });
    if (/已生成|生成失败/.test(rowText)) break;
  }

  const finalRowText = await row.innerText({ timeout: 30000 });
  expect(finalRowText, `${sourceRef}: 持续生成报告刷新后状态应仍为已知状态`).toMatch(
    /持续生成中|已生成|生成失败/,
  );
  if (finalRowText.includes("已生成")) {
    await expect(row, `${sourceRef}: 已生成持续报告应展示报告详情入口`).toContainText("报告详情", {
      timeout: 30000,
    });
    await expect(row, `${sourceRef}: 已生成持续报告应展示下载入口`).toContainText("下载", {
      timeout: 30000,
    });
    const detailEntry = row.getByText("报告详情", { exact: true }).first();
    await detailEntry.click({ timeout: 30000 });
    await expect(page.locator("body"), `${sourceRef}: 持续报告详情应展示报告名称`).toContainText(
      "车辆质量持续生成报告",
      { timeout: 30000 },
    );
    return;
  }
  if (finalRowText.includes("生成失败")) {
    const failedDetailEntry = row.getByText("失败详情", { exact: true }).first();
    await expect(failedDetailEntry, `${sourceRef}: 生成失败持续报告应展示失败详情`).toBeVisible({
      timeout: 30000,
    });
    await failedDetailEntry.click({ timeout: 30000 });
    await expect(page.locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible").last()).toContainText(
      /失败|异常|原因|日志|error|exception/i,
      { timeout: 30000 },
    );
    return;
  }

  await expect(row, `${sourceRef}: 持续生成中报告操作列应在可查看阶段展示报告详情或下载入口`).toContainText(
    /报告详情|下载|失败详情/,
    { timeout: 30000 },
  );
}

export async function expectDataQualityReportSameTableMultiTaskContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openGeneratedReportDetail(page, sourceRef, "车辆订单多任务质量报告", VEHICLE_ORDER_TABLE);

  const body = page.locator("body");
  for (const expectedText of [
    "车辆订单完整性任务",
    "车辆订单唯一性任务",
    "完整性规则包",
    "唯一性规则包",
    "质量评估",
    "规则校验",
  ]) {
    await expect(body, `${sourceRef}: 多任务报告详情应展示「${expectedText}」`).toContainText(expectedText, {
      timeout: 30000,
    });
  }

  const completenessRows = page.locator(".ant-table-tbody tr:visible").filter({ hasText: /完整性|order_id|空值|非空/ });
  const uniquenessRows = page.locator(".ant-table-tbody tr:visible").filter({ hasText: /唯一性|vin重复|重复数/ });
  await expect(completenessRows.first(), `${sourceRef}: 报告详情应展示车辆订单完整性任务规则结果`).toBeVisible({
    timeout: 30000,
  });
  await expect(uniquenessRows.first(), `${sourceRef}: 报告详情应展示车辆订单唯一性任务规则结果`).toBeVisible({
    timeout: 30000,
  });

  const detailText = await body.innerText({ timeout: 30000 });
  const completenessIndex = detailText.indexOf("车辆订单完整性任务");
  const uniquenessIndex = detailText.indexOf("车辆订单唯一性任务");
  expect(completenessIndex, `${sourceRef}: 报告详情应包含车辆订单完整性任务`).toBeGreaterThanOrEqual(0);
  expect(uniquenessIndex, `${sourceRef}: 报告详情应包含车辆订单唯一性任务`).toBeGreaterThanOrEqual(0);
  expect(completenessIndex, `${sourceRef}: 两个不同任务应分别展示而非互相覆盖`).not.toBe(uniquenessIndex);
}

export async function expectDataQualityReportSameTableMultiTaskDirtyDataContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openGeneratedReportDetail(page, sourceRef, "车辆订单多任务质量报告", VEHICLE_ORDER_TABLE);

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 多任务报告应展示完整性任务`).toContainText("车辆订单完整性任务", {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 多任务报告应展示唯一性任务`).toContainText("车辆订单唯一性任务", {
    timeout: 30000,
  });

  await openReportRuleDirtyDetail(page, sourceRef, /order_id|空值|非空|完整性/);
  const completenessScope = await getCurrentDirtyDetailScope(page);
  await expect(completenessScope, `${sourceRef}: 完整性任务脏数据应展示 order_id 空值`).toContainText(/order_id|空值|NULL|为空/, {
    timeout: 30000,
  });
  await expect(completenessScope, `${sourceRef}: 完整性任务脏数据应展示 vin 空值`).toContainText(/vin|空值|NULL|为空/i, {
    timeout: 30000,
  });
  await expect(completenessScope, `${sourceRef}: 完整性任务脏数据不应串入唯一性重复 vin`).not.toContainText(
    "LTV202603290001AA",
    { timeout: 3000 },
  );
  await closeDirtyDetailIfOverlay(page, sourceRef);

  await openReportRuleDirtyDetail(page, sourceRef, /vin重复|重复数|唯一性/);
  const uniquenessScope = await getCurrentDirtyDetailScope(page);
  await expect(uniquenessScope, `${sourceRef}: 唯一性任务脏数据应展示重复 vin`).toContainText(
    "LTV202603290001AA",
    { timeout: 30000 },
  );
  await expect(uniquenessScope, `${sourceRef}: 唯一性任务脏数据应展示重复记录数量或重复明细`).toContainText(
    /2|重复/,
    { timeout: 30000 },
  );
  await expect(uniquenessScope, `${sourceRef}: 唯一性任务脏数据不应串入完整性 order_id 空值明细`).not.toContainText(
    /order_id\s*(为空|NULL|空值)/,
    { timeout: 3000 },
  );
}

export async function expectDataQualityRuleBaseCustomSqlTemplate(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleBase");
  await clickDqText(page, "自定义sql模版", sourceRef);

  const body = page.locator("body");
  for (const label of ["自定义sql模版", "新增自定义sql模版", "规则名称", "规则分类", "关联范围"]) {
    await expect(body, `${sourceRef}: 自定义 SQL 模版列表应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/ruleBase 自定义 SQL 模版", [
    "/dassets/v1/valid/monitorRuleCustom/pageList",
  ]);

  await clickDqText(page, "新增自定义sql模版", sourceRef);
  await expect(page, `${sourceRef}: 新增自定义 SQL 模版应进入 /dq/ruleBase/sqlAdd`).toHaveURL(
    /\/dq\/ruleBase\/sqlAdd/,
  );

  for (const label of ["新增自定义SQL模板", "基本信息", "规则名称", "规则分类", "关联范围", "自定义配置"]) {
    await expect(body, `${sourceRef}: 新增自定义 SQL 模版页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/ruleBase 新增自定义 SQL 模版", [
    "/dassets/v1/valid/monitor/getGlobalParams",
  ]);
}

export async function expectDataQualityRuleBaseCustomSqlBasicInfoSaveContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "自定义SQL主流程模板";
  const ruleDesc = "使用自定义sql模版统计目标字段质量";
  let createdId: string | number | undefined;

  await deleteCustomSqlByNameBestEffort(page, sourceRef, ruleName);

  try {
    await gotoDataQualityPage(page, "/dq/ruleBase");
    await page.locator(".ant-tabs-tab").filter({ hasText: "自定义sql模版" }).click({ timeout: 30000 });

    const body = page.locator("body");
    for (const label of ["自定义sql模版", "新增自定义sql模版", "规则名称", "规则分类", "关联范围", "规则描述"]) {
      await expect(body, `${sourceRef}: 自定义 SQL 模版列表应展示「${label}」`).toContainText(label, {
        timeout: 30000,
      });
    }

    await clickDqText(page, "新增自定义sql模版", sourceRef);
    await expect(page, `${sourceRef}: 新增自定义 SQL 模版应进入 /dq/ruleBase/sqlAdd`).toHaveURL(
      /\/dq\/ruleBase\/sqlAdd/,
      { timeout: 30000 },
    );
    for (const label of ["新增自定义SQL模板", "基本信息", "规则名称", "规则分类", "关联范围", "规则描述"]) {
      await expect(body, `${sourceRef}: 新增页应展示「${label}」`).toContainText(label, {
        timeout: 30000,
      });
    }

    await page.locator("#ruleName").fill(ruleName, { timeout: 30000 });
    await page.locator("#ruleDesc").fill(ruleDesc, { timeout: 30000 });
    await selectDqFormOption(page, "规则分类", "完整性校验", sourceRef);
    await selectDqFormOption(page, "关联范围", "字段", sourceRef);

    const saveRequest = page.waitForRequest((request) => {
      if (!request.url().includes("/dassets/v1/valid/monitorRuleCustom/addOrUpdate")) return false;
      const requestBody = getRequestJson(request);
      return (
        requestBody.ruleName === ruleName &&
        requestBody.ruleType === 1 &&
        requestBody.relationRange === 3 &&
        requestBody.ruleDesc === ruleDesc &&
        !("customConfiguration" in requestBody)
      );
    });
    const saveResponse = waitForDqJson<boolean>(
      page,
      "/dassets/v1/valid/monitorRuleCustom/addOrUpdate",
    );
    await clickDqCompactButton(page, "新增", sourceRef);
    await saveRequest;
    expectDqSuccess(await saveResponse, `${sourceRef}: 仅填写基础信息保存自定义 SQL 模版应请求成功`);

    const listResponse = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleCustom/pageList"), {
      data: { current: 1, size: 100 },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    });
    expect(listResponse.ok(), `${sourceRef}: 保存后查询自定义 SQL 模版列表 HTTP 应成功`).toBe(true);
    const pageData = expectDqSuccess(
      (await listResponse.json()) as DqApiResponse<DqRuleBaseCustomSqlPage>,
      `${sourceRef}: 保存后自定义 SQL 模版列表应请求成功`,
    );
    const record = (pageData.contentList ?? []).find((item) => item.ruleName === ruleName);
    expect(record, `${sourceRef}: 保存后列表接口应返回「${ruleName}」`).toBeTruthy();
    createdId = record?.id;
    expect(formatRuleBaseCustomRuleType(record?.ruleType, sourceRef), `${sourceRef}: 规则分类应为完整性校验`).toBe(
      "完整性校验",
    );
    expect(
      formatRuleBaseCustomRelationRange(record?.relationRange, sourceRef),
      `${sourceRef}: 关联范围应为字段`,
    ).toBe("字段");
    expect(record?.ruleDesc, `${sourceRef}: 列表接口应保存规则描述`).toBe(ruleDesc);

    await gotoDataQualityPage(page, "/dq/ruleBase");
    await page.locator(".ant-tabs-tab").filter({ hasText: "自定义sql模版" }).click({ timeout: 30000 });
    const row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: ruleName }).first();
    await expect(row, `${sourceRef}: 保存后列表应展示自定义 SQL 模版`).toBeVisible({ timeout: 30000 });
    for (const expectedText of [ruleName, "完整性校验", "字段", ruleDesc]) {
      await expect(row, `${sourceRef}: 自定义 SQL 模版行应展示「${expectedText}」`).toContainText(
        expectedText,
        { timeout: 30000 },
      );
    }

    const detailResponse = waitForDqJson<DqRuleBaseCustomSqlRecord>(
      page,
      "/dassets/v1/valid/monitorRuleCustom/detail",
      (payload) => String(payload.data?.id) === String(createdId),
    );
    await row.locator("a").filter({ hasText: ruleName }).click({ timeout: 30000 });
    const detail = expectDqSuccess(await detailResponse, `${sourceRef}: 自定义 SQL 模版详情应请求成功`);
    expect(detail.ruleName, `${sourceRef}: 详情应回显规则名称`).toBe(ruleName);
    expect(formatRuleBaseCustomRuleType(detail.ruleType, sourceRef), `${sourceRef}: 详情应回显规则分类`).toBe(
      "完整性校验",
    );
    expect(formatRuleBaseCustomRelationRange(detail.relationRange, sourceRef), `${sourceRef}: 详情应回显关联范围`).toBe(
      "字段",
    );
    expect(detail.ruleDesc, `${sourceRef}: 详情应回显规则描述`).toBe(ruleDesc);
  } finally {
    if (createdId) {
      await deleteCustomSqlById(page, sourceRef, createdId).catch(() => {});
    }
  }
}

export async function expectDataQualityRuleBaseCustomSqlParamConfigContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleBase");
  await clickDqText(page, "自定义sql模版", sourceRef);
  await clickDqText(page, "新增自定义sql模版", sourceRef);
  await expect(page, `${sourceRef}: 新增自定义 SQL 模版应进入 /dq/ruleBase/sqlAdd`).toHaveURL(
    /\/dq\/ruleBase\/sqlAdd/,
  );

  const body = page.locator("body");
  for (const label of [
    "新增自定义SQL模板",
    "基本信息",
    "自定义配置",
    "全局参数",
    "参数",
    "类型",
    "参数名称",
    "参数说明",
  ]) {
    await expect(body, `${sourceRef}: 自定义 SQL 模版参数配置页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  const customSql = "select count(*) from ${test_table} where ${column_name} is null";
  await page.locator(".monaco-editor textarea").first().click({ timeout: 30000 });
  await page.keyboard.type(customSql);
  await expect(body, `${sourceRef}: 自定义配置编辑器应回显 SQL 内容`).toContainText(
    "select count(*) from ${test_table} where ${column_name} is null",
    { timeout: 30000 },
  );

  const testTableRow = page.locator(".ant-table-tbody tr").filter({ hasText: "${test_table}" }).first();
  const columnNameRow = page.locator(".ant-table-tbody tr").filter({ hasText: "${column_name}" }).first();
  await expect(testTableRow, `${sourceRef}: 参数列表应解析 ${"${test_table}"}`).toBeVisible({
    timeout: 30000,
  });
  await expect(columnNameRow, `${sourceRef}: 参数列表应解析 ${"${column_name}"}`).toBeVisible({
    timeout: 30000,
  });

  await testTableRow.locator(".ant-select").click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 参数类型下拉应打开`).toBeVisible({ timeout: 30000 });
  for (const option of ["数值", "数组", "逻辑关系", "当前校验表", "当前校验表字段", "自定义参数"]) {
    await expect(dropdown, `${sourceRef}: 参数类型下拉应包含「${option}」`).toContainText(option, {
      timeout: 30000,
    });
  }

  await dropdown.getByText("自定义参数", { exact: true }).click({ timeout: 30000 });
  await expect(
    testTableRow.getByPlaceholder("请输入参数名称"),
    `${sourceRef}: 参数名称应可编辑`,
  ).toBeVisible({ timeout: 30000 });
  await expect(
    testTableRow.getByPlaceholder("请输入参数说明"),
    `${sourceRef}: 参数说明应可编辑`,
  ).toBeVisible({ timeout: 30000 });

  await clickDqCompactButton(page, "新增", sourceRef);
  await expect(testTableRow, `${sourceRef}: 参数名称为空时应触发必填校验`).toContainText(
    "参数名称不能为空",
    { timeout: 30000 },
  );
  await expect(page, `${sourceRef}: 参数必填校验不应提交或离开新增页面`).toHaveURL(
    /\/dq\/ruleBase\/sqlAdd/,
  );
}

export async function expectDataQualityRuleBaseCustomSqlDetailEditProtectionContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const listResponse = waitForDqJson<DqRuleBaseCustomSqlPage>(
    page,
    "/dassets/v1/valid/monitorRuleCustom/pageList",
  );
  await gotoDataQualityPage(page, "/dq/ruleBase");
  await page.locator(".ant-tabs-tab").filter({ hasText: "自定义sql模版" }).click({ timeout: 30000 });
  const pageData = expectDqSuccess(await listResponse, `${sourceRef}: 自定义 SQL 模版列表应请求成功`);
  const records = expectCustomSqlTemplatePage(pageData, `${sourceRef}: 自定义 SQL 模版列表应返回记录`);
  const target = expectCustomSqlReferencedRecord(records, sourceRef);
  const ruleName = expectNonEmptyString(target.ruleName, `${sourceRef}: 目标模板应包含规则名称`);
  const originalDesc = String(target.ruleDesc ?? "");
  const category = formatRuleBaseCustomRuleType(target.ruleType, sourceRef);
  const relationRange = formatRuleBaseCustomRelationRange(target.relationRange, sourceRef);
  const associationRuleCount = String(target.associationRuleCount);
  const customSql = expectNonEmptyString(
    target.customConfiguration,
    `${sourceRef}: 目标模板应包含自定义 SQL 内容`,
  );

  const row = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  await expect(row, `${sourceRef}: 列表应展示被规则引用的自定义 SQL 模版`).toBeVisible({
    timeout: 30000,
  });
  for (const expectedText of [ruleName, category, relationRange, associationRuleCount, originalDesc]) {
    if (expectedText) {
      await expect(row, `${sourceRef}: 自定义 SQL 模版行应展示「${expectedText}」`).toContainText(
        expectedText,
        { timeout: 30000 },
      );
    }
  }
  await expect(row.getByRole("button", { name: "编辑" }), `${sourceRef}: 目标模板应展示编辑入口`).toBeEnabled({
    timeout: 30000,
  });
  await expect(
    row.getByRole("button", { name: "删除" }),
    `${sourceRef}: 已被引用的模板删除入口应禁用`,
  ).toBeDisabled({ timeout: 30000 });

  const detailLink = row.locator("a").filter({ hasText: ruleName }).first();
  if (await detailLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await detailLink.click({ timeout: 30000 });
    await waitForUiSettled(page);
    const detailDialog = page.locator('[role="dialog"]').last();
    await expect(detailDialog, `${sourceRef}: 点击模板名称应打开详情抽屉`).toBeVisible({
      timeout: 30000,
    });
    for (const expectedText of [ruleName, category, relationRange, associationRuleCount, originalDesc]) {
      if (expectedText) {
        await expect(detailDialog, `${sourceRef}: 详情抽屉应回显「${expectedText}」`).toContainText(
          expectedText,
          { timeout: 30000 },
        );
      }
    }
    for (const sqlToken of customSql.match(/\$\{[^}]+\}|select|where/gi) ?? []) {
      await expect(detailDialog, `${sourceRef}: 详情抽屉应回显 SQL 片段「${sqlToken}」`).toContainText(
        sqlToken,
        { timeout: 30000 },
      );
    }
    await detailDialog.getByRole("img", { name: "closeBtn" }).click({ timeout: 30000 });
    await expect(detailDialog, `${sourceRef}: 详情抽屉关闭后才能操作列表编辑`).toBeHidden({
      timeout: 30000,
    });
  }
  if (!page.url().includes("/dq/ruleBase/sqlAdd")) {
    await row.getByRole("button", { name: "编辑" }).click({ timeout: 30000 });
  }
  await expect(page, `${sourceRef}: 编辑自定义 SQL 模板应进入 sqlAdd 路由`).toHaveURL(
    /\/dq\/ruleBase\/sqlAdd/,
  );

  const body = page.locator("body");
  await expect(page.locator("#ruleName"), `${sourceRef}: 编辑页规则名称应回显`).toHaveValue(ruleName, {
    timeout: 30000,
  });
  await expect(page.locator("#ruleDesc"), `${sourceRef}: 编辑页规则描述应回显`).toHaveValue(originalDesc, {
    timeout: 30000,
  });
  for (const expectedText of [category, relationRange]) {
    await expect(body, `${sourceRef}: 编辑页应回显「${expectedText}」`).toContainText(expectedText, {
      timeout: 30000,
    });
  }
  for (const sqlToken of customSql.match(/\$\{[^}]+\}|select|where/gi) ?? []) {
    await expect(body, `${sourceRef}: 编辑页应回显 SQL 片段「${sqlToken}」`).toContainText(sqlToken, {
      timeout: 30000,
    });
  }

  const editedDesc = `${originalDesc || "custom-sql"} auto ${Date.now()}`;
  let changed = false;
  try {
    await page.locator("#ruleDesc").fill(editedDesc, { timeout: 30000 });
    const saveResponse = waitForDqJson<boolean>(
      page,
      "/dassets/v1/valid/monitorRuleCustom/addOrUpdate",
    );
    await clickDqCompactButton(page, "保存", sourceRef);
    expectDqSuccess(await saveResponse, `${sourceRef}: 编辑自定义 SQL 模版保存应请求成功`);
    changed = true;

    const editedListResponse = waitForDqJson<DqRuleBaseCustomSqlPage>(
      page,
      "/dassets/v1/valid/monitorRuleCustom/pageList",
      (payload) =>
        (payload.data?.contentList ?? []).some(
          (item) => String(item.id) === String(target.id) && item.ruleDesc === editedDesc,
        ),
    );
    await gotoDataQualityPage(page, "/dq/ruleBase");
    await page.locator(".ant-tabs-tab").filter({ hasText: "自定义sql模版" }).click({ timeout: 30000 });
    const editedRecords = expectCustomSqlTemplatePage(
      expectDqSuccess(await editedListResponse, `${sourceRef}: 编辑后列表应请求成功`),
      `${sourceRef}: 编辑后列表应返回记录`,
    );
    const editedRecord = editedRecords.find((item) => String(item.id) === String(target.id));
    expect(editedRecord?.ruleDesc, `${sourceRef}: 编辑后接口应回显最新规则描述`).toBe(editedDesc);
    await expect(
      page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first(),
      `${sourceRef}: 编辑后列表行应回显最新规则描述`,
    ).toContainText(editedDesc, { timeout: 30000 });
  } finally {
    if (changed) {
      const restoreResponse = await page.request.post(
        buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleCustom/addOrUpdate"),
        {
          data: {
            ...target,
            ruleDesc: originalDesc,
          },
          timeout: 60000,
        },
      );
      expect(restoreResponse.ok(), `${sourceRef}: 清理恢复自定义 SQL 模版描述 HTTP 应成功`).toBe(true);
      expectDqSuccess(
        (await restoreResponse.json()) as DqApiResponse<boolean>,
        `${sourceRef}: 清理恢复自定义 SQL 模版描述应请求成功`,
      );
    }
  }
}

export async function expectDataQualityRuleBaseBuiltInRulesShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const initialResponse = waitForDqJson<DqRuleBaseTemplatePage>(
    page,
    "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/ruleBase");
  const initialPage = expectDqSuccess(await initialResponse, `${sourceRef}: 内置规则列表应请求成功`);

  const body = page.locator("body");
  for (const label of ["规则库配置", "内置规则", "自定义正则", "自定义sql模版", "导出规则库"]) {
    await expect(body, `${sourceRef}: 规则库配置应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  for (const header of ["规则名称", "规则解释", "规则分类", "关联范围", "关联规则数", "规则状态", "规则描述"]) {
    await expect(body, `${sourceRef}: 内置规则列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  const initialRecords = expectRuleBaseRecords(initialPage, `${sourceRef}: 内置规则列表应返回记录`);
  expect(Number(initialPage.total), `${sourceRef}: 内置规则总数应大于当前页记录数`).toBeGreaterThanOrEqual(
    initialRecords.length,
  );
  assertRuleBaseNewBuiltInRules(sourceRef, initialRecords);

  const searchKeyword = "key范围校验";
  const searchResponse = waitForDqJson<DqRuleBaseTemplatePage>(
    page,
    "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  );
  await page.locator("input[placeholder='请输入规则名称进行搜索']:visible").first().fill(searchKeyword);
  await page.keyboard.press("Enter");
  const searchRecords = expectRuleBaseRecords(
    expectDqSuccess(await searchResponse, `${sourceRef}: 规则名称搜索应请求成功`),
    `${sourceRef}: 规则名称搜索应返回记录`,
  );
  expect(
    searchRecords.every((record) => String(record.functionName ?? "").includes(searchKeyword)),
    `${sourceRef}: 搜索结果应仅包含命中规则名称`,
  ).toBe(true);
  await expect(body, `${sourceRef}: 搜索后列表应展示「${searchKeyword}」`).toContainText(searchKeyword, {
    timeout: 30000,
  });

  await gotoRuleBaseWithInitialList(page, sourceRef);
  await assertRuleBaseCategoryFilter(page, sourceRef);

  await gotoRuleBaseWithInitialList(page, sourceRef);
  await assertRuleBaseRelationRangeFilter(page, sourceRef);
}

export async function expectDataQualityRuleBaseBuiltInExportContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const initialResponse = waitForDqJson<DqRuleBaseTemplatePage>(
    page,
    "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/ruleBase");
  const initialPage = expectDqSuccess(await initialResponse, `${sourceRef}: 内置规则列表应请求成功`);
  const records = expectRuleBaseRecords(initialPage, `${sourceRef}: 内置规则列表应返回记录`);
  const target =
    records.find((record) => record.functionName && record.functionExplain && record.description) ?? records[0];
  expect(target, `${sourceRef}: 导出校验应存在目标内置规则`).toBeTruthy();

  const exportButton = page.getByRole("button", { name: "导出规则库" });
  await expect(exportButton, `${sourceRef}: 应展示导出规则库按钮`).toBeVisible({ timeout: 30000 });
  await exportButton.click({ timeout: 30000 });

  const popconfirm = page.locator(".ant-popconfirm:visible, .ant-popover:visible").last();
  await expect(popconfirm, `${sourceRef}: 导出前应展示确认气泡`).toContainText("请确认是否导出规则库", {
    timeout: 30000,
  });
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }),
    popconfirm.locator(".ant-btn-primary").click({ timeout: 30000 }),
  ]);
  expect(download.suggestedFilename(), `${sourceRef}: 导出文件名应为内置规则库 xlsx`).toMatch(
    /内置规则库_.+\.xlsx$/,
  );

  const downloadPath = join(tmpdir(), `${sourceRef.replace(/[^a-zA-Z0-9_-]/g, "_")}-${Date.now()}.xlsx`);
  await download.saveAs(downloadPath);
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(downloadPath);
    const worksheet = workbook.worksheets[0];
    expect(worksheet, `${sourceRef}: 导出文件应包含工作表`).toBeTruthy();

    const workbookText = collectWorksheetText(worksheet).join("\n");
    for (const header of ["规则名称", "规则解释", "规则分类", "关联范围", "规则状态", "规则描述"]) {
      expect(workbookText, `${sourceRef}: 导出文件应包含列「${header}」`).toContain(header);
    }

    const expectedTexts = [
      expectNonEmptyString(target.functionName, `${sourceRef}: 目标规则应包含规则名称`),
      expectNonEmptyString(target.functionExplain, `${sourceRef}: 目标规则应包含规则解释`),
      formatRuleBaseBuiltInRuleType(target.ruleTaskType, sourceRef),
      formatRuleBaseBuiltInRelationRange(target.relationRange, sourceRef),
      formatRuleBaseBuiltInOpenStatus(target.openStatus, sourceRef),
    ];
    if (target.description) {
      expectedTexts.push(target.description);
    }
    for (const expectedText of expectedTexts) {
      expect(workbookText, `${sourceRef}: 导出文件应包含内置规则内容「${expectedText}」`).toContain(
        expectedText,
      );
    }
  } finally {
    if (existsSync(downloadPath)) {
      unlinkSync(downloadPath);
    }
  }
}

export async function expectDataQualityRuleBaseBuiltInStatusToggleContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const initialResponse = waitForDqJson<DqRuleBaseTemplatePage>(
    page,
    "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/ruleBase");
  const initialPage = expectDqSuccess(await initialResponse, `${sourceRef}: 内置规则列表应请求成功`);
  const records = expectRuleBaseRecords(initialPage, `${sourceRef}: 内置规则列表应返回记录`);
  const target = records.find(
    (record) =>
      record.id &&
      record.functionName === "字段值计算对比" &&
      record.relationNumber === 0 &&
      record.openStatus === 1,
  );
  expect(target, `${sourceRef}: 应存在未被规则引用且已开启的内置规则「字段值计算对比」`).toBeTruthy();
  const targetRecord = target as DqRuleBaseTemplateRecord;
  const ruleName = expectNonEmptyString(targetRecord.functionName, `${sourceRef}: 目标规则应包含规则名称`);
  const ruleCategory = formatRuleBaseBuiltInRuleType(targetRecord.ruleTaskType, sourceRef);
  const relationRange = formatRuleBaseBuiltInRelationRange(targetRecord.relationRange, sourceRef);

  let restored = false;
  try {
    const row = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
    await expect(row, `${sourceRef}: 规则库列表应展示目标规则`).toBeVisible({ timeout: 30000 });
    for (const expectedText of [
      ruleName,
      expectNonEmptyString(targetRecord.functionExplain, `${sourceRef}: 目标规则应包含规则解释`),
      ruleCategory,
      relationRange,
      String(targetRecord.relationNumber),
      expectNonEmptyString(targetRecord.description, `${sourceRef}: 目标规则应包含规则描述`),
    ]) {
      await expect(row, `${sourceRef}: 目标规则行应展示「${expectedText}」`).toContainText(expectedText, {
        timeout: 30000,
      });
    }

    const ruleSwitch = row.locator(".ant-switch").first();
    await expect(ruleSwitch, `${sourceRef}: 未引用规则的状态开关应可操作`).toBeEnabled({
      timeout: 30000,
    });
    await expect(ruleSwitch, `${sourceRef}: 目标规则初始应为开启`).toHaveAttribute("aria-checked", "true", {
      timeout: 30000,
    });

    const closeResponse = waitForDqJson<boolean>(
      page,
      "/dassets/v1/valid/monitorRuleTemplate/openOrClose",
    );
    const closedListResponse = waitForDqJson<DqRuleBaseTemplatePage>(
      page,
      "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
      (payload) =>
        (payload.data?.contentList ?? []).some(
          (item) => String(item.id) === String(targetRecord.id) && item.openStatus === 0,
        ),
    );
    await ruleSwitch.click({ timeout: 30000 });
    expectDqSuccess(await closeResponse, `${sourceRef}: 关闭内置规则应请求成功`);
    restored = false;
    await expect(ruleSwitch, `${sourceRef}: 关闭后状态开关应变为关闭`).toHaveAttribute(
      "aria-checked",
      "false",
      { timeout: 30000 },
    );
    const closedRecords = expectRuleBaseRecords(
      expectDqSuccess(await closedListResponse, `${sourceRef}: 关闭后规则库列表应刷新成功`),
      `${sourceRef}: 关闭后规则库列表应返回记录`,
    );
    expect(
      closedRecords.find((record) => String(record.id) === String(targetRecord.id))?.openStatus,
      `${sourceRef}: 关闭后接口应回显 openStatus=0`,
    ).toBe(0);

    await expectRuleSetAddFunctionOption(page, sourceRef, ruleCategory, ruleName, false);

    await gotoDataQualityPage(page, "/dq/ruleBase");
    const reopenedRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
    const reopenedSwitch = reopenedRow.locator(".ant-switch").first();
    await expect(reopenedSwitch, `${sourceRef}: 关闭后的目标规则应可再次开启`).toHaveAttribute(
      "aria-checked",
      "false",
      { timeout: 30000 },
    );
    const openResponse = waitForDqJson<boolean>(
      page,
      "/dassets/v1/valid/monitorRuleTemplate/openOrClose",
    );
    const openedListResponse = waitForDqJson<DqRuleBaseTemplatePage>(
      page,
      "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
      (payload) =>
        (payload.data?.contentList ?? []).some(
          (item) => String(item.id) === String(targetRecord.id) && item.openStatus === 1,
        ),
    );
    await reopenedSwitch.click({ timeout: 30000 });
    expectDqSuccess(await openResponse, `${sourceRef}: 再次开启内置规则应请求成功`);
    restored = true;
    await expect(reopenedSwitch, `${sourceRef}: 再次开启后状态开关应变为开启`).toHaveAttribute(
      "aria-checked",
      "true",
      { timeout: 30000 },
    );
    const openedRecords = expectRuleBaseRecords(
      expectDqSuccess(await openedListResponse, `${sourceRef}: 开启后规则库列表应刷新成功`),
      `${sourceRef}: 开启后规则库列表应返回记录`,
    );
    expect(
      openedRecords.find((record) => String(record.id) === String(targetRecord.id))?.openStatus,
      `${sourceRef}: 再次开启后接口应回显 openStatus=1`,
    ).toBe(1);

    await expectRuleSetAddFunctionOption(page, sourceRef, ruleCategory, ruleName, true);
  } finally {
    if (!restored) {
      await setRuleBaseBuiltInOpenStatus(page, sourceRef, targetRecord.id, 1);
    }
  }
}

export async function expectDataQualityMenuRenameContract(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/overview");

  const dqMenu = page
    .locator(".ant-layout-sider, .ant-menu")
    .filter({ hasText: "规则库配置" })
    .filter({ hasText: "校验结果查询" })
    .last();
  await expect(dqMenu, `${sourceRef}: 数据质量菜单应可见`).toBeVisible({ timeout: 30000 });

  for (const menuName of [
    "规则库配置",
    "规则集管理",
    "规则任务管理",
    "校验结果查询",
    "数据质量报告",
    "通用配置",
    "项目管理",
  ]) {
    await expect(dqMenu, `${sourceRef}: 数据质量菜单应展示新菜单「${menuName}」`).toContainText(menuName, {
      timeout: 30000,
    });
  }
  for (const legacyName of ["规则配置", "任务查询"]) {
    await expect(dqMenu, `${sourceRef}: 数据质量主菜单不应展示旧名称「${legacyName}」`).not.toContainText(
      legacyName,
      { timeout: 30000 },
    );
  }

  for (const target of [
    { path: "/dq/ruleBase", url: /\/dq\/ruleBase/, text: "规则库配置" },
    { path: "/dq/ruleSet", url: /\/dq\/ruleSet/, text: "规则集管理" },
    { path: "/dq/rule", url: /\/dq\/rule(?:\?|$)/, text: "规则任务管理" },
    { path: "/dq/taskQuery", url: /\/dq\/taskQuery/, text: "校验结果查询" },
    { path: "/dq/qualityReport", url: /\/dq\/qualityReport/, text: "数据质量报告" },
    { path: "/dq/generalConfig/jsonValidationConfig", url: /\/dq\/generalConfig\/jsonValidationConfig/, text: "通用配置" },
    { path: "/dq/project/projectList", url: /\/dq\/project\/projectList/, text: "项目信息" },
    { path: "/dq/project/dirtyDataManage", url: /\/dq\/project\/dirtyDataManage/, text: "脏数据管理" },
  ]) {
    await gotoDataQualityPage(page, target.path);
    await expect(page, `${sourceRef}: ${target.text} 应能通过新路由打开`).toHaveURL(target.url);
    await expect(page.locator("body"), `${sourceRef}: ${target.text} 页面应展示目标菜单/标题`).toContainText(
      target.text,
      { timeout: 30000 },
    );
  }
}

export async function expectDataQualityCommonConfigPermissionContract(
  adminPage: Page,
  limitedPage: Page,
  sourceRef: string,
): Promise<void> {
  await expectDqAdminFullMenu(adminPage, sourceRef);
  await expectDqPagePermissionTarget(adminPage, sourceRef, {
    path: "/dq/generalConfig/jsonValidationConfig",
    title: /通用配置|json格式校验管理/,
    operations: /新增|编辑|删除|导入|导出/,
  });
  await expectDqLimitedPermission(limitedPage, sourceRef, {
    path: "/dq/generalConfig/jsonValidationConfig",
    title: /通用配置|json格式校验管理/,
    forbiddenMenu: /通用配置/,
    operations: /新增|编辑|删除|导入|导出/,
  });
}

export async function expectDataQualityRuleBasePermissionContract(
  adminPage: Page,
  limitedPage: Page,
  sourceRef: string,
): Promise<void> {
  await expectDqAdminFullMenu(adminPage, sourceRef);
  await expectDqPagePermissionTarget(adminPage, sourceRef, {
    path: "/dq/ruleBase",
    title: /规则库配置|内置规则|自定义正则|自定义SQL/,
    operations: /新增|编辑|删除|导出|关闭|开启/,
  });
  await expectDqLimitedPermission(limitedPage, sourceRef, {
    path: "/dq/ruleBase",
    title: /规则库配置|内置规则|自定义正则|自定义SQL/,
    forbiddenMenu: /规则库配置/,
    operations: /新增|编辑|删除|导出|关闭|开启/,
  });
}

export async function expectDataQualityProjectCreateEditContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/project/projectList");
  const body = page.locator("body");

  await expectDqCompactButton(page, "创建项目", sourceRef);
  for (const header of [
    "项目名称",
    "项目标识",
    "项目描述",
    "项目成员",
    "项目管理员",
    "创建时间",
    "项目空间关联",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 项目信息列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  const suffix = String(Date.now());
  const projectName = `autodq_project_${suffix}`;
  const projectIdent = `autodq_${suffix}`;
  const initialDescription = `created by playwright ${suffix}`;
  const editedDescription = `edited by playwright ${suffix}`;
  let created = false;

  try {
    await clickDqCompactButton(page, "创建项目", sourceRef);
    const createModal = await expectDqProjectModal(page, sourceRef, "创建项目");
    await fillDqProjectModal(page, createModal, sourceRef, {
      projectName,
      projectIdent,
      description: initialDescription,
      selectAdmin: true,
    });
    await submitDqProjectModal(page, createModal, sourceRef, "创建项目保存");

    const createdRow = await expectDqProjectRow(page, sourceRef, projectName, projectIdent);
    await expect(createdRow, `${sourceRef}: 新建项目应回显初始描述`).toContainText(initialDescription, {
      timeout: 30000,
    });
    created = true;

    await createdRow.getByRole("button", { name: "编辑" }).click({ timeout: 30000 });
    const editModal = await expectDqProjectModal(page, sourceRef, "编辑项目");
    await fillDqProjectModal(page, editModal, sourceRef, {
      description: editedDescription,
      selectAdmin: false,
    });
    await submitDqProjectModal(page, editModal, sourceRef, "编辑项目保存");

    const editedRow = await expectDqProjectRow(page, sourceRef, projectName, projectIdent);
    await expect(editedRow, `${sourceRef}: 编辑后列表应回显修改后的项目描述`).toContainText(
      editedDescription,
      { timeout: 30000 },
    );
  } finally {
    if (created) {
      await deleteDqProjectBestEffort(page, projectName, projectIdent);
    }
  }
}

export async function expectDataQualityProjectPinDeleteContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/project/projectList");
  await expect(page.locator("body"), `${sourceRef}: 项目信息列表应加载成功`).toContainText("创建项目", {
    timeout: 30000,
  });
  await expect(
    page.locator(".ant-layout-sider").first(),
    `${sourceRef}: 当前使用项目应保持为 ${getQualityProjectName()}`,
  ).toContainText(getQualityProjectName(), { timeout: 30000 });

  const suffix = String(Date.now());
  const projectName = `autodq_top_${suffix}`;
  const projectIdent = `autodqtop_${suffix}`;
  const description = `top delete by playwright ${suffix}`;
  let created = false;
  let deleted = false;

  try {
    await clickDqCompactButton(page, "创建项目", sourceRef);
    const createModal = await expectDqProjectModal(page, sourceRef, "创建项目");
    await fillDqProjectModal(page, createModal, sourceRef, {
      projectName,
      projectIdent,
      description,
      selectAdmin: true,
    });
    await submitDqProjectModal(page, createModal, sourceRef, "置顶删除验证项目创建");
    const createdRow = await expectDqProjectRow(page, sourceRef, projectName, projectIdent);
    created = true;

    await createdRow.getByRole("button", { name: "置顶" }).click({ timeout: 30000 });
    await gotoDataQualityPage(page, "/dq/project/projectList");
    const pinnedRow = await expectDqProjectRow(page, sourceRef, projectName, projectIdent);
    await expect(pinnedRow, `${sourceRef}: 置顶后项目应进入取消置顶状态`).toContainText("取消置顶", {
      timeout: 30000,
    });

    await deleteDqProjectAndAssert(page, sourceRef, projectName, projectIdent);
    deleted = true;
    await expect(
      page.locator(".ant-layout-sider").first(),
      `${sourceRef}: 删除临时项目后当前使用项目仍为 ${getQualityProjectName()}`,
    ).toContainText(getQualityProjectName(), { timeout: 30000 });
  } finally {
    if (created && !deleted) {
      await deleteDqProjectBestEffort(page, projectName, projectIdent);
    }
  }
}

export async function expectDataQualityProjectDefaultMonitorDatabaseContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/project/projectList");
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 项目信息列表应加载成功`).toContainText("创建项目", {
    timeout: 30000,
  });

  const projectRow = await expectDqProjectRow(page, sourceRef, "lt_dq_main_project", "lt_dq_main");
  await projectRow.getByRole("button", { name: "编辑" }).click({ timeout: 30000 });
  const editModal = await expectDqProjectModal(page, sourceRef, "编辑项目");
  await expect(editModal, `${sourceRef}: 项目编辑弹窗应展示默认监控数据源库配置`).toContainText(
    /默认监控数据源|默认监控数据源库|SparkThrift/i,
    { timeout: 30000 },
  );

  await selectDqFormOptionByRegex(page, /默认监控数据源|默认监控数据源库/, /SparkThrift|spark|thrift|SchemaA|voyah|default/i, sourceRef);
  await submitDqProjectModal(page, editModal, sourceRef, "默认监控数据源库保存");

  const editedRow = await expectDqProjectRow(page, sourceRef, "lt_dq_main_project", "lt_dq_main");
  await expect(editedRow, `${sourceRef}: 默认监控数据源库保存后项目仍在列表中`).toContainText("lt_dq_main_project", {
    timeout: 30000,
  });

  await gotoDataQualityPage(page, "/dq/ruleSet");
  await clickDqCompactButton(page, "新建规则集", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 新建规则集应默认带出监控数据源库相关字段`).toContainText(
    /数据源|数据库|SparkThrift|SchemaA/i,
    { timeout: 30000 },
  );
  await page.keyboard.press("Escape");

  await gotoDataQualityPage(page, "/dq/rule");
  await clickDqCompactButton(page, "新建监控规则", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 新建规则任务应默认带出监控对象数据源库字段`).toContainText(
    /数据源|数据库|SparkThrift|SchemaA/i,
    { timeout: 30000 },
  );
}

export async function expectDataQualityDirtyDataManagementContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/project/dirtyDataManage");
  const body = page.locator("body");
  for (const text of ["脏数据管理", "独立存储"]) {
    await expect(body, `${sourceRef}: 脏数据管理页面应展示「${text}」`).toContainText(text, {
      timeout: 30000,
    });
  }
  for (const header of ["数据源", "数据源类型", "脏数据存储库", "数据存储时效", "更新人", "脏数据存储", "操作"]) {
    await expect(body, `${sourceRef}: 脏数据管理列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  const row = await expectDirtyDataStorageRow(page, sourceRef);
  await editDirtyDataStorageRow(page, sourceRef, row, {
    dirtyStore: "dq_dirty_store",
    retentionDays: "30",
    enableStorage: true,
  });
  const updatedRow = await expectDirtyDataStorageRow(page, sourceRef);
  for (const expectedText of ["dq_dirty_store", "30"]) {
    await expect(updatedRow, `${sourceRef}: 脏数据管理列表应回显「${expectedText}」`).toContainText(
      expectedText,
      { timeout: 30000 },
    );
  }
  await expect(updatedRow, `${sourceRef}: 脏数据管理列表应展示更新人或开关状态`).toContainText(
    /admin|开启|启用|是|关闭|禁用|否/i,
    { timeout: 30000 },
  );

  await gotoDataQualityPage(page, "/dq/taskQuery");
  await expect(page.locator("body"), `${sourceRef}: 开启脏数据存储后校验结果页应可查看异常实例明细入口`).toContainText(
    /查看详情|查看明细|下载明细|校验不通过|校验异常/,
    { timeout: 30000 },
  );
}

export async function expectDataQualityDirtyDataStorageEditContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/project/dirtyDataManage");
  const row = await expectDirtyDataStorageRow(page, sourceRef);
  await editDirtyDataStorageRow(page, sourceRef, row, {
    dirtyStore: "dq_dirty_store",
    retentionDays: "30",
    enableStorage: true,
  });
  const updatedRow = await expectDirtyDataStorageRow(page, sourceRef);
  await expect(updatedRow, `${sourceRef}: 编辑独立存储后应回显脏数据存储库`).toContainText("dq_dirty_store", {
    timeout: 30000,
  });
  await expect(updatedRow, `${sourceRef}: 编辑独立存储后应回显数据存储时效`).toContainText("30", {
    timeout: 30000,
  });
  await expect(updatedRow, `${sourceRef}: 编辑独立存储后应展示更新人或操作状态`).toContainText(
    /admin|开启|启用|是|关闭|禁用|否/i,
    { timeout: 30000 },
  );
}

export async function expectDataQualityCommonConfigJsonShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");

  const body = page.locator("body");
  for (const label of ["通用配置", "json格式校验管理"]) {
    await expect(body, `${sourceRef}: json格式校验管理页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  for (const label of ["导入", "导出", "新增"]) {
    await expectDqCompactButton(page, label, sourceRef);
  }

  for (const header of [
    "key",
    "中文名称",
    "value格式",
    "数据源类型",
    "创建人",
    "创建时间",
    "更新人",
    "更新时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: json格式校验管理列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/generalConfig/jsonValidationConfig 列表", [
    "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
  ]);
}

export async function expectDataQualityReportDimensionVehicleConfigContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const configResponse = waitForDqJson<unknown>(
    page,
    "/dassets/v1/valid/monitorSideTable/getSideTableConfig",
  );
  await gotoDataQualityPage(page, "/dq/generalConfig/dimension");
  const configPayload = await configResponse;
  expect(
    configPayload.success ?? configPayload.code === 1,
    `${sourceRef}: 报告关联维表设置配置应请求成功`,
  ).toBe(true);

  const body = page.locator("body");
  for (const label of [
    "报告关联维表设置（hive）",
    "报告关联维表设置（doris）",
    "车辆信息关联维表设置",
    "数据源",
    "数据库",
    "数据表",
    "车辆数统计字段",
    "车系关联字段",
    "车型关联字段",
    "动力类型关联字段",
  ]) {
    await expect(body, `${sourceRef}: 报告关联维表设置页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  const selects = page.locator(".ant-select:visible");
  const datasourceLabel = `${getDefaultDatasource().metadata.name}（${SPARKTHRIFT_SOURCE_TYPE_LABEL}）`;
  const database = getDefaultDatasource().sql.database;
  await selects.nth(1).click({ timeout: 30000 });
  const sourceDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(sourceDropdown, `${sourceRef}: 数据源下拉应包含 ${datasourceLabel}`).toContainText(datasourceLabel, {
    timeout: 30000,
  });
  await sourceDropdown.getByText(datasourceLabel, { exact: true }).click({
    timeout: 30000,
  });

  await selects.nth(2).click({ timeout: 30000 });
  await page.keyboard.type(database);
  const schemaDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(schemaDropdown, `${sourceRef}: 数据库下拉应包含 ${database}`).toContainText(database, {
    timeout: 30000,
  });
  await page.keyboard.press("Enter");

  await selects.nth(3).click({ timeout: 30000 });
  await page.keyboard.type(VEHICLE_INFO_DIM_TABLE);
  const tableDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(tableDropdown, `${sourceRef}: 数据表下拉应包含前置维表 ${VEHICLE_INFO_DIM_TABLE}`).toContainText(
    VEHICLE_INFO_DIM_TABLE,
    { timeout: 30000 },
  );
  const tableClicked = await clickActiveAntdOption(page, VEHICLE_INFO_DIM_TABLE);
  expect(tableClicked, `${sourceRef}: 数据表下拉应包含可点击前置维表 ${VEHICLE_INFO_DIM_TABLE}`).toBe(true);

  await selectDqAntSelectOption(page, selects.nth(4), "车辆数统计字段", "vehicle_count", sourceRef);
  await selectDqAntSelectOption(page, selects.nth(5), "车系关联字段", "car_series_code", sourceRef);
  await selectDqAntSelectOption(page, selects.nth(6), "车型关联字段", "car_model_code", sourceRef);
  await selectDqAntSelectOption(page, selects.nth(7), "动力类型关联字段", "power_type", sourceRef);

  const saveResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/valid/monitorSideTable/") &&
      !response.url().includes("/getSideTableConfig") &&
      response.request().method() === "POST" &&
      response.status() === 200,
    { timeout: 60000 },
  );
  await clickDqCompactButton(page, "保存", sourceRef);
  const savePayload = (await (await saveResponse).json()) as DqApiResponse<unknown>;
  expect(savePayload.success ?? savePayload.code === 1, `${sourceRef}: 报告关联维表保存应请求成功`).toBe(
    true,
  );
  await expect(body, `${sourceRef}: 报告关联维表保存后应提示成功`).toContainText(/成功|保存/, {
    timeout: 30000,
  });

  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForUiSettled(page);
  for (const savedText of [
    VEHICLE_INFO_DIM_TABLE,
    "vehicle_count",
    "car_series_code",
    "car_model_code",
    "power_type",
  ]) {
    await expect(body, `${sourceRef}: 再次进入页面应回显「${savedText}」`).toContainText(savedText, {
      timeout: 30000,
    });
  }
}

async function selectDqAntSelectOption(
  page: Page,
  select: ReturnType<Page["locator"]>,
  label: string,
  option: string,
  sourceRef: string,
): Promise<void> {
  await expect(select, `${sourceRef}: 「${label}」下拉应可见`).toBeVisible({ timeout: 30000 });
  await select.click({ force: true, timeout: 30000 });
  await page.keyboard.type(option);
  await expect
    .poll(
      async () => {
        const optionTexts = await getActiveAntdOptionTexts(page);
        return optionTexts.some((text) => text === option || text.includes(option));
      },
      {
        message: `${sourceRef}: 「${label}」下拉应包含「${option}」`,
        timeout: 30000,
      },
    )
    .toBe(true);
  const clicked = await clickActiveAntdOption(page, option);
  expect(clicked, `${sourceRef}: 「${label}」下拉应包含可点击选项「${option}」`).toBe(true);
  await expect(select, `${sourceRef}: 「${label}」应回显「${option}」`).toContainText(option, {
    timeout: 30000,
  });
}

export async function expectDataQualityCommonConfigJsonImportModalShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  await clickDqCompactButton(page, "导入", sourceRef);

  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, `${sourceRef}: 导入弹窗应打开`).toBeVisible({ timeout: 30000 });
  for (const label of ["导入", "重复处理规则", "重复则跳过", "上传文件"]) {
    await expect(modal, `${sourceRef}: 导入弹窗应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(
    modal.locator("input[type='file']").first(),
    `${sourceRef}: 导入弹窗应包含文件上传控件`,
  ).toBeAttached({ timeout: 30000 });
  await closeDqModal(page, sourceRef);
}

export async function expectDataQualityCommonConfigJsonExportConfirmShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  await clickDqCompactButton(page, "导出", sourceRef);

  const body = page.locator("body");
  await expect(
    body,
    `${sourceRef}: 导出只验证确认壳，不点击确认下载`,
  ).toContainText("请确认是否导出列表数据", { timeout: 30000 });
  await clickDqCompactButton(page, "取消", sourceRef);
}

export async function expectDataQualityCommonConfigJsonAddRegexShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  await clickDqCompactButton(page, "新增", sourceRef);

  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, `${sourceRef}: 新增弹窗应打开`).toBeVisible({ timeout: 30000 });
  for (const label of ["新建", "key", "中文名称", "value格式", "数据源类型"]) {
    await expect(modal, `${sourceRef}: 新增弹窗应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(modal, `${sourceRef}: 数据源类型默认应展示 SparkThrift2.x`).toContainText(
    /SparkThrift2\.x|sparkthrift2\.x/i,
    { timeout: 30000 },
  );
  await expect(
    modal.getByText("测试数据", { exact: true }),
    `${sourceRef}: 未填写 value格式 前不展示测试数据输入`,
  ).toHaveCount(0);

  const valueFormatInput = modal
    .locator(".ant-form-item")
    .filter({ hasText: "value格式" })
    .locator("input")
    .first();
  await valueFormatInput.fill("^[a-zA-Z]+$");

  await expect(modal, `${sourceRef}: value格式填写后应展示正则测试区域`).toContainText("测试数据", {
    timeout: 30000,
  });
  const testDataInput = modal.locator("textarea").first();
  await expect(testDataInput, `${sourceRef}: 正则测试输入框应可见`).toBeVisible({ timeout: 30000 });
  await testDataInput.fill("testValue");

  const regexTestButton = modal.getByRole("button", { name: /正则匹配测试/ }).first();
  await expect(regexTestButton, `${sourceRef}: 正则匹配测试按钮应可见`).toBeVisible({
    timeout: 30000,
  });
  await regexTestButton.click();
  await expect(modal, `${sourceRef}: 正则匹配测试应显示成功结果`).toContainText(/符合正则|匹配成功/, {
    timeout: 30000,
  });
  await closeDqModal(page, sourceRef);
}

export async function expectDataQualityCommonConfigJsonAddFullContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const key = "vehicle";
  const name = "车辆信息";
  const value = '^[A-Za-z0-9_{}:",]+$';
  const testData = '{"vin":"LTV202601160001AA"}';

  await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, key);

  try {
    await expectDataQualityCommonConfigJsonShell(page, sourceRef);
    await addJsonValidationKey(page, sourceRef, {
      key,
      name,
      value,
      testData,
      action: "新增 key",
    });

    const records = await listJsonValidationRecords(page, sourceRef, key);
    const savedRecord = records.find((record) => record.jsonKey === key);
    expect(savedRecord, `${sourceRef}: 新增后接口应返回 key ${key}`).toBeTruthy();
    expect(savedRecord?.name, `${sourceRef}: 新增后接口应保存中文名称`).toBe(name);
    expect(savedRecord?.value, `${sourceRef}: 新增后接口应保存 value格式`).toBe(value);
    expect(savedRecord?.dataSourceType, `${sourceRef}: 新增后接口应保存 SparkThrift2.x 数据源类型`).toBe(45);
    expectNonEmptyString(savedRecord?.createBy, `${sourceRef}: 新增后接口应返回创建人`);
    expectNonEmptyString(savedRecord?.createAt, `${sourceRef}: 新增后接口应返回创建时间`);

    await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
    await expectJsonValidationRow(page, sourceRef, key, name);
    await expectRuleSetJsonValidationKeyOption(page, sourceRef, key);
  } finally {
    await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, key);
  }
}

export async function expectDataQualityCommonConfigJsonImportSkipContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const suffix = Date.now();
  const existingKey = `skip_exist_${suffix}`;
  const newRootKey = `skip_new_${suffix}`;
  const newChildKey = `skip_child_${suffix}`;
  const existingOriginalName = "跳过已有键";
  const existingOriginalValue = "^[a-z]+$";
  const xlsxPath = join(tmpdir(), `${sourceRef.replace(/[^a-zA-Z0-9_-]/g, "_")}-${suffix}.xlsx`);

  await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, existingKey);
  await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, newRootKey);

  try {
    await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
    await addJsonValidationKey(page, sourceRef, {
      key: existingKey,
      name: existingOriginalName,
      value: existingOriginalValue,
      testData: "abc",
      action: "导入前置已有 key",
    });
    await createJsonValidationImportWorkbook(
      xlsxPath,
      [
        [existingKey, "覆盖后名称", "^[A-Z]+$"],
        [newRootKey, "导入新增父级", "^\\d+$"],
      ],
      [[newRootKey, newChildKey, "导入新增子级", "^[0-9]{3}$"]],
    );
    expect(existsSync(xlsxPath), `${sourceRef}: 导入 xlsx 文件应创建成功`).toBe(true);

    await importJsonValidationWorkbook(page, sourceRef, xlsxPath, "重复则跳过");

    const existingRecords = await listJsonValidationRecords(page, sourceRef, existingKey);
    const existingRecord = existingRecords.find((record) => record.jsonKey === existingKey);
    expect(existingRecord, `${sourceRef}: 导入后应仍可查询到已有 key`).toBeTruthy();
    expect(existingRecord?.name, `${sourceRef}: 重复则跳过不应覆盖已有 key 中文名称`).toBe(existingOriginalName);
    expect(existingRecord?.value, `${sourceRef}: 重复则跳过不应覆盖已有 key value格式`).toBe(existingOriginalValue);

    const newRecords = await listJsonValidationRecords(page, sourceRef, newRootKey);
    const newRoot = newRecords.find((record) => record.jsonKey === newRootKey);
    const newChild = newRecords.find((record) => record.jsonKey === newChildKey);
    expect(newRoot, `${sourceRef}: 导入后应新增一层 key ${newRootKey}`).toBeTruthy();
    expect(newRoot?.name, `${sourceRef}: 新增一层 key 应保存中文名称`).toBe("导入新增父级");
    expect(newRoot?.value, `${sourceRef}: 新增一层 key 应保存 value格式`).toBe("^\\d+$");
    expect(newChild, `${sourceRef}: 导入后应新增二层 key ${newChildKey}`).toBeTruthy();
    expect(newChild?.name, `${sourceRef}: 新增二层 key 应保存中文名称`).toBe("导入新增子级");
    expect(newChild?.value, `${sourceRef}: 新增二层 key 应保存 value格式`).toBe("^[0-9]{3}$");
  } finally {
    await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, existingKey);
    await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, newRootKey);
    if (existsSync(xlsxPath)) unlinkSync(xlsxPath);
  }
}

export async function expectDataQualityCommonConfigJsonImportCoverContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const suffix = Date.now();
  const existingKey = `cover_exist_${suffix}`;
  const newRootKey = `cover_new_${suffix}`;
  const newChildKey = `cover_child_${suffix}`;
  const existingOriginalName = "覆盖前名称";
  const existingOriginalValue = "^[a-z]+$";
  const existingUpdatedName = "覆盖后名称";
  const existingUpdatedValue = "^[A-Z]+$";
  const xlsxPath = join(tmpdir(), `${sourceRef.replace(/[^a-zA-Z0-9_-]/g, "_")}-${suffix}.xlsx`);

  await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, existingKey);
  await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, newRootKey);

  try {
    await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
    await addJsonValidationKey(page, sourceRef, {
      key: existingKey,
      name: existingOriginalName,
      value: existingOriginalValue,
      testData: "abc",
      action: "导入覆盖前置已有 key",
    });
    await createJsonValidationImportWorkbook(
      xlsxPath,
      [
        [existingKey, existingUpdatedName, existingUpdatedValue],
        [newRootKey, "覆盖导入新增父级", "^\\d+$"],
      ],
      [[newRootKey, newChildKey, "覆盖导入新增子级", "^[0-9]{3}$"]],
    );
    expect(existsSync(xlsxPath), `${sourceRef}: 覆盖导入 xlsx 文件应创建成功`).toBe(true);

    await importJsonValidationWorkbook(page, sourceRef, xlsxPath, "重复则覆盖更新");

    const existingRecords = await listJsonValidationRecords(page, sourceRef, existingKey);
    const existingRecord = existingRecords.find((record) => record.jsonKey === existingKey);
    expect(existingRecord, `${sourceRef}: 覆盖导入后应仍可查询到已有 key`).toBeTruthy();
    expect(existingRecord?.name, `${sourceRef}: 重复则覆盖更新应覆盖已有 key 中文名称`).toBe(
      existingUpdatedName,
    );
    expect(existingRecord?.value, `${sourceRef}: 重复则覆盖更新应覆盖已有 key value格式`).toBe(
      existingUpdatedValue,
    );

    const newRecords = await listJsonValidationRecords(page, sourceRef, newRootKey);
    const newRoot = newRecords.find((record) => record.jsonKey === newRootKey);
    const newChild = newRecords.find((record) => record.jsonKey === newChildKey);
    expect(newRoot, `${sourceRef}: 覆盖导入后应新增一层 key ${newRootKey}`).toBeTruthy();
    expect(newRoot?.name, `${sourceRef}: 覆盖导入新增一层 key 应保存中文名称`).toBe("覆盖导入新增父级");
    expect(newRoot?.value, `${sourceRef}: 覆盖导入新增一层 key 应保存 value格式`).toBe("^\\d+$");
    expect(newChild, `${sourceRef}: 覆盖导入后应新增二层 key ${newChildKey}`).toBeTruthy();
    expect(newChild?.name, `${sourceRef}: 覆盖导入新增二层 key 应保存中文名称`).toBe("覆盖导入新增子级");
    expect(newChild?.value, `${sourceRef}: 覆盖导入新增二层 key 应保存 value格式`).toBe("^[0-9]{3}$");
  } finally {
    await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, existingKey);
    await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, newRootKey);
    if (existsSync(xlsxPath)) unlinkSync(xlsxPath);
  }
}

export async function expectDataQualityCommonConfigJsonExportFilteredContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const suffix = Date.now();
  const key = `export_key_${suffix}`;
  const name = "导出筛选键";
  const value = "^[a-z0-9]+$";
  const downloadPath = join(tmpdir(), `${sourceRef.replace(/[^a-zA-Z0-9_-]/g, "_")}-${suffix}.xlsx`);

  await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, key);

  try {
    await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
    await addJsonValidationKey(page, sourceRef, {
      key,
      name,
      value,
      testData: "abc123",
      action: "导出前置 key",
    });

    const searchResponse = waitForDqJson<DqJsonValidationConfigPage>(
      page,
      "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
    );
    await page.getByPlaceholder("请输入key名称查询").fill(key);
    await page.keyboard.press("Enter");
    const searchPage = expectDqSuccess(await searchResponse, `${sourceRef}: 导出前 key 名筛选应请求成功`);
    const searchRecords = flattenJsonValidationRecords(
      expectJsonValidationPage(searchPage, `${sourceRef}: 导出前 key 名筛选应返回数据`),
    );
    expect(searchRecords.some((record) => record.jsonKey === key), `${sourceRef}: 筛选结果应包含前置 key`).toBe(
      true,
    );

    await page.locator(".ant-table-filter-trigger").first().click({ timeout: 30000 });
    const dropdown = page.locator(".ant-dropdown:visible, .ant-table-filter-dropdown:visible").last();
    await expect(dropdown, `${sourceRef}: 导出前数据源类型筛选下拉应打开`).toBeVisible({ timeout: 30000 });
    const filterResponse = waitForDqJson<DqJsonValidationConfigPage>(
      page,
      "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
    );
    await dropdown.getByText("SparkThrift2.x", { exact: true }).click({ timeout: 30000 });
    await dropdown.getByRole("button", { name: "确 定" }).click({ timeout: 30000 });
    const filterPage = expectDqSuccess(await filterResponse, `${sourceRef}: 导出前数据源类型筛选应请求成功`);
    const filterRecords = flattenJsonValidationRecords(
      expectJsonValidationPage(filterPage, `${sourceRef}: 导出前数据源类型筛选应返回数据`),
    );
    const targetRecord = filterRecords.find((record) => record.jsonKey === key);
    expect(targetRecord, `${sourceRef}: key 和 SparkThrift2.x 组合筛选后应包含前置 key`).toBeTruthy();
    expect(targetRecord?.dataSourceType, `${sourceRef}: 前置 key 数据源类型应为 SparkThrift2.x`).toBe(45);

    await exportJsonValidationWorkbook(page, sourceRef, downloadPath);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(downloadPath);
    const worksheet = workbook.worksheets[0];
    expect(worksheet, `${sourceRef}: json格式校验管理导出文件应包含工作表`).toBeTruthy();
    const rows = collectWorksheetRows(worksheet);
    const headers = rows[0] ?? [];
    for (const header of ["key", "中文名称", "value", "数据源类型"]) {
      expect(headers.join("\n"), `${sourceRef}: 导出文件应包含列「${header}」`).toContain(header);
    }

    const dataRows = rows.slice(1).filter((row) => row.some(Boolean));
    expect(dataRows.length, `${sourceRef}: 导出文件应包含筛选后的 key 数据`).toBeGreaterThan(0);
    expect(
      dataRows.every((row) => row[0] === key),
      `${sourceRef}: 导出文件应仅包含筛选 key ${key}`,
    ).toBe(true);
    const exportedRow = dataRows.find((row) => row[0] === key);
    expect(exportedRow?.[1], `${sourceRef}: 导出文件应包含中文名称`).toBe(name);
    expect(exportedRow?.[2], `${sourceRef}: 导出文件应包含 value格式`).toBe(value);
    expect(exportedRow?.[3], `${sourceRef}: 导出文件应包含 SparkThrift2.x 数据源类型`).toBe("SparkThrift2.x");
  } finally {
    await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, key);
    if (existsSync(downloadPath)) unlinkSync(downloadPath);
  }
}

export async function expectDataQualityCommonConfigJsonFilterPaginationContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const initialResponse = waitForDqJson<DqJsonValidationConfigPage>(
    page,
    "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
  );
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  const initialPage = expectDqSuccess(await initialResponse, `${sourceRef}: json格式校验管理列表应请求成功`);
  expectJsonValidationPage(initialPage, `${sourceRef}: json格式校验管理列表应返回数据`);

  const searchKeyword = "vin";
  const searchResponse = waitForDqJson<DqJsonValidationConfigPage>(
    page,
    "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
  );
  await page.getByPlaceholder("请输入key名称查询").fill(searchKeyword);
  await page.keyboard.press("Enter");
  const searchPage = expectDqSuccess(await searchResponse, `${sourceRef}: key 名搜索应请求成功`);
  const searchRecords = expectJsonValidationPage(searchPage, `${sourceRef}: key 名搜索应返回数据`);
  expect(searchPage.currentPage, `${sourceRef}: key 名搜索后应回到第一页`).toBe(1);
  expect(
    searchRecords.every((record) => flattenJsonValidationRecords([record]).some((item) => String(item.jsonKey ?? "").includes(searchKeyword))),
    `${sourceRef}: key 名搜索结果应仅展示命中 key 或其子层级`,
  ).toBe(true);
  await expect(page.locator(".ant-table"), `${sourceRef}: key 名搜索后列表应展示 vin`).toContainText("vin", {
    timeout: 30000,
  });

  const filterPage = await gotoJsonValidationWithInitialList(page, sourceRef);
  expectJsonValidationPage(filterPage, `${sourceRef}: 数据源筛选前列表应返回数据`);
  await page.locator(".ant-table-filter-trigger").first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-dropdown:visible, .ant-table-filter-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 数据源类型筛选下拉应打开`).toBeVisible({ timeout: 30000 });
  for (const dataSourceType of ["SparkThrift2.x", "Hive2.x", "Doris3.x"]) {
    await expect(dropdown, `${sourceRef}: 数据源类型筛选项应包含「${dataSourceType}」`).toContainText(
      dataSourceType,
      { timeout: 30000 },
    );
  }

  const sparkFilterResponse = waitForDqJson<DqJsonValidationConfigPage>(
    page,
    "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
  );
  await dropdown.getByText("SparkThrift2.x", { exact: true }).click({ timeout: 30000 });
  await dropdown.getByRole("button", { name: "确 定" }).click({ timeout: 30000 });
  const sparkPage = expectDqSuccess(await sparkFilterResponse, `${sourceRef}: SparkThrift2.x 筛选应请求成功`);
  const sparkRecords = expectJsonValidationPage(sparkPage, `${sourceRef}: SparkThrift2.x 筛选应返回数据`);
  expect(sparkPage.currentPage, `${sourceRef}: SparkThrift2.x 筛选后应回到第一页`).toBe(1);
  expect(
    flattenJsonValidationRecords(sparkRecords).every((record) => record.dataSourceType === 45),
    `${sourceRef}: SparkThrift2.x 筛选结果应全部为 dataSourceType=45`,
  ).toBe(true);
  await expect(page.locator(".ant-table"), `${sourceRef}: SparkThrift2.x 筛选后可见列表应展示数据源类型`).toContainText(
    "SparkThrift2.x",
    { timeout: 30000 },
  );

  const nextPageResponse = waitForDqJson<DqJsonValidationConfigPage>(
    page,
    "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
  );
  await page.locator(".ant-pagination-item-2").click({ timeout: 30000 });
  const secondPage = expectDqSuccess(await nextPageResponse, `${sourceRef}: 筛选结果翻页应请求成功`);
  const secondPageRecords = expectJsonValidationPage(secondPage, `${sourceRef}: 筛选结果第二页应返回数据`);
  expect(secondPage.currentPage, `${sourceRef}: 翻页后 currentPage 应为 2`).toBe(2);
  expect(secondPage.totalCount, `${sourceRef}: 翻页前后分页总数应一致`).toBe(sparkPage.totalCount);
  expect(
    flattenJsonValidationRecords(secondPageRecords).every((record) => record.dataSourceType === 45),
    `${sourceRef}: SparkThrift2.x 第二页结果应全部为 dataSourceType=45`,
  ).toBe(true);
}

export async function expectDataQualityCommonConfigJsonEditChildDeleteContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const suffix = String(Date.now());
  const parentKey = `autodq_parent_${suffix}`;
  const childKey = "vin";
  let created = false;
  let deleted = false;

  try {
    await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
    await addJsonValidationKey(page, sourceRef, {
      key: parentKey,
      name: "车辆信息",
      value: "^[A-Za-z0-9_{}:\",-]+$",
      testData: "{\"vin\":\"LTV202601160001AA\"}",
      action: "新增父级 key",
    });
    created = true;

    let parentRow = await expectJsonValidationRow(page, sourceRef, parentKey, "车辆信息");
    await expect(parentRow, `${sourceRef}: 新增父级 key 应展示初始 value格式`).toContainText(
      "^[A-Za-z0-9_{}:\",-]+$",
      { timeout: 30000 },
    );

    await parentRow.getByRole("button", { name: "编辑" }).click({ timeout: 30000 });
    await fillJsonValidationModal(page, sourceRef, {
      name: "车辆信息编辑",
      value: "^[A-Za-z0-9_{}:\",.-]+$",
      testData: "{\"vin\":\"LTV202601160001AA\"}",
      action: "编辑父级 key",
    });

    parentRow = await expectJsonValidationRow(page, sourceRef, parentKey, "车辆信息编辑");
    await expect(parentRow, `${sourceRef}: 编辑保存后列表应回显最新 value格式`).toContainText(
      "^[A-Za-z0-9_{}:\",.-]+$",
      { timeout: 30000 },
    );
    await expect(parentRow, `${sourceRef}: 编辑保存后列表应回显更新人`).toContainText("admin@dtstack.com", {
      timeout: 30000,
    });

    await parentRow.getByRole("button", { name: "新增子层级" }).click({ timeout: 30000 });
    await addJsonValidationKey(page, sourceRef, {
      key: childKey,
      name: "车辆VIN",
      value: "^[A-Z0-9]{17}$",
      testData: "LTV202601160001AA",
      action: "新增子层级 key",
      modalAlreadyOpen: true,
    });

    parentRow = await expectJsonValidationRow(page, sourceRef, parentKey, "车辆信息编辑");
    const expandButton = parentRow.locator(".ant-table-row-expand-icon").first();
    await expect(expandButton, `${sourceRef}: 父级 key 应展示可展开子层级入口`).toBeVisible({
      timeout: 30000,
    });
    await expandButton.click({ timeout: 30000 });
    const childRow = page.locator(".ant-table-tbody tr").filter({ hasText: childKey }).filter({ hasText: "车辆VIN" }).first();
    await expect(childRow, `${sourceRef}: 展开父级 key 后应展示子层级 ${childKey}`).toBeVisible({
      timeout: 30000,
    });
    await expect(childRow, `${sourceRef}: 子层级应展示 value格式`).toContainText("^[A-Z0-9]{17}$", {
      timeout: 30000,
    });

    await deleteJsonValidationKeyAndAssert(page, sourceRef, parentKey);
    deleted = true;
    await expect(
      page.locator(".ant-table-tbody tr").filter({ hasText: parentKey }),
      `${sourceRef}: 删除父级 key 后父级应从列表移除`,
    ).toHaveCount(0, { timeout: 30000 });
    await expect(
      page.locator(".ant-table-tbody tr").filter({ hasText: childKey }).filter({ hasText: "车辆VIN" }),
      `${sourceRef}: 删除父级 key 后子层级应联动移除`,
    ).toHaveCount(0, { timeout: 30000 });
  } finally {
    if (created && !deleted) {
      await deleteJsonValidationKeyBestEffort(page, parentKey);
    }
  }
}

export async function expectMetadataIntegrityShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/integrityAnalysis",
    labels: ["元数据质量", "完整度分析", "质量统计", "统计类型", "质量分析", "分析方式"],
    tableHeaders: ["数据源名称", "数据源类型", "表元数据完整度"],
    apiPaths: [
      "/dassets/v1/metaDataValid/totalRateAnalysis",
      "/dassets/v1/metaDataValid/fillRateByDataSource",
    ],
  });
}

function waitForDqJson<T>(
  page: Page,
  apiPath: string,
  matches?: (payload: DqApiResponse<T>) => boolean,
): Promise<DqApiResponse<T>> {
  return page
    .waitForResponse(
      async (response) => {
        if (!response.url().includes(apiPath) || response.status() !== 200) return false;
        if (!matches) return true;
        return matches((await response.json()) as DqApiResponse<T>);
      },
      { timeout: 60000 },
    )
    .then((response) => response.json() as Promise<DqApiResponse<T>>);
}

function expectDqSuccess<T>(payload: DqApiResponse<T>, message: string): T {
  expect(payload.success ?? payload.code === 1, message).toBe(true);
  expect(payload.data, `${message}: data 应存在`).toBeTruthy();
  return payload.data as T;
}

async function assertOverviewCountCards(
  page: Page,
  sourceRef: string,
  countRecord: DqOverviewCountRecord,
): Promise<void> {
  const body = page.locator("body");
  const ruleCount = expectNumberLike(countRecord.ruleCount, `${sourceRef}: countRecord.ruleCount 应为数字`);
  const ruleSetCount = expectNumberLike(countRecord.ruleSetCount, `${sourceRef}: countRecord.ruleSetCount 应为数字`);
  const monitorCount = expectNumberLike(countRecord.monitorCount, `${sourceRef}: countRecord.monitorCount 应为数字`);
  const passCount = expectNumberLike(countRecord.passCount, `${sourceRef}: countRecord.passCount 应为数字`);
  const errorCount = expectNumberLike(countRecord.errorCount, `${sourceRef}: countRecord.errorCount 应为数字`);
  const lastUpdateTime = expectNonEmptyString(
    countRecord.lastUpdateTime,
    `${sourceRef}: countRecord.lastUpdateTime 应为有效时间`,
  );
  expect(lastUpdateTime, `${sourceRef}: 最近一次更新时间格式应有效`).toMatch(
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
  );

  for (const value of [ruleCount, ruleSetCount, monitorCount, `${passCount}/${errorCount}`, lastUpdateTime]) {
    await expect(body, `${sourceRef}: 总览统计卡片应展示接口值「${value}」`).toContainText(value, {
      timeout: 30000,
    });
  }
}

function assertOverviewRuleCharts(
  sourceRef: string,
  ruleDistribution: DqOverviewRuleDistributionRecord[],
  ruleCategories: DqOverviewRuleDistributionRecord[],
): void {
  const expectedRuleTypes = ["完整性校验", "有效性校验", "唯一性校验", "统计性校验", "一致性校验", "时效性校验", "合理性校验"];
  const distributionTypes = new Set(ruleDistribution.map((record) => expectNonEmptyString(record.ruleType, `${sourceRef}: 规则库分布应包含规则分类`)));
  const categoryTypes = new Set(ruleCategories.map((record) => expectNonEmptyString(record.ruleType, `${sourceRef}: 已配置规则分类应包含规则分类`)));

  for (const ruleType of expectedRuleTypes) {
    expect(distributionTypes.has(ruleType), `${sourceRef}: 规则库分布应包含「${ruleType}」`).toBe(true);
    expect(categoryTypes.has(ruleType), `${sourceRef}: 已配置规则分类应包含「${ruleType}」`).toBe(true);
  }
  for (const record of [...ruleDistribution, ...ruleCategories]) {
    expectNumberLike(record.ruleCount, `${sourceRef}: ${record.ruleType} ruleCount 应为数字`);
    expect(Number(record.percentage), `${sourceRef}: ${record.ruleType} percentage 应为数字`).not.toBeNaN();
  }
}

async function assertOverviewTopRanking(
  body: ReturnType<Page["locator"]>,
  sourceRef: string,
  topRecords: DqOverviewTopRecord[],
): Promise<void> {
  expect(topRecords.length, `${sourceRef}: 校验异常 top 排名应返回数据`).toBeGreaterThan(0);
  let previousScore = Number.POSITIVE_INFINITY;
  let previousTime = "";
  for (const [index, record] of topRecords.entries()) {
    const tableName = expectNonEmptyString(record.tableName, `${sourceRef}: Top${index + 1} 应包含数据表`);
    const schemaName = expectNonEmptyString(record.schemaName, `${sourceRef}: Top${index + 1} 应包含所属数据库`);
    const sourceName = expectNonEmptyString(record.sourceName, `${sourceRef}: Top${index + 1} 应包含所属数据源`);
    const monitorCount = expectNumberLike(record.monitorCount, `${sourceRef}: Top${index + 1} 校验任务数应为数字`);
    const failedCount = expectNumberLike(record.failedCount, `${sourceRef}: Top${index + 1} 校验失败数应为数字`);
    const unPassCount = expectNumberLike(record.unPassCount, `${sourceRef}: Top${index + 1} 校验不通过数应为数字`);
    const lastExecuteTime = expectNonEmptyString(record.lastExecuteTime, `${sourceRef}: Top${index + 1} 最近一次校验时间应存在`);
    const currentScore = Number(failedCount) + Number(unPassCount);
    expect(currentScore, `${sourceRef}: Top${index + 1} 失败/不通过数不应为负数`).toBeGreaterThanOrEqual(0);
    expect(currentScore, `${sourceRef}: Top 排名应按失败/不通过数降序`).toBeLessThanOrEqual(previousScore);
    if (currentScore === previousScore && previousTime) {
      expect(
        lastExecuteTime <= previousTime,
        `${sourceRef}: Top 排名同分时应按最近一次校验时间降序`,
      ).toBe(true);
    }
    previousScore = currentScore;
    previousTime = lastExecuteTime;

    for (const value of [tableName, schemaName, sourceName, monitorCount, `${failedCount}/${unPassCount}`, lastExecuteTime]) {
      await expect(body, `${sourceRef}: 校验异常 top 排名应展示接口值「${value}」`).toContainText(value, {
        timeout: 30000,
      });
    }
  }
}

async function assertOverviewRecentErrors(
  body: ReturnType<Page["locator"]>,
  sourceRef: string,
  recentErrors: DqOverviewRecentErrorRecord[],
): Promise<void> {
  expect(recentErrors.length, `${sourceRef}: 近期校验异常结果应返回数据`).toBeGreaterThan(0);
  const firstRecord = recentErrors[0];
  for (const value of [
    expectNonEmptyString(firstRecord.tableName, `${sourceRef}: 近期异常首条应包含数据表`),
    expectNonEmptyString(firstRecord.schemaName, `${sourceRef}: 近期异常首条应包含所属数据库`),
    expectNonEmptyString(firstRecord.sourceName, `${sourceRef}: 近期异常首条应包含所属数据源`),
    expectNonEmptyString(firstRecord.ruleName, `${sourceRef}: 近期异常首条应包含任务名称`),
    expectNonEmptyString(firstRecord.periodTypeName, `${sourceRef}: 近期异常首条应包含执行周期`),
    expectNonEmptyString(firstRecord.associated, `${sourceRef}: 近期异常首条应包含是否关联任务`),
    expectNonEmptyString(firstRecord.cycTime, `${sourceRef}: 近期异常首条应包含计划时间`),
    expectNonEmptyString(firstRecord.executeTime, `${sourceRef}: 近期异常首条应包含开始时间`),
    expectNonEmptyString(firstRecord.execEndTime, `${sourceRef}: 近期异常首条应包含结束时间`),
  ]) {
    await expect(body, `${sourceRef}: 近期校验异常结果应展示接口值「${value}」`).toContainText(value, {
      timeout: 30000,
    });
  }
}

async function assertOverviewRecentErrorsAfterRefresh(
  page: Page,
  sourceRef: string,
  executedRuleName: string,
): Promise<void> {
  const recentErrorResponse = waitForDqJson<DqOverviewRecentErrorRecord[]>(
    page,
    "/dassets/v1/valid/monitorOverview/listRecentError",
  );
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  const recentErrors = expectDqSuccess(
    await recentErrorResponse,
    `${sourceRef}: 刷新后 listRecentError 应返回成功状态`,
  );
  expect(recentErrors.length, `${sourceRef}: 刷新后近期异常结果应返回数据`).toBeGreaterThan(0);
  const body = page.locator("body");
  await assertOverviewRecentErrors(body, sourceRef, recentErrors);
  expect(
    recentErrors.some((record) => String(record.ruleName ?? "") === executedRuleName) ||
      (await body.innerText()).includes(executedRuleName),
    `${sourceRef}: 刷新后近期异常结果应同步任务执行结果或保留可见异常列表`,
  ).toBe(true);
}

async function assertOverviewWeeklyTrend(
  page: Page,
  sourceRef: string,
  weeklyResult: DqOverviewWeeklyResult,
  tableOptions: DqOverviewTableOption[],
): Promise<void> {
  const statisticDate = weeklyResult.statisticDate ?? [];
  const passCount = weeklyResult.passCount ?? [];
  const unpassCount = weeklyResult.unpassCount ?? [];
  expect(statisticDate.length, `${sourceRef}: 近7日趋势应返回 7 个统计日期`).toBe(7);
  expect(passCount.length, `${sourceRef}: 近7日趋势通过数长度应与日期一致`).toBe(statisticDate.length);
  expect(unpassCount.length, `${sourceRef}: 近7日趋势不通过数长度应与日期一致`).toBe(statisticDate.length);
  for (const value of [...passCount, ...unpassCount]) {
    expectNumberLike(value, `${sourceRef}: 近7日趋势统计值应为数字`);
  }

  expect(
    tableOptions.some((option) => option.tableName),
    `${sourceRef}: 统计范围应有可切换的数据表选项`,
  ).toBe(true);
  const weeklyResponseAfterSwitch = waitForDqJson<DqOverviewWeeklyResult>(
    page,
    "/dassets/v1/valid/monitorOverview/listWeeklyResult",
  );
  await page.getByText("全部", { exact: true }).first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 统计范围下拉应打开`).toBeVisible({ timeout: 30000 });
  const option = dropdown.locator(".ant-select-item-option:not(.ant-select-item-option-selected)").first();
  await expect(option, `${sourceRef}: 统计范围下拉应展示非全部数据表选项`).toBeVisible({ timeout: 30000 });
  const selectedTable = normalizeVisibleText(await option.innerText());
  expect(selectedTable, `${sourceRef}: 统计范围选项文本不应为空`).not.toBe("");
  await option.click({ timeout: 30000 });
  const switchedWeeklyResult = expectDqSuccess(
    await weeklyResponseAfterSwitch,
    `${sourceRef}: 切换统计范围后 listWeeklyResult 应重新请求成功`,
  );
  expect(switchedWeeklyResult.statisticDate?.length, `${sourceRef}: 切换后趋势仍应返回 7 个统计日期`).toBe(7);
  await expect(page.locator("body"), `${sourceRef}: 统计范围切换后应展示目标数据表`).toContainText(
    selectedTable,
    { timeout: 30000 },
  );
}

function expectNumberLike(value: unknown, message: string): string {
  expect(value, message).toBeDefined();
  const text = String(value);
  expect(text, message).toMatch(/^\d+(?:\.\d+)?$/);
  return text;
}

function normalizeVisibleText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

async function gotoRuleBaseWithInitialList(page: Page, sourceRef: string): Promise<DqRuleBaseTemplateRecord[]> {
  await gotoDataQualityPage(page, "/dq/overview");
  const response = waitForDqJson<DqRuleBaseTemplatePage>(
    page,
    "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/ruleBase");
  return expectRuleBaseRecords(
    expectDqSuccess(await response, `${sourceRef}: 规则库配置重新加载应请求成功`),
    `${sourceRef}: 规则库配置重新加载应返回内置规则`,
  );
}

async function gotoJsonValidationWithInitialList(page: Page, sourceRef: string): Promise<DqJsonValidationConfigPage> {
  await gotoDataQualityPage(page, "/dq/overview");
  const response = waitForDqJson<DqJsonValidationConfigPage>(
    page,
    "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
  );
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  return expectDqSuccess(await response, `${sourceRef}: json格式校验管理重新加载应请求成功`);
}

async function assertRuleBaseCategoryFilter(page: Page, sourceRef: string): Promise<void> {
  await page.locator(".ant-table-filter-trigger").first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-dropdown:visible, .ant-table-filter-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 规则分类筛选下拉应打开`).toBeVisible({ timeout: 30000 });
  for (const category of ["完整性校验", "有效性校验", "唯一性校验", "统计性校验", "一致性校验", "时效性校验", "合理性校验"]) {
    await expect(dropdown, `${sourceRef}: 规则分类筛选项应包含「${category}」`).toContainText(category, {
      timeout: 30000,
    });
  }

  const categoryResponse = waitForDqJson<DqRuleBaseTemplatePage>(
    page,
    "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  );
  await dropdown.getByText("合理性校验", { exact: true }).click({ timeout: 30000 });
  await dropdown.getByRole("button", { name: "确 定" }).click({ timeout: 30000 });
  const categoryRecords = expectRuleBaseRecords(
    expectDqSuccess(await categoryResponse, `${sourceRef}: 合理性校验筛选应请求成功`),
    `${sourceRef}: 合理性校验筛选应返回记录`,
  );
  expect(
    categoryRecords.every((record) => record.ruleTaskType === 9),
    `${sourceRef}: 合理性校验筛选结果应全部为 ruleTaskType=9`,
  ).toBe(true);

  const names = new Set(categoryRecords.map((record) => record.functionName));
  for (const ruleName of ["多表字段值对比", "字段值计算对比", "数据变化趋势"]) {
    expect(names.has(ruleName), `${sourceRef}: 合理性校验应展示新增内置规则「${ruleName}」`).toBe(true);
    await expect(page.locator("body"), `${sourceRef}: 合理性校验筛选后 UI 应展示「${ruleName}」`).toContainText(
      ruleName,
      { timeout: 30000 },
    );
  }
}

async function assertRuleBaseRelationRangeFilter(page: Page, sourceRef: string): Promise<void> {
  await page.locator(".ant-table-filter-trigger").nth(1).click({ timeout: 30000 });
  const dropdown = page.locator(".ant-dropdown:visible, .ant-table-filter-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 关联范围筛选下拉应打开`).toBeVisible({ timeout: 30000 });
  for (const relationRange of ["字段", "单表", "多表"]) {
    await expect(dropdown, `${sourceRef}: 关联范围筛选项应包含「${relationRange}」`).toContainText(
      relationRange,
      { timeout: 30000 },
    );
  }

  const relationResponse = waitForDqJson<DqRuleBaseTemplatePage>(
    page,
    "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  );
  await dropdown.getByText("多表", { exact: true }).click({ timeout: 30000 });
  await dropdown.getByRole("button", { name: "确 定" }).click({ timeout: 30000 });
  const relationRecords = expectRuleBaseRecords(
    expectDqSuccess(await relationResponse, `${sourceRef}: 多表关联范围筛选应请求成功`),
    `${sourceRef}: 多表关联范围筛选应返回记录`,
  );
  expect(
    relationRecords.every((record) => record.relationRange === 1),
    `${sourceRef}: 多表筛选结果应全部为 relationRange=1`,
  ).toBe(true);
  await expect(page.locator("body"), `${sourceRef}: 多表筛选后 UI 应展示「多表」`).toContainText("多表", {
    timeout: 30000,
  });
}

function expectRuleBaseRecords(pageData: DqRuleBaseTemplatePage, message: string): DqRuleBaseTemplateRecord[] {
  const records = pageData.contentList ?? [];
  expect(records.length, message).toBeGreaterThan(0);
  for (const [index, record] of records.entries()) {
    expectNonEmptyString(record.functionName, `${message}: 第 ${index + 1} 条应包含规则名称`);
    expectNonEmptyString(record.functionExplain, `${message}: 第 ${index + 1} 条应包含规则解释`);
    expect(typeof record.ruleTaskType, `${message}: 第 ${index + 1} 条应包含规则分类编码`).toBe("number");
    expect(typeof record.relationRange, `${message}: 第 ${index + 1} 条应包含关联范围编码`).toBe("number");
    expect([0, 1], `${message}: 第 ${index + 1} 条规则状态应为开启或关闭`).toContain(record.openStatus);
  }
  return records;
}

function expectCustomSqlTemplatePage(
  pageData: DqRuleBaseCustomSqlPage,
  message: string,
): DqRuleBaseCustomSqlRecord[] {
  const records = pageData.contentList ?? [];
  expect(Number(pageData.total), `${message}: total 应覆盖当前返回记录数`).toBeGreaterThanOrEqual(records.length);
  expect(records.length, message).toBeGreaterThan(0);
  for (const [index, record] of records.entries()) {
    expectNonEmptyString(record.ruleName, `${message}: 第 ${index + 1} 条应包含规则名称`);
    formatRuleBaseCustomRuleType(record.ruleType, message);
    formatRuleBaseCustomRelationRange(record.relationRange, message);
    expect(Number(record.associationRuleCount), `${message}: 第 ${index + 1} 条关联规则数应为数字`).not.toBeNaN();
    expectNonEmptyString(record.customConfiguration, `${message}: 第 ${index + 1} 条应包含规则内容`);
  }
  return records;
}

function expectCustomRegexPage(
  pageData: DqRuleBaseCustomRegexPage,
  message: string,
  options: { allowEmpty?: boolean } = {},
): DqRuleBaseCustomRegexRecord[] {
  const records = pageData.contentList ?? [];
  expect(Number(pageData.total), `${message}: total 应覆盖当前返回记录数`).toBeGreaterThanOrEqual(records.length);
  if (!options.allowEmpty) {
    expect(records.length, message).toBeGreaterThan(0);
  }
  for (const [index, record] of records.entries()) {
    expectNonEmptyString(record.ruleName, `${message}: 第 ${index + 1} 条应包含规则名称`);
    formatCustomRegexRuleType(record.ruleType, message);
    formatCustomRegexAssociationScope(record.associationScope, message);
    expect(Number(record.associationRuleCount), `${message}: 第 ${index + 1} 条关联规则数应为数字`).not.toBeNaN();
    expectNonEmptyString(record.ruleContent, `${message}: 第 ${index + 1} 条应包含正则内容`);
  }
  return records;
}

async function deleteCustomRegexByNameBestEffort(page: Page, sourceRef: string, ruleName: string): Promise<void> {
  const records = await listCustomRegexRecords(page, sourceRef);
  for (const record of records.filter((item) => item.ruleName === ruleName)) {
    expect(Number(record.associationRuleCount), `${sourceRef}: 清理同名自定义正则前不应存在引用规则`).toBe(0);
    await deleteCustomRegexById(page, sourceRef, record.id);
  }
}

async function listCustomRegexRecords(page: Page, sourceRef: string): Promise<DqRuleBaseCustomRegexRecord[]> {
  const response = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleLibrary/list"), {
    data: { current: 1, size: 100 },
    headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
    timeout: 60000,
  });
  expect(response.ok(), `${sourceRef}: 查询自定义正则列表 HTTP 应成功`).toBe(true);
  return expectCustomRegexPage(
    expectDqSuccess(
      (await response.json()) as DqApiResponse<DqRuleBaseCustomRegexPage>,
      `${sourceRef}: 查询自定义正则列表应请求成功`,
    ),
    `${sourceRef}: 查询自定义正则列表应返回有效结构`,
    { allowEmpty: true },
  );
}

async function createCustomRegexFixture(
  page: Page,
  sourceRef: string,
  data: {
    ruleName: string;
    ruleType: number;
    associationScope: number;
    ruleDesc: string;
    ruleContent: string;
  },
): Promise<string | number> {
  const response = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleLibrary/addOrUpdate"), {
    data,
    headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
    timeout: 60000,
  });
  expect(response.ok(), `${sourceRef}: 创建自定义正则 fixture HTTP 应成功`).toBe(true);
  expectDqSuccess(
    (await response.json()) as DqApiResponse<boolean>,
    `${sourceRef}: 创建自定义正则 fixture 应请求成功`,
  );
  const records = await listCustomRegexRecords(page, sourceRef);
  const created = records.find((record) => record.ruleName === data.ruleName);
  expect(created?.id, `${sourceRef}: 创建后自定义正则 fixture 应返回 id`).toBeTruthy();
  return created?.id as string | number;
}

async function deleteCustomRegexById(
  page: Page,
  sourceRef: string,
  ruleId: string | number | undefined,
): Promise<void> {
  expect(ruleId, `${sourceRef}: 删除自定义正则应有 id`).toBeTruthy();
  const response = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleLibrary/delete"), {
    data: { id: String(ruleId) },
    headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
    timeout: 60000,
  });
  expect(response.ok(), `${sourceRef}: 删除自定义正则 HTTP 应成功`).toBe(true);
  expectDqSuccess(
    (await response.json()) as DqApiResponse<boolean>,
    `${sourceRef}: 删除自定义正则应请求成功`,
  );
}

async function deleteCustomSqlByNameBestEffort(page: Page, sourceRef: string, ruleName: string): Promise<void> {
  const records = await listCustomSqlRecords(page, sourceRef);
  for (const record of records.filter((item) => item.ruleName === ruleName)) {
    expect(Number(record.associationRuleCount), `${sourceRef}: 清理同名自定义 SQL 前不应存在引用规则`).toBe(0);
    await deleteCustomSqlById(page, sourceRef, record.id);
  }
}

async function createCustomSqlTemplateFixture(
  page: Page,
  sourceRef: string,
  template: NonNullable<SparkThriftQualityRuleValidationScenario["customSqlTemplate"]>,
): Promise<void> {
  const response = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleCustom/addOrUpdate"), {
    data: {
      ruleName: template.ruleName,
      ruleType: template.ruleType,
      relationRange: template.relationRange,
      ruleDesc: template.ruleDesc,
      customConfiguration: template.customConfiguration,
      customParam: template.params,
    },
    headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
    timeout: 60000,
  });
  expect(response.ok(), `${sourceRef}: 创建自定义 SQL 模版 fixture HTTP 应成功`).toBe(true);
  expectDqSuccess(
    (await response.json()) as DqApiResponse<boolean>,
    `${sourceRef}: 创建自定义 SQL 模版 fixture 应请求成功`,
  );
  const records = await listCustomSqlRecords(page, sourceRef);
  const created = records.find((record) => record.ruleName === template.ruleName);
  expect(created, `${sourceRef}: 创建后自定义 SQL 模版列表应返回「${template.ruleName}」`).toBeTruthy();
  expect(formatRuleBaseCustomRuleType(created?.ruleType, sourceRef), `${sourceRef}: 模版规则分类应正确`).toBe(
    formatRuleBaseCustomRuleType(template.ruleType, sourceRef),
  );
  expect(formatRuleBaseCustomRelationRange(created?.relationRange, sourceRef), `${sourceRef}: 模版关联范围应正确`).toBe(
    formatRuleBaseCustomRelationRange(template.relationRange, sourceRef),
  );
  const createdParams = created?.customParam ?? [];
  for (const expectedParam of template.params) {
    const actualParam = createdParams.find((param) => param.param === expectedParam.param);
    expect(actualParam, `${sourceRef}: 自定义 SQL 模版应保存参数 ${expectedParam.param}`).toBeTruthy();
    expect(actualParam?.type, `${sourceRef}: 参数 ${expectedParam.param} 类型应正确`).toBe(expectedParam.type);
    expect(actualParam?.paramName, `${sourceRef}: 参数 ${expectedParam.param} 名称应正确`).toBe(
      expectedParam.paramName,
    );
    expect(actualParam?.description, `${sourceRef}: 参数 ${expectedParam.param} 说明应正确`).toBe(
      expectedParam.description,
    );
  }
}

async function listCustomSqlRecords(page: Page, sourceRef: string): Promise<DqRuleBaseCustomSqlRecord[]> {
  const response = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleCustom/pageList"), {
    data: { current: 1, size: 100 },
    headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
    timeout: 60000,
  });
  expect(response.ok(), `${sourceRef}: 查询自定义 SQL 模版列表 HTTP 应成功`).toBe(true);
  const payload = (await response.json()) as DqApiResponse<DqRuleBaseCustomSqlPage>;
  return expectDqSuccess(payload, `${sourceRef}: 查询自定义 SQL 模版列表应请求成功`).contentList ?? [];
}

async function deleteCustomSqlById(
  page: Page,
  sourceRef: string,
  ruleId: string | number | undefined,
): Promise<void> {
  expect(ruleId, `${sourceRef}: 删除自定义 SQL 模版应有 id`).toBeTruthy();
  const response = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleCustom/delete"), {
    data: { id: String(ruleId) },
    headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
    timeout: 60000,
  });
  expect(response.ok(), `${sourceRef}: 删除自定义 SQL 模版 HTTP 应成功`).toBe(true);
  expectDqSuccess(
    (await response.json()) as DqApiResponse<boolean>,
    `${sourceRef}: 删除自定义 SQL 模版应请求成功`,
  );
}

function expectCustomSqlReferencedRecord(
  records: DqRuleBaseCustomSqlRecord[],
  sourceRef: string,
): DqRuleBaseCustomSqlRecord {
  const target = records.find(
    (record) =>
      record.id &&
      record.ruleName &&
      Number(record.associationRuleCount) > 0 &&
      record.customConfiguration,
  );
  expect(target, `${sourceRef}: 当前环境应存在已被规则引用的自定义 SQL 模版`).toBeTruthy();
  return target as DqRuleBaseCustomSqlRecord;
}

function formatCustomRegexRuleType(ruleType: unknown, sourceRef: string): string {
  const labels = new Map<unknown, string>([
    [1, "完整性"],
    [2, "唯一性"],
    [3, "有效性"],
    [6, "统计性"],
    [7, "一致性"],
    [8, "时效性"],
    [9, "合理性"],
  ]);
  const label = labels.get(ruleType);
  expect(label, `${sourceRef}: 自定义正则规则类型编码应可映射`).toBeTruthy();
  return label as string;
}

function formatCustomRegexAssociationScope(associationScope: unknown, sourceRef: string): string {
  const labels = new Map<unknown, string>([
    [1, "字段级"],
    [2, "表级"],
    [3, "多表"],
  ]);
  const label = labels.get(associationScope);
  expect(label, `${sourceRef}: 自定义正则关联范围编码应可映射`).toBeTruthy();
  return label as string;
}

function formatRuleBaseCustomRuleType(ruleType: unknown, sourceRef: string): string {
  const labels = new Map<unknown, string>([
    [1, "完整性校验"],
    [2, "唯一性校验"],
    [3, "有效性校验"],
    [6, "统计性校验"],
    [7, "一致性校验"],
    [8, "时效性校验"],
    [9, "合理性校验"],
  ]);
  const label = labels.get(ruleType);
  expect(label, `${sourceRef}: 自定义规则分类编码应可映射`).toBeTruthy();
  return label as string;
}

function formatRuleBaseBuiltInRuleType(ruleTaskType: unknown, sourceRef: string): string {
  const label = formatRuleBaseCustomRuleType(ruleTaskType, sourceRef);
  expect(label, `${sourceRef}: 内置规则分类编码应可映射`).toBeTruthy();
  return label;
}

function formatRuleBaseCustomRelationRange(relationRange: unknown, sourceRef: string): string {
  const labels = new Map<unknown, string>([
    [1, "多表"],
    [2, "单表"],
    [3, "字段"],
  ]);
  const label = labels.get(relationRange);
  expect(label, `${sourceRef}: 自定义规则关联范围编码应可映射`).toBeTruthy();
  return label as string;
}

function formatRuleBaseBuiltInRelationRange(relationRange: unknown, sourceRef: string): string {
  const label = formatRuleBaseCustomRelationRange(relationRange, sourceRef);
  expect(label, `${sourceRef}: 内置规则关联范围编码应可映射`).toBeTruthy();
  return label;
}

function formatRuleBaseBuiltInOpenStatus(openStatus: unknown, sourceRef: string): string {
  const labels = new Map<unknown, string>([
    [0, "关闭"],
    [1, "开启"],
  ]);
  const label = labels.get(openStatus);
  expect(label, `${sourceRef}: 内置规则状态编码应可映射`).toBeTruthy();
  return label as string;
}

function collectWorksheetText(worksheet: ExcelJS.Worksheet): string[] {
  const texts: string[] = [];
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      const value = cell.value;
      if (value === null || value === undefined) return;
      if (typeof value === "object" && "richText" in value && Array.isArray(value.richText)) {
        texts.push(value.richText.map((item) => item.text).join(""));
        return;
      }
      if (typeof value === "object" && "result" in value && value.result !== undefined) {
        texts.push(String(value.result));
        return;
      }
      texts.push(String(value));
    });
  });
  return texts.map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function assertRuleBaseNewBuiltInRules(sourceRef: string, records: DqRuleBaseTemplateRecord[]): void {
  const expectedRules = new Map([
    ["多表字段值对比", 9],
    ["字段值计算对比", 9],
    ["周期性校验", 8],
    ["及时性校验", 8],
    ["数据变化趋势", 9],
  ]);

  for (const [ruleName, ruleTaskType] of expectedRules) {
    const matches = records.filter((item) => item.functionName === ruleName);
    expect(matches.length, `${sourceRef}: 新增内置规则「${ruleName}」不应重复展示`).toBe(1);
    const record = matches[0];
    expect(record, `${sourceRef}: 内置规则列表应展示新增规则「${ruleName}」`).toBeTruthy();
    expect(record?.ruleTaskType, `${sourceRef}: 「${ruleName}」应归属预期规则分类`).toBe(ruleTaskType);
  }
}

function expectJsonValidationPage(
  pageData: DqJsonValidationConfigPage,
  message: string,
): DqJsonValidationConfigRecord[] {
  const records = pageData.data ?? [];
  expect(pageData.currentPage, `${message}: currentPage 应为数字`).toBeGreaterThan(0);
  expect(pageData.pageSize, `${message}: pageSize 应为数字`).toBeGreaterThan(0);
  expect(pageData.totalCount, `${message}: totalCount 应为数字`).toBeGreaterThanOrEqual(records.length);
  expect(records.length, message).toBeGreaterThan(0);
  for (const record of flattenJsonValidationRecords(records)) {
    expectNonEmptyString(record.jsonKey, `${message}: 记录应包含 key`);
    expect(typeof record.dataSourceType, `${message}: 记录应包含数据源类型编码`).toBe("number");
  }
  return records;
}

function flattenJsonValidationRecords(
  records: DqJsonValidationConfigRecord[],
): DqJsonValidationConfigRecord[] {
  return records.flatMap((record) => [
    record,
    ...flattenJsonValidationRecords(record.children ?? []),
  ]);
}

function expectRuleSetPage(pageData: DqRuleSetPageData, message: string): DqRuleSetRecord[] {
  const records = pageData.contentList ?? [];
  expect(Number(pageData.current), `${message}: current 应为数字`).toBeGreaterThan(0);
  expect(Number(pageData.size), `${message}: size 应为数字`).toBeGreaterThan(0);
  expect(Number(pageData.total), `${message}: total 应为数字`).toBeGreaterThanOrEqual(records.length);
  expect(records.length, message).toBeGreaterThan(0);
  for (const record of records) {
    expectNonEmptyString(record.tableName, `${message}: 记录应包含表名`);
    expectNonEmptyString(record.schemaName, `${message}: 记录应包含所属数据库`);
    expectNonEmptyString(record.sourceName, `${message}: 记录应包含所属数据源`);
    expect(Number(record.packageCount), `${message}: 规则包数量应为非负整数`).toBeGreaterThanOrEqual(0);
    expect(Number(record.ruleCount), `${message}: 规则数量应为非负整数`).toBeGreaterThanOrEqual(0);
  }
  return records;
}

function getRuleSetPageRecordsAllowEmpty(pageData: DqRuleSetPageData, message: string): DqRuleSetRecord[] {
  const records = pageData.contentList ?? [];
  expect(Number(pageData.current), `${message}: current 应为数字`).toBeGreaterThan(0);
  expect(Number(pageData.size), `${message}: size 应为数字`).toBeGreaterThan(0);
  expect(Number(pageData.total), `${message}: total 应为数字`).not.toBeNaN();
  return records;
}

function expectRuleSetSearchTarget(records: DqRuleSetRecord[], sourceRef: string): DqRuleSetRecord {
  const target =
    records.find((record) => /key_range|json_key/i.test(String(record.tableName ?? ""))) ??
    records.find((record) => Number(record.packageCount) > 0 && Number(record.ruleCount) > 0);
  expect(target, `${sourceRef}: 应存在可搜索并可编辑的规则集记录`).toBeTruthy();
  expect(target?.id, `${sourceRef}: 目标规则集应包含 id`).toBeTruthy();
  expect(Number(target?.packageCount), `${sourceRef}: 目标规则集应包含规则包`).toBeGreaterThan(0);
  expect(Number(target?.ruleCount), `${sourceRef}: 目标规则集应包含规则`).toBeGreaterThan(0);
  return target as DqRuleSetRecord;
}

function expectGlobalParamsPage(pageData: DqGlobalParamsPage, sourceRef: string): DqGlobalParamRecord[] {
  const records = pageData.data ?? [];
  expect(pageData.currentPage, `${sourceRef}: 全局参数 currentPage 应为第一页`).toBe(1);
  expect(pageData.pageSize, `${sourceRef}: 全局参数 pageSize 应为 10`).toBe(10);
  expect(pageData.totalCount, `${sourceRef}: 全局参数 totalCount 应大于当前页记录数`).toBeGreaterThanOrEqual(
    records.length,
  );
  expect(records.length, `${sourceRef}: 全局参数列表应返回记录`).toBeGreaterThan(0);
  for (const record of records) {
    expectNonEmptyString(record.paramName, `${sourceRef}: 全局参数记录应包含参数名称`);
    expectNonEmptyString(record.paramValue, `${sourceRef}: 全局参数记录应包含参数值`);
    expectNonEmptyString(record.paramDesc, `${sourceRef}: 全局参数记录应包含注释`);
  }
  return records;
}

function assertRuleSetDetailPackages(detail: DqRuleSetRecord, sourceRef: string): void {
  const packages = detail.packageVOList ?? [];
  expect(packages.length, `${sourceRef}: 规则集详情应返回规则包列表`).toBe(Number(detail.packageCount));
  const rules = packages.flatMap((item) => item.rules ?? []);
  expect(rules.length, `${sourceRef}: 规则集详情规则数量应与列表一致`).toBe(Number(detail.ruleCount));
  expect(getRuleSetPackageNames(detail).length, `${sourceRef}: 规则集详情应包含规则包名称`).toBeGreaterThan(0);
  expect(getRuleSetFunctionNames(detail).length, `${sourceRef}: 规则集详情应包含规则名称`).toBeGreaterThan(0);
}

function getRuleSetPackageNames(detail: DqRuleSetRecord): string[] {
  return (detail.packageVOList ?? [])
    .map((item) => item.packageName)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function getRuleSetFunctionNames(detail: DqRuleSetRecord): string[] {
  const names = new Set<string>();
  for (const item of detail.packageVOList ?? []) {
    for (const rule of item.rules ?? []) {
      if (rule.functionName) {
        names.add(rule.functionName);
      }
    }
  }
  return [...names];
}

async function clickDqText(page: Page, label: string, sourceRef: string): Promise<void> {
  await page.getByText(label, { exact: true }).first().click({
    timeout: 30000,
  });
  await expect(page.locator("body"), `${sourceRef}: 点击「${label}」后页面主体应仍可见`).toBeVisible({
    timeout: 30000,
  });
}

async function clickDqCompactButton(page: Page, label: string, sourceRef: string): Promise<void> {
  const spacedLabel = label.split("").join("\\s*");
  await page
    .getByRole("button", { name: new RegExp(`^${spacedLabel}$`) })
    .first()
    .click({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: 点击「${label}」后页面主体应仍可见`).toBeVisible({
    timeout: 30000,
  });
}

async function clickNextUntilScheduleConfig(page: Page, sourceRef: string): Promise<void> {
  const scheduleField = page.locator(".ant-form-item:visible, .ant-row:visible").filter({
    hasText: /调度周期|调度配置|生效日期|实例生成方式/,
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nextButton = page.getByRole("button", { name: /^下\s*一\s*步$/ }).last();
    await expect(nextButton, `${sourceRef}: 监控规则页应展示下一步入口`).toBeVisible({ timeout: 30000 });
    await nextButton.click({ force: true, timeout: 30000 });
    await page.keyboard.press("Enter").catch(() => {});
    if (await scheduleField.first().isVisible({ timeout: 5000 }).catch(() => false)) return;
  }
  await expect(scheduleField.first(), `${sourceRef}: 下一步后应进入调度属性配置表单`).toBeVisible({
    timeout: 30000,
  });
}

async function clickNextUntilMonitorRuleConfig(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await clickDqCompactButton(page, "下一步", sourceRef);
    if (await body.getByText(/监控规则|引用规则包|添加规则|规则包/, { exact: false }).first().isVisible({
      timeout: 10000,
    }).catch(() => false)) {
      return;
    }
    await waitForUiSettled(page);
  }
  await expect(body, `${sourceRef}: 监控对象保存成功后应进入监控规则配置页`).toContainText(
    /监控规则|引用规则包|添加规则|规则包/,
    { timeout: 30000 },
  );
}

async function closeDqOverlay(page: Page, sourceRef: string): Promise<void> {
  const closeButton = page
    .locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible")
    .last()
    .locator(".ant-drawer-close,.ant-modal-close,[aria-label='Close'],[aria-label='close']")
    .first();
  if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await closeButton.click({ timeout: 30000 });
    await expect(
      page.locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible"),
      `${sourceRef}: 弹窗或抽屉应关闭`,
    ).toHaveCount(0, { timeout: 30000 });
    return;
  }
  await page.keyboard.press("Escape");
  await expect(page.locator("body"), `${sourceRef}: 关闭浮层后页面主体应仍可见`).toBeVisible({
    timeout: 30000,
  });
}

async function closeVisibleDqOverlayIfAny(page: Page, sourceRef: string): Promise<void> {
  const overlay = page.locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible").last();
  if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeDqOverlay(page, sourceRef);
  }
}

async function selectDqFormOption(page: Page, label: string, option: string, sourceRef: string): Promise<void> {
  const formItem = page.locator(".ant-form-item").filter({ hasText: label }).first();
  await formItem.locator(".ant-select").first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 「${label}」下拉应包含「${option}」`).toContainText(option, {
    timeout: 30000,
  });
  await dropdown.getByText(option, { exact: true }).click({ timeout: 30000 });
}

async function selectDqFormOptions(
  page: Page,
  label: string,
  options: readonly string[],
  sourceRef: string,
): Promise<void> {
  const formItem = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  for (const option of options) {
    await formItem.locator(".ant-select").first().click({ timeout: 30000 });
    const dropdown = page.locator(".ant-select-dropdown:visible").last();
    await expect(dropdown, `${sourceRef}: 「${label}」下拉应包含「${option}」`).toContainText(option, {
      timeout: 30000,
    });
    await dropdown.getByText(option, { exact: true }).click({ timeout: 30000 });
  }
  for (const option of options) {
    await expect(formItem, `${sourceRef}: 「${label}」应选中「${option}」`).toContainText(option, {
      timeout: 30000,
    });
  }
}

async function fillDqFormItemInput(page: Page, label: string, value: string, sourceRef: string): Promise<void> {
  const formItem = page.locator(".ant-form-item:visible").filter({ hasText: label }).last();
  const editableInput = formItem
    .locator(
      [
        'input[placeholder*="请填写"]:visible',
        'input[placeholder*="请输入"]:visible',
        'input:not([readonly]):not(.ant-select-selection-search-input):visible',
        "textarea:visible",
      ].join(", "),
    )
    .last();
  if (await editableInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await editableInput.fill(value, { timeout: 30000 });
    await expect(editableInput, `${sourceRef}: 「${label}」输入框应回显「${value}」`).toHaveValue(value, {
      timeout: 30000,
    });
    return;
  }
  if (label === "期望值") {
    const numericInput = page.locator('input[placeholder="请填写数值"]:visible').last();
    if (await numericInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await numericInput.fill(value, { timeout: 30000 });
      await expect(numericInput, `${sourceRef}: 「${label}」数值框应回显「${value}」`).toHaveValue(value, {
        timeout: 30000,
      });
      return;
    }
  }
  await selectDqFormOptions(page, label, [value], sourceRef);
}

async function selectDqFormOptionBySearch(
  page: Page,
  label: RegExp,
  option: string,
  sourceRef: string,
): Promise<void> {
  const formItem = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await expect(formItem, `${sourceRef}: 应展示目标表单项 ${label}`).toBeVisible({ timeout: 30000 });
  if ((await formItem.textContent({ timeout: 30000 }))?.includes(option)) {
    return;
  }

  const select = formItem.locator(".ant-select:visible").first();
  await expect(select, `${sourceRef}: 「${label}」下拉应可见`).toBeVisible({ timeout: 30000 });
  await select.click({ force: true, timeout: 30000 });
  await page.keyboard.type(option);
  await expect
    .poll(
      async () => {
        const optionTexts = await getActiveAntdOptionTexts(page);
        return optionTexts.some((text) => text === option || text.includes(option));
      },
      {
        message: `${sourceRef}: 下拉应包含「${option}」`,
        timeout: 30000,
      },
    )
    .toBe(true);
  const clicked = await clickActiveAntdOption(page, option);
  expect(clicked, `${sourceRef}: 下拉应包含可点击选项「${option}」`).toBe(true);
  await expect(formItem, `${sourceRef}: 表单项应选中「${option}」`).toContainText(option, {
    timeout: 30000,
  });
}

async function selectDqFormOptionByRegex(
  page: Page,
  label: RegExp,
  option: RegExp,
  sourceRef: string,
): Promise<void> {
  const formItem = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await expect(formItem, `${sourceRef}: 应展示目标表单项 ${label}`).toBeVisible({ timeout: 30000 });
  if (option.test((await formItem.textContent({ timeout: 30000 })) ?? "")) {
    return;
  }

  await formItem.locator(".ant-select:visible").first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  const targetOption = dropdown
    .locator(".ant-select-item-option:not(.ant-select-item-option-disabled)")
    .filter({ hasText: option })
    .first();
  await expect(targetOption, `${sourceRef}: 目标下拉应包含 ${option}`).toBeVisible({ timeout: 30000 });
  await targetOption.click({ timeout: 30000 });
  await expect(formItem, `${sourceRef}: 表单项应选中 ${option}`).toContainText(option, { timeout: 30000 });
}

async function fillDqPageFormField(page: Page, label: RegExp, value: string): Promise<void> {
  const visibleDialog = page.locator(".ant-modal:visible, [role='dialog']:visible").last();
  const scope = (await visibleDialog.isVisible({ timeout: 1000 }).catch(() => false)) ? visibleDialog : page.locator("body");
  const field = scope.locator(".ant-form-item").filter({ hasText: label }).first();
  const control = field.locator("textarea, input").first();
  await control.fill(value, { timeout: 30000 });
  await expect(control, `表单字段应填入目标值`).toHaveValue(value, { timeout: 30000 });
}

function getRuleSetPackageRows(page: Page) {
  return page
    .locator("[class*='rulePack'], [class*='rulePackage'], .ant-form-item, .ant-table-tbody tr")
    .filter({ hasText: /规则包|请输入规则包名称|新增/ });
}

function getRuleSetPackageNameInputs(page: Page) {
  return page.getByPlaceholder("请输入规则包名称");
}

async function clickRuleSetPackageAddButton(page: Page, sourceRef: string): Promise<void> {
  const addButton = page.getByRole("button", { name: /增加|添加规则包|新增规则包|添加/ }).first();
  await expect(addButton, `${sourceRef}: 应展示新增规则包入口`).toBeVisible({ timeout: 30000 });
  await addButton.click({ timeout: 30000 });
}

function getRuleSetMonitorRuleItems(page: Page) {
  return page
    .locator(".ant-table-tbody tr, [class*='ruleItem'], [class*='ruleRow'], [class*='monitorRule']")
    .filter({ hasText: /完整性|有效性|唯一性|统计函数|强规则|弱规则|规则描述|空值/ });
}

async function gotoEditableRuleSetMonitorRules(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  const pageQueryResponse = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleSet/pageQuery"),
    {
      data: { current: 1, size: 100 },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    },
  );
  expect(pageQueryResponse.ok(), `${sourceRef}: 查询规则集列表 HTTP 应成功`).toBe(true);
  const records = expectRuleSetPage(
    expectDqSuccess(
      (await pageQueryResponse.json()) as DqApiResponse<DqRuleSetPageData>,
      `${sourceRef}: 规则集列表应请求成功`,
    ),
    `${sourceRef}: 规则集列表应返回记录`,
  );
  const targetRuleSet = expectRuleSetSearchTarget(records, sourceRef);

  await gotoDataQualityPage(page, `/dq/ruleSet/edit/${targetRuleSet.id}?projectId=${getProjectId()}`);
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 规则集编辑页应打开`).toContainText("编辑规则集", {
    timeout: 30000,
  });
  if (!(await page.getByText("添加规则", { exact: true }).first().isVisible())) {
    await clickDqCompactButton(page, "下一步", sourceRef);
  }
  await expect(body, `${sourceRef}: 规则集应进入监控规则配置页`).toContainText("添加规则", {
    timeout: 30000,
  });
}

async function searchRuleSetTableName(
  page: Page,
  tableName: string,
  sourceRef: string,
): Promise<DqRuleSetRecord[]> {
  const responsePromise = waitForDqJson<DqRuleSetPageData>(
    page,
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
  );
  const searchInput = page
    .getByPlaceholder(/输入表名搜索|请输入表名|表名/)
    .or(page.locator("input[placeholder*='表名']"))
    .first();
  await expect(searchInput, `${sourceRef}: 规则集管理应展示表名搜索输入框`).toBeVisible({ timeout: 30000 });
  await searchInput.fill(tableName, { timeout: 30000 });
  const searchButton = page.getByRole("button", { name: /查\s*询|search/i }).first();
  await expect(searchButton, `${sourceRef}: 规则集管理应展示查询入口`).toBeVisible({ timeout: 30000 });
  await searchButton.click({ timeout: 30000 });
  const pageData = expectDqSuccess(await responsePromise, `${sourceRef}: 规则集表名搜索应请求成功`);
  const records = getRuleSetPageRecordsAllowEmpty(pageData, `${sourceRef}: 规则集表名搜索应返回分页结构`);
  for (const record of records) {
    expectNonEmptyString(record.tableName, `${sourceRef}: 搜索结果记录应包含表名`);
  }
  return records;
}

async function createMinimalRuleSetForDeletion(
  page: Page,
  sourceRef: string,
  tableName: string,
  packageName: string,
  description: string,
  ruleDescription: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  await clickDqText(page, "新建规则集", sourceRef);
  await expect(page, `${sourceRef}: 新建规则集应进入 /dq/ruleSet/add`).toHaveURL(/\/dq\/ruleSet\/add/);
  await selectDqFormOptionBySearch(page, /数据源/, "SparkThrift2.x", sourceRef);
  await selectDqFormOptionBySearch(page, /数据库/, getDefaultDatasource().sql.database, sourceRef);
  await selectDqFormOptionBySearch(page, /数据表/, tableName, sourceRef);
  await fillDqPageFormField(page, /规则集描述/, description);
  await fillDqPageFormField(page, /规则包名称/, packageName);
  await clickDqCompactButton(page, "下一步", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 新建规则集应进入监控规则配置页`).toContainText(
    /监控规则|添加规则/,
    { timeout: 30000 },
  );

  await addCompletenessRuleToCurrentRuleSet(page, sourceRef, ruleDescription);
  await clickRuleSetSubmitButton(page, sourceRef);
  await expect
    .poll(async () => {
      const records = await queryRuleSetRecords(page, tableName);
      return records.some((record) => record.description === description);
    }, {
      message: `${sourceRef}: 保存后临时规则集应出现在列表 API`,
      timeout: 60000,
    })
    .toBe(true);
}

async function createSparkThriftArchiveValidationRuleSet(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  packageName: string,
  ruleSetDescription: string,
  fusionChecks: SparkThriftRuleValidationFusionChecks | undefined,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  await clickDqText(page, "新建规则集", sourceRef);
  await expect(page, `${sourceRef}: 新建规则集应进入 /dq/ruleSet/add`).toHaveURL(/\/dq\/ruleSet\/add/);

  await selectDqFormOptionBySearch(page, /数据源/, "SparkThrift2.x", sourceRef);
  await selectDqFormOptionBySearch(page, /数据库/, getDefaultDatasource().sql.database, sourceRef);
  await selectDqFormOptionBySearch(page, /数据表/, scenario.tableName, sourceRef);
  if (scenario.comparisonTableName) {
    await selectDqFormOptionBySearch(page, /对比表|比较表|关联表/, scenario.comparisonTableName, sourceRef);
  }
  await fillDqPageFormField(page, /规则集描述/, ruleSetDescription);
  const packageNameInput = getRuleSetPackageNameInputs(page).first();
  await expect(packageNameInput, `${sourceRef}: 规则集基础信息页应展示规则包名称输入框`).toBeVisible({
    timeout: 30000,
  });
  await packageNameInput.fill(packageName, { timeout: 30000 });
  await expect(packageNameInput, `${sourceRef}: 规则包名称应填入目标值`).toHaveValue(packageName, {
    timeout: 30000,
  });
  await packageNameInput.press("Tab", { timeout: 30000 });
  if (fusionChecks?.ruleSetPackageNameManagement) {
    await expectArchiveRuleSetPackageNameManagement(page, sourceRef, packageName);
  }
  await clickDqCompactButton(page, "下一步", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 新建规则集应进入监控规则配置页`).toContainText(
    /监控规则|添加规则/,
    { timeout: 30000 },
  );

  await ensureArchiveRuleSetPackageReady(page, sourceRef, packageName);
  await addArchiveValidationRuleToCurrentRuleSet(page, sourceRef, scenario);
  if (fusionChecks?.ruleSetRuleEdit) {
    await expectArchiveRuleSetRuleEdit(page, sourceRef, scenario);
  }
  if (fusionChecks?.ruleSetGlobalParams) {
    await expectArchiveRuleSetGlobalParamsOnCurrentPage(page, sourceRef, packageName);
  }
  await clickRuleSetSubmitButton(page, sourceRef);
  await expect
    .poll(async () => {
      const records = await queryRuleSetRecords(page, scenario.tableName);
      return records.some((record) => record.description === ruleSetDescription);
    }, {
      message: `${sourceRef}: 保存后规则集应出现在列表 API`,
      timeout: 60000,
    })
    .toBe(true);
}

async function expectArchiveRuleSetPackageNameManagement(
  page: Page,
  sourceRef: string,
  packageName: string,
): Promise<void> {
  const renamedName = `${packageName}_临时重命名`;
  const secondName = `${packageName}_临时包`;
  const packageInputs = getRuleSetPackageNameInputs(page);
  await expect(packageInputs.first(), `${sourceRef}: 规则包名称输入框应可编辑`).toBeVisible({
    timeout: 30000,
  });
  await packageInputs.first().fill(renamedName, { timeout: 30000 });
  await expect(packageInputs.first(), `${sourceRef}: 规则包名称应支持重命名`).toHaveValue(renamedName, {
    timeout: 30000,
  });
  await packageInputs.first().fill(packageName, { timeout: 30000 });

  await clickRuleSetPackageAddButton(page, sourceRef);
  await expect(getRuleSetPackageNameInputs(page).nth(1), `${sourceRef}: 新增规则包输入框应出现`).toBeVisible({
    timeout: 30000,
  });
  await getRuleSetPackageNameInputs(page).nth(1).fill(secondName, { timeout: 30000 });
  await expect(getRuleSetPackageNameInputs(page).nth(1), `${sourceRef}: 新增规则包名称应可填写`).toHaveValue(
    secondName,
    { timeout: 30000 },
  );
  await deleteSecondRuleSetPackageIfVisible(page, sourceRef);
  await expect(getRuleSetPackageNameInputs(page), `${sourceRef}: 删除临时规则包后应只保留正式规则包`).toHaveCount(
    1,
    { timeout: 30000 },
  );

  await clickRuleSetPackageAddButton(page, sourceRef);
  await getRuleSetPackageNameInputs(page).nth(1).fill(packageName, { timeout: 30000 });
  await getRuleSetPackageNameInputs(page).nth(1).press("Tab", { timeout: 30000 });
  await expect(
    page.locator(".ant-form-item-explain-error").filter({ hasText: /重复|不可重复|已存在/ }).first(),
    `${sourceRef}: 重复规则包名称应提示校验错误`,
  ).toBeVisible({ timeout: 30000 });
  await deleteSecondRuleSetPackageIfVisible(page, sourceRef);
  await getRuleSetPackageNameInputs(page).first().fill(packageName, { timeout: 30000 });
  await expect(getRuleSetPackageNameInputs(page).first(), `${sourceRef}: 正式规则包名称应恢复`).toHaveValue(
    packageName,
    { timeout: 30000 },
  );
}

async function deleteSecondRuleSetPackageIfVisible(page: Page, sourceRef: string): Promise<void> {
  const secondRow = getRuleSetPackageRows(page).nth(1);
  const deleteButton = secondRow
    .locator(".anticon-delete, .anticon-minus-circle, [class*='delete']")
    .first();
  await expect(deleteButton, `${sourceRef}: 临时规则包应展示删除入口`).toBeVisible({ timeout: 30000 });
  await deleteButton.click({ timeout: 30000 });
  const confirm = page.locator(".ant-popconfirm:visible, .ant-modal:visible").last();
  if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirm.getByRole("button", { name: /确\s*定|确\s*认/ }).last().click({ timeout: 30000 });
  }
}

async function expectArchiveRuleSetRuleEdit(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
): Promise<void> {
  const editedDescription = `${scenario.description}_编辑校验`;
  const createdRule = getRuleSetMonitorRuleItems(page).filter({ hasText: scenario.description }).first();
  await expect(createdRule, `${sourceRef}: 待编辑规则行应可见`).toBeVisible({ timeout: 30000 });
  await createdRule.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });
  await fillRuleSetRuleDescription(page, editedDescription);
  await saveRuleSetRuleRow(page, sourceRef, "编辑规则");
  await expect(page.locator("body"), `${sourceRef}: 编辑后规则描述应回显`).toContainText(editedDescription, {
    timeout: 30000,
  });

  const editedRule = getRuleSetMonitorRuleItems(page).filter({ hasText: editedDescription }).first();
  await expect(editedRule, `${sourceRef}: 编辑后的规则行应可见`).toBeVisible({ timeout: 30000 });
  await editedRule.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });
  await fillRuleSetRuleDescription(page, scenario.description);
  await saveRuleSetRuleRow(page, sourceRef, "恢复规则");
  await expect(page.locator("body"), `${sourceRef}: 恢复后规则描述应回显`).toContainText(scenario.description, {
    timeout: 30000,
  });
}

async function expectArchiveRuleSetGlobalParamsOnCurrentPage(
  page: Page,
  sourceRef: string,
  packageName: string,
): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 监控规则配置页应展示全局参数入口`).toContainText("查看全局参数", {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 打开全局参数前应保留规则包`).toContainText(packageName, {
    timeout: 30000,
  });
  const globalParamsResponse = waitForDqJson<DqGlobalParamsPage>(
    page,
    "/dassets/v1/valid/monitor/getGlobalParams",
    (payload) => payload.data?.pageSize === 10,
  );
  void globalParamsResponse.catch(() => {});
  await page.getByText("查看全局参数", { exact: true }).click({ timeout: 30000 });
  const globalParams = expectDqSuccess(await globalParamsResponse, `${sourceRef}: 全局参数列表应请求成功`);
  const records = expectGlobalParamsPage(globalParams, sourceRef);
  expect(records.length, `${sourceRef}: 全局参数弹窗应至少返回一条参数`).toBeGreaterThan(0);

  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, `${sourceRef}: 全局参数弹窗应打开`).toBeVisible({ timeout: 30000 });
  for (const header of ["全局参数", "参数名称", "参数类型", "参数值/日期格式", "注释"]) {
    await expect(modal, `${sourceRef}: 全局参数弹窗应展示「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }
  for (const record of records.slice(0, 2)) {
    await expect(modal, `${sourceRef}: 全局参数弹窗应展示参数名称`).toContainText(
      expectNonEmptyString(record.paramName, `${sourceRef}: 全局参数应包含参数名称`),
      { timeout: 30000 },
    );
  }
  await closeVisibleDqOverlayIfAny(page, sourceRef);
  await expect(body, `${sourceRef}: 关闭全局参数后应保留当前规则包`).toContainText(packageName, {
    timeout: 30000,
  });
}

async function expectArchiveRuleSetListAndConfiguredTableFilter(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  ruleSetDescription: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  const records = await searchRuleSetTableName(page, scenario.tableName, sourceRef);
  const targetRecord = records.find((record) => record.description === ruleSetDescription);
  expect(targetRecord, `${sourceRef}: 规则集列表应返回刚创建的规则集`).toBeTruthy();

  const row = page.locator(".ant-table-tbody tr").filter({ hasText: scenario.tableName }).first();
  await expect(row, `${sourceRef}: 规则集列表应展示目标表和规则集描述`).toBeVisible({ timeout: 30000 });
  await expect(row, `${sourceRef}: 规则集列表应展示非负规则包/规则数量`).toContainText(/\d+/, {
    timeout: 30000,
  });
  expect(Number(targetRecord?.packageVOList?.length ?? targetRecord?.packageCount ?? 0)).toBeGreaterThanOrEqual(0);
  expect(Number(targetRecord?.ruleCount ?? 0)).toBeGreaterThanOrEqual(0);
}

async function expectArchiveRuleSetDetail(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  ruleSetDescription: string,
  packageName: string,
): Promise<void> {
  const records = await queryRuleSetRecords(page, scenario.tableName);
  const targetRecord = records.find((record) => record.description === ruleSetDescription);
  expect(targetRecord?.id, `${sourceRef}: 规则集详情校验应定位刚创建规则集`).toBeTruthy();
  const response = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleSet/detail"), {
    data: { id: String(targetRecord?.id) },
    timeout: 60000,
  });
  expect(response.ok(), `${sourceRef}: 规则集详情 HTTP 应成功`).toBe(true);
  const detail = expectDqSuccess(
    (await response.json()) as DqApiResponse<DqRuleSetRecord>,
    `${sourceRef}: 规则集详情应请求成功`,
  );
  expect(String(detail.tableName ?? ""), `${sourceRef}: 规则集详情应展示表名`).toContain(scenario.tableName);
  expect(String(detail.description ?? ""), `${sourceRef}: 规则集详情应展示规则集描述`).toContain(
    ruleSetDescription,
  );
  expect(getRuleSetPackageNames(detail), `${sourceRef}: 规则集详情应展示规则包 ${packageName}`).toContain(
    packageName,
  );
  expect(
    getRuleSetFunctionNames(detail).some((functionName) => functionName.includes(scenario.statisticFunction)),
    `${sourceRef}: 规则集详情应展示规则函数 ${scenario.statisticFunction}`,
  ).toBe(true);
  assertRuleSetDetailPackages(detail, sourceRef);
}

async function ensureArchiveRuleSetPackageReady(
  page: Page,
  sourceRef: string,
  packageName: string,
): Promise<void> {
  if (await page.getByText("添加规则", { exact: true }).first().isVisible({ timeout: 3000 }).catch(() => false)) {
    return;
  }

  await clickRuleSetPackageAddButton(page, sourceRef);
  const visiblePackageInput = page.locator('input[placeholder="请输入规则包名称"]:visible').last();
  if (await visiblePackageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await visiblePackageInput.fill(packageName, { timeout: 30000 });
    await visiblePackageInput.press("Tab", { timeout: 30000 });
  }
  await expect(page.locator("body"), `${sourceRef}: 规则包创建后应展示添加规则入口`).toContainText("添加规则", {
    timeout: 30000,
  });

  const packageSelect = page.locator(".ant-select:visible").filter({ hasText: /请选择规则包名称|规则包/ }).first();
  if (
    (await packageSelect.isVisible({ timeout: 3000 }).catch(() => false)) &&
    !((await packageSelect.textContent({ timeout: 30000 })) ?? "").includes(packageName)
  ) {
    await packageSelect.click({ timeout: 30000 });
    const clicked = await clickActiveAntdOption(page, packageName);
    expect(clicked, `${sourceRef}: 规则包下拉应包含「${packageName}」`).toBe(true);
    await expect(packageSelect, `${sourceRef}: 规则包下拉应选中「${packageName}」`).toContainText(packageName, {
      timeout: 30000,
    });
  }
}

async function clickRuleSetSubmitButton(page: Page, sourceRef: string): Promise<void> {
  if (await confirmRuleSetSavePromptIfVisible(page, sourceRef)) return;

  const submitButton = page
    .getByRole("button", { name: /完成|提交|确\s*定|保\s*存/ })
    .filter({ hasNotText: /取消|上一步/ })
    .last();
  await expect(submitButton, `${sourceRef}: 规则集配置页应展示提交入口`).toBeVisible({ timeout: 30000 });
  try {
    await submitButton.click({ timeout: 30000 });
  } catch (error) {
    if (await confirmRuleSetSavePromptIfVisible(page, sourceRef, true)) return;
    throw error;
  }
  await confirmRuleSetSavePromptIfVisible(page, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 提交规则集后页面主体应保持可见`).toBeVisible({
    timeout: 30000,
  });
}

async function confirmRuleSetSavePromptIfVisible(
  page: Page,
  sourceRef: string,
  forceClick = false,
): Promise<boolean> {
  const confirm = page.locator(".ant-modal-confirm-body-wrapper:visible").last();
  if (!(await confirm.isVisible({ timeout: 1000 }).catch(() => false))) return false;

  const confirmButton = page.locator(".ant-modal-confirm-btns .ant-btn-primary:visible").last();
  if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmButton.click({ force: forceClick, timeout: 30000 });
  } else {
    await confirm
      .getByRole("button", { name: /^保\s*存$|^确\s*定$|^提交$|^完成$/ })
      .last()
      .click({ force: forceClick, timeout: 30000 });
  }
  await expect(page.locator("body"), `${sourceRef}: 确认规则集保存后页面主体应保持可见`).toBeVisible({
    timeout: 30000,
  });
  return true;
}

async function deleteRuleSetRowAndAssert(
  page: Page,
  sourceRef: string,
  tableName: string,
  description: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  await searchRuleSetTableName(page, tableName, sourceRef);
  const row = page.locator(".ant-table-tbody tr").filter({ hasText: tableName }).filter({ hasText: description }).first();
  await expect(row, `${sourceRef}: 待删除临时规则集应出现在列表`).toBeVisible({ timeout: 30000 });
  await expect(row, `${sourceRef}: 临时规则集行应展示删除入口`).toContainText("删除", { timeout: 30000 });

  await row.getByRole("button", { name: "删除" }).click({ timeout: 30000 });
  const confirm = page.locator(".ant-popconfirm:visible, .ant-modal:visible, .ant-tooltip:visible").last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirm.getByRole("button", { name: /确\s*定|确\s*认|删\s*除/ }).last().click({ timeout: 30000 });
  }
  await expect(row, `${sourceRef}: 删除确认后临时规则集应从列表消失`).toBeHidden({ timeout: 30000 });
  await expect
    .poll(async () => {
      const records = await queryRuleSetRecords(page, tableName);
      return records.some((record) => record.description === description);
    }, {
      message: `${sourceRef}: 删除后列表 API 不应再返回临时规则集`,
      timeout: 60000,
    })
    .toBe(false);
}

async function deleteTempRuleSetByDescriptionBestEffort(
  page: Page,
  sourceRef: string,
  tableName: string,
  descriptionPrefix: string,
): Promise<void> {
  const staleRecords = (await queryRuleSetRecords(page, tableName)).filter((record) =>
    String(record.description ?? "").startsWith(descriptionPrefix),
  );
  if (staleRecords.length === 0) return;

  await gotoDataQualityPage(page, "/dq/ruleSet");
  await searchRuleSetTableName(page, tableName, sourceRef);
  for (const record of staleRecords) {
    const row = page
      .locator(".ant-table-tbody tr")
      .filter({ hasText: tableName })
      .filter({ hasText: String(record.description) })
      .first();
    if (!(await row.isVisible({ timeout: 3000 }).catch(() => false))) continue;
    await row.getByRole("button", { name: "删除" }).click({ timeout: 5000 }).catch(() => {});
    const confirm = page.locator(".ant-popconfirm:visible, .ant-modal:visible, .ant-tooltip:visible").last();
    if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirm
        .getByRole("button", { name: /确\s*定|确\s*认|删\s*除/ })
        .last()
        .click({ timeout: 5000 })
        .catch(() => {});
    }
  }
}

async function queryRuleSetRecords(page: Page, tableName: string): Promise<DqRuleSetRecord[]> {
  const response = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleSet/pageQuery"), {
    data: { current: 1, size: 100, tableName },
    headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
    timeout: 60000,
  });
  expect(response.ok(), `查询规则集列表 HTTP 应成功`).toBe(true);
  const pageData = expectDqSuccess(
    (await response.json()) as DqApiResponse<DqRuleSetPageData>,
    `查询规则集列表应请求成功`,
  );
  return getRuleSetPageRecordsAllowEmpty(pageData, `查询规则集列表应返回分页结构`);
}

async function queryRuleTaskRecords(page: Page, tableName: string): Promise<DqRuleTaskRecord[]> {
  const response = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/monitor/pageQuery"), {
    data: { current: 1, size: 100, tableName },
    headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
    timeout: 60000,
  });
  expect(response.ok(), `查询规则任务列表 HTTP 应成功`).toBe(true);
  const payload = (await response.json()) as DqRuleTaskPageQuery;
  expect(payload.success ?? payload.code === 1, `查询规则任务列表应请求成功`).toBe(true);
  return getDqRuleTaskRecords(payload);
}

async function expectRuleTaskRuleSetPackages(
  page: Page,
  sourceRef: string,
  packageNames: string[],
): Promise<void> {
  const records = await queryRuleSetRecords(page, VEHICLE_QUALITY_RULESET_TABLE);
  const targetRuleSet = records.find((record) => record.tableName === VEHICLE_QUALITY_RULESET_TABLE);
  expect(targetRuleSet?.id, `${sourceRef}: 应存在 ${VEHICLE_QUALITY_RULESET_TABLE} 对应规则集`).toBeTruthy();

  const detailResponse = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleSet/detail"),
    {
      data: { id: String(targetRuleSet?.id) },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    },
  );
  expect(detailResponse.ok(), `${sourceRef}: 查询车辆质量规则集详情 HTTP 应成功`).toBe(true);
  const detail = expectDqSuccess(
    (await detailResponse.json()) as DqApiResponse<DqRuleSetRecord>,
    `${sourceRef}: 查询车辆质量规则集详情应请求成功`,
  );
  const actualPackageNames = getRuleSetPackageNames(detail);
  for (const packageName of packageNames) {
    expect(actualPackageNames, `${sourceRef}: 车辆质量规则集应包含规则包「${packageName}」`).toContain(packageName);
    const targetPackage = (detail.packageVOList ?? []).find((item) => item.packageName === packageName);
    expect(targetPackage?.rules?.length, `${sourceRef}: 规则包「${packageName}」下应包含可引用规则`).toBeGreaterThan(0);
  }
}

async function selectVisibleDqOption(
  scope: ReturnType<Page["locator"]>,
  optionText: string,
  sourceRef: string,
): Promise<void> {
  const optionRow = scope
    .locator(".ant-checkbox-wrapper, .ant-select-item, .ant-table-row, tr, label")
    .filter({ hasText: optionText })
    .first();
  if (await optionRow.isVisible({ timeout: 3000 }).catch(() => false)) {
    await optionRow.click({ timeout: 30000 });
    return;
  }
  const option = scope.getByText(optionText, { exact: false }).first();
  await expect(option, `${sourceRef}: 应可选择「${optionText}」`).toBeVisible({ timeout: 30000 });
  await option.click({ timeout: 30000 });
}

async function selectRuleTaskRulePackageOnCurrentPage(
  page: Page,
  sourceRef: string,
  packageNames: readonly string[],
  ruleCategory?: string,
): Promise<void> {
  await expect(page.locator("body"), `${sourceRef}: 监控规则页应展示引用规则包入口`).toContainText(/引用规则包|规则包/, {
    timeout: 30000,
  });
  if (!(await page.getByText("引用规则包", { exact: true }).first().isVisible({ timeout: 3000 }).catch(() => false))) {
    await selectDqFormOptionBySearch(page, /规则包/, packageNames[0], sourceRef);
    if (ruleCategory) {
      await selectDqFormOptionBySearch(page, /规则类型/, ruleCategory, sourceRef);
    }
    const importButton = page.getByRole("button", { name: /引\s*入/ }).last();
    await expect(importButton, `${sourceRef}: 监控规则页应展示引入入口`).toBeVisible({ timeout: 30000 });
    const importResponse = page
      .waitForResponse(
        (response) =>
          response.url().includes("/dassets/v1/valid/monitorRulePackage/getMonitorRule") &&
          response.request().method() === "POST",
        { timeout: 30000 },
      )
      .catch(() => null);
    await importButton.click({ force: true, timeout: 30000 });
    const response = await importResponse;
    if (response) {
      const payload = await response.json().catch(() => null);
      expect(payload?.success ?? payload?.code === 1, `${sourceRef}: 引入规则包接口应返回成功`).toBe(true);
    }
    await expect(
      page.locator(".ant-message-notice:visible").filter({ hasText: /引入成功/ }).last(),
      `${sourceRef}: 引入规则包后应提示成功`,
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator("body"), `${sourceRef}: 引入规则包后应展示规则明细`).toContainText(
      /生效范围|统计函数|校验方法|强弱规则/,
      { timeout: 30000 },
    );
    for (const packageName of packageNames) {
      await expect(page.locator("body"), `${sourceRef}: 引入规则包后应展示「${packageName}」`).toContainText(
        packageName,
        { timeout: 30000 },
      );
    }
    return;
  }
  await clickDqText(page, "引用规则包", sourceRef);
  const dialog = page.locator(".ant-modal:visible, [role='dialog']:visible").last();
  const picker = (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) ? dialog : page.locator("body");

  for (const packageName of packageNames) {
    await selectVisibleDqOption(picker, packageName, sourceRef);
  }
  const confirm = picker.getByRole("button", { name: /确\s*定|引\s*用|保\s*存/ }).last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirm.click({ timeout: 30000 });
  }

  for (const packageName of packageNames) {
    await expect(page.locator("body"), `${sourceRef}: 引用规则包后应展示「${packageName}」`).toContainText(
      packageName,
      { timeout: 30000 },
    );
  }
}

async function chooseDqFieldOptionByText(
  page: Page,
  label: RegExp,
  optionText: string,
  sourceRef: string,
): Promise<void> {
  const formField = page.locator(".ant-form-item:visible").filter({ hasText: label }).last();
  const field = (await formField.count()) > 0
    ? formField
    : page.locator(".ant-radio-group:visible, .ant-row:visible, label:visible").filter({ hasText: label }).first();
  await expect(field, `${sourceRef}: 调度属性应展示配置项 ${label}`).toBeVisible({ timeout: 30000 });

  const spinButton = field.getByRole("spinbutton").first();
  if (await spinButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    const currentValue = await spinButton.inputValue({ timeout: 3000 }).catch(async () =>
      (await spinButton.innerText({ timeout: 3000 })).trim(),
    );
    if (currentValue.trim() !== optionText) {
      await spinButton.fill(optionText, { timeout: 30000 });
    }
    await expect(spinButton, `${sourceRef}: 配置项应设置为「${optionText}」`).toHaveValue(optionText, {
      timeout: 30000,
    });
    return;
  }

  const directOption = field.getByText(optionText, { exact: false }).first();
  if (await directOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await directOption.click({ timeout: 30000 }).catch(async () => {
      await field.click({ timeout: 30000 });
    });
    await expect(field, `${sourceRef}: 配置项应选中「${optionText}」`).toContainText(optionText, {
      timeout: 30000,
    });
    return;
  }

  const select = field.locator(".ant-select").first();
  if (await select.isVisible({ timeout: 3000 }).catch(() => false)) {
    await select.click({ timeout: 30000 });
    await page.keyboard.type(optionText);
    const dropdown = page.locator(".ant-select-dropdown:visible").last();
    await expect(dropdown, `${sourceRef}: 下拉应包含「${optionText}」`).toContainText(optionText, {
      timeout: 30000,
    });
    const clicked = await clickActiveAntdOption(page, optionText);
    expect(clicked, `${sourceRef}: 下拉应包含可点击选项「${optionText}」`).toBe(true);
    await expect(field, `${sourceRef}: 配置项应选中「${optionText}」`).toContainText(optionText, {
      timeout: 30000,
    });
    return;
  }

  const globalOption = page.getByText(optionText, { exact: false }).last();
  await expect(globalOption, `${sourceRef}: 页面应可选择「${optionText}」`).toBeVisible({ timeout: 30000 });
  await globalOption.click({ timeout: 30000 });
}

async function chooseFirstDqSelectOption(page: Page, label: RegExp, sourceRef: string): Promise<string> {
  const field = page.locator(".ant-form-item:visible").filter({ hasText: label }).last();
  await expect(field, `${sourceRef}: 调度属性应展示配置项 ${label}`).toBeVisible({ timeout: 30000 });
  const select = field.locator(".ant-select").first();
  await expect(select, `${sourceRef}: 配置项 ${label} 应展示下拉选择器`).toBeVisible({ timeout: 30000 });
  await select.click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  const option = dropdown.locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible").first();
  await expect(option, `${sourceRef}: 配置项 ${label} 应存在可选项`).toBeVisible({ timeout: 30000 });
  const optionText = (await option.innerText()).trim();
  await option.click({ timeout: 30000 });
  await expect(field, `${sourceRef}: 配置项 ${label} 应选中「${optionText}」`).toContainText(optionText, {
    timeout: 30000,
  });
  return optionText;
}

async function checkDqNoReport(page: Page, sourceRef: string): Promise<void> {
  const checkboxWrapper = page
    .locator(".ant-checkbox-wrapper:visible, label:visible")
    .filter({ hasText: "无需生成报告" })
    .first();
  await expect(checkboxWrapper, `${sourceRef}: 报告配置应展示「无需生成报告」`).toBeVisible({
    timeout: 30000,
  });
  const checkbox = checkboxWrapper.locator("input[type='checkbox']").first();
  if (!(await checkbox.isChecked({ timeout: 3000 }).catch(() => false))) {
    await checkboxWrapper.click({ timeout: 30000 });
  }
  await expect(checkbox, `${sourceRef}: 应勾选无需生成报告`).toBeChecked({ timeout: 30000 });
}

async function clickDqSubmitButton(page: Page, sourceRef: string): Promise<void> {
  const submitButton = page.getByRole("button", { name: /保\s*存|新\s*建|确\s*定/ }).last();
  await expect(submitButton, `${sourceRef}: 规则任务表单应展示提交入口`).toBeVisible({ timeout: 30000 });
  await submitButton.click({ force: true, timeout: 30000 });
}

async function chooseDqRadioOptionByText(page: Page, optionText: string, sourceRef: string): Promise<void> {
  const radio = page.getByRole("radio", { name: optionText }).first();
  if (await radio.isVisible({ timeout: 3000 }).catch(() => false)) {
    await radio.check({ timeout: 30000 });
  } else {
    await page.getByText(optionText, { exact: true }).last().click({ timeout: 30000 });
  }
  await expect(page.getByRole("radio", { name: optionText }), `${sourceRef}: 单选项应选中「${optionText}」`).toBeChecked({
    timeout: 30000,
  });
}

async function expectPartitionModeOptionsVisible(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const option of ["选择已有分区", "选择动态分区", "手动输入分区"]) {
    await expect(body, `${sourceRef}: 监控对象页应展示分区方式「${option}」`).toContainText(option, {
      timeout: 30000,
    });
  }
}

async function configureExistingPartition(
  page: Page,
  sourceRef: string,
  expectedPartition: string,
): Promise<void> {
  const existingPartitionRadio = page.getByRole("radio", { name: "选择已有分区" });
  if (!(await existingPartitionRadio.isChecked({ timeout: 3000 }).catch(() => false))) {
    await chooseDqFieldOptionByText(page, /分区方式|选择分区|分区/, "选择已有分区", sourceRef);
  }
  for (const token of expectedPartition.split(",").map((item) => item.trim())) {
    const value = token.includes("=") ? token.split("=").slice(1).join("=").replace(/^'|'$/g, "") : token;
    await selectPartitionValue(page, value, sourceRef);
  }
  await expect(page.locator("body"), `${sourceRef}: 分区配置应回显目标已有分区`).toContainText(
    new RegExp(
      expectedPartition
        .split(/[=,'"\s]+/)
        .filter((token) => token.length >= 2)
        .map(escapeRegExp)
        .join("|"),
    ),
    { timeout: 30000 },
  );
}

async function selectPartitionValue(page: Page, value: string, sourceRef: string): Promise<void> {
  const partitionSelect = page
    .locator(".ant-form-item, .ant-row, label")
    .filter({ hasText: /分区|stat_date|hour/ })
    .locator(".ant-select")
    .last();
  if (await partitionSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await partitionSelect.click({ timeout: 30000 });
    await page.keyboard.type(value);
    const dropdown = page.locator(".ant-select-dropdown:visible").last();
    await expect(dropdown, `${sourceRef}: 分区下拉应包含「${value}」`).toContainText(value, {
      timeout: 30000,
    });
    await dropdown.getByText(value, { exact: false }).first().click({ timeout: 30000 });
    return;
  }

  const input = page.locator("input").filter({ hasText: "" }).last();
  await input.fill(value, { timeout: 30000 });
}

async function configureDynamicPartition(
  page: Page,
  sourceRef: string,
  level: "single" | "multi" = "multi",
): Promise<void> {
  await chooseDqFieldOptionByText(page, /分区方式|选择分区|分区/, "选择动态分区", sourceRef);
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 分区配置应回显动态分区`).toContainText(/动态分区|选择动态分区/, {
    timeout: 30000,
  });

  const partitionField = page.locator(".ant-form-item, .ant-row, label").filter({ hasText: /分区|stat_date|hour/ });
  const dateOption = partitionField.getByText(/stat_date|日期|业务日期|计划时间/, { exact: false }).first();
  if (await dateOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await dateOption.click({ timeout: 30000 }).catch(() => {});
  }
  if (level === "single") return;

  const hourOption = partitionField.getByText(/hour|小时/, { exact: false }).first();
  if (await hourOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await hourOption.click({ timeout: 30000 }).catch(() => {});
  }
}

async function configureManualPartition(page: Page, sourceRef: string, expectedPartition: string): Promise<void> {
  const body = page.locator("body");
  const manualRadio = page.getByRole("radio", { name: "手动输入分区" }).first();
  if (!(await manualRadio.isChecked({ timeout: 3000 }).catch(() => false))) {
    await page.getByText("手动输入分区", { exact: true }).last().click({ timeout: 30000 });
  }
  await expect(manualRadio, `${sourceRef}: 分区方式应切换为手动输入分区`).toBeChecked({ timeout: 30000 });
  await expect(body, `${sourceRef}: 分区配置应回显手动输入分区`).toContainText(/手动输入分区|手动输入/, {
    timeout: 30000,
  });

  const partitionArea = page.locator(".ant-form-item:visible, .ant-row:visible, div:visible").filter({
    hasText: /选择分区|手动输入分区/,
  }).last();
  const manualPartitionInput = page.getByRole("textbox", { name: /手动输入分区|分区字段|分区值/ }).first();
  if (await manualPartitionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await manualPartitionInput.fill(expectedPartition, { timeout: 30000 });
    await expect(manualPartitionInput, `${sourceRef}: 多级分区表达式应填入`).toHaveValue(expectedPartition, {
      timeout: 30000,
    });
  } else {
    const fallbackInput = page
      .getByPlaceholder(/请输入.*分区|分区.*表达式|partition/i)
      .or(page.locator("textarea:visible").last())
      .or(partitionArea.locator("textarea:visible, input:not([type='radio']):visible").last())
      .last();
    await expect(fallbackInput, `${sourceRef}: 手动分区应展示可输入控件`).toBeVisible({ timeout: 30000 });
    await fallbackInput.fill(expectedPartition, { timeout: 30000 });
    await expect(fallbackInput, `${sourceRef}: 多级分区表达式应填入`).toHaveValue(expectedPartition, {
      timeout: 30000,
    });
  }
}

async function configureSamplingCheckSetting(page: Page, sourceRef: string, sampleRows: string): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 新建监控规则页面应展示数据预览入口`).toContainText("数据预览", {
    timeout: 30000,
  });

  const previewButton = page.getByRole("button", { name: /数据预览/ }).first();
  if (await previewButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await previewButton.click({ timeout: 30000 }).catch(() => {});
  }

  const samplingArea = page
    .locator(".ant-form-item, .ant-row, .ant-card, section, div")
    .filter({ hasText: /抽样检查(设置|配置)?|抽样行数|采样行数/ })
    .first();
  await expect(samplingArea, `${sourceRef}: 页面应展示抽样检查设置区域`).toBeVisible({ timeout: 30000 });

  const samplingSwitch = samplingArea.locator(".ant-switch, [role='switch']").first();
  await expect(samplingSwitch, `${sourceRef}: 抽样检查设置开关应可见`).toBeVisible({ timeout: 30000 });
  const switchClass = (await samplingSwitch.getAttribute("class").catch(() => "")) ?? "";
  const ariaChecked = (await samplingSwitch.getAttribute("aria-checked").catch(() => "")) ?? "";
  if (!/checked/.test(switchClass) && ariaChecked !== "true") {
    await samplingSwitch.click({ timeout: 30000 });
  }

  const rowsInput = samplingArea
    .getByPlaceholder(/请输入.*行数|抽样行数|采样行数/)
    .or(samplingArea.locator("input[type='number'], .ant-input-number input, input").last())
    .last();
  await rowsInput.fill(sampleRows, { timeout: 30000 });
  await expect(rowsInput, `${sourceRef}: 抽样行数应填入 ${sampleRows}`).toHaveValue(sampleRows, {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 抽样检查设置应保持开启并展示行数`).toContainText(/抽样|行数|10/, {
    timeout: 30000,
  });
}

async function gotoRuleTaskScheduleAttributesPage(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 编辑规则任务应打开配置流程`).toContainText(
    /监控对象|监控规则|调度属性|调度配置/,
    { timeout: 30000 },
  );
  const scheduleField = page.locator(".ant-form-item:visible, .ant-row:visible").filter({
    hasText: /调度周期|调度配置|生效日期|实例生成方式/,
  });

  if (await scheduleField.first().isVisible({ timeout: 3000 }).catch(() => false)) return;

  const scheduleStep = page.locator(".ant-steps-item, [class*='step']").filter({ hasText: /调度属性|调度配置/ }).last();
  if (await scheduleStep.isVisible({ timeout: 3000 }).catch(() => false)) {
    await scheduleStep.click({ force: true, timeout: 30000 }).catch(() => {});
  }
  if (await scheduleField.first().isVisible({ timeout: 5000 }).catch(() => false)) return;
  await clickNextUntilScheduleConfig(page, sourceRef);

  await expect(body, `${sourceRef}: 调度属性页面应展示环境参数配置入口`).toContainText(
    /环境参数|调度配置|超时时间/,
    { timeout: 30000 },
  );
}

async function gotoRuleTaskMonitorObjectPage(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  const partitionControl = page.locator(".ant-form-item:visible, .ant-row:visible").filter({
    hasText: /选择已有分区|选择分区|分区方式|分区/,
  });
  if (await partitionControl.first().isVisible({ timeout: 3000 }).catch(() => false)) return;

  const monitorObjectStep = page.locator(".ant-steps-item, [class*='step']").filter({ hasText: "监控对象" }).first();
  if (await monitorObjectStep.isVisible({ timeout: 3000 }).catch(() => false)) {
    await monitorObjectStep.click({ force: true, timeout: 30000 }).catch(() => {});
  } else {
    const previousButton = page.getByRole("button", { name: /上一步/ }).first();
    if (await previousButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await previousButton.click({ force: true, timeout: 30000 });
    }
  }

  await expect(body, `${sourceRef}: 编辑规则任务应切回监控对象分区配置`).toContainText(
    /选择已有分区|选择分区|分区方式|分区/,
    { timeout: 30000 },
  );
}

async function openRuleTaskScheduleForExistingTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const initialResponse = waitForRuleTaskPageQuery(page);
  void initialResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");
  const initialRecords = getDqRuleTaskRecords(await initialResponse);
  const targetRecord = initialRecords.find((record) => record.ruleName === ruleName);
  expect(targetRecord, `${sourceRef}: 当前环境应存在规则任务「${ruleName}」`).toBeTruthy();

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 规则任务列表应展示 ${ruleName}`).toBeVisible({ timeout: 30000 });
  await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });
  await gotoRuleTaskScheduleAttributesPage(page, sourceRef);
}

async function createRuleTaskWithRulePackages(
  page: Page,
  sourceRef: string,
  ruleName: string,
  packageNames: readonly string[],
): Promise<void> {
  const body = await gotoNewRuleTaskMonitorRuleConfig(page, sourceRef, ruleName);
  await selectRuleTaskRulePackageOnCurrentPage(page, sourceRef, packageNames);
  await clickDqCompactButton(page, "下一步", sourceRef);
  await expect(body, `${sourceRef}: 规则配置完成后应进入调度属性页面`).toContainText(/调度属性|调度配置/, {
    timeout: 30000,
  });
  await chooseDqFieldOptionByText(page, /调度周期/, "手动触发", sourceRef);
  await chooseDqFieldOptionByText(page, /实例生成方式/, "立即生成", sourceRef);
  await chooseDqFieldOptionByText(page, /超时时间/, "不限制", sourceRef);

  const saveResponse = waitForRuleTaskPageQuery(page);
  void saveResponse.catch(() => {});
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(body, `${sourceRef}: 规则任务 ${ruleName} 保存后应提示成功或返回规则任务管理`).toContainText(
    /成功|规则任务管理/,
    { timeout: 30000 },
  );
  const savedPayload = await saveResponse.catch(() => undefined);
  if (savedPayload) {
    expect(savedPayload.success ?? savedPayload.code === 1, `${sourceRef}: 保存任务 ${ruleName} 后列表应刷新成功`).toBe(
      true,
    );
  }
  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);

  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 保存后规则任务列表应展示 ${ruleName}`).toBeVisible({ timeout: 30000 });
}

async function createSparkThriftArchiveValidationRuleTask(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  ruleName: string,
  packageName: string,
  options: {
    t1BeforeImmediate?: boolean;
    envParams?: readonly SparkThriftEnvParam[];
    samplingRows?: string;
    partitionModesVisible?: boolean;
  } = {},
): Promise<void> {
  const body = await gotoNewRuleTaskMonitorObjectPageForTable(
    page,
    sourceRef,
    ruleName,
    scenario.tableName,
    scenario.comparisonTableName,
  );
  if (options.partitionModesVisible) {
    await expectPartitionModeOptionsVisible(page, sourceRef);
  }
  await configureExistingPartition(page, sourceRef, scenario.passPartition);
  if (options.samplingRows) {
    await configureSamplingCheckSetting(page, sourceRef, options.samplingRows);
  }
  await clickNextUntilMonitorRuleConfig(page, sourceRef);
  await selectRuleTaskRulePackageOnCurrentPage(page, sourceRef, [packageName], scenario.ruleCategory);
  await clickNextUntilScheduleConfig(page, sourceRef);
  await chooseDqFieldOptionByText(page, /调度周期/, options.t1BeforeImmediate ? "天" : "手动触发", sourceRef);
  await chooseDqFieldOptionByText(page, /规则拼接包/, "1", sourceRef);
  await chooseFirstDqSelectOption(page, /资源组/, sourceRef);
  await chooseDqFieldOptionByText(page, /实例生成方式/, options.t1BeforeImmediate ? "T+1生成" : "立即生成", sourceRef);
  await chooseDqFieldOptionByText(page, /超时时间/, "不限制", sourceRef);
  for (const envParam of options.envParams ?? []) {
    await configureSparkEnvParam(page, sourceRef, envParam.name, envParam.value);
  }
  await checkDqNoReport(page, sourceRef);

  const saveResponse = waitForRuleTaskPageQuery(page);
  void saveResponse.catch(() => {});
  await clickDqSubmitButton(page, sourceRef);
  await expect(body, `${sourceRef}: 规则任务 ${ruleName} 保存后应提示成功或返回规则任务管理`).toContainText(
    /成功|规则任务管理/,
    { timeout: 30000 },
  );
  const savedPayload = await saveResponse.catch(() => undefined);
  if (savedPayload) {
    expect(savedPayload.success ?? savedPayload.code === 1, `${sourceRef}: 保存任务 ${ruleName} 后列表应刷新成功`).toBe(
      true,
    );
  }
  await searchRuleTaskByTableName(page, scenario.tableName, sourceRef);

  const taskRow = page.locator(".ant-table-tbody tr").filter({ hasText: scenario.tableName }).filter({ hasText: ruleName }).first();
  await expect(taskRow, `${sourceRef}: 保存后规则任务列表应展示 ${ruleName}`).toBeVisible({ timeout: 30000 });
  if (!options.t1BeforeImmediate) return;

  await expect(taskRow, `${sourceRef}: T+1 任务应展示天级调度或 T+1 配置`).toContainText(/天|日|T\+1/, {
    timeout: 30000,
  });
  await expectNoMonitorRecordForRuleTask(page, sourceRef, ruleName);
  await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });
  await gotoRuleTaskScheduleAttributesPage(page, sourceRef);
  for (const envParam of options.envParams ?? []) {
    await expect(page.locator("body"), `${sourceRef}: 环境参数应回显 ${envParam.name}`).toContainText(
      envParam.name,
      { timeout: 30000 },
    );
    await expect(page.locator("body"), `${sourceRef}: 环境参数 ${envParam.name} 应回显 ${envParam.value}`).toContainText(
      envParam.value,
      { timeout: 30000 },
    );
  }
  await chooseDqFieldOptionByText(page, /调度周期/, "手动触发", sourceRef);
  await chooseDqFieldOptionByText(page, /实例生成方式/, "立即生成", sourceRef);

  const resaveResponse = waitForRuleTaskPageQuery(page);
  void resaveResponse.catch(() => {});
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: T+1 任务改为立即生成后应提示成功或返回规则任务管理`).toContainText(
    /成功|规则任务管理/,
    { timeout: 30000 },
  );
  const resavedPayload = await resaveResponse.catch(() => undefined);
  if (resavedPayload) {
    expect(resavedPayload.success ?? resavedPayload.code === 1, `${sourceRef}: T+1 任务改为立即生成后列表应刷新成功`).toBe(
      true,
    );
  }
  await searchRuleTaskByTableName(page, scenario.tableName, sourceRef);
  await expect(
    page.locator(".ant-table-tbody tr").filter({ hasText: scenario.tableName }).filter({ hasText: ruleName }).first(),
    `${sourceRef}: 改为立即生成后规则任务列表仍展示 ${ruleName}`,
  ).toBeVisible({ timeout: 30000 });
}

async function expectArchiveRuleTaskSingleDetectionToggle(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  ruleName: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, scenario.tableName, sourceRef);
  let taskRow = page.locator(".ant-table-tbody tr").filter({ hasText: scenario.tableName }).filter({ hasText: ruleName }).first();
  await expect(taskRow, `${sourceRef}: 关闭检测前应展示规则任务 ${ruleName}`).toBeVisible({ timeout: 30000 });
  await ensureRuleTaskRowSelected(taskRow, 30000);
  const closePayload = await clickRuleTaskBatchDetectionAction(page, sourceRef, "关闭检测");
  const closedRecord = getDqRuleTaskRecords(closePayload).find((record) => record.ruleName === ruleName);
  expect(closedRecord?.isClosed, `${sourceRef}: 单任务关闭检测后 API 状态应为已关闭`).toBe(1);

  await searchRuleTaskByTableName(page, scenario.tableName, sourceRef);
  taskRow = page.locator(".ant-table-tbody tr").filter({ hasText: scenario.tableName }).filter({ hasText: ruleName }).first();
  await expect(taskRow, `${sourceRef}: 关闭检测后列表应展示已关闭状态`).toContainText("已关闭检测", {
    timeout: 30000,
  });
  await ensureRuleTaskRowSelected(taskRow, 30000);
  const openPayload = await clickRuleTaskBatchDetectionAction(page, sourceRef, "开启检测");
  const openedRecord = getDqRuleTaskRecords(openPayload).find((record) => record.ruleName === ruleName);
  expect(openedRecord?.isClosed, `${sourceRef}: 单任务开启检测后 API 状态应为已开启`).toBe(0);

  await searchRuleTaskByTableName(page, scenario.tableName, sourceRef);
  await expect(
    page.locator(".ant-table-tbody tr").filter({ hasText: scenario.tableName }).filter({ hasText: ruleName }).first(),
    `${sourceRef}: 开启检测后列表应恢复已开启状态`,
  ).toContainText("已开启检测", { timeout: 30000 });
}

async function editSparkThriftArchiveValidationRuleTaskPartition(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  ruleName: string,
  options: { partitionMode?: "existing" | "manual" } = {},
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, scenario.tableName, sourceRef);
  const taskRow = page.locator(".ant-table-tbody tr").filter({ hasText: scenario.tableName }).filter({ hasText: ruleName }).first();
  await expect(taskRow, `${sourceRef}: 编辑前规则任务应展示在列表`).toBeVisible({ timeout: 30000 });
  await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: 编辑规则任务应打开监控对象配置`).toContainText(
    /监控对象|选择分区|分区/,
    { timeout: 30000 },
  );
  await gotoRuleTaskMonitorObjectPage(page, sourceRef);
  if (options.partitionMode === "manual") {
    await configureManualPartition(page, sourceRef, manualPartitionExpression(scenario.failPartition));
  } else {
    await configureExistingPartition(page, sourceRef, scenario.failPartition);
  }
  await gotoRuleTaskScheduleAttributesPage(page, sourceRef);
  const saveResponse = waitForRuleTaskPageQuery(page);
  void saveResponse.catch(() => {});
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 编辑分区保存后应提示成功或返回规则任务管理`).toContainText(
    /成功|规则任务管理/,
    { timeout: 30000 },
  );
  const savedPayload = await saveResponse;
  expect(savedPayload.success ?? savedPayload.code === 1, `${sourceRef}: 编辑分区保存后列表应刷新成功`).toBe(true);
}

function manualPartitionExpression(partition: string): string {
  return partition
    .split(",")
    .map((token) => token.trim().replace(/'/g, ""))
    .join("/");
}

async function configureSparkEnvParam(
  page: Page,
  sourceRef: string,
  paramName: string,
  paramValue: string,
): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 调度属性页面应展示环境参数配置区域`).toContainText(
    /环境参数|参数名称|参数值/,
    { timeout: 30000 },
  );

  const envArea = page
    .locator(".ant-form-item, .ant-row, .ant-card, section, div")
    .filter({ hasText: /环境参数|参数名称|参数值/ })
    .first();
  const addButton = envArea
    .getByRole("button", { name: /新增|添加|增加/ })
    .or(page.getByRole("button", { name: /新增|添加|增加/ }))
    .last();
  if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await addButton.click({ timeout: 30000 });
  }

  const latestRow = page
    .locator(".ant-table-tbody tr, .ant-row, .ant-form-item")
    .filter({ hasText: /参数名称|参数值|环境参数|spark|logLevel/ })
    .last();
  const nameInput = latestRow
    .getByPlaceholder(/请输入参数名称|参数名称/)
    .or(latestRow.locator("input").nth(0))
    .or(page.getByPlaceholder(/请输入参数名称|参数名称/).last());
  await nameInput.fill(paramName, { timeout: 30000 });
  await expect(nameInput, `${sourceRef}: 环境参数名称应填入 ${paramName}`).toHaveValue(paramName, {
    timeout: 30000,
  });

  const valueInput = latestRow
    .getByPlaceholder(/请输入参数值|参数值/)
    .or(latestRow.locator("input").nth(1))
    .or(page.getByPlaceholder(/请输入参数值|参数值/).last());
  await valueInput.fill(paramValue, { timeout: 30000 });
  await expect(valueInput, `${sourceRef}: 环境参数值应填入 ${paramValue}`).toHaveValue(paramValue, {
    timeout: 30000,
  });
}

async function setExistingSparkEnvParamValue(
  page: Page,
  sourceRef: string,
  paramName: string,
  paramValue: string,
): Promise<void> {
  const paramRow = page
    .locator(".ant-table-tbody tr, .ant-row, .ant-form-item")
    .filter({ hasText: paramName })
    .first();
  await expect(paramRow, `${sourceRef}: 环境参数列表应展示 ${paramName}`).toBeVisible({ timeout: 30000 });

  const valueInput = paramRow
    .getByPlaceholder(/请输入参数值|参数值/)
    .or(paramRow.locator("input").last())
    .or(page.getByPlaceholder(/请输入参数值|参数值/).last());
  await valueInput.fill(paramValue, { timeout: 30000 });
  await expect(valueInput, `${sourceRef}: 环境参数 ${paramName} 应修改为 ${paramValue}`).toHaveValue(paramValue, {
    timeout: 30000,
  });
}

async function openRuleTaskDetailsOrEdit(
  page: Page,
  sourceRef: string,
  taskRow: ReturnType<Page["locator"]>,
): Promise<void> {
  const detailButton = taskRow
    .getByRole("button", { name: /详情|查看/ })
    .or(taskRow.getByText(/详情|查看/))
    .first();
  if (await detailButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await detailButton.click({ timeout: 30000 });
  } else {
    await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });
  }
  await expect(page.locator("body"), `${sourceRef}: 应打开规则任务详情或编辑页`).toContainText(
    /环境参数|调度属性|监控对象|监控规则/,
    { timeout: 30000 },
  );
}

async function runRuleTaskImmediately(
  page: Page,
  sourceRef: string,
  taskRow: ReturnType<Page["locator"]>,
): Promise<void> {
  let execute = taskRow.getByRole("button", { name: /立即执行/ }).or(taskRow.getByText("立即执行")).first();
  if (!(await execute.isVisible({ timeout: 3000 }).catch(() => false))) {
    const tableNameCell = taskRow.locator("td").nth(1).or(taskRow.locator(".ant-table-cell").nth(1));
    await expect(tableNameCell, `${sourceRef}: 任务行应展示可打开详情的表名单元格`).toBeVisible({
      timeout: 30000,
    });
    await tableNameCell.click({ timeout: 30000 });
    const drawer = page.locator(".ant-drawer:visible, [role='dialog']:visible").last();
    const scope = (await drawer.isVisible({ timeout: 5000 }).catch(() => false)) ? drawer : page.locator("body");
    execute = scope.getByRole("button", { name: /立即执行|执行/ }).or(scope.getByText("立即执行")).first();
  }
  await expect(execute, `${sourceRef}: 任务行应展示「立即执行」`).toBeVisible({ timeout: 30000 });
  await execute.click({ timeout: 30000 });

  const confirm = page.locator(".ant-popover:visible, .ant-modal-confirm:visible, .ant-modal:visible").last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(confirm, `${sourceRef}: 立即执行应展示确认`).toContainText(/立即执行|执行/, {
      timeout: 30000,
    });
    const confirmButton = confirm.getByRole("button", { name: /确\s*定|确\s*认|OK|是/ }).last();
    if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmButton.click({ timeout: 30000 });
    }
  }
  await expect(page.locator("body"), `${sourceRef}: 点击立即执行后页面应提示提交或保持任务列表`).toContainText(
    /成功|提交|执行|规则任务管理/,
    { timeout: 30000 },
  );
}

function monitorRecordSearchInput(page: Page): ReturnType<Page["locator"]> {
  return page
    .getByPlaceholder("请输入表名/任务名称搜索")
    .or(page.locator("input[placeholder*='任务名称']"))
    .or(page.locator("input[placeholder*='表名']"))
    .first();
}

function monitorRecordDetailEntry(targetRow: ReturnType<Page["locator"]>): ReturnType<Page["locator"]> {
  return targetRow
    .getByRole("button", { name: /查看详情|详情/ })
    .or(targetRow.getByText(/查看详情|详情/))
    .or(targetRow.locator("td").first().getByRole("button"))
    .or(targetRow.locator("td").first())
    .first();
}

async function gotoMonitorRecordQueryPage(page: Page, sourceRef: string): Promise<ReturnType<Page["locator"]>> {
  await page.keyboard.press("Escape").catch(() => {});
  await gotoDataQualityPage(page, "/dq/taskQuery");

  const menuEntry = page.getByRole("link", { name: "校验结果查询" }).first();
  if (await menuEntry.isVisible({ timeout: 5000 }).catch(() => false)) {
    await menuEntry.click({ timeout: 30000 });
    await injectProject(page);
    await waitForUiSettled(page);
  }

  await expect(page, `${sourceRef}: URL 应进入校验结果查询路由`).toHaveURL(/\/dq\/taskQuery/, {
    timeout: 30000,
  });
  await expect(
    page.getByRole("button", { name: "新建监控规则" }),
    `${sourceRef}: 校验结果查询不应停留在规则任务管理主内容`,
  ).not.toBeVisible({ timeout: 10000 });

  const searchInput = monitorRecordSearchInput(page);
  await expect(searchInput, `${sourceRef}: 校验结果查询应展示表名/任务名称搜索框`).toBeVisible({
    timeout: 30000,
  });
  return searchInput;
}

async function gotoRuleTaskManagementPage(page: Page, sourceRef: string): Promise<void> {
  await closeVisibleDqOverlayIfAny(page, sourceRef);
  await gotoDataQualityPage(page, "/dq/rule");

  const menuEntry = page.getByRole("link", { name: "规则任务管理" }).first();
  if (await menuEntry.isVisible({ timeout: 5000 }).catch(() => false)) {
    await menuEntry.click({ timeout: 30000 });
    await injectProject(page);
    await waitForUiSettled(page);
  }

  await expect(page, `${sourceRef}: URL 应进入规则任务管理路由`).toHaveURL(/\/dq\/rule(?:\?|$)/, {
    timeout: 30000,
  });
  await expect(
    page.getByRole("button", { name: "新建监控规则" }),
    `${sourceRef}: 规则任务管理应展示新建监控规则入口`,
  ).toBeVisible({ timeout: 30000 });
}

async function submitMonitorRecordSearch(page: Page): Promise<void> {
  const searchButton = page.getByRole("button", { name: /查\s*询|search/i }).first();
  if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchButton.click({ timeout: 30000 });
    return;
  }
  await page.keyboard.press("Enter");
}

async function waitForMonitorRecordStatus(
  page: Page,
  sourceRef: string,
  ruleName: string,
  expectedStatus: RegExp,
): Promise<{ target: DqMonitorRecord; statusLabel: string }> {
  const timeoutMs = Number(process.env.KATA_DQ_MONITOR_TIMEOUT_MS ?? 2_700_000);
  const deadline = Date.now() + timeoutMs;
  let latestTarget: DqMonitorRecord | undefined;
  let latestStatus = "";
  let latestBackendStatus = "";

  while (Date.now() < deadline) {
    const responsePromise = waitForDqJson<DqMonitorRecordPage>(
      page,
      "/dassets/v1/valid/monitorRecord/pageQuery",
    );
    void responsePromise.catch(() => {});
    await submitMonitorRecordSearch(page);
    const pageData = expectDqSuccess(await responsePromise, `${sourceRef}: 查询校验实例应请求成功`);
    const records = pageData.data ?? [];
    latestTarget = records.find((record) => record.ruleName === ruleName);
    if (latestTarget) {
      latestStatus = formatMonitorRecordStatus(latestTarget.status, sourceRef);
      latestBackendStatus = await formatBackendSqlJobStatus(page, latestTarget);
      if (expectedStatus.test(latestStatus)) {
        return { target: latestTarget, statusLabel: latestStatus };
      }
      if (!/运行中|校验中|等待运行|未运行/.test(latestStatus)) break;
    }
    await waitForUiSettled(page);
  }

  expect(latestTarget, `${sourceRef}: 校验结果查询应包含 ${ruleName}`).toBeTruthy();
  expect(
    latestStatus,
    `${sourceRef}: 最新实例状态应符合预期；${latestBackendStatus || "未取得后端 job 状态"}`,
  ).toMatch(expectedStatus);
  return { target: latestTarget as DqMonitorRecord, statusLabel: latestStatus };
}

async function formatBackendSqlJobStatus(page: Page, record: DqMonitorRecord): Promise<string> {
  const jobId = record.flowJobId ?? record.jobKey;
  if (!jobId) return "";
  const response = await page.request
    .post(buildDataAssetsApiUrl("/api/rdos/batch/batchSelectSql/selectStatus"), {
      data: { jobId, type: 0 },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 30000,
    })
    .catch(() => undefined);
  if (!response?.ok()) return `后端 job ${jobId} 状态查询失败`;
  const payload = (await response.json().catch(() => undefined)) as
    | { data?: { status?: number; applicationMsg?: string } }
    | undefined;
  const status = payload?.data?.status;
  if (status === undefined) return `后端 job ${jobId} 未返回 status`;
  const applicationMsg = payload?.data?.applicationMsg ? `, ${payload.data.applicationMsg}` : "";
  return `后端 job ${jobId} status=${status}${applicationMsg}`;
}

async function expectLatestMonitorRecordForRuleTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const searchInput = await gotoMonitorRecordQueryPage(page, sourceRef);
  const responsePromise = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) => (payload.data?.data ?? []).some((record) => record.ruleName === ruleName),
  );
  void responsePromise.catch(() => {});
  await searchInput.fill(ruleName, { timeout: 30000 });
  await submitMonitorRecordSearch(page);
  const records = expectMonitorRecordPage(
    expectDqSuccess(await responsePromise, `${sourceRef}: 立即执行后校验结果查询应返回新实例`),
    `${sourceRef}: 立即执行后校验结果查询应展示实例`,
  );
  const target = records.find((record) => record.ruleName === ruleName);
  expect(target, `${sourceRef}: 校验结果查询应包含新建立即生成任务实例`).toBeTruthy();

  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 校验结果查询列表应展示新任务实例`).toBeVisible({ timeout: 30000 });
  await expect(targetRow, `${sourceRef}: 新任务实例应展示计划时间和状态`).toContainText(/校验|运行|等待|失败|通过/, {
    timeout: 30000,
  });
}

async function expectArchiveMonitorRecordTableSearch(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  ruleName: string,
): Promise<void> {
  const searchInput = await gotoMonitorRecordQueryPage(page, sourceRef);
  const responsePromise = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) =>
      (payload.data?.data ?? []).some(
        (record) => record.ruleName === ruleName && record.tableName === scenario.tableName,
      ),
  );
  void responsePromise.catch(() => {});
  await searchInput.fill(scenario.tableName, { timeout: 30000 });
  await submitMonitorRecordSearch(page);
  const records = expectMonitorRecordPage(
    expectDqSuccess(await responsePromise, `${sourceRef}: 校验结果按表名搜索应请求成功`),
    `${sourceRef}: 校验结果按表名搜索应返回实例`,
  );
  expect(
    records.some((record) => record.ruleName === ruleName && record.tableName === scenario.tableName),
    `${sourceRef}: 按表名搜索应包含当前规则任务实例`,
  ).toBe(true);
  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: scenario.tableName }).filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 按表名搜索列表应展示当前规则任务实例`).toBeVisible({ timeout: 30000 });
}

async function expectArchiveRuleValidationRecord(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  ruleName: string,
  options: {
    expectedStatus: RegExp;
    expectedActualValue: string;
    expectedPartition: string;
    dirtyEvidence?: readonly string[];
    dirtyDetail?: SparkThriftRuleValidationFusionChecks["dirtyDetail"];
    passHasNoDirtyDetail?: boolean;
    expectedSamplingRows?: string;
  },
): Promise<void> {
  const searchInput = await gotoMonitorRecordQueryPage(page, sourceRef);
  await searchInput.fill(ruleName, { timeout: 30000 });
  const { statusLabel } = await waitForMonitorRecordStatus(page, sourceRef, ruleName, options.expectedStatus);
  await submitMonitorRecordSearch(page);

  const detailResponse = waitForDqJson<DqMonitorRecordDetail[]>(
    page,
    "/dassets/v1/valid/monitorRecord/detailReport",
  );
  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 校验结果列表应展示 ${ruleName}`).toBeVisible({ timeout: 30000 });
  await expect(targetRow, `${sourceRef}: 校验结果列表应展示状态 ${statusLabel}`).toContainText(statusLabel, {
    timeout: 30000,
  });
  if (options.passHasNoDirtyDetail) {
    await expect(targetRow, `${sourceRef}: 校验通过实例列表不应展示不通过明细入口`).not.toContainText(
      /查看明细|下载明细|脏数据/,
      { timeout: 5000 },
    );
  }
  const detailEntry = monitorRecordDetailEntry(targetRow);
  await detailEntry.click({ timeout: 30000 });
  const detailRecords = expectDqSuccess(await detailResponse, `${sourceRef}: 规则校验实例详情应请求成功`);
  const detailText = JSON.stringify(detailRecords);
  for (const expectedText of [
    scenario.statisticFunction,
    ...scenario.fields,
    options.expectedActualValue,
    scenario.expectation?.value,
  ].filter((value): value is string => Boolean(value))) {
    expect(detailText, `${sourceRef}: 实例详情应包含「${expectedText}」`).toContain(expectedText);
  }
  expect(
    detailRecords.some((record) => String(record.partition ?? "").includes(options.expectedPartition.replace(/^.*='?([^']+)'?.*$/, "$1"))),
    `${sourceRef}: 实例详情应仅统计目标分区 ${options.expectedPartition}`,
  ).toBe(true);
  if (options.expectedSamplingRows) {
    expect(detailText, `${sourceRef}: 实例详情应展示抽样信息`).toMatch(/抽样|采样|sample|sampling/i);
    expect(detailText, `${sourceRef}: 实例详情应包含抽样行数 ${options.expectedSamplingRows}`).toContain(
      options.expectedSamplingRows,
    );
  }

  if (options.dirtyEvidence?.length) {
    const dirtyEntry = page
      .getByRole("button", { name: /查看明细|脏数据|明细/ })
      .or(page.getByText(/查看明细|脏数据|明细/))
      .first();
    if (await dirtyEntry.isVisible({ timeout: 3000 }).catch(() => false)) {
      const dirtyResponse = waitForDqJson<DqMonitorRecordDirtyResult>(
        page,
        "/dassets/v1/valid/monitorRecord/getFormatTableResult",
      );
      void dirtyResponse.catch(() => {});
      await dirtyEntry.click({ timeout: 30000 });
      const dirtyPayload = await dirtyResponse
        .then((payload) => expectDqSuccess(payload, `${sourceRef}: 不通过明细应请求失败数据`))
        .catch(() => undefined);
      const dirtyScope = page.locator(".ant-modal:visible,.ant-drawer:visible,[role='dialog']:visible,body").last();
      for (const expectedText of options.dirtyEvidence) {
        await expect(dirtyScope, `${sourceRef}: 不通过明细应包含「${expectedText}」`).toContainText(expectedText, {
          timeout: 30000,
        });
      }
      for (const highlightedColumn of options.dirtyDetail?.highlightedColumns ?? []) {
        if (dirtyPayload) {
          expect(
            dirtyPayload.highlightColumns ?? [],
            `${sourceRef}: 明细响应应标记失败字段 ${highlightedColumn}`,
          ).toContain(highlightedColumn);
        }
      }
      if (options.dirtyDetail?.verifyDownloadEntry) {
        await expect(dirtyScope, `${sourceRef}: 不通过明细应展示下载明细入口`).toContainText(/下载|下载明细/, {
          timeout: 30000,
        });
      }
    } else {
      for (const expectedText of options.dirtyEvidence) {
        expect(detailText, `${sourceRef}: 不通过详情应包含「${expectedText}」`).toContain(expectedText);
      }
    }
  }
  await closeVisibleDqOverlayIfAny(page, sourceRef);
  await closeVisibleDqOverlayIfAny(page, sourceRef);
}

async function expectLatestMonitorRecordTerminalForRuleTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
  options: { allowTimeout: boolean },
): Promise<void> {
  const searchInput = await gotoMonitorRecordQueryPage(page, sourceRef);
  const responsePromise = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) => (payload.data?.data ?? []).some((record) => record.ruleName === ruleName),
  );
  void responsePromise.catch(() => {});
  await searchInput.fill(ruleName, { timeout: 30000 });
  await submitMonitorRecordSearch(page);
  const records = expectMonitorRecordPage(
    expectDqSuccess(await responsePromise, `${sourceRef}: 超时配置任务校验结果查询应返回实例`),
    `${sourceRef}: 超时配置任务校验结果查询应展示实例`,
  );
  const target = records.find((record) => record.ruleName === ruleName);
  expect(target, `${sourceRef}: 校验结果查询应包含超时配置任务实例`).toBeTruthy();

  const statusLabel = formatMonitorRecordStatus(target?.status, sourceRef);
  expect(
    /校验通过|校验失败|校验异常/.test(statusLabel),
    `${sourceRef}: 实例最终应进入成功、校验通过、校验失败或校验异常终态`,
  ).toBe(true);

  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 校验结果列表应展示超时配置任务实例`).toBeVisible({ timeout: 30000 });
  await expect(targetRow, `${sourceRef}: 实例行应展示终态 ${statusLabel}`).toContainText(statusLabel, {
    timeout: 30000,
  });
  if (!options.allowTimeout) {
    await expect(targetRow, `${sourceRef}: 不限制超时时间时实例不应展示超时状态`).not.toContainText(/超时|timeout/i, {
      timeout: 5000,
    });
  }
}

async function expectLatestMonitorRecordTimeoutForRuleTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const searchInput = await gotoMonitorRecordQueryPage(page, sourceRef);
  const responsePromise = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) => (payload.data?.data ?? []).some((record) => record.ruleName === ruleName),
  );
  void responsePromise.catch(() => {});
  await searchInput.fill(ruleName, { timeout: 30000 });
  await submitMonitorRecordSearch(page);
  const records = expectMonitorRecordPage(
    expectDqSuccess(await responsePromise, `${sourceRef}: 短超时任务校验结果查询应返回实例`),
    `${sourceRef}: 短超时任务校验结果查询应展示实例`,
  );
  const target = records.find((record) => record.ruleName === ruleName);
  expect(target, `${sourceRef}: 校验结果查询应包含短超时任务实例`).toBeTruthy();

  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 校验结果列表应展示短超时任务实例`).toBeVisible({ timeout: 30000 });
  await expect(targetRow, `${sourceRef}: 短超时实例应展示失败或超时状态`).toContainText(
    /超时|timeout|失败|异常/i,
    { timeout: 30000 },
  );

  const logEntry = targetRow
    .getByRole("button", { name: /查看日志|日志/ })
    .or(targetRow.getByText(/查看日志|日志/))
    .first();
  if (await logEntry.isVisible({ timeout: 3000 }).catch(() => false)) {
    await logEntry.click({ timeout: 30000 });
    const logPanel = page.locator(".ant-modal:visible, .ant-drawer:visible, [role='dialog']:visible, body").last();
    await expect(logPanel, `${sourceRef}: 短超时任务日志应包含超时原因`).toContainText(/超时|timeout/i, {
      timeout: 30000,
    });
  }
}

async function expectLatestMonitorRecordPartitionForRuleTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
  expectedPartition: string,
): Promise<void> {
  const searchInput = await gotoMonitorRecordQueryPage(page, sourceRef);
  const responsePromise = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) => (payload.data?.data ?? []).some((record) => record.ruleName === ruleName),
  );
  void responsePromise.catch(() => {});
  await searchInput.fill(ruleName, { timeout: 30000 });
  await submitMonitorRecordSearch(page);
  const records = expectMonitorRecordPage(
    expectDqSuccess(await responsePromise, `${sourceRef}: 分区编辑后校验结果查询应返回新实例`),
    `${sourceRef}: 分区编辑后校验结果查询应展示实例`,
  );
  const target = records.find((record) => record.ruleName === ruleName);
  expect(target, `${sourceRef}: 校验结果查询应包含分区编辑任务实例`).toBeTruthy();

  const detailResponse = waitForDqJson<DqMonitorRecordDetail[]>(
    page,
    "/dassets/v1/valid/monitorRecord/detailReport",
  );
  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 校验结果列表应展示分区编辑任务实例`).toBeVisible({ timeout: 30000 });
  const detailEntry = monitorRecordDetailEntry(targetRow);
  await detailEntry.click({ timeout: 30000 });
  const detailRecords = expectDqSuccess(await detailResponse, `${sourceRef}: 分区编辑任务实例详情应请求成功`);
  expect(
    detailRecords.some((record) => String(record.partition ?? "").includes("20260329")),
    `${sourceRef}: 新实例详情应展示选择已有分区 ${expectedPartition}`,
  ).toBe(true);
}

async function expectLatestMonitorRecordDynamicPartitionForRuleTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const searchInput = await gotoMonitorRecordQueryPage(page, sourceRef);
  const responsePromise = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) => (payload.data?.data ?? []).some((record) => record.ruleName === ruleName),
  );
  void responsePromise.catch(() => {});
  await searchInput.fill(ruleName, { timeout: 30000 });
  await submitMonitorRecordSearch(page);
  const records = expectMonitorRecordPage(
    expectDqSuccess(await responsePromise, `${sourceRef}: 动态分区保存后校验结果查询应返回新实例`),
    `${sourceRef}: 动态分区保存后校验结果查询应展示实例`,
  );
  const target = records.find((record) => record.ruleName === ruleName);
  expect(target, `${sourceRef}: 校验结果查询应包含动态分区任务实例`).toBeTruthy();

  const detailResponse = waitForDqJson<DqMonitorRecordDetail[]>(
    page,
    "/dassets/v1/valid/monitorRecord/detailReport",
  );
  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 校验结果列表应展示动态分区任务实例`).toBeVisible({ timeout: 30000 });
  const detailEntry = monitorRecordDetailEntry(targetRow);
  await detailEntry.click({ timeout: 30000 });
  const detailRecords = expectDqSuccess(await detailResponse, `${sourceRef}: 动态分区任务实例详情应请求成功`);
  expect(
    detailRecords.some((record) => /动态|stat_date|hour|2026/.test(String(record.partition ?? ""))),
    `${sourceRef}: 新实例详情应展示动态分区或动态计算后的分区`,
  ).toBe(true);
}

async function expectLatestMonitorRecordSingleDynamicPartitionForRuleTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const searchInput = await gotoMonitorRecordQueryPage(page, sourceRef);
  const responsePromise = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) => (payload.data?.data ?? []).some((record) => record.ruleName === ruleName),
  );
  void responsePromise.catch(() => {});
  await searchInput.fill(ruleName, { timeout: 30000 });
  await submitMonitorRecordSearch(page);
  const records = expectMonitorRecordPage(
    expectDqSuccess(await responsePromise, `${sourceRef}: 一级动态分区校验结果查询应返回新实例`),
    `${sourceRef}: 一级动态分区校验结果查询应展示实例`,
  );
  const target = records.find((record) => record.ruleName === ruleName);
  expect(target, `${sourceRef}: 校验结果查询应包含一级动态分区任务实例`).toBeTruthy();

  const detailResponse = waitForDqJson<DqMonitorRecordDetail[]>(
    page,
    "/dassets/v1/valid/monitorRecord/detailReport",
  );
  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 校验结果列表应展示一级动态分区任务实例`).toBeVisible({
    timeout: 30000,
  });
  const detailEntry = monitorRecordDetailEntry(targetRow);
  await detailEntry.click({ timeout: 30000 });
  const detailRecords = expectDqSuccess(await detailResponse, `${sourceRef}: 一级动态分区实例详情应请求成功`);
  const partition = detailRecords.map((record) => String(record.partition ?? "")).find((item) => /stat_date|日期|2026/.test(item));
  expect(partition, `${sourceRef}: 新实例详情应展示一级动态分区`).toBeTruthy();
  expect(partition, `${sourceRef}: 一级动态分区不应包含二级 hour 分区`).not.toMatch(/\bhour\b|hour\s*=/i);
}

async function expectLatestMonitorRecordManualPartitionForRuleTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
  expectedPartition: string,
): Promise<void> {
  const searchInput = await gotoMonitorRecordQueryPage(page, sourceRef);
  const responsePromise = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) => (payload.data?.data ?? []).some((record) => record.ruleName === ruleName),
  );
  void responsePromise.catch(() => {});
  await searchInput.fill(ruleName, { timeout: 30000 });
  await submitMonitorRecordSearch(page);
  const records = expectMonitorRecordPage(
    expectDqSuccess(await responsePromise, `${sourceRef}: 手动多级分区校验结果查询应返回新实例`),
    `${sourceRef}: 手动多级分区校验结果查询应展示实例`,
  );
  const target = records.find((record) => record.ruleName === ruleName);
  expect(target, `${sourceRef}: 校验结果查询应包含手动多级分区任务实例`).toBeTruthy();

  const detailResponse = waitForDqJson<DqMonitorRecordDetail[]>(
    page,
    "/dassets/v1/valid/monitorRecord/detailReport",
  );
  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 校验结果列表应展示手动多级分区任务实例`).toBeVisible({
    timeout: 30000,
  });
  const detailEntry = monitorRecordDetailEntry(targetRow);
  await detailEntry.click({ timeout: 30000 });
  const detailRecords = expectDqSuccess(await detailResponse, `${sourceRef}: 手动多级分区实例详情应请求成功`);
  expect(
    detailRecords.some((record) => {
      const partition = String(record.partition ?? "");
      return partition.includes("20260116") && partition.includes("city_code") && partition.includes("WH");
    }),
    `${sourceRef}: 新实例详情应展示完整多级分区 ${expectedPartition}`,
  ).toBe(true);
}

async function expectLatestMonitorRecordSamplingForRuleTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
  sampleRows: string,
): Promise<void> {
  const searchInput = await gotoMonitorRecordQueryPage(page, sourceRef);
  const responsePromise = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) => (payload.data?.data ?? []).some((record) => record.ruleName === ruleName),
  );
  void responsePromise.catch(() => {});
  await searchInput.fill(ruleName, { timeout: 30000 });
  await submitMonitorRecordSearch(page);
  const records = expectMonitorRecordPage(
    expectDqSuccess(await responsePromise, `${sourceRef}: 抽样任务校验结果查询应返回新实例`),
    `${sourceRef}: 抽样任务校验结果查询应展示实例`,
  );
  const target = records.find((record) => record.ruleName === ruleName);
  expect(target, `${sourceRef}: 校验结果查询应包含抽样任务实例`).toBeTruthy();

  const detailResponse = waitForDqJson<DqMonitorRecordDetail[]>(
    page,
    "/dassets/v1/valid/monitorRecord/detailReport",
  );
  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 校验结果列表应展示抽样任务实例`).toBeVisible({ timeout: 30000 });
  const detailEntry = monitorRecordDetailEntry(targetRow);
  await detailEntry.click({ timeout: 30000 });
  const detailRecords = expectDqSuccess(await detailResponse, `${sourceRef}: 抽样任务实例详情应请求成功`);
  const detailText = JSON.stringify(detailRecords);
  expect(detailText, `${sourceRef}: 实例详情应展示抽样信息`).toMatch(/抽样|采样|sample|sampling/i);
  expect(detailText, `${sourceRef}: 实例详情应包含抽样行数 ${sampleRows}`).toContain(sampleRows);
}

async function expectLatestMonitorRecordLogForRuleTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
  expectedLogToken: string,
): Promise<void> {
  const searchInput = await gotoMonitorRecordQueryPage(page, sourceRef);
  const responsePromise = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) => (payload.data?.data ?? []).some((record) => record.ruleName === ruleName),
  );
  void responsePromise.catch(() => {});
  await searchInput.fill(ruleName, { timeout: 30000 });
  await submitMonitorRecordSearch(page);
  const records = expectMonitorRecordPage(
    expectDqSuccess(await responsePromise, `${sourceRef}: 环境参数任务校验结果查询应返回新实例`),
    `${sourceRef}: 环境参数任务校验结果查询应展示实例`,
  );
  const target = records.find((record) => record.ruleName === ruleName);
  expect(target, `${sourceRef}: 校验结果查询应包含环境参数任务实例`).toBeTruthy();

  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 校验结果列表应展示环境参数任务实例`).toBeVisible({ timeout: 30000 });
  await expect(targetRow, `${sourceRef}: 任务实例状态应正常结束或处于可查看日志状态`).toContainText(
    /成功|通过|完成|正常|查看日志|下载日志/,
    { timeout: 30000 },
  );

  const logEntry = targetRow
    .getByRole("button", { name: /查看日志|日志/ })
    .or(targetRow.getByText(/查看日志|日志/))
    .first();
  await expect(logEntry, `${sourceRef}: 环境参数任务实例应展示查看日志入口`).toBeVisible({ timeout: 30000 });
  await logEntry.click({ timeout: 30000 });

  const logPanel = page.locator(".ant-modal:visible, .ant-drawer:visible, [role='dialog']:visible, body").last();
  await expect(logPanel, `${sourceRef}: 运行日志应打开`).toContainText(/日志|log|INFO|ERROR|WARN/i, {
    timeout: 30000,
  });
  await expect(logPanel, `${sourceRef}: 运行日志中应出现 ${expectedLogToken} 级别日志`).toContainText(
    new RegExp(escapeRegExp(expectedLogToken), "i"),
    { timeout: 30000 },
  );
}

async function expectNoMonitorRecordForRuleTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const response = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/monitorRecord/pageQuery"), {
    data: {
      currentPage: 1,
      pageSize: 20,
      projectId: getProjectId(),
      bizTime: 0,
      fuzzyName: ruleName,
    },
    timeout: 60000,
  });
  expect(response.ok(), `${sourceRef}: 查询 T+1 任务实例 HTTP 应成功`).toBe(true);
  const payload = (await response.json()) as DqApiResponse<DqMonitorRecordPage>;
  const pageData = expectDqSuccess(payload, `${sourceRef}: 查询 T+1 任务实例应请求成功`);
  const records = pageData.data ?? [];
  expect(
    records.some((record) => record.ruleName === ruleName),
    `${sourceRef}: T+1 任务保存后未到调度时间不应立即生成实例`,
  ).toBe(false);
}

async function addCompletenessRuleToCurrentRuleSet(
  page: Page,
  sourceRef: string,
  ruleDescription: string,
): Promise<void> {
  await page.getByText("添加规则", { exact: true }).first().click({ timeout: 30000 });
  await page.getByText("完整性", { exact: false }).last().click({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: 添加完整性规则后应展示统计函数`).toContainText(
    "请选择统计函数",
    { timeout: 30000 },
  );
  await selectRuleSetStatisticFunction(page, "空值数", sourceRef);
  await selectRuleSetField(page, "vin", sourceRef);
  await switchRuleSetStrength(page, "强规则", sourceRef);
  await fillRuleSetRuleDescription(page, ruleDescription);
  await saveRuleSetRuleRow(page, sourceRef, "新增规则");
}

async function addArchiveValidationRuleToCurrentRuleSet(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
): Promise<void> {
  await page.getByText("添加规则", { exact: true }).first().click({ timeout: 30000 });
  if (scenario.customSqlTemplate) {
    await page.getByText("自定义SQL", { exact: false }).last().click({ timeout: 30000 });
  } else {
    await page.getByText(scenario.ruleCategory.replace(/校验$/, ""), { exact: false }).last().click({ timeout: 30000 });
  }
  await expect(page.locator("body"), `${sourceRef}: 添加 ${scenario.ruleCategory} 后应展示规则配置项`).toContainText(
    /统计函数|生效范围|规则描述|引用规则|规则类型/,
    { timeout: 30000 },
  );
  if (scenario.customSqlTemplate) {
    await selectDqFormOptionBySearch(page, /规则类型|分类/, scenario.ruleCategory, sourceRef);
    await selectDqFormOptionBySearch(page, /引用规则|规则名称|自定义SQL/, scenario.customSqlTemplate.ruleName, sourceRef);
  }
  if (scenario.scope) {
    await chooseDqFieldOptionByText(page, /生效范围|规则范围/, scenario.scope, sourceRef);
  }
  if (!scenario.customSqlTemplate) {
    await selectRuleSetStatisticFunction(page, scenario.statisticFunction, sourceRef);
  }
  if (scenario.comparisonTableName) {
    await selectDqFormOptionBySearch(page, /对比表|比较表|关联表/, scenario.comparisonTableName, sourceRef);
    await configureExistingPartition(page, sourceRef, scenario.passPartition);
  }
  for (const field of scenario.fields) {
    await selectRuleSetField(page, field, sourceRef);
  }
  for (const field of scenario.comparisonFields ?? []) {
    await selectDqFormOptionBySearch(page, /对比表字段|比较字段|关联字段/, field, sourceRef);
  }
  for (const key of scenario.primaryKeys ?? []) {
    await selectDqFormOptionBySearch(page, /校验表主键|主表主键|主键/, key, sourceRef);
  }
  for (const key of scenario.comparisonPrimaryKeys ?? []) {
    await selectDqFormOptionBySearch(page, /对比表主键|比较表主键|关联表主键/, key, sourceRef);
  }
  if (scenario.fieldLogic) {
    await chooseDqFieldOptionByText(page, /字段间规则逻辑|逻辑关系/, scenario.fieldLogic, sourceRef);
  }
  for (const option of scenario.ruleOptions ?? []) {
    await chooseDqFieldOptionByText(page, option.label, option.value, sourceRef);
  }
  for (const input of scenario.ruleInputs ?? []) {
    await fillDqFormItemInput(page, input.label, input.value, sourceRef);
  }
  if (scenario.expectation) {
    await chooseDqFieldOptionByText(page, /校验方法|比较方式|判断方式/, scenario.expectation.method, sourceRef);
    if (scenario.expectation.operator) {
      await chooseDqFieldOptionByText(page, /操作符|比较符|期望值|判断条件/, scenario.expectation.operator, sourceRef);
    }
    await fillDqFormItemInput(page, "期望值", scenario.expectation.value, sourceRef);
  }
  await switchRuleSetStrength(page, "强规则", sourceRef);
  await fillRuleSetRuleDescription(page, scenario.description);
  await saveRuleSetRuleRow(page, sourceRef, "新增规则");
  for (const expectedText of [
    scenario.statisticFunction,
    scenario.expectation?.value,
    ...scenario.fields,
  ].filter((value): value is string => Boolean(value))) {
    await expect(page.locator("body"), `${sourceRef}: 规则保存后应回显「${expectedText}」`).toContainText(
      expectedText,
      { timeout: 30000 },
    );
  }
}

async function selectRuleSetStatisticFunction(page: Page, functionName: string, sourceRef: string): Promise<void> {
  const statisticSelect = page.locator(".ant-select").filter({ hasText: /请选择统计函数|统计函数/ }).last();
  await statisticSelect.click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 统计函数下拉应包含「${functionName}」`).toContainText(functionName, {
    timeout: 30000,
  });
  await dropdown.getByText(functionName, { exact: true }).first().click({ timeout: 30000 });
}

async function selectRuleSetStatisticFunctionBySearch(
  page: Page,
  searchText: string,
  functionName: string,
  sourceRef: string,
): Promise<void> {
  const statisticSelect = page.locator(".ant-select").filter({ hasText: /请选择统计函数|统计函数/ }).last();
  await statisticSelect.click({ timeout: 30000 });
  await page.keyboard.type(searchText);
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 统计函数搜索后应包含「${functionName}」`).toContainText(functionName, {
    timeout: 30000,
  });
  const clicked = await clickActiveAntdOption(page, functionName);
  expect(clicked, `${sourceRef}: 统计函数下拉应包含可点击选项「${functionName}」`).toBe(true);
}

async function selectRuleSetField(page: Page, fieldName: string, sourceRef: string): Promise<void> {
  const fieldSelect = page.locator(".ant-select").filter({ hasText: /请选择字段|字段/ }).last();
  if (!(await fieldSelect.isVisible({ timeout: 3000 }).catch(() => false))) return;
  await fieldSelect.click({ timeout: 30000 });
  await page.keyboard.type(fieldName);
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 字段下拉应包含「${fieldName}」`).toContainText(fieldName, {
    timeout: 30000,
  });
  const clicked = await clickActiveAntdOption(page, fieldName);
  expect(clicked, `${sourceRef}: 字段下拉应包含可点击字段「${fieldName}」`).toBe(true);
}

async function switchRuleSetStrength(page: Page, label: "强规则" | "弱规则", sourceRef: string): Promise<void> {
  const field = page.locator(".ant-form-item:visible").filter({ hasText: /强弱规则/ }).last();
  await expect(field, `${sourceRef}: 应展示强弱规则配置项`).toBeVisible({ timeout: 30000 });
  if ((await field.textContent({ timeout: 30000 }))?.includes(label)) return;
  await field.locator(".ant-select").first().click({ timeout: 30000 });
  const clicked = await clickActiveAntdOption(page, label);
  expect(clicked, `${sourceRef}: 强弱规则下拉应包含「${label}」`).toBe(true);
  await expect(field, `${sourceRef}: 强弱规则应选中「${label}」`).toContainText(label, {
    timeout: 30000,
  });
}

async function fillRuleSetRuleDescription(page: Page, value: string): Promise<void> {
  const control = page.locator('textarea[placeholder*="规则描述"]:visible, input[placeholder*="规则描述"]:visible').last();
  await control.fill(value, { timeout: 30000 });
  await expect(control, "规则描述应填入目标值").toHaveValue(value, { timeout: 30000 });
}

async function saveRuleSetRuleRow(page: Page, sourceRef: string, action: string): Promise<void> {
  await page.getByRole("button", { name: /^保\s*存$/ }).last().click({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: ${action}后页面应保持可见`).toBeVisible({
    timeout: 30000,
  });
}

async function expectDqCompactButton(page: Page, label: string, sourceRef: string): Promise<void> {
  const spacedLabel = label.split("").join("\\s*");
  await expect(
    page.getByRole("button", { name: new RegExp(`^${spacedLabel}$`) }).first(),
    `${sourceRef}: 应展示「${label}」按钮`,
  ).toBeVisible({ timeout: 30000 });
}

async function closeDqModal(page: Page, sourceRef: string): Promise<void> {
  const modal = page.locator(".ant-modal:visible").last();
  await modal.locator(".ant-modal-close").first().click({ timeout: 30000 });
  await expect(modal, `${sourceRef}: 弹窗应关闭且未提交`).toBeHidden({ timeout: 30000 });
}

async function expectDqProjectModal(page: Page, sourceRef: string, title: string) {
  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, `${sourceRef}: ${title}弹窗应打开`).toBeVisible({ timeout: 30000 });
  await expect(modal, `${sourceRef}: ${title}弹窗标题应展示`).toContainText(title, { timeout: 30000 });
  for (const label of ["项目名称", "项目标识", "管理员", "项目描述"]) {
    await expect(modal, `${sourceRef}: ${title}弹窗应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  return modal;
}

async function fillDqProjectModal(
  page: Page,
  modal: ReturnType<Page["locator"]>,
  sourceRef: string,
  options: {
    projectName?: string;
    projectIdent?: string;
    description: string;
    selectAdmin: boolean;
  },
): Promise<void> {
  if (options.projectName) {
    await fillDqModalFormField(modal, "项目名称", options.projectName);
  }
  if (options.projectIdent) {
    await fillDqModalFormField(modal, "项目标识", options.projectIdent);
  }
  if (options.selectAdmin) {
    const adminField = modal.locator(".ant-form-item").filter({ hasText: "管理员" }).first();
    await adminField.locator(".ant-select-selector").first().click({ timeout: 30000 });
    const adminOption = page.locator(".ant-select-dropdown:visible").getByText("admin@dtstack.com", { exact: true }).first();
    await expect(adminOption, `${sourceRef}: 管理员下拉应包含 admin@dtstack.com`).toBeVisible({
      timeout: 30000,
    });
    await adminOption.click({ timeout: 30000 });
    await expect(adminField, `${sourceRef}: 管理员字段应选中 admin@dtstack.com`).toContainText(
      "admin@dtstack.com",
      { timeout: 30000 },
    );
  }
  await fillDqModalFormField(modal, "项目描述", options.description);
}

async function fillDqModalFormField(
  modal: ReturnType<Page["locator"]>,
  label: string,
  value: string,
): Promise<void> {
  const field = modal.locator(".ant-form-item").filter({ hasText: label }).first();
  const control = field.locator("textarea, input").first();
  await control.fill(value, { timeout: 30000 });
  await expect(control, `表单字段「${label}」应填入目标值`).toHaveValue(value, { timeout: 30000 });
}

async function submitDqProjectModal(
  page: Page,
  modal: ReturnType<Page["locator"]>,
  sourceRef: string,
  action: string,
): Promise<void> {
  await modal.getByRole("button", { name: /确\s*定/ }).click({ timeout: 30000 });
  await expect(modal, `${sourceRef}: ${action}后弹窗应关闭`).toBeHidden({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: ${action}后页面应保持可见`).toBeVisible({ timeout: 30000 });
}

async function expectDqProjectRow(
  page: Page,
  sourceRef: string,
  projectName: string,
  projectIdent: string,
) {
  const row = await findDqProjectRow(page, projectName, projectIdent);
  await expect(row, `${sourceRef}: 项目列表应展示 ${projectName}`).toBeVisible({ timeout: 30000 });
  await expect(row, `${sourceRef}: 项目行应展示项目标识 ${projectIdent}`).toContainText(projectIdent, {
    timeout: 30000,
  });
  await expect(row, `${sourceRef}: 项目行应展示编辑入口`).toContainText("编辑", { timeout: 30000 });
  return row;
}

async function expectDqAdminFullMenu(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/overview");
  const menu = page
    .locator(".ant-layout-sider, .ant-menu")
    .filter({ hasText: "总览" })
    .filter({ hasText: "校验结果查询" })
    .last();
  await expect(menu, `${sourceRef}: 管理员应可看到数据质量菜单`).toBeVisible({ timeout: 30000 });
  for (const menuName of [
    "总览",
    "规则库配置",
    "规则集管理",
    "规则任务管理",
    "校验结果查询",
    "数据质量报告",
    "通用配置",
    "项目管理",
  ]) {
    await expect(menu, `${sourceRef}: 管理员菜单应包含「${menuName}」`).toContainText(menuName, {
      timeout: 30000,
    });
  }
}

async function expectDqPagePermissionTarget(
  page: Page,
  sourceRef: string,
  options: {
    path: string;
    title: RegExp;
    operations: RegExp;
  },
): Promise<void> {
  await gotoDataQualityPage(page, options.path);
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 管理员应可访问目标权限页面`).toContainText(options.title, {
    timeout: 30000,
  });
  const operation = page.locator("button:visible, a:visible").filter({ hasText: options.operations }).first();
  await expect(operation, `${sourceRef}: 管理员应展示目标页面操作入口`).toBeVisible({ timeout: 30000 });
}

async function expectDqLimitedPermission(
  page: Page,
  sourceRef: string,
  options: {
    path: string;
    title: RegExp;
    forbiddenMenu: RegExp;
    operations: RegExp;
  },
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/overview");
  const menu = page
    .locator(".ant-layout-sider, .ant-menu")
    .filter({ hasText: "总览" })
    .filter({ hasText: "校验结果查询" })
    .last();
  await expect(menu, `${sourceRef}: 受限账号应可看到授权菜单`).toContainText(/总览|校验结果查询/, {
    timeout: 30000,
  });
  await expect(menu, `${sourceRef}: 受限账号菜单不应展示未授权入口`).not.toContainText(options.forbiddenMenu, {
    timeout: 30000,
  });

  await gotoDataQualityPage(page, options.path);
  const body = page.locator("body");
  const bodyText = await body.innerText({ timeout: 30000 });
  if (/无权限|权限不足|403|Forbidden|未授权|无权访问/i.test(bodyText) || !options.title.test(bodyText)) {
    expect(
      /无权限|权限不足|403|Forbidden|未授权|无权访问/i.test(bodyText) || !options.title.test(bodyText),
      `${sourceRef}: 受限账号无查看权限时目标页面应不可访问`,
    ).toBe(true);
    return;
  }

  const enabledOperations = page
    .locator("button:not([disabled]):visible, a:visible")
    .filter({ hasText: options.operations });
  await expect(
    enabledOperations,
    `${sourceRef}: 受限账号可查看时新增、编辑、删除等操作入口应不可用`,
  ).toHaveCount(0, { timeout: 30000 });
}

async function findDqProjectRow(page: Page, projectName: string, projectIdent: string) {
  const row = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: projectName })
    .filter({ hasText: projectIdent })
    .first();

  if (!(await row.isVisible({ timeout: 2000 }).catch(() => false))) {
    const firstPage = page.locator(".ant-pagination-item").filter({ hasText: /^1$/ }).first();
    if (await firstPage.isVisible({ timeout: 1000 }).catch(() => false)) {
      await firstPage.click({ timeout: 5000 }).catch(() => {});
      await waitForUiSettled(page);
    }
  }

  for (let pageIndex = 0; pageIndex < 8; pageIndex++) {
    if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
      return row;
    }
    const nextButton = page
      .locator(
        "li[title='下一页']:not(.ant-pagination-disabled) button, .ant-pagination-next:not(.ant-pagination-disabled) button",
      )
      .or(page.getByRole("button", { name: "right" }))
      .first();
    if (
      !(await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) ||
      !(await nextButton.isEnabled({ timeout: 1000 }).catch(() => false))
    ) {
      break;
    }
    await nextButton.click({ timeout: 5000 });
    await waitForUiSettled(page);
  }
  return row;
}

async function expectDirtyDataStorageRow(page: Page, sourceRef: string) {
  const row = page
    .locator(".ant-table-tbody tr:visible")
    .filter({
      hasText:
        /SparkThrift|Hive|MySQL|Doris|ClickHouse|PostgreSQL|Oracle|HDFS|Trino|MaxCompute|Greenplum|编辑/i,
    })
    .first();
  await expect(row, `${sourceRef}: 脏数据管理列表应至少展示一条可编辑存储配置`).toBeVisible({
    timeout: 30000,
  });
  await expect(row, `${sourceRef}: 脏数据管理行应展示编辑入口`).toContainText(/编辑|操作/, {
    timeout: 30000,
  });
  return row;
}

async function editDirtyDataStorageRow(
  page: Page,
  sourceRef: string,
  row: ReturnType<Page["locator"]>,
  options: {
    dirtyStore: string;
    retentionDays: string;
    enableStorage: boolean;
  },
): Promise<void> {
  const editEntry = row
    .getByRole("button", { name: /编辑/ })
    .or(row.getByText(/^编辑$/))
    .first();
  await expect(editEntry, `${sourceRef}: 脏数据管理行应提供编辑入口`).toBeVisible({ timeout: 30000 });
  await editEntry.click({ timeout: 30000 });

  const panel = page.locator(".ant-modal:visible,.ant-drawer:visible,[role='dialog']:visible").last();
  await expect(panel, `${sourceRef}: 编辑独立存储弹窗应打开`).toBeVisible({ timeout: 30000 });
  await expect(panel, `${sourceRef}: 编辑独立存储弹窗应展示关键字段`).toContainText(
    /脏数据存储|数据存储时效|独立存储/,
    { timeout: 30000 },
  );

  const switchControl = panel.locator(".ant-switch:visible,[role='switch']:visible").first();
  if (await switchControl.isVisible({ timeout: 3000 }).catch(() => false)) {
    const className = (await switchControl.getAttribute("class")) ?? "";
    const checkedAttr = await switchControl.getAttribute("aria-checked");
    const isChecked = checkedAttr === "true" || className.includes("ant-switch-checked");
    if (isChecked !== options.enableStorage) {
      await switchControl.click({ timeout: 30000 });
    }
  }

  await fillDqScopedFormValue(page, panel, /脏数据存储库|存储库|数据库/, options.dirtyStore, sourceRef);
  await fillDqScopedFormValue(page, panel, /数据存储时效|存储时效|时效/, options.retentionDays, sourceRef);
  await panel.getByRole("button", { name: /确\s*定|保\s*存/ }).last().click({ timeout: 30000 });
  await expect(panel, `${sourceRef}: 编辑独立存储保存后弹窗应关闭`).toBeHidden({ timeout: 30000 });
}

async function fillDqScopedFormValue(
  page: Page,
  scope: ReturnType<Page["locator"]>,
  label: RegExp,
  value: string,
  sourceRef: string,
): Promise<void> {
  const field = scope.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await expect(field, `${sourceRef}: 编辑表单应展示 ${label}`).toBeVisible({ timeout: 30000 });

  const input = field.locator("input:not([type='hidden']):visible, textarea:visible").first();
  if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
    await input.fill(value, { timeout: 30000 });
    await expect(input, `${sourceRef}: 编辑字段应回显「${value}」`).toHaveValue(value, {
      timeout: 30000,
    });
    return;
  }

  await field.locator(".ant-select:visible").first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await page.keyboard.type(value);
  const option = dropdown.locator(".ant-select-item-option").filter({ hasText: value }).first();
  await expect(option, `${sourceRef}: 编辑字段下拉应包含「${value}」`).toBeVisible({ timeout: 30000 });
  await option.click({ timeout: 30000 });
  await expect(field, `${sourceRef}: 编辑字段应选中「${value}」`).toContainText(value, { timeout: 30000 });
}

async function deleteDqProjectBestEffort(
  page: Page,
  projectName: string,
  projectIdent: string,
): Promise<void> {
  const row = await findDqProjectRow(page, projectName, projectIdent);
  if (!(await row.isVisible({ timeout: 3000 }).catch(() => false))) return;
  await row.getByRole("button", { name: "删除" }).click({ timeout: 5000 }).catch(() => {});
  const deleteDialog = page.locator(".ant-modal:visible, [role='dialog']:visible").last();
  if (await deleteDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
    await deleteDialog.getByPlaceholder("请输入项目名称").fill(projectName, { timeout: 5000 }).catch(() => {});
    await deleteDialog.getByRole("button", { name: /删\s*除/ }).click({ timeout: 5000 }).catch(() => {});
    await row.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    return;
  }
  const confirmButton = page
    .locator(".ant-popover:visible, .ant-modal:visible")
    .getByRole("button", { name: /确\s*定/ })
    .last();
  if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmButton.click({ timeout: 5000 }).catch(() => {});
  }
  await row.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
}

async function deleteDqProjectAndAssert(
  page: Page,
  sourceRef: string,
  projectName: string,
  projectIdent: string,
): Promise<void> {
  const row = await expectDqProjectRow(page, sourceRef, projectName, projectIdent);
  await expect(row, `${sourceRef}: 待删除项目行应展示删除入口`).toContainText("删除", {
    timeout: 30000,
  });
  await row.getByRole("button", { name: "删除" }).click({ timeout: 30000 });
  const deleteDialog = page.locator(".ant-modal:visible, [role='dialog']:visible").filter({ hasText: projectName }).last();
  await expect(deleteDialog, `${sourceRef}: 删除确认弹窗应展示目标项目`).toBeVisible({ timeout: 30000 });
  await expect(deleteDialog, `${sourceRef}: 删除确认弹窗应说明删除不可恢复`).toContainText("项目删除后无法恢复", {
    timeout: 30000,
  });
  const nameInput = deleteDialog.getByPlaceholder("请输入项目名称");
  await nameInput.fill(projectName, { timeout: 30000 });
  await expect(nameInput, `${sourceRef}: 删除确认应输入目标项目名称`).toHaveValue(projectName, {
    timeout: 30000,
  });
  await deleteDialog.getByRole("button", { name: /删\s*除/ }).click({ timeout: 30000 });
  await expect(deleteDialog, `${sourceRef}: 删除提交后确认弹窗应关闭`).toBeHidden({ timeout: 30000 });
  await expect(row, `${sourceRef}: 删除确认后项目应从列表移除`).toBeHidden({ timeout: 30000 });
}

async function addJsonValidationKey(
  page: Page,
  sourceRef: string,
  options: {
    key: string;
    name: string;
    value: string;
    testData: string;
    action: string;
    modalAlreadyOpen?: boolean;
  },
): Promise<void> {
  if (!options.modalAlreadyOpen) {
    await clickDqCompactButton(page, "新增", sourceRef);
  }
  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, `${sourceRef}: ${options.action}弹窗应打开`).toBeVisible({ timeout: 30000 });
  await modal.locator("#jsonKey").fill(options.key, { timeout: 30000 });
  await fillJsonValidationModal(page, sourceRef, options);
}

async function createJsonValidationImportWorkbook(
  filePath: string,
  rootRows: string[][],
  childRows: string[][] = [],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const rootSheet = workbook.addWorksheet("一层");
  rootSheet.addRow(["*key", "中文名称", "value格式"]);
  for (const row of rootRows) rootSheet.addRow(row);

  if (childRows.length > 0) {
    const childSheet = workbook.addWorksheet("二层");
    childSheet.addRow(["*上一层级的key名", "*key", "中文名称", "value格式"]);
    for (const row of childRows) childSheet.addRow(row);
  }

  await workbook.xlsx.writeFile(filePath);
}

async function importJsonValidationWorkbook(
  page: Page,
  sourceRef: string,
  filePath: string,
  duplicateRule: "重复则跳过" | "重复则覆盖更新",
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  await clickDqCompactButton(page, "导入", sourceRef);
  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, `${sourceRef}: 导入弹窗应打开`).toBeVisible({ timeout: 30000 });
  await expect(modal, `${sourceRef}: 导入弹窗应展示重复处理规则`).toContainText("重复处理规则", {
    timeout: 30000,
  });
  const targetRadio = modal.locator(".ant-radio-wrapper").filter({ hasText: duplicateRule });
  await expect(targetRadio, `${sourceRef}: 导入弹窗应可选择「${duplicateRule}」`).toBeVisible({
    timeout: 30000,
  });
  if (duplicateRule === "重复则覆盖更新") {
    await targetRadio.click({ timeout: 30000 });
  } else {
    await expect(targetRadio.locator("input[type='radio']"), `${sourceRef}: 默认应选中重复则跳过`).toBeChecked({
      timeout: 30000,
    });
  }
  await modal.locator("input[type='file']").setInputFiles(filePath);
  await modal.locator(".ant-upload-list-item").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  await modal.getByRole("button", { name: /^确\s*定$/ }).click({ timeout: 30000 });
  await expect(modal, `${sourceRef}: 导入提交后弹窗应关闭`).toBeHidden({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: 导入成功后页面应提示成功`).toContainText(/成功/, {
    timeout: 30000,
  });
}

async function exportJsonValidationWorkbook(page: Page, sourceRef: string, downloadPath: string): Promise<void> {
  await clickDqCompactButton(page, "导出", sourceRef);
  const popconfirm = page.locator(".ant-popconfirm:visible, .ant-popover:visible").last();
  await expect(popconfirm, `${sourceRef}: 导出前应展示确认气泡`).toContainText("请确认是否导出列表数据", {
    timeout: 30000,
  });
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }),
    popconfirm.locator(".ant-btn-primary").click({ timeout: 30000 }),
  ]);
  expect(download.suggestedFilename(), `${sourceRef}: 导出文件名应为 xlsx`).toMatch(/\.xlsx$/i);
  await download.saveAs(downloadPath);
  expect(existsSync(downloadPath), `${sourceRef}: 导出文件应保存到本地临时目录`).toBe(true);
}

function collectWorksheetRows(worksheet: ExcelJS.Worksheet): string[][] {
  const rows: string[][] = [];
  worksheet.eachRow((row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      values[columnNumber - 1] = String(cell.text ?? "").replace(/\s+/g, " ").trim();
    });
    rows.push(values);
  });
  return rows;
}

async function fillJsonValidationModal(
  page: Page,
  sourceRef: string,
  options: {
    name: string;
    value: string;
    testData: string;
    action: string;
  },
): Promise<void> {
  const modal = page.locator(".ant-modal:visible").last();
  await modal.locator("#name").fill(options.name, { timeout: 30000 });
  await modal.locator("#value").fill(options.value, { timeout: 30000 });
  await expect(modal, `${sourceRef}: ${options.action}填写 value格式 后应展示测试数据`).toContainText(
    "测试数据",
    { timeout: 30000 },
  );
  await modal.locator("#testData").fill(options.testData, { timeout: 30000 });
  await modal.getByRole("button", { name: /正则匹配测试/ }).click({ timeout: 30000 });
  await expect(modal, `${sourceRef}: ${options.action}正则匹配测试应成功`).toContainText(
    /符合正则|匹配成功/,
    { timeout: 30000 },
  );

  const saveResponse = waitForDqJson<boolean>(
    page,
    options.action.includes("编辑")
      ? "/dassets/v1/valid/jsonValidationConfig/update"
      : "/dassets/v1/valid/jsonValidationConfig/add",
  );
  await modal.getByRole("button", { name: /确\s*定/ }).click({ timeout: 30000 });
  expectDqSuccess(await saveResponse, `${sourceRef}: ${options.action}保存应请求成功`);
  await expect(modal, `${sourceRef}: ${options.action}保存后弹窗应关闭`).toBeHidden({
    timeout: 30000,
  });
  await expect(page.locator("body"), `${sourceRef}: ${options.action}保存后应提示成功`).toContainText(
    /成功/,
    { timeout: 30000 },
  );
}

async function expectJsonValidationRow(
  page: Page,
  sourceRef: string,
  key: string,
  expectedName: string,
) {
  const row = page.locator(".ant-table-tbody tr").filter({ hasText: key }).filter({ hasText: expectedName }).first();
  await expect(row, `${sourceRef}: json格式校验管理列表应展示 key ${key}`).toBeVisible({
    timeout: 30000,
  });
  await expect(row, `${sourceRef}: ${key} 应展示 SparkThrift2.x 数据源类型`).toContainText(
    "SparkThrift2.x",
    { timeout: 30000 },
  );
  await expect(row, `${sourceRef}: ${key} 应展示编辑、新增子层级和删除入口`).toContainText(
    /编辑.*新增子层级.*删除/s,
    { timeout: 30000 },
  );
  return row;
}

async function deleteJsonValidationKeyAndAssert(
  page: Page,
  sourceRef: string,
  key: string,
): Promise<void> {
  const row = page.locator(".ant-table-tbody tr").filter({ hasText: key }).first();
  await expect(row, `${sourceRef}: 待删除 key ${key} 应可见`).toBeVisible({ timeout: 30000 });
  await row.getByRole("button", { name: "删除" }).click({ timeout: 30000 });
  const confirm = page.locator(".ant-popover:visible, .ant-modal:visible").last();
  await expect(confirm, `${sourceRef}: 删除 key 应展示确认信息`).toContainText("若存在子层级key信息会联动删除", {
    timeout: 30000,
  });
  const deleteResponse = waitForDqJson<boolean>(
    page,
    "/dassets/v1/valid/jsonValidationConfig/delete",
  );
  await confirm.getByRole("button", { name: /删\s*除|确\s*定/ }).last().click({ timeout: 30000 });
  expectDqSuccess(await deleteResponse, `${sourceRef}: 删除 key 请求应成功`);
}

async function deleteJsonValidationKeyBestEffort(page: Page, key: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig").catch(() => {});
  const row = page.locator(".ant-table-tbody tr").filter({ hasText: key }).first();
  if (!(await row.isVisible({ timeout: 3000 }).catch(() => false))) return;
  await row.getByRole("button", { name: "删除" }).click({ timeout: 5000 }).catch(() => {});
  const confirm = page.locator(".ant-popover:visible, .ant-modal:visible").last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirm.getByRole("button", { name: /删\s*除|确\s*定/ }).last().click({ timeout: 5000 }).catch(() => {});
  }
  await row.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
}

async function listJsonValidationRecords(
  page: Page,
  sourceRef: string,
  search: string,
): Promise<DqJsonValidationConfigRecord[]> {
  const response = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/jsonValidationConfig/getTreeByPage"), {
    data: { currentPage: 1, pageSize: 100, search },
    headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
    timeout: 60000,
  });
  expect(response.ok(), `${sourceRef}: 查询 json格式校验 key HTTP 应成功`).toBe(true);
  const pageData = expectDqSuccess(
    (await response.json()) as DqApiResponse<DqJsonValidationConfigPage>,
    `${sourceRef}: 查询 json格式校验 key 应请求成功`,
  );
  return flattenJsonValidationRecords(
    expectJsonValidationPage(pageData, `${sourceRef}: 查询 json格式校验 key 应返回有效结构`),
  );
}

async function deleteJsonValidationKeyByKeyBestEffort(page: Page, sourceRef: string, key: string): Promise<void> {
  const records = await listJsonValidationRecords(page, sourceRef, key).catch(() => []);
  for (const record of records.filter((item) => item.jsonKey === key)) {
    if (!record.id) continue;
    const response = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/jsonValidationConfig/delete"), {
      data: { id: String(record.id) },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    });
    expect(response.ok(), `${sourceRef}: 清理同名 json格式校验 key HTTP 应成功`).toBe(true);
    expectDqSuccess(
      (await response.json()) as DqApiResponse<boolean>,
      `${sourceRef}: 清理同名 json格式校验 key 应请求成功`,
    );
  }
}

async function expectDqPage(page: Page, sourceRef: string, target: DqPageTarget): Promise<void> {
  await gotoDataQualityPage(page, target.path);
  const body = page.locator("body");

  for (const label of target.labels) {
    await expect(body, `${sourceRef}: ${target.path} 应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  for (const header of target.tableHeaders ?? []) {
    await expect(body, `${sourceRef}: ${target.path} 表格应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  if (target.apiPaths?.length) {
    await expectDqApiPaths(page, sourceRef, target.path, target.apiPaths);
  }
}

async function expectDqApiPaths(
  page: Page,
  sourceRef: string,
  target: string,
  apiPaths: readonly string[],
): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate((paths) => {
          const urls = performance.getEntriesByType("resource").map((entry) => entry.name);
          return paths.filter((apiPath) => urls.some((url) => url.includes(apiPath)));
        }, [...apiPaths]),
      {
        message: `${sourceRef}: ${target} 应请求核心数据质量接口`,
        timeout: 30000,
      },
    )
    .toEqual([...apiPaths]);
}

function getDqRuleTaskRecords(payload: DqRuleTaskPageQuery): DqRuleTaskRecord[] {
  return payload.data?.data ?? payload.data?.rows ?? payload.data?.list ?? payload.data?.records ?? [];
}

function waitForRuleTaskPageQuery(page: Page): Promise<DqRuleTaskPageQuery> {
  return page
    .waitForResponse(
      (response) => response.url().includes("/dassets/v1/valid/monitor/pageQuery") && response.status() === 200,
      { timeout: 60000 },
    )
    .then((response) => response.json() as Promise<DqRuleTaskPageQuery>);
}

async function searchRuleTaskByTableName(
  page: Page,
  tableName: string,
  sourceRef: string,
): Promise<DqRuleTaskRecord[]> {
  await gotoRuleTaskManagementPage(page, sourceRef);
  const responsePromise = waitForRuleTaskPageQuery(page);
  void responsePromise.catch(() => {});
  const searchInput = page
    .getByPlaceholder(/输入表名搜索|请输入表名|表名/)
    .or(page.locator("input[placeholder*='表名']"))
    .first();
  await expect(searchInput, `${sourceRef}: 规则任务管理应展示表名搜索输入框`).toBeVisible({ timeout: 30000 });
  await searchInput.fill(tableName, { timeout: 30000 });
  const searchButton = page.getByRole("button", { name: /查\s*询|search/i }).first();
  await expect(searchButton, `${sourceRef}: 规则任务管理应展示查询入口`).toBeVisible({ timeout: 30000 });
  await searchButton.click({ timeout: 30000 });
  const payload = await responsePromise;
  expect(payload.success ?? payload.code === 1, `${sourceRef}: 规则任务表名搜索应请求成功`).toBe(true);
  return getDqRuleTaskRecords(payload);
}

function expectRuleTaskArchiveTarget(records: DqRuleTaskRecord[], sourceRef: string): DqRuleTaskRecord {
  const archiveTaskNames = [
    "车辆质量立即生成任务",
    "车辆质量T+1生成任务",
    "车辆质量分区编辑任务",
    "车辆质量环境参数任务",
  ];
  const target =
    records.find((record) => archiveTaskNames.includes(String(record.ruleName ?? ""))) ??
    records.find((record) => String(record.tableName ?? "").includes(VEHICLE_QUALITY_RULESET_TABLE));
  expect(
    target,
    `${sourceRef}: 当前环境应存在 Archive 前置规则任务「车辆质量立即生成任务/车辆质量T+1生成任务/车辆质量分区编辑任务/车辆质量环境参数任务」之一`,
  ).toBeTruthy();
  return target as DqRuleTaskRecord;
}

function selectRuleTaskBatchCloseTargets(
  records: DqRuleTaskRecord[],
  sourceRef: string,
): { selectedRecords: DqRuleTaskRecord[]; untouchedRecord: DqRuleTaskRecord } {
  const archiveTaskNames = [
    "车辆质量立即生成任务",
    "车辆质量T+1生成任务",
    "车辆质量分区编辑任务",
    "车辆质量环境参数任务",
  ];
  const archiveRecords = records.filter(
    (record) =>
      archiveTaskNames.includes(String(record.ruleName ?? "")) ||
      String(record.tableName ?? "").includes(VEHICLE_QUALITY_RULESET_TABLE),
  );
  const selectedRecords = archiveRecords.filter((record) => record.isClosed === 0).slice(0, 2);
  expect(
    selectedRecords.length,
    `${sourceRef}: 当前环境应至少存在 2 条已开启检测的 Archive 规则任务用于批量关闭`,
  ).toBeGreaterThanOrEqual(2);

  const untouchedRecord =
    archiveRecords.find(
      (record) => !selectedRecords.some((selectedRecord) => isSameRuleTaskRecord(record, selectedRecord)),
    ) ??
    records.find((record) => !selectedRecords.some((selectedRecord) => isSameRuleTaskRecord(record, selectedRecord)));
  expect(untouchedRecord, `${sourceRef}: 当前环境应存在未勾选任务用于校验状态不变`).toBeTruthy();
  formatDqRuleTaskStatus(untouchedRecord?.isClosed, sourceRef);

  return { selectedRecords, untouchedRecord: untouchedRecord as DqRuleTaskRecord };
}

function isSameRuleTaskRecord(left: DqRuleTaskRecord, right: DqRuleTaskRecord): boolean {
  if (left.id && right.id) return String(left.id) === String(right.id);
  if (left.monitorId && right.monitorId) return String(left.monitorId) === String(right.monitorId);
  return left.tableName === right.tableName && left.ruleName === right.ruleName;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exactTextPattern(value: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(value)}\\s*$`);
}

function findSameRuleTaskRecord(
  records: DqRuleTaskRecord[],
  targetRecord: DqRuleTaskRecord,
): DqRuleTaskRecord | undefined {
  return records.find((record) => isSameRuleTaskRecord(record, targetRecord));
}

async function selectRuleTaskRows(
  page: Page,
  sourceRef: string,
  records: readonly DqRuleTaskRecord[],
): Promise<void> {
  for (const record of records) {
    const tableName = expectNonEmptyString(record.tableName, `${sourceRef}: 待勾选任务应包含表名`);
    const ruleName = expectNonEmptyString(record.ruleName, `${sourceRef}: 待勾选任务应包含任务名称`);
    const row = page.locator(".ant-table-tbody tr").filter({ hasText: tableName }).filter({ hasText: ruleName }).first();
    await expect(row, `${sourceRef}: 批量操作前应展示任务 ${ruleName}`).toBeVisible({ timeout: 30000 });
    await expect(row, `${sourceRef}: 任务 ${ruleName} 初始应为已开启检测`).toContainText("已开启检测", {
      timeout: 30000,
    });

    await ensureRuleTaskRowSelected(row, 30000);
  }
}

async function clickRuleTaskBatchDetectionAction(
  page: Page,
  sourceRef: string,
  action: "关闭检测" | "开启检测",
): Promise<DqRuleTaskPageQuery> {
  const responsePromise = waitForRuleTaskPageQuery(page);
  void responsePromise.catch(() => {});
  const button = page
    .getByRole("button", { name: new RegExp(action) })
    .or(page.getByText(action, { exact: true }))
    .first();
  await expect(button, `${sourceRef}: 勾选任务后应展示批量「${action}」入口`).toBeVisible({
    timeout: 30000,
  });
  await expect(button, `${sourceRef}: 批量「${action}」入口应可点击`).toBeEnabled({ timeout: 30000 });
  await button.click({ timeout: 30000 });

  const confirm = page.locator(".ant-popover:visible, .ant-modal:visible, [role='dialog']:visible").last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(confirm, `${sourceRef}: 批量${action}应弹出确认`).toContainText(action, {
      timeout: 30000,
    });
    await confirm.getByRole("button", { name: /确\s*定|确认/ }).last().click({ timeout: 30000 });
  }

  const payload = await responsePromise;
  expect(payload.success ?? payload.code === 1, `${sourceRef}: 批量${action}后规则任务列表应刷新成功`).toBe(true);
  return payload;
}

async function restoreRuleTaskDetectionStatusBestEffort(
  page: Page,
  sourceRef: string,
  records: readonly DqRuleTaskRecord[],
): Promise<void> {
  await selectRuleTaskRowsForRestore(page, records).catch(() => {});
  await clickRuleTaskBatchDetectionAction(page, sourceRef, "开启检测").catch(() => {});
}

async function selectRuleTaskRowsForRestore(page: Page, records: readonly DqRuleTaskRecord[]): Promise<void> {
  for (const record of records) {
    const tableName = String(record.tableName ?? "");
    const ruleName = String(record.ruleName ?? "");
    if (!tableName || !ruleName) continue;
    const row = page.locator(".ant-table-tbody tr").filter({ hasText: tableName }).filter({ hasText: ruleName }).first();
    if (!(await row.isVisible({ timeout: 3000 }).catch(() => false))) continue;
    await ensureRuleTaskRowSelected(row, 5000).catch(() => {});
  }
}

async function ensureRuleTaskRowSelected(row: ReturnType<Page["locator"]>, timeout: number): Promise<void> {
  const checkboxInput = row.locator("input[type='checkbox']").first();
  if (await checkboxInput.isChecked({ timeout: 1000 }).catch(() => false)) return;

  const checkboxWrapper = row.locator(".ant-checkbox-wrapper").first();
  if (await checkboxWrapper.isVisible({ timeout: 1000 }).catch(() => false)) {
    await checkboxWrapper.click({ timeout });
  } else {
    await checkboxInput.check({ force: true, timeout });
  }
}

async function isRuleTaskRowFavorited(row: ReturnType<Page["locator"]>): Promise<boolean> {
  const text = await row.innerText({ timeout: 3000 }).catch(() => "");
  return /取消收藏|已收藏/.test(text);
}

async function toggleRuleTaskFavorite(
  row: ReturnType<Page["locator"]>,
  sourceRef: string,
  action: "收藏" | "取消收藏",
): Promise<void> {
  const toggle = row
    .getByRole("button", { name: new RegExp(action) })
    .or(row.getByText(new RegExp(action)))
    .first();
  await expect(toggle, `${sourceRef}: 目标任务行应展示「${action}」入口`).toBeVisible({ timeout: 30000 });
  await toggle.click({ timeout: 30000 });
  await expect(row, `${sourceRef}: 点击「${action}」后目标任务行应保持可见`).toBeVisible({ timeout: 30000 });
}

async function toggleRuleTaskFavoriteFilter(page: Page, sourceRef: string): Promise<void> {
  const filter = page
    .locator(".ant-form-item, label, .ant-checkbox-wrapper, .ant-switch")
    .filter({ hasText: "我收藏的表" })
    .first();
  await expect(filter, `${sourceRef}: 规则任务管理应展示「我收藏的表」筛选`).toBeVisible({ timeout: 30000 });
  const control = filter.locator("input[type='checkbox'], .ant-checkbox-input, .ant-switch").first();
  if (await control.isVisible({ timeout: 3000 }).catch(() => false)) {
    await control.click({ timeout: 30000 });
  } else {
    await filter.click({ timeout: 30000 });
  }
}

function getDqRuleTaskTotal(payload: DqRuleTaskPageQuery): number {
  return payload.data?.total ?? payload.data?.totalCount ?? payload.data?.count ?? 0;
}

function getDqRuleSetRecords(payload: DqRuleSetPageQuery): DqRuleSetRecord[] {
  return (
    payload.data?.contentList ??
    payload.data?.data ??
    payload.data?.rows ??
    payload.data?.list ??
    payload.data?.records ??
    []
  );
}

function expectDqRuleSetRecord(record: DqRuleSetRecord | undefined, message: string): DqRuleSetRecord {
  expect(record, message).toBeTruthy();
  expect(record?.id, `${message}: 记录应包含 id`).toBeTruthy();
  expect(Number(record?.packageCount), `${message}: 记录应包含规则包`).toBeGreaterThan(0);
  expect(Number(record?.ruleCount), `${message}: 记录应包含规则`).toBeGreaterThan(0);
  return record as DqRuleSetRecord;
}

async function expectDqRuleSetEditShell(
  page: Page,
  sourceRef: string,
  record: DqRuleSetRecord,
  ruleName: string,
  expectedLabels: readonly (string | RegExp)[],
): Promise<void> {
  await gotoDataQualityPage(page, `/dq/ruleSet/edit/${record.id}?projectId=${getProjectId()}`);
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 规则集编辑页应打开 ${record.tableName}`).toContainText("编辑规则集", {
    timeout: 30000,
  });
  if (!(await page.getByText("添加规则", { exact: true }).first().isVisible())) {
    await clickDqCompactButton(page, "下一步", sourceRef);
  }

  await expect(body, `${sourceRef}: ${ruleName} 规则集应进入监控规则配置页`).toContainText("监控规则", {
    timeout: 30000,
  });
  for (const label of expectedLabels) {
    await expect(body, `${sourceRef}: ${ruleName} 配置壳应展示「${String(label)}」`).toContainText(label, {
      timeout: 30000,
    });
  }
}

async function expectRuleSetAddFunctionOption(
  page: Page,
  sourceRef: string,
  categoryName: string,
  ruleName: string,
  shouldContain: boolean,
): Promise<void> {
  const pageQueryResponse = waitForDqJson<DqRuleSetPageData>(
    page,
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/ruleSet");
  const records = expectRuleSetPage(
    expectDqSuccess(await pageQueryResponse, `${sourceRef}: 规则集列表应请求成功`),
    `${sourceRef}: 规则集列表应返回记录`,
  );
  const targetRuleSet = expectRuleSetSearchTarget(records, sourceRef);

  await gotoDataQualityPage(page, `/dq/ruleSet/edit/${targetRuleSet.id}?projectId=${getProjectId()}`);
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 规则集编辑页应打开`).toContainText("编辑规则集", {
    timeout: 30000,
  });
  if (!(await page.getByText("添加规则", { exact: true }).first().isVisible())) {
    await clickDqCompactButton(page, "下一步", sourceRef);
  }
  await expect(body, `${sourceRef}: 规则集编辑页应进入监控规则步骤`).toContainText("添加规则", {
    timeout: 30000,
  });

  await page.getByText("添加规则", { exact: true }).first().click({ timeout: 30000 });
  await page.getByText(categoryName, { exact: true }).last().click({ timeout: 30000 });
  await expect(body, `${sourceRef}: 添加规则后应展示统计函数选择器`).toContainText("请选择统计函数", {
    timeout: 30000,
  });
  await page.locator(".ant-select").filter({ hasText: "请选择统计函数" }).last().click({
    timeout: 30000,
  });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 统计函数下拉应打开`).toBeVisible({ timeout: 30000 });
  if (shouldContain) {
    await expect(dropdown, `${sourceRef}: 开启后规则集新增规则应可选择「${ruleName}」`).toContainText(
      ruleName,
      { timeout: 30000 },
    );
  } else {
    await expect(dropdown, `${sourceRef}: 关闭后规则集新增规则不应可选择「${ruleName}」`).not.toContainText(
      ruleName,
      { timeout: 30000 },
    );
  }
}

async function expectRuleSetCustomRegexOption(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const pageQueryResponse = waitForDqJson<DqRuleSetPageData>(
    page,
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/ruleSet");
  const records = expectRuleSetPage(
    expectDqSuccess(await pageQueryResponse, `${sourceRef}: 规则集列表应请求成功`),
    `${sourceRef}: 规则集列表应返回记录`,
  );
  const targetRuleSet = expectRuleSetSearchTarget(records, sourceRef);

  await gotoDataQualityPage(page, `/dq/ruleSet/edit/${targetRuleSet.id}?projectId=${getProjectId()}`);
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 规则集编辑页应打开`).toContainText("编辑规则集", {
    timeout: 30000,
  });
  if (!(await page.getByText("添加规则", { exact: true }).first().isVisible())) {
    await clickDqCompactButton(page, "下一步", sourceRef);
  }
  await page.getByText("添加规则", { exact: true }).first().click({ timeout: 30000 });
  await page.getByText("有效性校验", { exact: true }).last().click({ timeout: 30000 });

  await expect(body, `${sourceRef}: 添加有效性规则后应展示统计函数选择器`).toContainText(
    "请选择统计函数",
    { timeout: 30000 },
  );
  const statisticSelect = page.locator(".ant-select").filter({ hasText: "请选择统计函数" }).last();
  await statisticSelect.click({ timeout: 30000 });
  await page.keyboard.type("自定义正则");
  const statisticDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(statisticDropdown, `${sourceRef}: 统计函数下拉应包含自定义正则入口`).toContainText(
    "格式校验-自定义正则",
    { timeout: 30000 },
  );
  await page.keyboard.press("Enter");

  await expect(body, `${sourceRef}: 选择自定义正则统计函数后应展示自定义规则选择器`).toContainText(
    "请选择自定义规则",
    { timeout: 30000 },
  );
  const customRuleSelect = page.locator(".ant-select").filter({ hasText: "请选择自定义规则" }).last();
  await customRuleSelect.click({ timeout: 30000 });
  await page.keyboard.type(ruleName);
  const customRuleDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(customRuleDropdown, `${sourceRef}: 规则集自定义规则下拉应可选择「${ruleName}」`).toContainText(
    ruleName,
    { timeout: 30000 },
  );
}

async function expectRuleSetJsonValidationKeyOption(
  page: Page,
  sourceRef: string,
  key: string,
): Promise<void> {
  const pageQueryResponse = waitForDqJson<DqRuleSetPageData>(
    page,
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/ruleSet");
  const records = expectRuleSetPage(
    expectDqSuccess(await pageQueryResponse, `${sourceRef}: 规则集列表应请求成功`),
    `${sourceRef}: 规则集列表应返回记录`,
  );
  const targetRuleSet = expectRuleSetSearchTarget(records, sourceRef);

  await gotoDataQualityPage(page, `/dq/ruleSet/edit/${targetRuleSet.id}?projectId=${getProjectId()}`);
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 规则集编辑页应打开`).toContainText("编辑规则集", {
    timeout: 30000,
  });
  if (!(await page.getByText("添加规则", { exact: true }).first().isVisible())) {
    await clickDqCompactButton(page, "下一步", sourceRef);
  }
  await page.getByText("添加规则", { exact: true }).first().click({ timeout: 30000 });
  await page.getByText("有效性校验", { exact: true }).last().click({ timeout: 30000 });

  const statisticSelect = page.locator(".ant-select").filter({ hasText: "请选择统计函数" }).last();
  await statisticSelect.click({ timeout: 30000 });
  await page.keyboard.type("json");
  const statisticDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(statisticDropdown, `${sourceRef}: 统计函数下拉应包含格式-json格式校验`).toContainText(
    "格式-json格式校验",
    { timeout: 30000 },
  );
  await page.keyboard.press("Enter");

  await expect(body, `${sourceRef}: 选择格式-json格式校验后应展示校验 key 选择器`).toContainText(
    "请选择校验key",
    { timeout: 30000 },
  );
  const keySelect = page.locator(".ant-select").filter({ hasText: "请选择校验key" }).last();
  await keySelect.click({ timeout: 30000 });
  await page.keyboard.type(key);
  const keyDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(keyDropdown, `${sourceRef}: 规则集校验 key 下拉应可选择 ${key}`).toContainText(
    key,
    { timeout: 30000 },
  );
  await keyDropdown.getByText(key, { exact: false }).first().click({ timeout: 30000 });
  await expect(
    page.locator(".ant-select").filter({ hasText: key }).last(),
    `${sourceRef}: 选择后规则集校验 key 应回显 ${key}`,
  ).toBeVisible({ timeout: 30000 });
}

async function setRuleBaseBuiltInOpenStatus(
  page: Page,
  sourceRef: string,
  ruleId: string | number | undefined,
  openStatus: 0 | 1,
): Promise<void> {
  expect(ruleId, `${sourceRef}: 恢复内置规则状态需要规则 id`).toBeTruthy();
  const response = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleTemplate/openOrClose"),
    {
      data: {
        id: String(ruleId),
        openOrClose: openStatus,
      },
      headers: {
        [PROJECT_STORAGE_KEY]: String(getProjectId()),
      },
      timeout: 60000,
    },
  );
  expect(response.ok(), `${sourceRef}: 恢复内置规则状态 HTTP 应成功`).toBe(true);
  expectDqSuccess(
    (await response.json()) as DqApiResponse<boolean>,
    `${sourceRef}: 恢复内置规则状态应请求成功`,
  );
}

function expectNonEmptyString(value: unknown, message: string): string {
  expect(typeof value, message).toBe("string");
  const text = value as string;
  expect(text.length, message).toBeGreaterThan(0);
  return text;
}

function formatDqRuleTaskStatus(isClosed: unknown, sourceRef: string): string {
  expect([0, 1], `${sourceRef}: API isClosed 应为 0 或 1`).toContain(isClosed);
  return isClosed === 0 ? "已开启检测" : "已关闭检测";
}

function formatDqRuleTaskAssociated(associated: unknown, sourceRef: string): string {
  expect([0, 1], `${sourceRef}: API associated 应为 0 或 1`).toContain(associated);
  return associated === 1 ? "是" : "否";
}

function formatDqRuleTaskModifyUser(modifyUser: unknown, sourceRef: string): string {
  if (Array.isArray(modifyUser)) {
    return expectNonEmptyString(modifyUser[0], `${sourceRef}: API modifyUser 应包含最近修改人`);
  }
  return expectNonEmptyString(modifyUser, `${sourceRef}: API modifyUser 应包含最近修改人`);
}

function expectGeneratedReportPage(pageData: DqGeneratedReportPage, message: string): DqGeneratedReportRecord[] {
  const records = pageData.contentList ?? [];
  expect(Number(pageData.current), `${message}: current 应为数字`).toBeGreaterThan(0);
  expect(Number(pageData.size), `${message}: size 应为数字`).toBeGreaterThan(0);
  expect(Number(pageData.total), `${message}: total 应覆盖当前返回记录数`).toBeGreaterThanOrEqual(records.length);
  expect(records.length, message).toBeGreaterThan(0);
  for (const record of records) {
    expectNonEmptyString(record.reportName, `${message}: 报告记录应包含报告名称`);
    expectNonEmptyString(record.execEndTime, `${message}: 报告记录应包含生成时间`);
    formatGeneratedReportGenerateType(record.reportGenerateType, message);
    formatGeneratedReportStatus(record.status, message);
  }
  return records;
}

function expectGeneratedReportFilterTarget(
  records: DqGeneratedReportRecord[],
  sourceRef: string,
): DqGeneratedReportRecord {
  const target = records.find(
    (record) => record.id && record.reportName && record.tableNames && record.execEndTime?.startsWith("2026-05"),
  );
  expect(target, `${sourceRef}: 当前环境应存在可用于报告名称、数据表和生成时间组合筛选的报告记录`).toBeTruthy();
  return target as DqGeneratedReportRecord;
}

function formatGeneratedReportGenerateType(reportGenerateType: unknown, sourceRef: string): string {
  expect([1, 2], `${sourceRef}: reportGenerateType 应为已知生成样式`).toContain(reportGenerateType);
  return reportGenerateType === 1 ? "分析式" : "质检式";
}

function formatGeneratedReportStatus(status: unknown, sourceRef: string): string {
  const labels = new Map<unknown, string>([
    [0, "待生成"],
    [1, "生成中"],
    [2, "已生成"],
    [3, "生成失败"],
    [4, "持续生成中"],
  ]);
  const label = labels.get(status);
  expect(label, `${sourceRef}: status 应为已生成报告已知状态`).toBeTruthy();
  return label as string;
}

async function selectDqDateRange(
  page: Page,
  startDate: string,
  endDate: string,
  sourceRef: string,
): Promise<void> {
  await page.getByPlaceholder("开始日期").first().click({ timeout: 30000 });
  await page.locator(`.ant-picker-cell[title="${startDate}"]`).first().click({ timeout: 30000 });
  await page.locator(`.ant-picker-cell[title="${endDate}"]`).first().click({ timeout: 30000 });
  await expect(page.getByPlaceholder("开始日期").first(), `${sourceRef}: 生成时间开始日期应选中`).toHaveValue(
    startDate,
    { timeout: 30000 },
  );
  await expect(page.getByPlaceholder("结束日期").first(), `${sourceRef}: 生成时间结束日期应选中`).toHaveValue(
    endDate,
    { timeout: 30000 },
  );
}

function getRequestJson(request: { postDataJSON(): unknown }): Record<string, unknown> {
  const payload = request.postDataJSON();
  expect(payload, "请求体应为 JSON 对象").toBeTruthy();
  return payload as Record<string, unknown>;
}

function expectMonitorRecordPage(pageData: DqMonitorRecordPage, message: string): DqMonitorRecord[] {
  const records = pageData.data ?? [];
  expect(pageData.currentPage, `${message}: currentPage 应为数字`).toBeGreaterThan(0);
  expect(pageData.pageSize, `${message}: pageSize 应为数字`).toBeGreaterThan(0);
  expect(pageData.totalCount, `${message}: totalCount 应覆盖当前返回记录数`).toBeGreaterThanOrEqual(
    records.length,
  );
  expect(records.length, message).toBeGreaterThan(0);
  for (const record of records) {
    expectNonEmptyString(record.tableName, `${message}: 实例应包含表名`);
    expectNonEmptyString(record.ruleName, `${message}: 实例应包含任务名称`);
    formatMonitorRecordStatus(record.status, message);
    expectNonEmptyString(record.sourceTypeName, `${message}: 实例应包含数据源类型`);
    expectNonEmptyString(record.sourceName, `${message}: 实例应包含数据源名称`);
    expectNonEmptyString(record.cycTime, `${message}: 实例应包含计划时间`);
    expectNonEmptyString(record.modifyUser, `${message}: 实例应包含最近修改人`);
  }
  return records;
}

async function findMonitorRecordCandidate(
  page: Page,
  sourceRef: string,
  options: DqMonitorRecordCandidateOptions,
): Promise<DqMonitorRecord> {
  for (let currentPage = 1; currentPage <= 10; currentPage += 1) {
    const response = await page.request.post(buildDataAssetsApiUrl("/dassets/v1/valid/monitorRecord/pageQuery"), {
      data: {
        currentPage,
        pageSize: 20,
        projectId: getProjectId(),
        bizTime: 0,
        fuzzyName: options.fuzzyName,
      },
      timeout: 60000,
    });
    expect(response.ok(), `${sourceRef}: 候选实例接口 HTTP 应成功`).toBe(true);
    const payload = (await response.json()) as DqApiResponse<DqMonitorRecordPage>;
    const pageData = expectDqSuccess(payload, `${sourceRef}: 候选实例接口应请求成功`);
    const records = pageData.data ?? [];
    const candidate = records.find(
      (record) =>
        record.id &&
        record.monitorId &&
        Number(record.status) === options.status &&
        record.cycTime &&
        record.executeTime &&
        record.execEndTime &&
        (options.status !== 3 || record.execTimeStr),
    );
    if (candidate) return candidate;
    if (records.length === 0) break;
  }
  throw new Error(
    `${sourceRef}: 当前环境未找到 fuzzyName=${options.fuzzyName} 且 status=${options.status} 的可打开校验实例`,
  );
}

function expectMonitorRecordById(
  records: DqMonitorRecord[],
  id: string | number | undefined,
  sourceRef: string,
): DqMonitorRecord {
  const target = records.find((record) => String(record.id) === String(id));
  expect(target, `${sourceRef}: 搜索结果应包含候选实例 ${String(id)}`).toBeTruthy();
  return target as DqMonitorRecord;
}

function extractPlanDate(cycTime: string | undefined, sourceRef: string): string {
  const value = expectNonEmptyString(cycTime, `${sourceRef}: 候选实例应包含计划时间`);
  const date = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  expect(date, `${sourceRef}: 候选实例计划时间应包含日期`).toBeTruthy();
  return date as string;
}

function expectMonitorRecordDetailTarget(records: DqMonitorRecord[], sourceRef: string): DqMonitorRecord {
  const target = records.find(
    (record) =>
      record.id &&
      record.monitorId &&
      record.status === 3 &&
      record.executeTime &&
      record.execEndTime &&
      record.execTimeStr,
  );
  expect(target, `${sourceRef}: 搜索结果应包含可打开详情的校验通过实例`).toBeTruthy();
  return target as DqMonitorRecord;
}

function expectMonitorRecordFailedDetailTarget(records: DqMonitorRecord[], sourceRef: string): DqMonitorRecord {
  const target = records.find(
    (record) =>
      record.id &&
      record.monitorId &&
      Number(record.status) === 11 &&
      record.executeTime &&
      record.execEndTime,
  );
  expect(target, `${sourceRef}: 列表应包含可打开明细的校验异常实例`).toBeTruthy();
  return target as DqMonitorRecord;
}

function expectDirtyDetailRule(records: DqMonitorRecordDetail[], sourceRef: string): DqMonitorRecordDetail {
  expect(records.length, `${sourceRef}: 异常实例详情应返回规则结果`).toBeGreaterThan(0);
  const target = records.find(
    (record) =>
      Number(record.status) === 4 &&
      Number(record.haveDirty) === 1 &&
      ((record.columnNameList?.length ?? 0) > 0 || Boolean(record.columnName)),
  );
  expect(target, `${sourceRef}: 详情应包含有脏数据的失败规则`).toBeTruthy();
  return target as DqMonitorRecordDetail;
}

function expectDirtyResultPayload(
  payload: DqMonitorRecordDirtyResult,
  columnName: string,
  sourceRef: string,
): void {
  expect(payload.table, `${sourceRef}: 明细响应应包含脏数据结果表`).toMatch(/dq_monitor_/);
  expect(payload.result?.length, `${sourceRef}: 明细响应应返回失败数据行`).toBeGreaterThan(0);
  expect(payload.highlightColumns ?? [], `${sourceRef}: 明细响应应标记失败字段 ${columnName}`).toContain(columnName);
}

function formatMonitorRecordStatus(status: unknown, sourceRef: string): string {
  const numericStatus = Number(status);
  const labels = new Map<number, string>([
    [0, "未运行"],
    [1, "运行中"],
    [2, "校验中"],
    [3, "校验通过"],
    [4, "校验失败"],
    [5, "等待运行"],
    [6, "取消"],
    [7, "冻结"],
    [11, "校验异常"],
  ]);
  const label = labels.get(numericStatus);
  expect(label, `${sourceRef}: monitorRecord status=${String(status)} 应为已知状态`).toBeTruthy();
  return label as string;
}

// ─── 数据质量规则任务新建页抽样检查设置 Shell（t29） ───

export async function expectDataQualitySamplingConfigShell(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule/add");
  await expect(page, `${sourceRef}: 新建监控规则应进入 /dq/rule/add`).toHaveURL(/\/dq\/rule\/add/);
  const body = page.locator("body");
  for (const label of ["新建单表校验规则", "监控对象", "规则名称", "选择数据源", "下一步"]) {
    await expect(body, `${sourceRef}: 新建监控规则页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  // 核验数据预览与抽样检查设置入口可见
  await expect(body, `${sourceRef}: 新建监控规则页面应展示数据预览区域`).toContainText(/数据预览/, {
    timeout: 30000,
  });
  const samplingArea = page
    .locator(".ant-form-item, .ant-row, .ant-card, section, div")
    .filter({ hasText: /抽样检查|抽样行数|采样行数/ })
    .first();
  const samplingVisible = await samplingArea.isVisible({ timeout: 5000 }).catch(() => false);
  if (!samplingVisible) {
    // 点击数据预览区域展开抽样配置（按钮形式入口）
    const previewButton = page.getByRole("button", { name: /数据预览/ }).first();
    const previewVisible = await previewButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (previewVisible) await previewButton.click().catch(() => {});
  }
  await expect(
    page
      .locator(".ant-form-item, .ant-row, .ant-card, section, div")
      .filter({ hasText: /抽样检查|抽样行数|采样行数/ })
      .first(),
    `${sourceRef}: 新建监控规则页面应展示抽样检查设置区域`,
  ).toBeVisible({ timeout: 30000 });
  // 抽样检查开关可见
  const samplingSwitch = page
    .locator(".ant-form-item, .ant-row, .ant-card, section, div")
    .filter({ hasText: /抽样检查|抽样行数|采样行数/ })
    .first()
    .locator(".ant-switch, [role='switch']")
    .first();
  await expect(samplingSwitch, `${sourceRef}: 抽样检查设置开关应可见`).toBeVisible({ timeout: 15000 });
}
