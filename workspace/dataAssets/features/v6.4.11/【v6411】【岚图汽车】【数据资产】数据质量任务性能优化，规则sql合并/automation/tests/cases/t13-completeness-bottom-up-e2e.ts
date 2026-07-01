// spec: cases/archive.md#L5760-L5837
// intent: SR-INTENT-V6411-SQL-MERGE
//
// Bottom-up E2E (Doris70):
// 1. create a unique test_info_1_<timestamp> base table through Batch and sync metadata
// 2. create a rule set/rule package for that table using case-driven rule definitions
// 3. create a quality monitor task importing that package
// 4. trigger immediate execution
// 5. collect generated SQL and execution record evidence for manual review
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import type { DtStackClientLike, DtStackResponse } from "dtstack-sdk";

import {
  setupPreconditions,
  type PrecondDatasourceProfile,
} from "../../../../../../_shared/helpers/preconditions";
import {
  applyRuntimeCookies,
  buildDataAssetsApiUrl,
  getEnvConfig,
} from "../../../../../../_shared/helpers/test-setup";

const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";
const EXPECTED_FUNCTIONS = ["空值数", "空值率", "空串数", "空串率", "表行数"] as const;

const CASE_RULE_DEFS = [
  { functionName: "空值数", fields: ["id", "age"], logic: "and", operator: "=", threshold: "1", level: 0 },
  { functionName: "空值率", fields: ["id", "age"], logic: "or", operator: "=", threshold: "10", level: 0 },
  { functionName: "空串数", fields: ["name", "address"], logic: "or", operator: ">=", threshold: "100", level: 0 },
  { functionName: "空串率", fields: ["name", "address"], logic: "and", operator: "!=", threshold: "0", level: 0 },
  { functionName: "表行数", fields: [], logic: "and", operator: "=", threshold: "0", level: 1 },
] as const;

type TargetDatasourceKey = "sparkthrift" | "doris";

type TargetDatasourceConfig = {
  key: TargetDatasourceKey;
  annotation: string;
  sourceRuleSetId: string;
  sourcePackageName: string;
  expectedSourceName: string;
  expectedSourceTypeName: string;
  tablePrefix: string;
};

const TARGET_CONFIGS: Record<TargetDatasourceKey, TargetDatasourceConfig> = {
  sparkthrift: {
    key: "sparkthrift",
    annotation: "pw_test_HADOOP",
    sourceRuleSetId: "549",
    sourcePackageName: "「完整性校验」-「多字段」-不通过",
    expectedSourceName: "pw_test_HADOOP",
    expectedSourceTypeName: "SparkThrift2.x",
    tablePrefix: "test_info_1",
  },
  doris: {
    key: "doris",
    annotation: "doris70",
    sourceRuleSetId: "568",
    sourcePackageName: "完整性校验-「多字段」-「抽样关闭」校验全不通过",
    expectedSourceName: "doris70",
    expectedSourceTypeName: "Doris3.x",
    tablePrefix: "test_info_1",
  },
};

const DEFAULT_TARGET_DATASOURCE: TargetDatasourceKey = "doris";

type DqApiResponse<T> = {
  success?: boolean;
  code?: number;
  data?: T;
  message?: string | null;
};

type DqPageData<T> = {
  data?: T[];
  contentList?: T[];
  records?: T[];
  rows?: T[];
  total?: number | string;
};

type DqRuleSetRecord = {
  id?: string | number;
  tableName?: string;
  schemaName?: string;
  sourceName?: string;
  sourceTypeName?: string;
  dataSourceId?: string | number;
  dataSourceType?: string | number;
  packageVOList?: Array<{
    packageName?: string;
    rules?: DqRule[];
  }>;
};

type DqRule = {
  id?: string | number;
  columnName?: string | null;
  functionId?: string | number | null;
  functionName?: string | null;
  verifyType?: string | number | null;
  operator?: string | null;
  threshold?: string | number | null;
  type?: string | number | null;
  ruleStrength?: string | number | null;
  packageId?: string | number | null;
  description?: string | null;
  expansion?: string | null;
  rulePackageId?: string | number | null;
  filterSql?: string | null;
  level?: string | number | null;
  standardRules?: unknown;
};

