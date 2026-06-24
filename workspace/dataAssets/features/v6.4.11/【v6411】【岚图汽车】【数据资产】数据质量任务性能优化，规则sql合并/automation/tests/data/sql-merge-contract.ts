import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { buildDataAssetsApiUrl, buildDataAssetsUrl } from "../../../../../../_shared/helpers/env-setup";

export const DQ_SQL_MERGE_PROJECT_ID = 92;
export const DQ_SQL_MERGE_SCHEMA = "pw_test";
export const DQ_SQL_MERGE_TABLE = "test_info_1";
export const DQ_SQL_MERGE_FULL_TABLE = `${DQ_SQL_MERGE_SCHEMA}.${DQ_SQL_MERGE_TABLE}`;
export const DQ_SQL_MERGE_DATASOURCE = "pw_test_HADOOP";
export const DQ_SQL_MERGE_SOURCE_TYPE = "SparkThrift2.x";
export const DQ_SQL_MERGE_TARGET_TASK =
  "可合并+不可合并+抽样开启+设置分区+不同过滤条件+包含强弱规则+多规则包";
export const DQ_SQL_MERGE_TARGET_PACKAGE =
  "可合并+不可合并+抽样开启+设置分区+相同过滤条件+包含强弱规则+多规则包";
export const DQ_SQL_MERGE_PARTITION = "dt=2026-06-04";

// test_info_1 规则集（id=549）实测的 6 个规则包名（盘点 SR-UI-PROBE-V6411-SQL-MERGE-16）
export const DQ_SQL_MERGE_PACKAGES = {
  mergeMulti: DQ_SQL_MERGE_TARGET_PACKAGE,
  completenessMergeable: "完整性可合并规则",
  completenessPass: "「完整性校验」-「多字段」-通过",
  completenessFail: "「完整性校验」-「多字段」-不通过",
  validityPass: "「有效性校验」-  全通过",
  validityFail: "「有效性校验」-  不通过",
} as const;

const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";
const DQ_PROJECT_STORAGE_KEY = "dq_project_id";
const MERGEABLE_FUNCTION_IDS = new Set(["1", "3", "4", "5", "6", "11", "12", "13", "14", "15", "16", "17", "20", "21", "25", "26", "30", "49"]);
const UNMERGEABLE_FUNCTION_IDS = new Set(["7", "8", "9", "10", "34", "39", "40", "41", "45", "46", "51"]);

export type DqApiResponse<T> = {
  success?: boolean;
  code?: number;
  data?: T;
  message?: string | null;
};

export type DqPageData<T> = {
  current?: number | string;
  size?: number | string;
  total?: number | string;
  totalCount?: number | string;
  contentList?: T[];
  data?: T[];
  rows?: T[];
  list?: T[];
  records?: T[];
};

export type DqRuleSetRecord = {
  id?: string | number;
  tableName?: string;
  schemaName?: string;
  sourceName?: string;
  sourceTypeName?: string;
  packageCount?: number | string;
  ruleCount?: number | string;
  dataSourceId?: string | number;
  packageVOList?: DqRuleSetPackage[];
};

export type DqRuleSetPackage = {
  packageName?: string;
  rules?: DqRule[];
};

export type DqRule = {
  id?: string | number;
  functionId?: string | number | null;
  functionName?: string | null;
  filterSql?: string | null;
  filter?: string | null;
  ruleStrength?: string | number | null;
  packageId?: string | number | null;
  isCustom?: string | number | null;
  customizeSql?: string | null;
  selectDataSql?: string | null;
  columnName?: string | null;
  columnNameList?: string[] | null;
  haveDirty?: string | number | null;
  partition?: string | null;
};

export type DqRuleTaskRecord = {
  id?: string | number;
  tableName?: string;
  ruleName?: string;
  sourceTypeName?: string;
  dataName?: string;
  periodTypeName?: string;
  assetsPeriodTypeName?: string;
  isClosed?: number;
  associated?: number;
  monitorPartVOS?: Array<{ monitorId?: string | number; partValue?: string | null }>;
};

export type DqMonitorRecord = {
  id?: string | number;
  monitorId?: string | number;
  tableName?: string;
  schemaName?: string;
  sourceName?: string;
  sourceTypeName?: string;
  ruleName?: string;
  partationValue?: string;
  status?: string | number;
  logInfo?: string;
  executeTime?: string;
  execEndTime?: string;
  cycTime?: string;
  periodTypeName?: string;
};

export type DqGeneratedReportRecord = {
  id?: string | number;
  reportName?: string;
  tableNames?: string;
  status?: string | number;
  reportType?: string | number;
};

type DqPostOptions = {
  sourceRef: string;
};