type RulePackageOption = {
  id?: string | number;
  packageId?: string | number;
  packageName?: string;
  tableId?: string | number;
};

type MonitorRecord = {
  id?: string | number;
  monitorId?: string | number;
  ruleName?: string;
  tableName?: string;
  status?: string | number;
  statusValue?: string;
  logInfo?: string;
  errorMsg?: string | null;
  executeTime?: string;
  execEndTime?: string;
};

type MonitorPageRecord = {
  id?: string | number;
  ruleName?: string;
  tableName?: string;
  dataName?: string;
  sourceTypeName?: string;
  periodTypeName?: string;
  isClosed?: number;
};

function rowsFromPage<T>(pageData: DqPageData<T> | undefined): T[] {
  return pageData?.data ?? pageData?.contentList ?? pageData?.records ?? pageData?.rows ?? [];
}

async function postEnvelope<T>(
  request: APIRequestContext,
  path: string,
  data: unknown,
  sourceRef: string,
  timeout = 60_000,
): Promise<DqApiResponse<T>> {
  const response = await request.post(buildDataAssetsApiUrl(path), {
    data,
    headers: { [PROJECT_STORAGE_KEY]: String(getEnvConfig().projects.quality.id) },
    timeout,
  });
  const text = await response.text();
  const payload = (text ? JSON.parse(text) : {}) as DqApiResponse<T>;
  expect(
    response.ok(),
    `${sourceRef}: ${path} HTTP=${response.status()} body=${text.slice(0, 500)}`,
  ).toBe(true);
  return payload;
}

async function postData<T>(
  request: APIRequestContext,
  path: string,
  data: unknown,
  sourceRef: string,
  timeout = 60_000,
): Promise<T> {
  const payload = await postEnvelope<T>(request, path, data, sourceRef, timeout);
  expect(
    payload.success ?? payload.code === 1,
    `${sourceRef}: ${path} 应成功，code=${payload.code} message=${payload.message ?? ""}`,
  ).toBe(true);
  return payload.data as T;
}

function uniqueTableName(): string {
  return `${targetConfig().tablePrefix}_${Date.now().toString(36)}`.toLowerCase();
}

function targetDatasourceKey(): TargetDatasourceKey {
  const raw = (process.env.V6411_DQ_DATASOURCE ?? DEFAULT_TARGET_DATASOURCE).trim().toLowerCase();
  if (raw === "doris" || raw === "doris70" || raw === "pw_test_doris_doris70") return "doris";
  if (raw === "sparkthrift" || raw === "spark" || raw === "hadoop" || raw === "pw_test_hadoop") {
    return "sparkthrift";
  }
  throw new Error(`Unsupported V6411_DQ_DATASOURCE=${raw}; expected doris or sparkthrift`);
}

function targetConfig(): TargetDatasourceConfig {
  return TARGET_CONFIGS[targetDatasourceKey()];
}

// 上海时区日期辅助函数，用于生成确定性的 fixture 数据
function formatShanghaiDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T00:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatShanghaiDate(date);
}

function buildSparkThriftFixtureSql(tableName: string): string {
  const rows = [
    "SELECT 1 AS id, CAST(NULL AS INT) AS age, 'name_01' AS name, 'addr_01' AS address",
    "SELECT 2 AS id, CAST(NULL AS INT) AS age, 'name_02' AS name, 'addr_02' AS address",
    "SELECT 3 AS id, 33 AS age, 'name_03' AS name, 'addr_03' AS address",
    "SELECT 4 AS id, 34 AS age, 'name_04' AS name, 'addr_04' AS address",
    "SELECT 5 AS id, 35 AS age, 'name_05' AS name, 'addr_05' AS address",
    "SELECT 6 AS id, 36 AS age, 'name_06' AS name, 'addr_06' AS address",
    "SELECT 7 AS id, 37 AS age, 'name_07' AS name, 'addr_07' AS address",
    "SELECT 8 AS id, 38 AS age, 'name_08' AS name, 'addr_08' AS address",
    "SELECT 9 AS id, 39 AS age, 'name_09' AS name, 'addr_09' AS address",
    "SELECT 10 AS id, 40 AS age, 'name_10' AS name, 'addr_10' AS address",
  ];

  return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} STORED AS PARQUET AS
${rows.join("\nUNION ALL\n")};
`;
}

function buildDorisFixtureSql(tableName: string): string {
  const bizDate = formatShanghaiDate(new Date());
  const nextDate = addDays(bizDate, 1);
  const partitionName = `p${bizDate.replace(/-/g, "")}`;
  const buyDates = [0, 1, 2, 3, 4, 5].map((offset) => addDays(bizDate, -30 + offset));

  return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INT COMMENT '用户ID',
  age INT COMMENT '年龄',
  string_num VARCHAR(64) COMMENT 'string类型的编号',
  name VARCHAR(64) COMMENT '姓名',
  address VARCHAR(128) COMMENT '地址',
  money VARCHAR(32) COMMENT '金额',
  buy_date DATE COMMENT '购买日期',
  date_detail VARCHAR(128) COMMENT '日期详情',
  dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
DUPLICATE KEY(id, dt)
PARTITION BY RANGE(dt) (
  PARTITION ${partitionName} VALUES [("${bizDate}"), ("${nextDate}"))
)
DISTRIBUTED BY HASH(id) BUCKETS 1
PROPERTIES ("replication_num" = "1");
INSERT INTO ${tableName}
  (id, age, string_num, name, address, money, buy_date, date_detail, dt)
VALUES
  (1, 25, '001', '张三', '北京市朝阳区', '5000.00', '${buyDates[0]}', '订单已完成', '${bizDate}'),
  (2, 30, '002', '李四', '上海市浦东新区', '6800.50', '${buyDates[1]}', '待发货', '${bizDate}'),
  (3, 28, '003', '王五', '广州市天河区', '4200.00', '${buyDates[2]}', '已取消', '${bizDate}'),
  (4, 35, '004', '赵六', '深圳市南山区', '9500.00', '${buyDates[3]}', '配送中', '${bizDate}'),
  (5, 22, '005', '小明', '杭州市西湖区', '3100.00', '${buyDates[4]}', '已完成', '${bizDate}'),
  (6, 29, '006', '小红', '成都市武侯区', '5600.00', '${buyDates[5]}', '退款中', '${bizDate}');
`;
}

function fixtureSql(tableName: string): string {
  return targetDatasourceKey() === "doris"
    ? buildDorisFixtureSql(tableName)
    : buildSparkThriftFixtureSql(tableName);
}

function targetDatasourceProfile(): PrecondDatasourceProfile {
  const env = getEnvConfig();
  const datasource = targetDatasourceKey() === "doris" ? env.datasources.doris : env.datasources.sparkthrift;
  return {
    id: datasource.batch.id,
    name: datasource.batch.name,
    typeId: datasource.batch.typeId,
    aliases: datasource.aliases,
    database: datasource.batch.database,
    schema: datasource.batch.schema,
    metadata: datasource.metadata,
    assets: datasource.assets,
  };
}

function targetEnvDatasource() {
  const env = getEnvConfig();
  return targetDatasourceKey() === "doris" ? env.datasources.doris : env.datasources.sparkthrift;
}

function isRetryablePreconditionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /Timeout \d+ms exceeded/.test(message) ||
    /HTTP (502|503|504)\b/.test(message) ||
    /net::ERR_/.test(message) ||
    /ETIMEDOUT/.test(message)
  );
}