export async function gotoDqSqlMergeRoute(page: Page, routePath: string, sourceRef: string): Promise<void> {
  await page.goto(buildDataAssetsUrl(routePath, DQ_SQL_MERGE_PROJECT_ID), {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await injectDqProjectContext(page);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
  await expect(page, `${sourceRef}: 应进入 ${routePath} 路由`).toHaveURL(new RegExp(routePath.replace("/", "\\/")), {
    timeout: 30_000,
  });
}

export async function injectDqProjectContext(page: Page): Promise<void> {
  await page.evaluate(
    ({ projectId, projectKey, dqProjectKey }) => {
      window.localStorage.setItem(projectKey, projectId);
      window.localStorage.setItem(dqProjectKey, projectId);
      window.localStorage.setItem("current-project-id", projectId);
      window.sessionStorage.setItem(projectKey, projectId);
      window.sessionStorage.setItem(dqProjectKey, projectId);
      window.sessionStorage.setItem("current-project-id", projectId);
    },
    {
      projectId: String(DQ_SQL_MERGE_PROJECT_ID),
      projectKey: PROJECT_STORAGE_KEY,
      dqProjectKey: DQ_PROJECT_STORAGE_KEY,
    },
  );
}

export async function postDq<T>(
  request: APIRequestContext,
  pathname: string,
  data: unknown,
  options: DqPostOptions,
): Promise<T> {
  const response = await request.post(buildDataAssetsApiUrl(pathname), {
    data,
    headers: { [PROJECT_STORAGE_KEY]: String(DQ_SQL_MERGE_PROJECT_ID) },
    timeout: 60_000,
  });
  expect(response.ok(), `${options.sourceRef}: ${pathname} HTTP 应成功`).toBe(true);
  const payload = (await response.json()) as DqApiResponse<T>;
  expect(payload.success ?? payload.code === 1, `${options.sourceRef}: ${pathname} 应返回成功`).toBe(true);
  return expectDefined(payload.data, `${options.sourceRef}: ${pathname} 应返回 data`);
}

export async function queryRuleSetList(
  request: APIRequestContext,
  sourceRef: string,
): Promise<DqRuleSetRecord[]> {
  const pageData = await postDq<DqPageData<DqRuleSetRecord>>(
    request,
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
    { current: 1, size: 100, tableName: DQ_SQL_MERGE_TABLE },
    { sourceRef },
  );
  return getRows(pageData, sourceRef, "规则集列表");
}

export async function queryRuleSetDetail(
  request: APIRequestContext,
  ruleSetId: string | number,
  sourceRef: string,
): Promise<DqRuleSetRecord> {
  return postDq<DqRuleSetRecord>(
    request,
    "/dassets/v1/valid/monitorRuleSet/detail",
    { id: String(ruleSetId) },
    { sourceRef },
  );
}

export async function queryRuleTasks(
  request: APIRequestContext,
  sourceRef: string,
): Promise<DqRuleTaskRecord[]> {
  const pageData = await postDq<DqPageData<DqRuleTaskRecord>>(
    request,
    "/dassets/v1/valid/monitor/pageQuery",
    { current: 1, size: 100, tableName: DQ_SQL_MERGE_TABLE },
    { sourceRef },
  );
  return getRows(pageData, sourceRef, "规则任务列表");
}

export async function queryMonitorRecords(
  request: APIRequestContext,
  sourceRef: string,
  fuzzyName = DQ_SQL_MERGE_TARGET_TASK,
): Promise<DqMonitorRecord[]> {
  const pageData = await postDq<DqPageData<DqMonitorRecord>>(
    request,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    {
      currentPage: 1,
      pageSize: 20,
      projectId: DQ_SQL_MERGE_PROJECT_ID,
      bizTime: 0,
      fuzzyName,
    },
    { sourceRef },
  );
  return getRows(pageData, sourceRef, "校验实例列表");
}

export async function queryMonitorRecordDetail(
  request: APIRequestContext,
  record: DqMonitorRecord,
  sourceRef: string,
): Promise<DqRule[]> {
  const recordId = expectDefined(record.id, `${sourceRef}: 校验实例应包含 id`);
  const monitorId = expectDefined(record.monitorId, `${sourceRef}: 校验实例应包含 monitorId`);
  const rows = await postDq<DqRule[]>(
    request,
    "/dassets/v1/valid/monitorRecord/detailReport",
    { recordId: String(recordId), monitorId: String(monitorId) },
    { sourceRef },
  );
  expect(Array.isArray(rows), `${sourceRef}: detailReport data 应为数组`).toBe(true);
  return rows;
}

export async function queryGeneratedReports(
  request: APIRequestContext,
  sourceRef: string,
): Promise<DqGeneratedReportRecord[]> {
  const pageData = await postDq<DqPageData<DqGeneratedReportRecord>>(
    request,
    "/dassets/v1/valid/monitorReportRecord/pageList",
    { current: 1, size: 20, search: DQ_SQL_MERGE_TABLE },
    { sourceRef },
  );
  return getRows(pageData, sourceRef, "已生成报告列表");
}

export function expectTargetRuleSet(records: DqRuleSetRecord[], sourceRef: string): DqRuleSetRecord {
  const target = records.find(
    (record) => record.tableName === DQ_SQL_MERGE_TABLE && record.schemaName === DQ_SQL_MERGE_SCHEMA,
  );
  expect(target, `${sourceRef}: 应存在 ${DQ_SQL_MERGE_SCHEMA}.${DQ_SQL_MERGE_TABLE} 规则集`).toBeTruthy();
  const ruleSet = target as DqRuleSetRecord;
  expect(ruleSet.sourceName, `${sourceRef}: 规则集应使用目标数据源`).toBe(DQ_SQL_MERGE_DATASOURCE);
  expect(ruleSet.sourceTypeName, `${sourceRef}: 规则集应使用 SparkThrift2.x`).toBe(DQ_SQL_MERGE_SOURCE_TYPE);
  expect(Number(ruleSet.packageCount), `${sourceRef}: 单规则集规则包数量不应超过产品上限 20`).toBeLessThanOrEqual(20);
  expect(Number(ruleSet.packageCount), `${sourceRef}: test_info_1 规则集应包含多个规则包`).toBeGreaterThanOrEqual(1);
  expect(Number(ruleSet.ruleCount), `${sourceRef}: test_info_1 规则集应包含已配置规则`).toBeGreaterThanOrEqual(1);
  return ruleSet;
}

export function expectTargetRuleTask(records: DqRuleTaskRecord[], sourceRef: string): DqRuleTaskRecord {
  const target = records.find((record) => record.ruleName === DQ_SQL_MERGE_TARGET_TASK);
  expect(target, `${sourceRef}: 应存在目标规则任务「${DQ_SQL_MERGE_TARGET_TASK}」`).toBeTruthy();
  const task = target as DqRuleTaskRecord;
  expect(task.tableName, `${sourceRef}: 目标规则任务应绑定 ${DQ_SQL_MERGE_FULL_TABLE}`).toBe(
    DQ_SQL_MERGE_FULL_TABLE,
  );
  expect(task.sourceTypeName, `${sourceRef}: 目标规则任务应使用 SparkThrift2.x`).toBe(DQ_SQL_MERGE_SOURCE_TYPE);
  expect(task.dataName, `${sourceRef}: 目标规则任务应使用目标数据源`).toBe(DQ_SQL_MERGE_DATASOURCE);
  expect(task.isClosed, `${sourceRef}: 目标规则任务应开启检测`).toBe(0);
  expect(
    task.monitorPartVOS?.some((part) => String(part.monitorId) === String(task.id) && part.partValue === DQ_SQL_MERGE_PARTITION),
    `${sourceRef}: 目标规则任务应配置分区 ${DQ_SQL_MERGE_PARTITION}`,
  ).toBe(true);
  return task;
}

export function expectTargetMonitorRecord(records: DqMonitorRecord[], sourceRef: string): DqMonitorRecord {
  const target = records.find((record) => record.ruleName === DQ_SQL_MERGE_TARGET_TASK);
  expect(target, `${sourceRef}: 应存在目标规则任务的校验实例`).toBeTruthy();
  const record = target as DqMonitorRecord;
  expect(record.tableName, `${sourceRef}: 校验实例应来自 ${DQ_SQL_MERGE_FULL_TABLE}`).toBe(DQ_SQL_MERGE_FULL_TABLE);
  expect(record.sourceName, `${sourceRef}: 校验实例应使用目标数据源`).toBe(DQ_SQL_MERGE_DATASOURCE);
  expect(record.sourceTypeName, `${sourceRef}: 校验实例应使用 SparkThrift2.x`).toBe(DQ_SQL_MERGE_SOURCE_TYPE);
  expect(record.partationValue, `${sourceRef}: 校验实例应使用目标分区`).toBe(DQ_SQL_MERGE_PARTITION);
  expect(record.executeTime, `${sourceRef}: 校验实例应包含开始时间`).toMatch(/^\d{4}-\d{2}-\d{2}/);
  expect(record.execEndTime, `${sourceRef}: 校验实例应包含结束时间`).toMatch(/^\d{4}-\d{2}-\d{2}/);
  expect(record.logInfo ?? "", `${sourceRef}: 校验实例日志应包含通过/失败统计`).toMatch(
    /verification passes:\s*\d+[\s\S]*verification fails:\s*\d+/i,
  );
  return record;
}

export function expectRuleSetMergeShape(detail: DqRuleSetRecord, sourceRef: string): void {
  const packages = detail.packageVOList ?? [];
  expect(packages.length, `${sourceRef}: 规则集详情应返回规则包`).toBeGreaterThan(0);
  const targetPackage = packages.find((item) => item.packageName === DQ_SQL_MERGE_TARGET_PACKAGE);
  expect(targetPackage, `${sourceRef}: 应存在目标规则包「${DQ_SQL_MERGE_TARGET_PACKAGE}」`).toBeTruthy();

  const rules = targetPackage?.rules ?? [];
  expect(rules.length, `${sourceRef}: 目标规则包应包含多条子规则`).toBeGreaterThanOrEqual(10);
  for (const functionName of ["空值数", "空值率", "空串数", "空串率", "表行数"]) {
    expect(
      rules.some((rule) => rule.functionName === functionName),
      `${sourceRef}: 目标规则包应包含 ${functionName}`,
    ).toBe(true);
  }
  expect(
    rules.some((rule) => UNMERGEABLE_FUNCTION_IDS.has(String(rule.functionId))),
    `${sourceRef}: 目标规则包应同时包含不可合并函数，覆盖可合并+不可合并组合`,
  ).toBe(true);

  const mergeGroups = buildMergeCandidateGroups(rules);
  expect(
    mergeGroups.some((group) => group.rules.length >= 2 && group.ruleStrength === "1"),
    `${sourceRef}: 应存在同过滤条件的强规则可合并候选组`,
  ).toBe(true);
  expect(
    mergeGroups.some((group) => group.rules.length >= 2 && group.ruleStrength === "2"),
    `${sourceRef}: 应存在同过滤条件的弱规则可合并候选组`,
  ).toBe(true);
}

export function expectMonitorRecordSqlShape(detailRows: DqRule[], sourceRef: string): void {
  expect(detailRows.length, `${sourceRef}: 校验实例详情应返回多条规则明细`).toBeGreaterThanOrEqual(10);

  const sqlRows = detailRows.filter((rule) => rule.customizeSql || rule.selectDataSql);
  expect(sqlRows.length, `${sourceRef}: 规则明细应包含可检查的 SQL 片段`).toBeGreaterThan(0);
  expect(
    sqlRows.some((rule) => `${rule.customizeSql ?? ""} ${rule.selectDataSql ?? ""}`.includes("test_info_1_temp_sample_table")),
    `${sourceRef}: 抽样开启场景应使用 test_info_1_temp_sample_table 临时抽样表`,
  ).toBe(true);
  expect(
    sqlRows.some((rule) => `${rule.customizeSql ?? ""} ${rule.selectDataSql ?? ""}`.includes("dt='2026-06-04'")),
    `${sourceRef}: SQL 片段应包含分区谓词 dt='2026-06-04'`,
  ).toBe(true);
  expect(
    detailRows.some((rule) => normalizeSql(rule.filterSql).includes("id <= 100")),
    `${sourceRef}: 明细应保留手动过滤条件 id<=100`,
  ).toBe(true);

  const mergeGroups = buildMergeCandidateGroups(detailRows);
  expect(
    mergeGroups.some((group) => group.rules.length >= 2),
    `${sourceRef}: 实例详情应仍能按 function/filter/ruleStrength 识别可合并候选组`,
  ).toBe(true);

  const customRules = detailRows.filter((rule) => Number(rule.isCustom) === 1 || !rule.functionId);
  for (const customRule of customRules) {
    const sql = customRule.selectDataSql || customRule.customizeSql || "";
    expect(sql.trim(), `${sourceRef}: 自定义 SQL 规则执行 SQL 不应为空`).not.toBe("");
    expect(detectSqlDefect(sql), `${sourceRef}: 自定义 SQL 规则不应出现明显残缺 SQL: ${sql}`).toBe("");
  }
}

export function expectGeneratedReportShape(records: DqGeneratedReportRecord[], sourceRef: string): void {
  const targetReports = records.filter((record) => String(record.tableNames ?? "").includes(DQ_SQL_MERGE_TABLE));
  expect(targetReports.length, `${sourceRef}: 已生成报告应包含 ${DQ_SQL_MERGE_TABLE}`).toBeGreaterThan(0);
  expect(
    targetReports.some((record) => String(record.reportName ?? "").includes("完整性可合并规则")),
    `${sourceRef}: 已生成报告应包含完整性可合并规则报告`,
  ).toBe(true);
  for (const report of targetReports.slice(0, 5)) {
    expect(report.reportName, `${sourceRef}: 已生成报告应包含报告名称`).toMatch(/test_info_1/);
    expect(report.reportType, `${sourceRef}: 已生成报告应为单表或有效报告类型`).toBeTruthy();
    expect(String(report.status), `${sourceRef}: 已生成报告状态应为已生成`).toBe("1");
  }
}

// ─── SQL 合并「配置层 / 报告层」扩展契约（read-only，不触发执行）──────────
// 说明：以下断言验证规则集规则包的合并「前提」（function/filter/strength 组合、
// 可合并候选组识别）与质量报告产出分类；不验证运行时合并 SQL 文本（在校验实例
// 详情里，当前环境立即执行链路 504 受阻），也不验证 DB merge_group_key（需
// sql-merge-validate skill 用 DB 只读凭据）。

export async function queryTargetRuleSetDetail(
  request: APIRequestContext,
  sourceRef: string,
): Promise<DqRuleSetRecord> {
  return queryRuleSetDetailByTable(request, DQ_SQL_MERGE_TABLE, sourceRef);
}

// 按表名查规则集详情（pageQuery 返回全部规则集，按 tableName + schemaName 定位）
export async function queryRuleSetDetailByTable(
  request: APIRequestContext,
  tableName: string,
  sourceRef: string,
): Promise<DqRuleSetRecord> {
  const list = await queryRuleSetList(request, sourceRef);
  const target = list.find(
    (record) => record.tableName === tableName && record.schemaName === DQ_SQL_MERGE_SCHEMA,
  );
  const id = expectDefined(target?.id, `${sourceRef}: 应存在 ${DQ_SQL_MERGE_SCHEMA}.${tableName} 规则集`);
  return queryRuleSetDetail(request, id, sourceRef);
}

export type DqPackageConfigSpec = {
  name: string;
  minRules: number;
  strengths: string[];
};

// 验证某规则包的配置形状：包名精确、规则数下限、强弱集合包含
export function expectPackageConfig(
  detail: DqRuleSetRecord,
  spec: DqPackageConfigSpec,
  sourceRef: string,
): void {
  const pkg = (detail.packageVOList ?? []).find((item) => item.packageName === spec.name);
  expect(pkg?.packageName, `${sourceRef}: 规则集应含规则包「${spec.name}」`).toBe(spec.name);
  const rules = pkg?.rules ?? [];
  expect(
    rules.length,
    `${sourceRef}: 规则包「${spec.name}」应至少含 ${spec.minRules} 条规则`,
  ).toBeGreaterThanOrEqual(spec.minRules);
  const strengths = new Set(rules.map((rule) => String(rule.ruleStrength ?? "")).filter(Boolean));
  for (const strength of spec.strengths) {
    expect(
      strengths.has(strength),
      `${sourceRef}: 规则包「${spec.name}」应含强弱规则 ruleStrength=${strength}`,
    ).toBe(true);
  }
}

export function expectRuleSetPackageInventory(detail: DqRuleSetRecord, sourceRef: string): void {
  const packages = detail.packageVOList ?? [];
  const byName = new Map(packages.map((pkg) => [pkg.packageName ?? "", pkg] as const));
  const expected: Array<[string, number]> = [
    [DQ_SQL_MERGE_PACKAGES.mergeMulti, 10],
    [DQ_SQL_MERGE_PACKAGES.completenessMergeable, 1],
    [DQ_SQL_MERGE_PACKAGES.completenessPass, 5],
    [DQ_SQL_MERGE_PACKAGES.completenessFail, 5],
    [DQ_SQL_MERGE_PACKAGES.validityPass, 3],
    [DQ_SQL_MERGE_PACKAGES.validityFail, 1],
  ];
  for (const [name, minRules] of expected) {
    const pkg = byName.get(name);
    expect(pkg, `${sourceRef}: test_info_1 规则集应包含规则包「${name}」`).toBeTruthy();
    expect(
      (pkg?.rules ?? []).length,
      `${sourceRef}: 规则包「${name}」应至少含 ${minRules} 条规则`,
    ).toBeGreaterThanOrEqual(minRules);
  }
}

export function expectCompletenessPackageShape(
  detail: DqRuleSetRecord,
  packageName: string,
  sourceRef: string,
): void {
  const pkg = (detail.packageVOList ?? []).find((item) => item.packageName === packageName);
  expect(pkg, `${sourceRef}: 应存在完整性规则包「${packageName}」`).toBeTruthy();
  const rules = pkg?.rules ?? [];
  for (const functionName of ["空值数", "空值率", "空串数", "空串率", "表行数"]) {
    expect(
      rules.some((rule) => rule.functionName === functionName),
      `${sourceRef}: 完整性规则包「${packageName}」应含 ${functionName}`,
    ).toBe(true);
  }
  const mergeGroups = buildMergeCandidateGroups(rules);
  expect(
    mergeGroups.some((group) => group.rules.length >= 2),
    `${sourceRef}: 完整性规则包「${packageName}」的同过滤条件同强弱规则应可识别为可合并候选组`,
  ).toBe(true);
}

export function expectValidityPackageShape(
  detail: DqRuleSetRecord,
  packageName: string,
  expectedCount: number,
  sourceRef: string,
): void {
  const pkg = (detail.packageVOList ?? []).find((item) => item.packageName === packageName);
  expect(pkg, `${sourceRef}: 应存在有效性规则包「${packageName}」`).toBeTruthy();
  expect(
    (pkg?.rules ?? []).length,
    `${sourceRef}: 有效性规则包「${packageName}」应含 ${expectedCount} 条规则`,
  ).toBe(expectedCount);
}

export function expectReportCategoriesShape(records: DqGeneratedReportRecord[], sourceRef: string): void {
  const targetReports = records.filter((record) =>
    String(record.reportName ?? "").includes(DQ_SQL_MERGE_TABLE),
  );
  expect(targetReports.length, `${sourceRef}: 应有 ${DQ_SQL_MERGE_TABLE} 的已生成报告`).toBeGreaterThan(0);
  const categories: Array<{ label: string; match: (name: string) => boolean }> = [
    { label: "有效性校验报告", match: (name) => name.includes("有效性校验") },
    { label: "完整性校验全通过报告", match: (name) => name.includes("完整性校验") && name.includes("全通过") },
    { label: "完整性校验全不通过报告", match: (name) => name.includes("完整性校验") && name.includes("全不通过") },
    { label: "完整性可合并规则报告", match: (name) => name.includes("完整性可合并规则") },
  ];
  for (const category of categories) {
    const matched = targetReports.filter((record) => category.match(String(record.reportName ?? "")));
    expect(matched.length, `${sourceRef}: 应存在${category.label}`).toBeGreaterThan(0);
    expect(
      matched.some((record) => String(record.status) === "1"),
      `${sourceRef}: ${category.label}应至少有一个已生成(status=1)`,
    ).toBe(true);
  }
}

// ─── SQL 合并「生成合并 SQL 端到端」契约（read-only，不触发执行）────────────
// 说明：以下断言直接拉取规则任务(monitor)在保存「规则拼接包」后由后端生成的合并 SQL
// （/monitor/packagelist 列出拼接包，/monitor/packagesql 返回每个拼接包的合并 SQL 文本），
// 对应 archive「校验功能」用例步骤37-38「点击规则SQL查看，切换规则包查看规则sql」。
// 这是「规则sql合并」被测特性的真实产物，配置即生成、无需立即执行，故能绕开
// immediatelyExecuted 5min 504 链路，对全部 sparkthrift 场景做端到端核验。

export type DqPackageItem = {
  packageId?: number | string;
  packageName?: string;
};

// monitor(规则任务)列表：按表名 pageQuery
export async function queryMonitorsByTable(
  request: APIRequestContext,
  tableName: string,
  sourceRef: string,
): Promise<DqRuleTaskRecord[]> {
  const pageData = await postDq<DqPageData<DqRuleTaskRecord>>(
    request,
    "/dassets/v1/valid/monitor/pageQuery",
    { current: 1, size: 100, tableName },
    { sourceRef },
  );
  return getRows(pageData, sourceRef, `规则任务列表(${tableName})`);
}

// 按表名 + 规则任务名精确定位一个 monitor
export async function findMonitorByRuleName(
  request: APIRequestContext,
  tableName: string,
  ruleName: string,
  sourceRef: string,
): Promise<DqRuleTaskRecord> {
  const monitors = await queryMonitorsByTable(request, tableName, sourceRef);
  const target = monitors.find((m) => m.ruleName === ruleName);
  expect(
    target,
    `${sourceRef}: ${DQ_SQL_MERGE_SCHEMA}.${tableName} 应存在规则任务「${ruleName}」（实有：${monitors
      .map((m) => m.ruleName)
      .join(" / ")}）`,
  ).toBeTruthy();
  return target as DqRuleTaskRecord;
}

// 拼接包列表（规则SQL查看右侧下拉）
export async function queryPackageList(
  request: APIRequestContext,
  monitorId: string | number,
  sourceRef: string,
): Promise<DqPackageItem[]> {
  const data = await postDq<DqPackageItem[]>(
    request,
    "/dassets/v1/valid/monitor/packagelist",
    { monitorId },
    { sourceRef },
  );
  expect(Array.isArray(data), `${sourceRef}: 拼接包列表应为数组`).toBe(true);
  return data;
}

// 单个拼接包的合并 SQL 文本
export async function queryPackageSql(
  request: APIRequestContext,
  packageId: string | number,
  sourceRef: string,
): Promise<string> {
  const sql = await postDq<string>(
    request,
    "/dassets/v1/valid/monitor/packagesql",
    { packageId },
    { sourceRef },
  );
  expect(typeof sql, `${sourceRef}: 拼接包 ${packageId} 的合并 SQL 应为字符串`).toBe("string");
  return sql;
}

export type MergeSqlAnalysis = {
  // 落脏数据管道（合并/不合并都先写 dtstack_dq_monitor_temp_data）
  writesDirtyPipeline: boolean;
  // 抽样开启 → 生成 *_temp_sample_table 临时抽样表
  hasSampleTable: boolean;
  // 设置分区 → 含 dt='yyyy-MM-dd' 分区谓词
  hasPartitionPredicate: boolean;
  // string 强转 int → 含 CAST(... AS <type>)
  hasCast: boolean;
  // 合并块大小：LATERAL VIEW STACK(N, ...) 的 N（每个 N = 该块合并的子规则数）
  stackGroupSizes: number[];
  // 同一聚合 select 内的 SUM(CASE WHEN ...) 个数（并行计算的合并子规则）
  sumCaseWhenCount: number;
  // 是否引用源表（样本表或直接源表）
  referencesTable: boolean;
  // SQL 缺陷（空/悬挂谓词/括号不配对），空串表示无缺陷
  defect: string;
};

// 分析一段生成的合并 SQL，提取合并/抽样/分区/转型等结构特征
export function analyzeMergeSql(sql: string, tableName: string): MergeSqlAnalysis {
  const flat = (sql ?? "").replace(/\s+/g, " ");
  const stackGroupSizes = Array.from(flat.matchAll(/stack\(\s*(\d+)/gi)).map((m) => Number(m[1]));
  const sumCaseWhenCount = (flat.match(/sum\s*\(\s*case\s+when/gi) ?? []).length;
  return {
    writesDirtyPipeline: sql.includes("dtstack_dq_monitor_temp_data"),
    hasSampleTable: sql.includes("_temp_sample_table"),
    hasPartitionPredicate: /\bdt\s*=\s*'\d{4}-\d{2}-\d{2}'/i.test(sql),
    hasCast: /\bcast\s*\(/i.test(sql),
    stackGroupSizes,
    sumCaseWhenCount,
    referencesTable: sql.includes(tableName),
    defect: detectSqlDefect(sql),
  };
}

export type DqGeneratedSqlSpec = {
  // 源表
  table: string;
  // 规则任务名（packagelist 的 monitor）
  ruleName: string;
  // 拼接包数量（精确）；不给则只要求 >=1
  expectedPackages?: number;
  // 抽样开启/关闭 —— 决定每个拼接包是否应出现临时抽样表
  sampling: "on" | "off";
  // 是否设置分区（至少一个拼接包应含分区谓词）
  partition?: boolean;
  // 是否期望「合并发生」：合并有两种表现——STACK(N>=2) 的 LATERAL VIEW 拆行，
  // 或同一聚合 select 内 >=2 个 SUM(CASE WHEN) 并行计算。任一成立即判定已合并。
  // 纯不合并/单规则场景不给，仅校验管道完整与无缺陷。
  expectsMerge?: boolean;
  // 可选更强断言：STACK 合并块的 N 至少为该值（仅 STACK 拆行型合并场景给）
  minStackGroup?: number;
  // 是否含 string 强转 int 的 CAST（至少一个拼接包）
  cast?: boolean;
};

// 端到端验证一个规则任务生成的合并 SQL（步骤37-38）
export async function expectMonitorGeneratedSql(
  request: APIRequestContext,
  spec: DqGeneratedSqlSpec,
  sourceRef: string,
): Promise<MergeSqlAnalysis[]> {
  const monitor = await findMonitorByRuleName(request, spec.table, spec.ruleName, sourceRef);
  const monitorId = expectDefined(monitor.id, `${sourceRef}: 规则任务「${spec.ruleName}」应有 id`);

  const packages = await queryPackageList(request, monitorId, sourceRef);
  if (spec.expectedPackages !== undefined) {
    expect(
      packages.length,
      `${sourceRef}: 规则任务「${spec.ruleName}」应有 ${spec.expectedPackages} 个拼接包`,
    ).toBe(spec.expectedPackages);
  } else {
    expect(
      packages.length,
      `${sourceRef}: 规则任务「${spec.ruleName}」应至少有 1 个拼接包`,
    ).toBeGreaterThanOrEqual(1);
  }

  const analyses: MergeSqlAnalysis[] = [];
  for (const pkg of packages) {
    const packageId = expectDefined(pkg.packageId, `${sourceRef}: 拼接包应有 packageId`);
    const sql = await queryPackageSql(request, packageId, sourceRef);
    const tag = `${sourceRef}#包${packageId}(${pkg.packageName ?? ""})`;
    const a = analyzeMergeSql(sql, spec.table);

    expect(sql.trim().length, `${tag}: 合并 SQL 不应为空`).toBeGreaterThan(0);
    expect(a.defect, `${tag}: 合并 SQL 不应有明显缺陷`).toBe("");
    expect(a.writesDirtyPipeline, `${tag}: 合并 SQL 应写入脏数据管道 dtstack_dq_monitor_temp_data`).toBe(
      true,
    );
    expect(a.referencesTable, `${tag}: 合并 SQL 应引用源表 ${spec.table}`).toBe(true);
    expect(
      a.hasSampleTable,
      `${tag}: 抽样${spec.sampling === "on" ? "开启应" : "关闭不应"}出现临时抽样表 *_temp_sample_table`,
    ).toBe(spec.sampling === "on");
    analyses.push(a);
  }

  if (spec.partition) {
    expect(
      analyses.some((a) => a.hasPartitionPredicate),
      `${sourceRef}: 设置分区场景应有拼接包含分区谓词 dt='yyyy-MM-dd'`,
    ).toBe(true);
  }
  if (spec.expectsMerge) {
    const maxStack = Math.max(0, ...analyses.flatMap((a) => a.stackGroupSizes));
    const maxSumCaseWhen = Math.max(0, ...analyses.map((a) => a.sumCaseWhenCount));
    expect(
      maxStack >= 2 || maxSumCaseWhen >= 2,
      `${sourceRef}: 合并场景应有合并证据——STACK(N>=2) 拆行 或 同 select 内 >=2 个 SUM(CASE WHEN)（实测 maxStack=${maxStack}, maxSumCaseWhen=${maxSumCaseWhen}）`,
    ).toBe(true);
  }
  if (spec.minStackGroup !== undefined) {
    const maxStack = Math.max(0, ...analyses.flatMap((a) => a.stackGroupSizes));
    expect(
      maxStack,
      `${sourceRef}: STACK 拆行型合并应至少有一个合并块 N>=${spec.minStackGroup}（实测最大合并块=${maxStack}）`,
    ).toBeGreaterThanOrEqual(spec.minStackGroup);
  }
  if (spec.cast) {
    expect(
      analyses.some((a) => a.hasCast),
      `${sourceRef}: string强转int 场景应有拼接包含 CAST(... AS <type>)`,
    ).toBe(true);
  }
  return analyses;
}

// ─── SQL 合并「运行时校验实例 + 质量报告」端到端契约（read-only）──────────
// 说明：直接读取已落库的校验实例(monitorRecord/detailReport)与已生成质量报告
// (monitorReportRecord)，对应 archive 步骤39「临时运行查看实例详情」、步骤40-42
// 「查看质量报告」。不触发立即执行，只核验调度已产出的运行时证据；实例为日调度
// 产物，依赖环境运行时数据是否在位（环境受阻时为真实失败信号，不弱化断言掩盖）。

export const DQ_INSTANCE_STATUS_COMPLETED = 11;

// 找一个「已完成」的校验实例（status=11 且日志含通过/失败统计）
export function findCompletedInstance(
  records: DqMonitorRecord[],
  ruleName: string,
  sourceRef: string,
): DqMonitorRecord {
  const mine = records.filter((r) => r.ruleName === ruleName);
  expect(mine.length, `${sourceRef}: 应存在规则任务「${ruleName}」的校验实例`).toBeGreaterThan(0);
  const completed = mine.find(
    (r) =>
      Number(r.status) === DQ_INSTANCE_STATUS_COMPLETED &&
      /verification (passes|fails)/i.test(r.logInfo ?? ""),
  );
  expect(
    completed,
    `${sourceRef}: 规则任务「${ruleName}」应有已完成校验实例(status=11，日志含通过/失败统计)`,
  ).toBeTruthy();
  return completed as DqMonitorRecord;
}

// 验证校验实例详情：子规则带执行 SQL、引用源表、无明显 SQL 缺陷，且仍可识别合并候选组
export function expectInstanceExecutedSql(detailRows: DqRule[], table: string, sourceRef: string): void {
  expect(detailRows.length, `${sourceRef}: 实例详情应返回多条子规则明细`).toBeGreaterThan(0);
  const sqlRows = detailRows.filter((r) => r.selectDataSql || r.customizeSql);
  expect(sqlRows.length, `${sourceRef}: 实例明细应含可检查的执行 SQL`).toBeGreaterThan(0);
  expect(
    sqlRows.some((r) => `${r.selectDataSql ?? ""} ${r.customizeSql ?? ""}`.includes(table)),
    `${sourceRef}: 实例执行 SQL 应引用源表 ${table}`,
  ).toBe(true);
  for (const r of sqlRows) {
    const sql = r.selectDataSql || r.customizeSql || "";
    expect(detectSqlDefect(sql), `${sourceRef}: 实例执行 SQL 不应有明显缺陷: ${sql.slice(0, 120)}`).toBe("");
  }
}

// 按关键词查已生成质量报告
export async function queryGeneratedReportsBySearch(
  request: APIRequestContext,
  search: string,
  sourceRef: string,
): Promise<DqGeneratedReportRecord[]> {
  const pageData = await postDq<DqPageData<DqGeneratedReportRecord>>(
    request,
    "/dassets/v1/valid/monitorReportRecord/pageList",
    { current: 1, size: 200, search },
    { sourceRef },
  );
  return getRows(pageData, sourceRef, `已生成报告(${search})`);
}

export type DqScenarioReportSpec = {
  table: string;
  nameIncludes: string[];
};

// 验证某场景的命名质量报告存在且已生成(status=1)
export function expectScenarioReport(
  reports: DqGeneratedReportRecord[],
  spec: DqScenarioReportSpec,
  sourceRef: string,
): void {
  const matched = reports.filter(
    (r) =>
      String(r.tableNames ?? "").includes(spec.table) &&
      spec.nameIncludes.every((kw) => String(r.reportName ?? "").includes(kw)),
  );
  expect(
    matched.length,
    `${sourceRef}: 应存在 ${spec.table} 含「${spec.nameIncludes.join("+")}」的质量报告`,
  ).toBeGreaterThan(0);
  expect(
    matched.some((r) => String(r.status) === "1"),
    `${sourceRef}: 该质量报告应已生成(status=1)`,
  ).toBe(true);
}

function getRows<T>(pageData: DqPageData<T>, sourceRef: string, label: string): T[] {
  const rows =
    pageData.contentList ??
    pageData.data ??
    pageData.rows ??
    pageData.list ??
    pageData.records ??
    [];
  expect(Array.isArray(rows), `${sourceRef}: ${label} 应返回数组`).toBe(true);
  return rows;
}

function buildMergeCandidateGroups(rules: DqRule[]): Array<{ key: string; ruleStrength: string; rules: DqRule[] }> {
  const groups = new Map<string, { key: string; ruleStrength: string; rules: DqRule[] }>();
  for (const rule of rules) {
    const functionId = String(rule.functionId ?? "");
    if (!MERGEABLE_FUNCTION_IDS.has(functionId)) continue;
    const filterSql = normalizeSql(rule.filterSql);
    if (!filterSql) continue;
    const ruleStrength = String(rule.ruleStrength ?? "");
    const key = `${rule.packageId ?? "package"}|${ruleStrength}|${filterSql}`;
    const group = groups.get(key) ?? { key, ruleStrength, rules: [] };
    group.rules.push(rule);
    groups.set(key, group);
  }
  return Array.from(groups.values()).filter((group) => group.rules.length >= 2);
}

function normalizeSql(sql: string | null | undefined): string {
  return (sql ?? "")
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
    .trim()
    .toLowerCase();
}

function detectSqlDefect(sql: string): string {
  const normalized = normalizeSql(sql);
  if (!normalized) return "empty_sql";
  if (/\bwhere\s*(=|and|or)?\s*$/.test(normalized)) return "dangling_where";
  if (/(=|<>|!=|>=|<=|>|<|like|in|and|or)\s*$/.test(normalized)) return "dangling_operator";
  const openCount = (sql.match(/\(/g) ?? []).length;
  const closeCount = (sql.match(/\)/g) ?? []).length;
  if (openCount !== closeCount) return "unbalanced_parentheses";
  return "";
}

function expectDefined<T>(value: T | null | undefined, message: string): T {
  expect(value, message).toBeTruthy();
  return value as T;
}