function createPreconditionClient(page: Page): DtStackClientLike {
  const post = async <T = unknown>(
    path: string,
    data?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<DtStackResponse<T>> => {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        const response = await page.context().request.post(buildDataAssetsApiUrl(path), {
          data,
          failOnStatusCode: false,
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "Accept-Language": "zh-CN",
            ...extraHeaders,
          },
          timeout: 120_000,
        });
        const text = await response.text();
        if (response.ok()) {
          return text.trim()
            ? (JSON.parse(text) as DtStackResponse<T>)
            : ({} as DtStackResponse<T>);
        }
        lastError = new Error(`HTTP ${response.status()} ${response.statusText()}: ${text}`);
        if (!isRetryablePreconditionError(lastError) || attempt === 4) throw lastError;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (!isRetryablePreconditionError(error) || attempt === 4) throw lastError;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
    throw lastError ?? new Error(`request failed: ${path}`);
  };

  return {
    post,
    postWithProjectId: <T = unknown>(path: string, data: unknown, projectId: number) =>
      post<T>(path, data, { "X-Project-Id": String(projectId) }),
  };
}

async function prepareUniqueTable(page: Page, tableName: string, sourceRef: string): Promise<void> {
  const env = getEnvConfig();
  const datasource = targetEnvDatasource();
  await applyRuntimeCookies(page);
  const result = await setupPreconditions({
    client: createPreconditionClient(page),
    project: env.projects.quality.name,
    projectId: env.projects.quality.id,
    datasource: datasource.preconditionType,
    datasourceProfile: targetDatasourceProfile(),
    database: datasource.batch.database,
    tables: [{ name: tableName, sql: fixtureSql(tableName) }],
    syncTimeoutMs: 300_000,
    autoCreate: false,
  });
  expect(result.tablesCreated, `${sourceRef}: Batch 应创建唯一底表`).toContain(tableName);
  expect(result.syncComplete, `${sourceRef}: 元数据同步应完成`).toBe(true);
}

async function querySourceRuleSet(request: APIRequestContext, sourceRef: string): Promise<DqRuleSetRecord> {
  const config = targetConfig();
  const detail = await postData<DqRuleSetRecord>(
    request,
    "/dassets/v1/valid/monitorRuleSet/detail",
    { id: config.sourceRuleSetId },
    sourceRef,
  );
  expect(detail.sourceName, `${sourceRef}: 模板规则集必须来自目标数据源`).toBe(config.expectedSourceName);
  expect(detail.sourceTypeName, `${sourceRef}: 模板规则集类型必须匹配目标数据源`).toBe(
    config.expectedSourceTypeName,
  );
  return detail;
}

function parseRuleExpansion(rule: DqRule): Record<string, unknown> {
  if (!rule.expansion) return {};
  try {
    return JSON.parse(rule.expansion) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function clonedCompletenessRules(sourceRuleSet: DqRuleSetRecord, tableName: string): DqRule[] {
  const sourcePackageName = targetConfig().sourcePackageName;
  const sourcePackage = sourceRuleSet.packageVOList?.find((item) => item.packageName === sourcePackageName);
  expect(sourcePackage, `应存在模板规则包「${sourcePackageName}」`).toBeTruthy();
  const sourceRules = sourcePackage?.rules ?? [];

  return CASE_RULE_DEFS.map((definition, index) => {
    const source = sourceRules.find((rule) => rule.functionName === definition.functionName);
    expect(source, `模板规则包应包含 ${definition.functionName}`).toBeTruthy();
    const fields = definition.level === 1 ? [tableName] : [...definition.fields];
    const expansion = {
      ...parseRuleExpansion(source as DqRule),
      columnName: fields,
      columnNameStr: fields.join(","),
      logic: definition.logic,
      sortOrder: index,
    };
    return {
      id: "0",
      columnName: fields.join(","),
      functionId: source?.functionId,
      verifyType: source?.verifyType,
      operator: definition.operator,
      threshold: definition.threshold,
      type: source?.type,
      ruleStrength: 1,
      description: "测试规则",
      expansion: JSON.stringify(expansion),
      filterSql: " (  id <= 100  ) ",
      functionName: source?.functionName,
      level: definition.level,
      standardRules: source?.standardRules ?? null,
    };
  });
}

async function createRuleSet(
  request: APIRequestContext,
  sourceRuleSet: DqRuleSetRecord,
  tableName: string,
  packageName: string,
  sourceRef: string,
): Promise<DqRuleSetRecord> {
  const payload = {
    dataSourceId: Number(sourceRuleSet.dataSourceId),
    dataSourceType: Number(sourceRuleSet.dataSourceType),
    schemaName: "pw_test",
    tableName,
    sourceName: sourceRuleSet.sourceName,
    sourceTypeName: sourceRuleSet.sourceTypeName,
    description: `v6411 bottom-up ${tableName}`,
    packages: [
      {
        packageName,
        rules: clonedCompletenessRules(sourceRuleSet, tableName),
      },
    ],
  };

  const addResponse = await postEnvelope<string | number>(
    request,
    "/dassets/v1/valid/monitorRuleSet/add",
    payload,
    `${sourceRef}: 新建规则集`,
    120_000,
  );
  expect(
    addResponse.success ?? addResponse.code === 1,
    `${sourceRef}: 新建规则集应成功，code=${addResponse.code} message=${addResponse.message ?? ""}`,
  ).toBe(true);

  await expect
    .poll(
      async () => {
        const pageData = await postData<DqPageData<DqRuleSetRecord>>(
          request,
          "/dassets/v1/valid/monitorRuleSet/pageQuery",
          { current: 1, size: 100, tableName },
          `${sourceRef}: 查询新规则集`,
        );
        return rowsFromPage(pageData).find(
          (record) => record.tableName === tableName && record.sourceName === sourceRuleSet.sourceName,
        );
      },
      { message: `${sourceRef}: 新规则集应出现在规则集列表`, timeout: 60_000 },
    )
    .toBeTruthy();

  const pageData = await postData<DqPageData<DqRuleSetRecord>>(
    request,
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
    { current: 1, size: 100, tableName },
    `${sourceRef}: 回查新规则集`,
  );
  const record = rowsFromPage(pageData).find(
    (item) => item.tableName === tableName && item.sourceName === sourceRuleSet.sourceName,
  );
  const detail = await postData<DqRuleSetRecord>(
    request,
    "/dassets/v1/valid/monitorRuleSet/detail",
    { id: String(record?.id) },
    `${sourceRef}: 新规则集详情`,
  );
  const pkg = detail.packageVOList?.find((item) => item.packageName === packageName);
  expect(pkg?.rules?.length, `${sourceRef}: 新规则包应包含 5 条完整性规则`).toBe(EXPECTED_FUNCTIONS.length);
  for (const functionName of EXPECTED_FUNCTIONS) {
    expect(
      pkg?.rules?.some((rule) => rule.functionName === functionName),
      `${sourceRef}: 新规则包应包含 ${functionName}`,
    ).toBe(true);
  }
  await test.info().attach("created-rule-set-detail.json", {
    body: JSON.stringify(detail, null, 2),
    contentType: "application/json",
  });
  return detail;
}

async function queryRulePackage(
  request: APIRequestContext,
  sourceRuleSet: DqRuleSetRecord,
  tableName: string,
  packageName: string,
  sourceRef: string,
): Promise<RulePackageOption> {
  const packages = await postData<RulePackageOption[]>(
    request,
    "/dassets/v1/valid/monitorRulePackage/ruleSetList",
    {
      dataSourceId: Number(sourceRuleSet.dataSourceId),
      tableName,
      schemaName: "pw_test",
    },
    sourceRef,
  );
  const target = packages.find((item) => item.packageName === packageName);
  expect(target, `${sourceRef}: 应能查到刚创建的规则包`).toBeTruthy();
  return target as RulePackageOption;
}

async function createMonitorTask(
  request: APIRequestContext,
  sourceRuleSet: DqRuleSetRecord,
  tableName: string,
  packageName: string,
  ruleName: string,
  sourceRef: string,
): Promise<string> {
  const rulePackage = await queryRulePackage(
    request,
    sourceRuleSet,
    tableName,
    packageName,
    `${sourceRef}: 查询可引用规则包`,
  );
  const packageId = Number(rulePackage.id ?? rulePackage.packageId);
  expect(packageId, `${sourceRef}: 规则包 id 应有效`).toBeGreaterThan(0);

  const importedRules = await postData<DqRule[]>(
    request,
    "/dassets/v1/valid/monitorRulePackage/getMonitorRule",
    { packageIdList: [packageId], ruleTypeList: [1] },
    `${sourceRef}: 引入规则包`,
  );
  await test.info().attach("imported-rules.json", {
    body: JSON.stringify(importedRules, null, 2),
    contentType: "application/json",
  });
  expect(importedRules.length, `${sourceRef}: 引入规则包应返回 5 条规则`).toBe(EXPECTED_FUNCTIONS.length);

  const rules = importedRules.map(({ id: _id, functionName: _functionName, ...rule }) => rule);
  const payload = {
    ruleName,
    dataSourceId: Number(sourceRuleSet.dataSourceId),
    dataSourceType: Number(sourceRuleSet.dataSourceType),
    sourceType: Number(sourceRuleSet.dataSourceType),
    schemaName: "pw_test",
    schema: "pw_test",
    tableName,
    isSubscribe: 0,
    partition: "",
    packageCount: 1,
    scheduleConf: JSON.stringify({
      assetsPeriodType: "5",
      isFailRetry: true,
      periodType: "5",
      selfReliance: false,
      isTimeout: false,
      yarnResourceId: "3",
      maxRetryNum: "3",
    }),
    periodType: 5,
    assetsPeriodType: "5",
    associatedTasks: [],
    sendTypes: [],
    notifyUser: [],
    notifyDTOS: [],
    rules,
    packageIds: [packageId],
    ruleTypes: [1],
    expansion: JSON.stringify({ openSample: 0, sampleDto: {}, packageIds: [packageId], ruleTypes: [1] }),
    regularType: 0,
    taskParams: "",
  };

  const addResponse = await postEnvelope<string | number>(
    request,
    "/dassets/v1/valid/monitor/add",
    payload,
    `${sourceRef}: 新建质量任务`,
    360_000,
  );
  await test.info().attach("monitor-add-response.json", {
    body: JSON.stringify(
      {
        request: {
          ruleName,
          dataSourceId: payload.dataSourceId,
          dataSourceType: payload.dataSourceType,
          schemaName: payload.schemaName,
          tableName,
          packageCount: payload.packageCount,
          packageIds: payload.packageIds,
          ruleCount: rules.length,
          functions: importedRules.map((rule) => rule.functionName),
          sendTypes: payload.sendTypes,
          notifyUser: payload.notifyUser,
        },
        response: addResponse,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect(
    addResponse.success ?? addResponse.code === 1,
    `${sourceRef}: 新建质量任务应成功，code=${addResponse.code} message=${addResponse.message ?? ""}`,
  ).toBe(true);

  const monitorId = String(addResponse.data ?? "");
  if (monitorId) return monitorId;

  const pageData = await postData<DqPageData<MonitorPageRecord>>(
    request,
    "/dassets/v1/valid/monitor/pageQuery",
    { current: 1, size: 100, tableName },
    `${sourceRef}: 回查质量任务`,
  );
  const task = rowsFromPage(pageData).find((item) => item.ruleName === ruleName);
  expect(task?.id, `${sourceRef}: 应回查到新建质量任务 monitorId`).toBeTruthy();
  return String(task?.id);
}

async function runMonitorNow(request: APIRequestContext, monitorId: string, sourceRef: string): Promise<void> {
  const payload = await postEnvelope<string>(
    request,
    "/dassets/v1/valid/monitor/immediatelyExecuted",
    { monitorId },
    sourceRef,
    420_000,
  );
  await test.info().attach("monitor-immediate-execute-response.json", {
    body: JSON.stringify(payload, null, 2),
    contentType: "application/json",
  });
  expect(
    payload.success ?? payload.code === 1,
    `${sourceRef}: 立即执行应提交成功，code=${payload.code} message=${payload.message ?? ""}`,
  ).toBe(true);
}

async function collectGeneratedPackageSqlEvidence(
  request: APIRequestContext,
  monitorId: string,
  tableName: string,
  sourceRef: string,
): Promise<void> {
  const packages = await postData<RulePackageOption[]>(
    request,
    "/dassets/v1/valid/monitor/packagelist",
    { monitorId },
    `${sourceRef}: 查询规则 SQL 包列表`,
  );
  await test.info().attach("monitor-package-list.json", {
    body: JSON.stringify(packages, null, 2),
    contentType: "application/json",
  });

  for (const item of packages) {
    const packageId = item.packageId ?? item.id;
    if (!packageId) continue;
    const sql = await postData<string>(
      request,
      "/dassets/v1/valid/monitor/packagesql",
      { packageId },
      `${sourceRef}: 查询合并 SQL`,
    );
    await test.info().attach(`package-sql-${packageId}.sql`, {
      body: sql,
      contentType: "text/plain",
    });
    test.info().annotations.push({
      type: "sql-evidence",
      description: `packageId=${packageId}, table=${tableName}, length=${sql.length}`,
    });
  }
}

async function collectMonitorRecordEvidence(
  request: APIRequestContext,
  monitorId: string,
  sourceRef: string,
): Promise<void> {
  const pageData = await postData<DqPageData<MonitorRecord>>(
    request,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    { currentPage: 1, pageSize: 100, projectId: getEnvConfig().projects.quality.id },
    sourceRef,
  );
  const records = rowsFromPage(pageData)
    .filter((record) => String(record.monitorId) === String(monitorId))
    .sort((left, right) => Number(right.id ?? 0) - Number(left.id ?? 0));
  await test.info().attach("monitor-records-after-execute.json", {
    body: JSON.stringify(records.slice(0, 5), null, 2),
    contentType: "application/json",
  });
}

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});

test.describe.serial("【P2】完整性校验·多字段·抽样关闭·全不通过（bottom-up）", () => {
  test.setTimeout(25 * 60 * 1000);

  test("建唯一表→同步元数据→规则包→质量任务→立即执行→证据收集", async ({ page }) => {
    const sourceRef = "SR-ARCHIVE-V6411-SQL-MERGE-CMP-FAIL-BOTTOM-UP";
    const config = targetConfig();
    const tableName = uniqueTableName();
    const packageName = "完整性可合并规则";
    const ruleName = `test_rule_${tableName}`;
    test.info().annotations.push({ type: "table", description: `pw_test.${tableName}` });
    test.info().annotations.push({ type: "datasource", description: config.annotation });

    const sourceRuleSet = await test.step(`步骤0: 读取 ${config.annotation} 模板规则集`, async () =>
      querySourceRuleSet(page.request, `${sourceRef}: 模板规则集`),
    );

    await test.step(`步骤1: 从底层创建唯一 ${config.annotation} 表并同步元数据`, async () => {
      await prepareUniqueTable(page, tableName, sourceRef);
    });

    const createdRuleSet = await test.step("步骤2: 创建规则集和 5 条完整性规则包", async () =>
      createRuleSet(page.request, sourceRuleSet, tableName, packageName, sourceRef),
    );
    test.info().annotations.push({ type: "ruleSetId", description: String(createdRuleSet.id) });

    const monitorId = await test.step("步骤3: 创建质量任务并引入刚创建的规则包", async () =>
      createMonitorTask(page.request, sourceRuleSet, tableName, packageName, ruleName, sourceRef),
    );
    test.info().annotations.push({ type: "monitorId", description: monitorId });

    await test.step("步骤4: 触发质量任务立即执行", async () => {
      await runMonitorNow(page.request, monitorId, `${sourceRef}: 立即执行`);
    });

    await test.step("步骤5: 收集规则 SQL 证据供手动验证", async () => {
      await collectGeneratedPackageSqlEvidence(page.request, monitorId, tableName, sourceRef);
    });

    await test.step("步骤6: 收集任务实例状态证据供手动验证", async () => {
      await collectMonitorRecordEvidence(page.request, monitorId, `${sourceRef}: 执行后实例快照`);
    });
  });
});
