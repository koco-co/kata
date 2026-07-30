import { expect, type Locator, type Page, type Response } from "@playwright/test";

import { getEnvConfig } from "../../../../../../_shared/automation/runtime/env-profile";
import { buildDataAssetsUrl } from "../../../../../../_shared/automation/runtime/env-setup";

const PROJECT_STORAGE_KEYS = ["X-Valid-Project-ID", "dq_project_id"] as const;
const STANDARD_CATALOG_NAME = "自动化回归标准目录";
const CODE_CATALOG_NAME = "自动化回归码表目录";
const SOURCE_CASE_ID = "「数据标准」模块集成测试用例";
const SOURCE_CASE_CATALOG_NAME = "test";
const SOURCE_CASE_SPARKTHRIFT_TYPE = 45;
const SOURCE_CASE_REQUIRED_TABLES = ["test_info_1", "test_info_2"] as const;

function sourceCaseSparkThriftSource(): string {
  const env = getEnvConfig();
  return env.datasources[env.runtime.defaultDatasource].metadata.name;
}

function sourceCaseSparkThriftDb(): string {
  const env = getEnvConfig();
  return env.datasources[env.runtime.defaultDatasource].sql.database;
}
const STANDARD_CHECK_TASK_TYPE_TEMP = 0;
const STANDARD_CHECK_TASK_TYPE_PERIOD = 1;
const PARTITION_CONFIG_SELECT = 1;
const PARTITION_CONFIG_DYNAMIC = 2;
const PARTITION_CONFIG_INPUT = 3;
const STANDARD_CHECK_STATUS_SUCCESS = 2;
const STANDARD_CHECK_STATUS_FAIL = 4;
const STANDARD_CHECK_STATUS_CANCELED = 7;
const STANDARD_CHECK_STATUS_FROZEN = 18;
const STANDARD_CHECK_STATUS_STOP = 998;
const STANDARD_CHECK_STATUS_EXIST_NON_COMPLIANCE = 999;
const STANDARD_CHECK_TERMINAL_STATUSES = new Set([
  STANDARD_CHECK_STATUS_SUCCESS,
  STANDARD_CHECK_STATUS_FAIL,
  STANDARD_CHECK_STATUS_CANCELED,
  STANDARD_CHECK_STATUS_FROZEN,
  STANDARD_CHECK_STATUS_STOP,
  STANDARD_CHECK_STATUS_EXIST_NON_COMPLIANCE,
]);
const STANDARD_CHECK_LIGHTWEIGHT_TASK_PARAM = [
  "spark.driver.cores=1",
  "spark.driver.memory=1g",
  "spark.executor.instances=1",
  "spark.executor.cores=1",
  "spark.executor.memory=1g",
  "spark.sql.shuffle.partitions=1",
].join("\n");
const SOURCE_CASE_ENUM_CODE_CONTENT = [
  { encodeValue: "1", encodeName: "test1", encodeDesc: "test1" },
  { encodeValue: "2", encodeName: "test2", encodeDesc: "test2" },
  { encodeValue: "3", encodeName: "test3", encodeDesc: "test3" },
] as const;
const SOURCE_CASE_PRECONDITION_CODE_CONTENT = [
  { encodeValue: "1", encodeName: "一次性还款", encodeDesc: "根据合同规定一次性归还本金" },
  { encodeValue: "2", encodeName: "分期还款", encodeDesc: "根据合同规定分期归还本金" },
  { encodeValue: "3", encodeName: "提前还款", encodeDesc: "根据合同规定提前归还本金" },
] as const;
const COLLECTION_SOURCE_PREFERENCE =
  /SparkThrift2\.x|SparkThrift|Hadoop|Doris3\.x|Doris2\.x|Doris/i;

type ApiResponse<T> = {
  code?: number;
  success?: boolean;
  message?: string | null;
  data?: T;
};

type CatalogNode = {
  id: string | number;
  name?: string;
  children?: CatalogNode[] | null;
};

type PagedListData<T> = {
  total?: number;
  contentList?: T[];
};

type RootRecord = {
  id: string | number;
  rootAbbreviation: string;
  rootFullName?: string | null;
  rootCn?: string | null;
};

type CodeRecord = {
  id: string | number;
  codeName: string;
  codeNumber: string;
  catalogId?: string | number | null;
};

type StandardRow = {
  id: string | number;
  standardNameCn: string;
  standardName: string;
  standardNameAbbreviation?: string | null;
  standardStatus?: number;
  catalogId?: string | number | null;
};

type RuntimeDataSource = {
  dataSourceId?: string | number;
  id?: string | number;
  dataSourceName?: string;
  name?: string;
  dataSourceType?: number;
  type?: number;
};

type RuntimeDb = {
  key?: string | number;
  value?: string;
  id?: string | number;
  dbId?: string | number;
  dbName?: string;
  name?: string;
};

type RuntimeTable = {
  tableId?: string | number;
  id?: string | number;
  tableName?: string;
  name?: string;
  isView?: number;
  isMaterializedView?: number;
};

type RuntimeColumn = {
  columnId?: string | number;
  id?: string | number;
  columnName?: string;
  name?: string;
  columnNameCn?: string | null;
};

type SourceCaseRootInput = {
  rootAbbreviation: string;
  rootFullName: string;
  rootCn: string;
};

type SourceCaseCodeInput = {
  codeName: string;
  codeNumber: string;
  catalogName: string;
  codeDesc: string;
  codeFrom: string;
  codeContent: Array<{ encodeValue: string; encodeName: string; encodeDesc: string }>;
};

type SourceCaseStandardInput = {
  standardNameCn: string;
  standardName: string;
  standardNameAbbreviation: string;
  catalogName: string;
  standardStatus: number;
  standardNumber?: string;
  businessDefinition?: string;
  standardFrom?: string;
  customAttribute?: Array<{ key: string; value: string; isModify?: boolean }>;
  carForests?: unknown[];
  techAttributes?: unknown[];
};

type CodeDetail = CodeRecord & {
  codeContent?: Array<{ encodeValue: string; encodeName: string; encodeDesc: string }>;
};

type MappingRecord = {
  mappingId?: string | number;
  tableName?: string;
  columnName?: string;
  bindStatus?: number;
};

type TableMappingStandardColumn = {
  mappingId?: string | number;
  standardId?: string | number;
  columnId?: string | number;
  columnName?: string;
  tableName?: string;
  tableId?: string | number;
  enableOpen?: number;
  checkItems?: number[];
};

type StandardCheckTaskRecord = {
  id?: string | number;
  datasourceId?: string | number;
  datasourceName?: string;
  dbId?: string | number;
  schemaName?: string;
  tableId?: string | number;
  tableName?: string;
  status?: number;
  quality?: number | null;
  noComplianceCount?: number | null;
  checkFailCount?: number | null;
  lastCheckAt?: string | null;
  existFinishJob?: number | null;
};

type StandardCheckRunRecord = StandardCheckTaskRecord & {
  statusName?: string;
  executeStartTime?: string | null;
  executeEndTime?: string | null;
};

type StandardCheckColumnRecord = {
  id?: string | number;
  tableId?: string | number;
  datasourceName?: string;
  schemaName?: string;
  tableName?: string;
  columnName?: string;
  jobId?: string;
  status?: number;
  statusName?: string;
  upStandard?: number;
  checkItemResult?: Array<Record<string, unknown>>;
  executeStartTime?: string | null;
  executeEndTime?: string | null;
  flowJobId?: string;
  standardId?: string | number;
};

type StandardCheckExpected = {
  status: number;
  quality: number;
  noComplianceCount: number;
  checkFailCount: number;
  upStandard: 0 | 1;
  label: "达标" | "未达标";
};

type StandardCheckScenario = {
  caseId: string;
  evidence: string;
  tableName: (typeof SOURCE_CASE_REQUIRED_TABLES)[number];
  columnName: "money" | "amount";
  partition: string;
  tablePartitionType:
    | typeof PARTITION_CONFIG_SELECT
    | typeof PARTITION_CONFIG_DYNAMIC
    | typeof PARTITION_CONFIG_INPUT;
  dynamicPartitionInfo?: {
    firstPartitionField: string;
    firstPartitionValue: string;
  };
  carModelColumn?: string;
  taskType: typeof STANDARD_CHECK_TASK_TYPE_TEMP | typeof STANDARD_CHECK_TASK_TYPE_PERIOD;
  immediateExecute?: 0 | 1;
  existingTaskId?: string | number;
  deleteAfter?: boolean;
  expected: StandardCheckExpected;
};

type DatabaseCollectionRecord = {
  id: number | string;
  collectType?: number | null;
  collectFrom?: string | null;
  collectCondition?: number | string | null;
  collectStatus?: number | null;
  collectCount?: number | null;
  createAt?: string | null;
  finishDate?: string | null;
};

export type CreatedPlatformRecord = {
  recordType:
    | "standard-root"
    | "standard-code"
    | "standard-definition"
    | "database-collection"
    | "standard-mapping"
    | "standard-check";
  recordName: string;
  recordId?: string;
  recordEnglishName?: string;
  catalogName?: string;
  status?: string;
  route: string;
  evidence: string;
  api?: string;
};

export type CreatedStandardRecord = CreatedPlatformRecord;

export type SourceCaseBlocker = {
  caseId: string;
  reasonCategory: "case_gap" | "data_prep" | "environment" | "permission";
  detail: string;
};

export type SourceCasePreconditionReport = {
  sourceCaseId: string;
  records: CreatedPlatformRecord[];
  sparkThrift: {
    dataSourceName?: string;
    dataSourceId?: string;
    databaseName?: string;
    databaseId?: string;
    requiredTables: readonly string[];
    exactTables: Array<{ tableName: string; tableId: string; columns: string[] }>;
    missingTables: string[];
    sampledTables: string[];
  };
  blockers: SourceCaseBlocker[];
};

function projectId(): number {
  return getEnvConfig().projects.quality.id;
}

function looseLabel(label: string): RegExp {
  return new RegExp(label.replace(/\s+/g, "\\s*"));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findCatalogByName(
  nodes: readonly CatalogNode[] | null | undefined,
  targetName: string,
): CatalogNode | null {
  if (!nodes) return null;
  for (const node of nodes) {
    if (node.name === targetName) return node;
    const child = findCatalogByName(node.children, targetName);
    if (child) return child;
  }
  return null;
}

function statusText(standardStatus?: number): string {
  if (standardStatus === 1) return "已上线";
  if (standardStatus === 2) return "待审批";
  return "待上线";
}

function dataTypeName(dataTypeId: number): string {
  if (dataTypeId === 2) return "数值型";
  if (dataTypeId === 3) return "日期型";
  if (dataTypeId === 4) return "日期时间型";
  if (dataTypeId === 5) return "时间型";
  if (dataTypeId === 6) return "布尔型";
  return "字符型";
}

function defaultValueRange() {
  return {
    preOperator: undefined,
    preValue: "",
    relationType: 0,
    postOperator: undefined,
    postValue: "",
    initValue: undefined,
    invalidValue: undefined,
  };
}

function sourceCaseCarForests() {
  return [
    {
      carSeries: "车系1",
      carModel: null,
      root: true,
      children: [
        { carSeries: "车系1", carModel: "车型1", root: false, children: [] },
        { carSeries: "车系1", carModel: "车型2", root: false, children: [] },
      ],
    },
  ];
}

export class DataStandardIntegrationPage {
  constructor(private readonly page: Page) {}

  async goto(
    path: string,
    sourceRef: string,
    expectedApiPaths: readonly string[] = [],
  ): Promise<void> {
    let responses = await this.visitRoute(path, sourceRef, expectedApiPaths);

    if (responses.some((response) => response === null) && (await this.isRouteShellOnly())) {
      responses = await this.visitRoute(path, sourceRef, expectedApiPaths);
    }

    for (let index = 0; index < expectedApiPaths.length; index += 1) {
      this.expectOkResponse(responses[index], expectedApiPaths[index], sourceRef);
    }
  }

  private async visitRoute(
    path: string,
    sourceRef: string,
    expectedApiPaths: readonly string[],
  ): Promise<Array<Response | null>> {
    await this.installProjectContext();
    if (this.page.url().includes("/dataAssets/")) {
      await this.page.goto("about:blank", { waitUntil: "domcontentloaded" });
    }

    const responseWaits = expectedApiPaths.map((apiPath) =>
      this.page
        .waitForResponse((response) => response.url().includes(apiPath), { timeout: 30_000 })
        .catch(() => null),
    );

    await this.page.goto(buildDataAssetsUrl(path, projectId()), {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await this.applyProjectContext();

    const body = this.body();
    await expect(body, `${sourceRef}: DataAssets shell should be logged in`).not.toContainText(
      /欢迎登录|UIC账号登录|账号登录|密码/,
      { timeout: 10_000 },
    );
    await expect(body, `${sourceRef}: DataAssets shell should be visible`).toContainText(
      "DataAssets",
      {
        timeout: 30_000,
      },
    );
    await expect(body, `${sourceRef}: page should not show global server error`).not.toContainText(
      /服务器异常|请求异常/,
      { timeout: 10_000 },
    );

    return Promise.all(responseWaits);
  }

  async expectStandardStatistic(sourceRef: string): Promise<void> {
    await this.goto("/standardStatistic", sourceRef, [
      "/dmetadata/v1/standardStatistic/standardHot",
      "/dmetadata/v1/standardStatistic/standardTrend",
      "/dmetadata/v1/standardStatistic/rootCount",
      "/dmetadata/v1/standardStatistic/standardSource",
      "/dmetadata/v1/standardStatistic/codeCount",
      "/dmetadata/v1/standardStatistic/standardCatalog",
      "/dmetadata/v1/standardStatistic/standardCount",
    ]);
    await this.expectBodyTexts(sourceRef, [
      "标准统计",
      "数据标准",
      "已上线",
      "待上线",
      "代码表",
      "词根管理",
      "标准热度",
      "标准目录分布",
      "标准趋势",
      "标准来源分布",
    ]);
  }

  async expectRootManagement(sourceRef: string): Promise<void> {
    await this.goto("/rootManage", sourceRef, [
      "/dmetadata/v1/standardRoot/getUpdateUsers",
      "/dmetadata/v1/standardRoot/pageQuery",
    ]);
    await this.expectBodyTexts(sourceRef, ["词根管理", "导入词根", "新建词根", "导出词根"]);
    await this.expectTableHeaders(sourceRef, [
      "词根简称",
      "词根全称",
      "词根中文名",
      "被引用数量",
      "更新时间",
      "更新用户",
      "操作",
    ]);
  }

  async expectCodeTableManagement(sourceRef: string): Promise<void> {
    await this.goto("/codeTableManage", sourceRef, [
      "/dmetadata/v1/standardCodeCatalog/listCatalog",
      "/dmetadata/v1/standardCode/pageQuery",
      "/dmetadata/v1/standardCode/listUser",
    ]);
    await this.expectBodyTexts(sourceRef, ["码表管理", "导出代码", "导入代码", "新建代码"]);
    await this.expectTableHeaders(sourceRef, [
      "代码名称",
      "代码编号",
      "代码说明",
      "被引用数量",
      "更新时间",
      "更新用户",
      "操作",
    ]);
  }

  async expectIndustryTemplate(sourceRef: string): Promise<void> {
    await this.goto("/industryTemplate", sourceRef);
    await this.expectBodyTexts(sourceRef, ["行业模版", "选择模版", "引用标准"]);
    await this.expectTableHeaders(sourceRef, [
      "中文名称",
      "英文名称",
      "标准编号",
      "标准目录",
      "数据类型",
      "业务定义",
    ]);
  }

  async expectDatabaseCollect(sourceRef: string): Promise<void> {
    await this.goto("/databaseCollect", sourceRef, [
      "/dmetadata/v1/databaseCollection/pageQueryCollection",
    ]);
    await this.expectBodyTexts(sourceRef, ["数据库拾取", "新建拾取"]);
    await this.expectTableHeaders(sourceRef, [
      "拾取类型",
      "拾取来源",
      "拾取条件",
      "状态",
      "拾取数量",
      "创建时间",
      "完成时间",
      "操作",
    ]);
  }

  async expectStandardDefinition(sourceRef: string): Promise<void> {
    await this.goto("/dataStandard", sourceRef, [
      "/dmetadata/v1/dataStandard/pageQuery",
      "/dmetadata/v1/standardCatalog/listCatalog",
    ]);
    await this.expectBodyTexts(sourceRef, [
      "标准定义",
      "标准目录",
      "导出标准",
      "导入标准",
      "新建标准",
    ]);
    await this.expectTableHeaders(sourceRef, [
      "中文名称",
      "英文名称",
      "英文缩写",
      "业务定义",
      "状态",
      "创建时间",
      "操作",
    ]);
  }

  async prepareSourceCasePreconditions(sourceRef: string): Promise<SourceCasePreconditionReport> {
    await this.goto("/dataStandard", sourceRef, [
      "/dmetadata/v1/dataStandard/pageQuery",
      "/dmetadata/v1/standardCatalog/listCatalog",
    ]);

    const records: CreatedPlatformRecord[] = [];
    const root = await this.ensureSourceCaseRoot(
      {
        rootAbbreviation: "test",
        rootFullName: "test",
        rootCn: "test",
      },
      sourceRef,
    );
    records.push(this.toRootPlatformRecord(root, "前置条件：词根管理已存在词根 test/test/test"));

    await this.ensureCodeCatalog(SOURCE_CASE_CATALOG_NAME);
    const preconditionCode = await this.ensureSourceCaseCode(
      {
        codeName: "测试",
        codeNumber: "test1",
        catalogName: SOURCE_CASE_CATALOG_NAME,
        codeDesc: "代码测试",
        codeFrom: "JR/T 0014-2005",
        codeContent: [...SOURCE_CASE_PRECONDITION_CODE_CONTENT],
      },
      sourceRef,
    );
    records.push(
      this.toCodePlatformRecord(
        preconditionCode,
        SOURCE_CASE_CATALOG_NAME,
        "前置条件：码表管理已存在代码 测试/test1",
      ),
    );

    await this.ensureStandardCatalog(SOURCE_CASE_CATALOG_NAME);
    const ageStandard = await this.ensureSourceCaseStandard(
      {
        standardNameCn: "年龄",
        standardName: "age",
        standardNameAbbreviation: "age",
        catalogName: SOURCE_CASE_CATALOG_NAME,
        standardStatus: 0,
      },
      sourceRef,
    );
    records.push(
      this.toStandardPlatformRecord(
        ageStandard,
        SOURCE_CASE_CATALOG_NAME,
        "前置条件：标准定义已存在标准 年龄/age",
      ),
    );

    const sparkThrift = await this.inspectSourceCaseSparkThrift(sourceRef);
    const blockers: SourceCaseBlocker[] = [];
    if (sparkThrift.missingTables.length > 0) {
      blockers.push({
        caseId: `${SOURCE_CASE_ID}#前置条件4`,
        reasonCategory: "data_prep",
        detail: `SparkThrift2.x 数据源 ${sparkThrift.dataSourceName ?? sourceCaseSparkThriftSource()}/库 ${
          sparkThrift.databaseName ?? sourceCaseSparkThriftDb()
        } 的平台元数据缺少源用例精确表：${sparkThrift.missingTables.join(", ")}；不能用带后缀的 test_info_1_* 表替代。`,
      });
    }

    return {
      sourceCaseId: SOURCE_CASE_ID,
      records,
      sparkThrift,
      blockers,
    };
  }

  async createSourceCaseBasisRecords(sourceRef: string): Promise<CreatedPlatformRecord[]> {
    const records: CreatedPlatformRecord[] = [];

    await this.expectRootManagement(sourceRef);
    const emailRoot = await this.ensureSourceCaseRoot(
      {
        rootAbbreviation: "email",
        rootFullName: "email",
        rootCn: "邮箱",
      },
      sourceRef,
    );
    records.push(this.toRootPlatformRecord(emailRoot, "步骤9：新建词根 email/email/邮箱"));
    await this.expectRootRow(emailRoot, sourceRef);

    await this.expectCodeTableManagement(sourceRef);
    const sourceCode = await this.ensureSourceCaseCode(
      {
        codeName: "code",
        codeNumber: "001",
        catalogName: SOURCE_CASE_CATALOG_NAME,
        codeDesc: "代码",
        codeFrom: "CD-001",
        codeContent: [...SOURCE_CASE_ENUM_CODE_CONTENT],
      },
      sourceRef,
    );
    records.push(
      this.toCodePlatformRecord(
        sourceCode,
        SOURCE_CASE_CATALOG_NAME,
        "步骤16-17：目录 test 下新建代码 code/001",
      ),
    );
    await this.expectCodeRow(sourceCode, sourceRef);

    return records;
  }

  async createSourceCaseStandardsAndMappings(
    sourceRef: string,
  ): Promise<{ records: CreatedPlatformRecord[]; blockers: SourceCaseBlocker[] }> {
    const records: CreatedPlatformRecord[] = [];
    const blockers: SourceCaseBlocker[] = [
      {
        caseId: `${SOURCE_CASE_ID}#步骤10/18/50`,
        reasonCategory: "case_gap",
        detail: "源用例只写“修改所有可以修改的内容”，未给修改后的目标值；严格模式下未编造编辑值。",
      },
      {
        caseId: `${SOURCE_CASE_ID}#步骤37`,
        reasonCategory: "case_gap",
        detail:
          "源用例要求邮箱标准“正确填写其他业务属性和技术属性”，但未给标准编号、业务定义、技术属性具体值；脚本只创建了源用例明确给出的 邮箱/email/email 与码表引用。",
      },
      {
        caseId: `${SOURCE_CASE_ID}#步骤53-57/141-143`,
        reasonCategory: "data_prep",
        detail:
          "导入/导出内容校验需要模板文件与期望文件内容 fixture；当前源目录未提供可上传模板文件，未用接口替代导入动作。",
      },
      {
        caseId: `${SOURCE_CASE_ID}#步骤59-60`,
        reasonCategory: "permission",
        detail:
          "数据开发用户待审批与管理员审批中心流程需要第二角色登录态；当前 env profile 只有 admin@dtstack.com 会话。",
      },
    ];

    await this.expectStandardDefinition(sourceRef);
    await this.ensureCodeCatalog(SOURCE_CASE_CATALOG_NAME);
    const enumCode = await this.ensureSourceCaseCode(
      {
        codeName: "code",
        codeNumber: "001",
        catalogName: SOURCE_CASE_CATALOG_NAME,
        codeDesc: "代码",
        codeFrom: "CD-001",
        codeContent: [...SOURCE_CASE_ENUM_CODE_CONTENT],
      },
      sourceRef,
    );
    const enumCodeDetail = await this.getCodeDetail(enumCode.id);

    const moneyStandard = await this.ensureSourceCaseStandard(
      {
        standardNameCn: "金额",
        standardName: "money",
        standardNameAbbreviation: "my",
        standardNumber: "bz001",
        catalogName: SOURCE_CASE_CATALOG_NAME,
        businessDefinition: "无车型的金额标准",
        standardFrom: "1",
        standardStatus: 0,
        techAttributes: [
          this.sourceCaseTechAttribute({
            dataTypeId: 1,
            dataLength: "4",
            prePrecision: "2",
            postPrecision: "1",
            valueRange: {
              preOperator: ">",
              preValue: "1",
              relationType: 0,
              postOperator: "<=",
              postValue: "50",
              initValue: 2,
              invalidValue: 0.1,
            },
            precisionMultiple: 2,
            deviation: 0.02,
            enumCode: enumCodeDetail,
          }),
        ],
      },
      sourceRef,
    );
    records.push(
      this.toStandardPlatformRecord(
        moneyStandard,
        SOURCE_CASE_CATALOG_NAME,
        "步骤28-32：新建标准 金额/money/my，待上线",
      ),
    );

    const emailStandard = await this.ensureSourceCaseStandard(
      {
        standardNameCn: "邮箱",
        standardName: "email",
        standardNameAbbreviation: "email",
        catalogName: SOURCE_CASE_CATALOG_NAME,
        standardStatus: 0,
        techAttributes: [
          this.sourceCaseTechAttribute({
            dataTypeId: 1,
            enumCode: enumCodeDetail,
          }),
        ],
      },
      sourceRef,
    );
    records.push(
      this.toStandardPlatformRecord(
        emailStandard,
        SOURCE_CASE_CATALOG_NAME,
        "步骤33-37：新建标准 邮箱/email/email，待上线",
      ),
    );

    const amountStandard = await this.ensureSourceCaseStandard(
      {
        standardNameCn: "总额",
        standardName: "amount",
        standardNameAbbreviation: "at",
        standardNumber: "bz002",
        catalogName: SOURCE_CASE_CATALOG_NAME,
        businessDefinition: "有车型的总额标准",
        standardFrom: "1",
        standardStatus: 0,
        carForests: sourceCaseCarForests(),
        techAttributes: [
          this.sourceCaseTechAttribute({
            carModel: "车型1",
            dataTypeId: 2,
            dataLength: "7",
            prePrecision: "3",
            postPrecision: "3",
            valueRange: {
              preOperator: ">=",
              preValue: "10",
              relationType: 0,
              postOperator: "<=",
              postValue: "280",
              initValue: 2,
              invalidValue: 0.1,
            },
            precisionMultiple: 0.2,
            deviation: 0.02,
            enumCode: enumCodeDetail,
          }),
          this.sourceCaseTechAttribute({
            carModel: "车型2",
            dataTypeId: 2,
            dataLength: "5",
            prePrecision: "2",
            postPrecision: "3",
            valueRange: {
              preOperator: ">=",
              preValue: "18",
              relationType: 0,
              postOperator: "<=",
              postValue: "99",
              initValue: 2,
              invalidValue: 0.1,
            },
            precisionMultiple: 0.02,
            deviation: 0.02,
            enumCode: enumCodeDetail,
          }),
        ],
      },
      sourceRef,
    );
    records.push(
      this.toStandardPlatformRecord(
        amountStandard,
        SOURCE_CASE_CATALOG_NAME,
        "步骤39-49：新建标准 总额/amount/at，待上线",
      ),
    );

    const publishedStandards = await this.publishSourceCaseStandards(
      [emailStandard, moneyStandard, amountStandard],
      sourceRef,
    );
    for (const standard of publishedStandards) {
      records.push(
        this.toStandardPlatformRecord(
          standard,
          SOURCE_CASE_CATALOG_NAME,
          `步骤58：管理员上线标准 ${standard.standardNameCn}`,
        ),
      );
    }

    await this.expectStandardMapping(sourceRef);
    for (const standard of publishedStandards) {
      const mappingResult = await this.startSourceCaseStandardMapping(standard, sourceRef);
      if (mappingResult.record) records.push(mappingResult.record);
      if (mappingResult.blocker) blockers.push(mappingResult.blocker);
    }

    const sparkThrift = await this.inspectSourceCaseSparkThrift(sourceRef);
    if (sparkThrift.missingTables.length > 0) {
      blockers.push({
        caseId: `${SOURCE_CASE_ID}#步骤70-143`,
        reasonCategory: "data_prep",
        detail: `字段绑定与落标检查要求精确表 test_info_1/test_info_2。当前平台元数据缺少：${sparkThrift.missingTables.join(
          ", ",
        )}，已停止执行 money/amount 字段绑定和落标检查任务创建。`,
      });
    } else {
      records.push(
        await this.bindSourceCaseMappedField(moneyStandard, "test_info_1", "money", sourceRef),
      );
      records.push(
        await this.bindSourceCaseMappedField(amountStandard, "test_info_2", "amount", sourceRef),
      );
    }

    return { records, blockers };
  }

  async createStandardDefinitionRecord(sourceRef: string): Promise<CreatedStandardRecord> {
    const suffix = Date.now().toString(36);
    const recordName = `自动化标准_${suffix}`;
    const recordEnglishName = `qa_auto_std_${suffix}`;
    const status = "已上线";

    await this.goto("/dataStandard", sourceRef, [
      "/dmetadata/v1/dataStandard/pageQuery",
      "/dmetadata/v1/standardCatalog/listCatalog",
    ]);
    await this.ensureStandardCatalog(STANDARD_CATALOG_NAME);

    await this.page.getByRole("button", { name: looseLabel("新建标准") }).click();
    await expect(this.body(), `${sourceRef}: add standard form should be visible`).toContainText(
      "新建标准",
      {
        timeout: 20_000,
      },
    );
    await expect(
      this.page.locator(".dt-addOrUpdateStandard-form"),
      `${sourceRef}: standard form should render`,
    ).toBeVisible({
      timeout: 20_000,
    });

    await this.page.locator("#standardNameCn").fill(recordName);
    await this.page.locator("#standardName").fill(recordEnglishName);
    await this.page.locator("#standardNameAbbreviation").fill(`qas_${suffix}`);
    await this.selectStandardCatalog(STANDARD_CATALOG_NAME);

    const saveResponse = this.page.waitForResponse(
      (response) => response.url().includes("/dmetadata/v1/dataStandard/addOrUpdate"),
      { timeout: 30_000 },
    );
    await this.page
      .locator("button")
      .filter({ hasText: /上\s*线/ })
      .first()
      .click();
    this.expectOkResponse(await saveResponse, "/dmetadata/v1/dataStandard/addOrUpdate", sourceRef);

    await expect(this.page, `${sourceRef}: save should return to standard list`).toHaveURL(
      /\/dataStandard(?:[?#]|$)/,
      {
        timeout: 30_000,
      },
    );
    const createdRow = this.page.locator(".ant-table-row").filter({ hasText: recordName }).first();
    await expect(
      createdRow,
      `${sourceRef}: created standard record should be visible in platform`,
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      createdRow,
      `${sourceRef}: created standard record should be online`,
    ).toContainText(status);

    return {
      recordType: "standard-definition",
      recordName,
      recordId: String((await this.findStandardRecord(recordName)).id),
      recordEnglishName,
      catalogName: STANDARD_CATALOG_NAME,
      status,
      route: "/dataStandard",
      evidence: "标准定义列表新增记录",
      api: "/dmetadata/v1/dataStandard/addOrUpdate",
    };
  }

  async createRootRecord(sourceRef: string): Promise<CreatedPlatformRecord> {
    const suffix = Date.now().toString(36);
    const rootAbbreviation = `qa_root_${suffix}`;
    const rootFullName = rootAbbreviation;
    const rootCn = `自动化词根_${suffix}`;

    await this.goto("/rootManage", sourceRef, [
      "/dmetadata/v1/standardRoot/getUpdateUsers",
      "/dmetadata/v1/standardRoot/pageQuery",
    ]);

    await this.page.getByRole("button", { name: looseLabel("新建词根") }).click();
    const modal = this.page.locator(".ant-modal:visible").first();
    await expect(modal, `${sourceRef}: add root modal should be visible`).toBeVisible({
      timeout: 20_000,
    });
    await expect(modal, `${sourceRef}: add root modal title should be correct`).toContainText(
      "新建词根",
    );

    await this.fillModalFormInput(modal, "词根简称", rootAbbreviation);
    await this.fillModalFormInput(modal, "词根全称", rootFullName);
    await this.fillModalFormInput(modal, "词根中文名", rootCn);

    const saveResponse = this.page.waitForResponse(
      (response) => response.url().includes("/dmetadata/v1/standardRoot/addOrUpdateRoot"),
      { timeout: 30_000 },
    );
    await modal.locator(".ant-modal-footer .ant-btn-primary").click();
    await this.expectOkApiResponse(
      await saveResponse,
      "/dmetadata/v1/standardRoot/addOrUpdateRoot",
      sourceRef,
    );

    const record = await this.findRootRecord(rootAbbreviation);
    await expect
      .poll(async () => (await this.findRootRecord(rootAbbreviation)).rootCn ?? "", {
        timeout: 30_000,
        message: `${sourceRef}: created root should be queryable from platform API`,
      })
      .toBe(rootCn);

    await this.goto("/rootManage", sourceRef, ["/dmetadata/v1/standardRoot/pageQuery"]);
    const createdRow = this.page
      .locator(".ant-table-row")
      .filter({ hasText: rootAbbreviation })
      .first();
    await expect(
      createdRow,
      `${sourceRef}: created root should be visible in platform`,
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(createdRow, `${sourceRef}: root row should show Chinese name`).toContainText(
      rootCn,
    );

    return {
      recordType: "standard-root",
      recordName: rootCn,
      recordId: String(record.id),
      recordEnglishName: rootAbbreviation,
      status: "已创建",
      route: "/rootManage",
      evidence: "词根管理列表新增记录",
      api: "/dmetadata/v1/standardRoot/addOrUpdateRoot",
    };
  }

  async createCodeTableRecord(sourceRef: string): Promise<CreatedPlatformRecord> {
    const suffix = Date.now().toString(36);
    const codeName = `自动化代码_${suffix}`;
    const codeNumber = `qa_code_${suffix}`;

    await this.goto("/codeTableManage", sourceRef, [
      "/dmetadata/v1/standardCodeCatalog/listCatalog",
      "/dmetadata/v1/standardCode/pageQuery",
      "/dmetadata/v1/standardCode/listUser",
    ]);
    const catalog = await this.ensureCodeCatalog(CODE_CATALOG_NAME);
    const catalogId = catalog.id;

    this.expectApiData(
      "create standard code",
      await this.postJsonFromPage<ApiResponse<string | number>>(
        "/dmetadata/v1/standardCode/addOrUpdateCode",
        {
          codeName,
          codeNumber,
          catalogId,
          codeDesc: "Playwright 自动化回归新增码表",
          codeFrom: "Playwright",
          codeContent: [
            {
              encodeValue: "1",
              encodeName: "启用",
              encodeDesc: "自动化编码启用",
            },
            {
              encodeValue: "0",
              encodeName: "停用",
              encodeDesc: "自动化编码停用",
            },
          ],
        },
      ),
    );

    const record = await this.findCodeRecord(codeName);
    await this.goto("/codeTableManage", sourceRef, ["/dmetadata/v1/standardCode/pageQuery"]);
    const createdRow = this.page.locator(".ant-table-row").filter({ hasText: codeName }).first();
    await expect(
      createdRow,
      `${sourceRef}: created code should be visible in platform`,
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(createdRow, `${sourceRef}: code row should show code number`).toContainText(
      codeNumber,
    );

    return {
      recordType: "standard-code",
      recordName: codeName,
      recordId: String(record.id),
      recordEnglishName: codeNumber,
      catalogName: CODE_CATALOG_NAME,
      status: "已创建",
      route: "/codeTableManage",
      evidence: "码表管理列表新增记录",
      api: "/dmetadata/v1/standardCode/addOrUpdateCode",
    };
  }

  async createDatabaseCollectionRecords(sourceRef: string): Promise<CreatedPlatformRecord[]> {
    await this.goto("/databaseCollect", sourceRef, [
      "/dmetadata/v1/databaseCollection/pageQueryCollection",
    ]);
    const existingCollectionIds = new Set(
      (await this.listDatabaseCollections()).map((record) => String(record.id)),
    );

    const rootCollection = await this.createDatabaseCollection(
      "词根管理",
      existingCollectionIds,
      sourceRef,
    );
    existingCollectionIds.add(String(rootCollection.id));
    const standardCollection = await this.createDatabaseCollection(
      "数据标准",
      existingCollectionIds,
      sourceRef,
    );

    const completedRoot = await this.waitForDatabaseCollectionComplete(
      rootCollection.id,
      sourceRef,
    );
    const completedStandard = await this.waitForDatabaseCollectionComplete(
      standardCollection.id,
      sourceRef,
    );
    await this.expectDatabaseCollectionRow(completedRoot, "词根管理", sourceRef);
    await this.expectDatabaseCollectionRow(completedStandard, "数据标准", sourceRef);

    return [
      this.toDatabaseCollectionPlatformRecord(completedRoot, "词根管理"),
      this.toDatabaseCollectionPlatformRecord(completedStandard, "数据标准"),
    ];
  }

  async createStandardMappingRecord(
    sourceRef: string,
    standardRecord: CreatedPlatformRecord,
  ): Promise<CreatedPlatformRecord> {
    await this.goto("/standardMapping", sourceRef, [
      "/dmetadata/v1/standardMapping/mappingList",
      "/dmetadata/v1/standardCatalog/listCatalog",
    ]);
    const standard = await this.findStandardRecord(standardRecord.recordName);
    const datasourceType = this.activeDatasourceType();
    const datasource = await this.findRuntimeDatasource(datasourceType);
    const datasourceId = datasource.dataSourceId ?? datasource.id;
    if (datasourceId === undefined || datasourceId === null) {
      throw new Error(`No datasource id returned for datasource type ${datasourceType}`);
    }
    const db = await this.findRuntimeDb(datasourceId, sourceRef);
    const dbId = db.key ?? db.dbId ?? db.id;
    if (dbId === undefined || dbId === null) {
      throw new Error(`No database id returned for datasource ${datasourceId}`);
    }

    this.expectApiData(
      "start standard mapping",
      await this.postJsonFromPage<ApiResponse<unknown>>(
        "/dmetadata/v1/standardMapping/startMapping",
        {
          standardIds: [standard.id],
          dataSourceTypes: [datasourceType],
          dataSourceIds: [datasourceId],
          dbIds: [dbId],
        },
      ),
    );

    await expect
      .poll(
        async () => {
          const data = this.expectApiData(
            "query standard mapping",
            await this.postJsonFromPage<ApiResponse<PagedListData<Record<string, unknown>>>>(
              "/dmetadata/v1/standardMapping/mappingList",
              {
                asc: false,
                current: 1,
                size: 20,
                search: standardRecord.recordName,
              },
            ),
          );
          return (data.contentList ?? []).some(
            (item) => String(item.standardNameCn ?? "") === standardRecord.recordName,
          );
        },
        {
          timeout: 60_000,
          message: `${sourceRef}: standard mapping record should be queryable from platform API`,
        },
      )
      .toBe(true);

    await this.goto("/standardMapping", sourceRef, ["/dmetadata/v1/standardMapping/mappingList"]);
    const createdRow = this.page
      .locator(".ant-table-row")
      .filter({ hasText: standardRecord.recordName })
      .first();
    await expect(
      createdRow,
      `${sourceRef}: mapped standard should be visible in platform`,
    ).toBeVisible({
      timeout: 30_000,
    });

    return {
      recordType: "standard-mapping",
      recordName: standardRecord.recordName,
      recordId: String(standard.id),
      recordEnglishName: standard.standardName,
      status: "已发起映射",
      route: "/standardMapping",
      evidence: `标准映射列表产生 ${standardRecord.recordName} 映射记录`,
      api: "/dmetadata/v1/standardMapping/startMapping",
    };
  }

  async expectStandardMapping(sourceRef: string): Promise<void> {
    await this.goto("/standardMapping", sourceRef, [
      "/dmetadata/v1/standardMapping/mappingList",
      "/dmetadata/v1/standardCatalog/listCatalog",
    ]);
    await this.expectBodyTexts(sourceRef, ["标准映射", "标准目录"]);
    await expect(
      this.page.getByRole("button", { name: looseLabel("标准映射") }).first(),
      `${sourceRef}: standard mapping button should be visible`,
    ).toBeVisible({ timeout: 20_000 });
    await this.expectTableHeaders(sourceRef, [
      "中文名称",
      "英文名称",
      "字段绑定(个)",
      "最近映射时间",
      "操作",
    ]);
  }

  async expectStandardCheck(sourceRef: string): Promise<void> {
    await this.goto("/standardCheck", sourceRef, [
      "/dmetadata/v1/standardTableCheck/configStandardTableCheckDatasource",
      "/dmetadata/v1/standardTableCheck/overview",
      "/dmetadata/v1/standardTableCheck/list",
    ]);
    await this.expectBodyTexts(sourceRef, [
      "落标检查总览",
      "检查数据表",
      "标准达标率",
      "检查字段总数",
      "达标字段数",
      "落标检查设置",
      "落标检查结果",
      "新增检查任务",
      "批量开启",
      "批量关闭",
    ]);
    await this.expectTableHeaders(sourceRef, [
      "数据表名称",
      "所属数据源",
      "所属数据库",
      "检查字段数/总字段数",
      "检查周期",
      "检查状态",
      "标准达标率",
      "不达标字段数/检查失败数",
      "最近编辑时间",
      "最近检查时间",
      "操作",
    ]);
  }

  async expectStandardCheckAddEntry(sourceRef: string): Promise<void> {
    await this.expectStandardCheck(sourceRef);
    await this.page.getByRole("button", { name: "新增检查任务" }).click();
    await expect(
      this.body(),
      `${sourceRef}: add check task should expose content configuration`,
    ).toContainText(/数据源|数据库|数据表|标准目录|下一步|取消/, { timeout: 30_000 });
  }

  async createSourceCaseStandardCheckRecords(
    sourceRef: string,
  ): Promise<{ records: CreatedPlatformRecord[]; blockers: SourceCaseBlocker[] }> {
    const records: CreatedPlatformRecord[] = [];
    const blockers: SourceCaseBlocker[] = [
      {
        caseId: `${SOURCE_CASE_ID}#步骤99/118`,
        reasonCategory: "case_gap",
        detail:
          "源用例步骤99/118写的是 test_info_2 分区 dt=2026-01-12/13，但同一用例前置DDL和平台元数据字段为 order_date；脚本按源DDL与平台真实元数据执行 order_date=2026-01-12/13，并保留该用例文本冲突证据。",
      },
    ];

    await this.expectStandardCheck(sourceRef);

    const passMoney = await this.createAndAssertSourceCaseStandardCheck(
      {
        caseId: `${SOURCE_CASE_ID}#步骤75-86`,
        evidence:
          "步骤75-86：test_info_1.money 选择已有分区 dt=2026-05-27，周期任务新增并立即执行，预期达标后删除任务",
        tableName: "test_info_1",
        columnName: "money",
        partition: "dt=2026-05-27",
        tablePartitionType: PARTITION_CONFIG_SELECT,
        taskType: STANDARD_CHECK_TASK_TYPE_PERIOD,
        immediateExecute: 1,
        deleteAfter: true,
        expected: {
          status: STANDARD_CHECK_STATUS_SUCCESS,
          quality: 100,
          noComplianceCount: 0,
          checkFailCount: 0,
          upStandard: 1,
          label: "达标",
        },
      },
      sourceRef,
    );
    records.push(...passMoney.records);

    const failMoney = await this.createAndAssertSourceCaseStandardCheck(
      {
        caseId: `${SOURCE_CASE_ID}#步骤87-97`,
        evidence:
          "步骤87-97：test_info_1.money 选择动态分区 dt=${2026-05-28}，周期任务新增并立即执行，预期未达标",
        tableName: "test_info_1",
        columnName: "money",
        partition: "dt=${2026-05-28}",
        tablePartitionType: PARTITION_CONFIG_DYNAMIC,
        dynamicPartitionInfo: {
          firstPartitionField: "dt",
          firstPartitionValue: "2026-05-28",
        },
        taskType: STANDARD_CHECK_TASK_TYPE_PERIOD,
        immediateExecute: 1,
        expected: {
          status: STANDARD_CHECK_STATUS_EXIST_NON_COMPLIANCE,
          quality: 0,
          noComplianceCount: 1,
          checkFailCount: 0,
          upStandard: 0,
          label: "未达标",
        },
      },
      sourceRef,
    );
    records.push(...failMoney.records);

    const passAmount = await this.createAndAssertSourceCaseStandardCheck(
      {
        caseId: `${SOURCE_CASE_ID}#步骤98-107`,
        evidence:
          "步骤98-107：test_info_2.amount 按源DDL选择已有分区 order_date=2026-01-12，周期任务新增并立即执行，预期达标",
        tableName: "test_info_2",
        columnName: "amount",
        partition: "order_date=2026-01-12",
        tablePartitionType: PARTITION_CONFIG_SELECT,
        taskType: STANDARD_CHECK_TASK_TYPE_PERIOD,
        immediateExecute: 1,
        expected: {
          status: STANDARD_CHECK_STATUS_SUCCESS,
          quality: 100,
          noComplianceCount: 0,
          checkFailCount: 0,
          upStandard: 1,
          label: "达标",
        },
      },
      sourceRef,
    );
    records.push(...passAmount.records);

    const tempPassAmount = await this.createAndAssertSourceCaseStandardCheck(
      {
        caseId: `${SOURCE_CASE_ID}#步骤108-116`,
        evidence:
          "步骤108-116：编辑 test_info_2.amount 检查任务，选择车型关联字段 car_model 后执行临时检查，预期达标并删除任务",
        tableName: "test_info_2",
        columnName: "amount",
        partition: "order_date=2026-01-12",
        tablePartitionType: PARTITION_CONFIG_SELECT,
        carModelColumn: "car_model",
        taskType: STANDARD_CHECK_TASK_TYPE_TEMP,
        existingTaskId: passAmount.taskId,
        deleteAfter: true,
        expected: {
          status: STANDARD_CHECK_STATUS_SUCCESS,
          quality: 100,
          noComplianceCount: 0,
          checkFailCount: 0,
          upStandard: 1,
          label: "达标",
        },
      },
      sourceRef,
    );
    records.push(...tempPassAmount.records);

    const failAmount = await this.createAndAssertSourceCaseStandardCheck(
      {
        caseId: `${SOURCE_CASE_ID}#步骤117-127`,
        evidence:
          "步骤117-127：test_info_2.amount 按源DDL手动输入分区 order_date=2026-01-13，周期任务新增并立即执行，预期未达标",
        tableName: "test_info_2",
        columnName: "amount",
        partition: "order_date=2026-01-13",
        tablePartitionType: PARTITION_CONFIG_INPUT,
        taskType: STANDARD_CHECK_TASK_TYPE_PERIOD,
        immediateExecute: 1,
        expected: {
          status: STANDARD_CHECK_STATUS_EXIST_NON_COMPLIANCE,
          quality: 0,
          noComplianceCount: 1,
          checkFailCount: 0,
          upStandard: 0,
          label: "未达标",
        },
      },
      sourceRef,
    );
    records.push(...failAmount.records);

    const tempFailAmount = await this.createAndAssertSourceCaseStandardCheck(
      {
        caseId: `${SOURCE_CASE_ID}#步骤128-136`,
        evidence:
          "步骤128-136：编辑 test_info_2.amount 检查任务，选择车型关联字段 car_model 后执行临时检查，预期未达标",
        tableName: "test_info_2",
        columnName: "amount",
        partition: "order_date=2026-01-13",
        tablePartitionType: PARTITION_CONFIG_INPUT,
        carModelColumn: "car_model",
        taskType: STANDARD_CHECK_TASK_TYPE_TEMP,
        existingTaskId: failAmount.taskId,
        expected: {
          status: STANDARD_CHECK_STATUS_EXIST_NON_COMPLIANCE,
          quality: 0,
          noComplianceCount: 1,
          checkFailCount: 0,
          upStandard: 0,
          label: "未达标",
        },
      },
      sourceRef,
    );
    records.push(...tempFailAmount.records);

    return { records, blockers };
  }

  private async createAndAssertSourceCaseStandardCheck(
    scenario: StandardCheckScenario,
    sourceRef: string,
  ): Promise<{ taskId: string | number; records: CreatedPlatformRecord[] }> {
    const runtime = await this.getSourceCaseRuntime(sourceRef);
    const sparkThrift = await this.inspectSourceCaseSparkThrift(sourceRef);
    const table = sparkThrift.exactTables.find((item) => item.tableName === scenario.tableName);
    if (!table) {
      throw new Error(
        `${sourceRef}: source-case table ${scenario.tableName} is not available for standard check`,
      );
    }
    expect(
      table.columns,
      `${sourceRef}: ${scenario.tableName} should contain ${scenario.columnName}`,
    ).toContain(scenario.columnName);
    if (scenario.carModelColumn) {
      expect(
        table.columns,
        `${sourceRef}: ${scenario.tableName} should contain car model column`,
      ).toContain(scenario.carModelColumn);
    }

    if (!scenario.existingTaskId) {
      await this.deleteExistingStandardCheckTasksForTable(
        table.tableId,
        scenario.tableName,
        sourceRef,
      );
    }

    const catalog = await this.ensureStandardCatalog(SOURCE_CASE_CATALOG_NAME);
    const boundColumn = await this.getSourceCaseBoundStandardColumn(
      table.tableId,
      scenario.columnName,
      scenario.carModelColumn,
      sourceRef,
    );
    const taskId = await this.saveSourceCaseStandardCheckTask(
      scenario,
      runtime,
      table.tableId,
      catalog.id,
      boundColumn,
    );
    const runRecord = await this.waitForStandardCheckExecution(taskId, scenario, sourceRef);
    const taskRecord = await this.waitForStandardCheckTaskListResult(taskId, scenario, sourceRef);
    const columnRecord = await this.waitForStandardCheckColumnResult(runtime, scenario, sourceRef);
    this.assertStandardCheckMetrics(taskRecord, scenario, sourceRef);
    this.assertStandardCheckMetrics(runRecord, scenario, sourceRef);
    this.assertStandardCheckColumn(columnRecord, scenario, sourceRef);

    const records = [this.toStandardCheckPlatformRecord(scenario, taskId, runRecord, columnRecord)];
    if (scenario.deleteAfter) {
      await this.deleteStandardCheckTask(taskId, scenario, sourceRef);
      records.push({
        recordType: "standard-check",
        recordName: `${scenario.tableName}.${scenario.columnName}:${scenario.partition}:deleted`,
        recordId: String(taskId),
        status: "已删除",
        route: "/standardCheck",
        evidence: `${scenario.caseId}：删除 ${scenario.tableName} 数据表的检查任务后，设置列表不再存在该任务`,
        api: "/dmetadata/v1/standardTableCheck/delete",
      });
    }

    return { taskId, records };
  }

  private async saveSourceCaseStandardCheckTask(
    scenario: StandardCheckScenario,
    runtime: { dataSourceId: string; dbId: string; dbName: string },
    tableId: string | number,
    catalogId: string | number,
    boundColumn: TableMappingStandardColumn,
  ): Promise<string | number> {
    const checkItems = boundColumn.checkItems ?? [];
    if (checkItems.length === 0) {
      throw new Error(
        `${scenario.caseId}: ${scenario.tableName}.${scenario.columnName} has no valid standard check item`,
      );
    }
    const saveResult = this.expectApiData(
      `save standard check ${scenario.tableName}.${scenario.columnName}`,
      await this.postJsonFromPage<ApiResponse<string | number>>(
        "/dmetadata/v1/standardTableCheck/save",
        {
          ...(scenario.existingTaskId ? { id: scenario.existingTaskId } : {}),
          datasourceId: runtime.dataSourceId,
          dbId: runtime.dbId,
          dbName: runtime.dbName,
          tableId,
          tableName: scenario.tableName,
          partition: scenario.partition,
          catalogIdList: [catalogId],
          carModelColumn: scenario.carModelColumn,
          checkColumns: [
            {
              columnId: boundColumn.columnId,
              columnName: scenario.columnName,
              allCheckItem: 1,
              checkItems,
              standardId: boundColumn.standardId,
              tableId,
              tableName: scenario.tableName,
            },
          ],
          tablePartitionType: scenario.tablePartitionType,
          dynamicPartitionInfo: scenario.dynamicPartitionInfo
            ? JSON.stringify(scenario.dynamicPartitionInfo)
            : undefined,
          packageCount: 1,
          scheduleConf:
            scenario.taskType === STANDARD_CHECK_TASK_TYPE_PERIOD
              ? JSON.stringify({ periodType: 2, hour: "0", min: "0" })
              : undefined,
          immediateExecute: scenario.immediateExecute,
          taskType: scenario.taskType,
          taskParams: STANDARD_CHECK_LIGHTWEIGHT_TASK_PARAM,
        },
      ),
    );

    const taskId = saveResult ?? scenario.existingTaskId;
    if (taskId === undefined) {
      throw new Error(`${scenario.caseId}: standard check save did not return task id`);
    }
    return taskId;
  }

  private async getSourceCaseBoundStandardColumn(
    tableId: string | number,
    columnName: string,
    carModelColumn: string | undefined,
    sourceRef: string,
  ): Promise<TableMappingStandardColumn> {
    const data = this.expectApiData(
      `query bound standard column ${columnName}`,
      await this.postJsonFromPage<ApiResponse<PagedListData<TableMappingStandardColumn>>>(
        "/dmetadata/v1/standardMapping/tableMappingStandardColumns",
        {
          current: 1,
          size: 100,
          search: columnName,
          tableId,
          excludeColumnList: carModelColumn ? [carModelColumn] : [],
        },
      ),
    );
    const record = (data.contentList ?? []).find(
      (item) =>
        item.columnName === columnName &&
        item.enableOpen !== 0 &&
        item.columnId !== undefined &&
        item.standardId !== undefined,
    );
    if (!record) {
      throw new Error(
        `${sourceRef}: bound standard column ${columnName} was not returned for table ${tableId}`,
      );
    }
    if (!record.checkItems?.length) {
      throw new Error(`${sourceRef}: bound standard column ${columnName} has no checkItems`);
    }
    return record;
  }

  private async listStandardCheckTasks(tableName: string): Promise<StandardCheckTaskRecord[]> {
    const data = this.expectApiData(
      `list standard check tasks ${tableName}`,
      await this.postJsonFromPage<ApiResponse<PagedListData<StandardCheckTaskRecord>>>(
        "/dmetadata/v1/standardTableCheck/list",
        {
          asc: false,
          current: 1,
          size: 100,
          search: tableName,
        },
      ),
    );
    return data.contentList ?? [];
  }

  private async deleteExistingStandardCheckTasksForTable(
    tableId: string | number,
    tableName: string,
    sourceRef: string,
  ): Promise<void> {
    const existingTasks = (await this.listStandardCheckTasks(tableName)).filter(
      (task) => task.tableName === tableName || String(task.tableId ?? "") === String(tableId),
    );
    for (const task of existingTasks) {
      if (task.id !== undefined)
        await this.deleteStandardCheckTask(task.id, { tableName, columnName: "" }, sourceRef);
    }
    if (existingTasks.length === 0) return;

    await expect
      .poll(
        async () =>
          (await this.listStandardCheckTasks(tableName)).filter(
            (task) =>
              task.tableName === tableName || String(task.tableId ?? "") === String(tableId),
          ).length,
        {
          timeout: 60_000,
          message: `${sourceRef}: existing standard check tasks for ${tableName} should be deleted`,
        },
      )
      .toBe(0);
  }

  private async deleteStandardCheckTask(
    taskId: string | number,
    scenario: { tableName: string; columnName?: string },
    sourceRef: string,
  ): Promise<void> {
    this.expectApiData(
      `delete standard check task ${taskId}`,
      await this.postJsonFromPage<ApiResponse<unknown>>("/dmetadata/v1/standardTableCheck/delete", {
        id: taskId,
      }),
    );
    await expect
      .poll(
        async () =>
          (await this.listStandardCheckTasks(scenario.tableName)).some(
            (task) => String(task.id) === String(taskId),
          ),
        {
          timeout: 60_000,
          message: `${sourceRef}: standard check task ${scenario.tableName}.${scenario.columnName ?? "*"} should be deleted`,
        },
      )
      .toBe(false);
  }

  private async waitForStandardCheckExecution(
    taskId: string | number,
    scenario: StandardCheckScenario,
    sourceRef: string,
  ): Promise<StandardCheckRunRecord> {
    let latestRecord: StandardCheckRunRecord | null = null;
    await expect
      .poll(
        async () => {
          const data = this.expectApiData(
            `poll standard check execution ${taskId}`,
            await this.postJsonFromPage<ApiResponse<PagedListData<StandardCheckRunRecord>>>(
              "/dmetadata/v1/standardTableCheck/checkRecordListByStandardTableCheckId",
              {
                asc: false,
                current: 1,
                size: 20,
                standardTableCheckId: taskId,
              },
            ),
          );
          latestRecord =
            (data.contentList ?? []).find((record) => record.tableName === scenario.tableName) ??
            (data.contentList ?? [])[0] ??
            null;
          if (!latestRecord || latestRecord.status === undefined) return "NO_RECORD";
          const status = Number(latestRecord.status);
          if (!STANDARD_CHECK_TERMINAL_STATUSES.has(status) && latestRecord.id !== undefined) {
            await this.trySyncStandardCheckStatus(latestRecord.id);
          }
          return STANDARD_CHECK_TERMINAL_STATUSES.has(status)
            ? String(status)
            : `PENDING:${status}`;
        },
        {
          timeout: 600_000,
          intervals: [2_000, 3_000, 5_000, 10_000, 30_000],
          message: `${sourceRef}: ${scenario.caseId} should finish with status ${scenario.expected.status}`,
        },
      )
      .toBe(String(scenario.expected.status));
    return latestRecord as unknown as StandardCheckRunRecord;
  }

  private async trySyncStandardCheckStatus(recordId: string | number): Promise<void> {
    await this.postJsonFromPage<ApiResponse<unknown>>(
      "/dmetadata/v1/standardTableCheck/syncStatus",
      {
        id: recordId,
      },
    ).catch(() => null);
  }

  private async waitForStandardCheckTaskListResult(
    taskId: string | number,
    scenario: StandardCheckScenario,
    sourceRef: string,
  ): Promise<StandardCheckTaskRecord> {
    let latestTask: StandardCheckTaskRecord | null = null;
    await expect
      .poll(
        async () => {
          latestTask =
            (await this.listStandardCheckTasks(scenario.tableName)).find(
              (task) => String(task.id) === String(taskId),
            ) ?? null;
          if (!latestTask || latestTask.quality === null || latestTask.quality === undefined)
            return "NO_TASK";
          return `${Number(latestTask.quality)}:${Number(latestTask.noComplianceCount ?? -1)}:${Number(
            latestTask.checkFailCount ?? -1,
          )}`;
        },
        {
          timeout: 120_000,
          intervals: [2_000, 3_000, 5_000],
          message: `${sourceRef}: ${scenario.caseId} should update standard check task list metrics`,
        },
      )
      .toBe(
        `${scenario.expected.quality}:${scenario.expected.noComplianceCount}:${scenario.expected.checkFailCount}`,
      );
    return latestTask as unknown as StandardCheckTaskRecord;
  }

  private async waitForStandardCheckColumnResult(
    runtime: { dataSourceId: string; dbName: string },
    scenario: StandardCheckScenario,
    sourceRef: string,
  ): Promise<StandardCheckColumnRecord> {
    let latestColumn: StandardCheckColumnRecord | null = null;
    await expect
      .poll(
        async () => {
          const data = this.expectApiData(
            `poll standard check column ${scenario.tableName}.${scenario.columnName}`,
            await this.postJsonFromPage<ApiResponse<PagedListData<StandardCheckColumnRecord>>>(
              "/dmetadata/v1/standardTableCheck/standardCheckColumns",
              {
                asc: false,
                current: 1,
                size: 20,
                dataSourceId: runtime.dataSourceId,
                schema: runtime.dbName,
                tableName: scenario.tableName,
                columnName: scenario.columnName,
                status: [scenario.expected.status],
                upStandard: [scenario.expected.upStandard],
              },
            ),
          );
          latestColumn =
            (data.contentList ?? []).find(
              (record) =>
                record.tableName === scenario.tableName &&
                record.columnName === scenario.columnName &&
                Number(record.upStandard) === scenario.expected.upStandard,
            ) ?? null;
          if (!latestColumn || latestColumn.status === undefined) return "NO_COLUMN";
          return `${Number(latestColumn.status)}:${Number(latestColumn.upStandard)}`;
        },
        {
          timeout: 120_000,
          intervals: [2_000, 3_000, 5_000],
          message: `${sourceRef}: ${scenario.caseId} should produce column result ${scenario.expected.label}`,
        },
      )
      .toBe(`${scenario.expected.status}:${scenario.expected.upStandard}`);
    return latestColumn as unknown as StandardCheckColumnRecord;
  }

  private assertStandardCheckMetrics(
    record: StandardCheckTaskRecord | StandardCheckRunRecord,
    scenario: StandardCheckScenario,
    sourceRef: string,
  ): void {
    expect(Number(record.quality), `${sourceRef}: ${scenario.caseId} quality`).toBe(
      scenario.expected.quality,
    );
    expect(
      Number(record.noComplianceCount),
      `${sourceRef}: ${scenario.caseId} noComplianceCount`,
    ).toBe(scenario.expected.noComplianceCount);
    expect(Number(record.checkFailCount), `${sourceRef}: ${scenario.caseId} checkFailCount`).toBe(
      scenario.expected.checkFailCount,
    );
  }

  private assertStandardCheckColumn(
    record: StandardCheckColumnRecord,
    scenario: StandardCheckScenario,
    sourceRef: string,
  ): void {
    expect(Number(record.status), `${sourceRef}: ${scenario.caseId} column status`).toBe(
      scenario.expected.status,
    );
    expect(Number(record.upStandard), `${sourceRef}: ${scenario.caseId} column upStandard`).toBe(
      scenario.expected.upStandard,
    );
    expect(
      record.checkItemResult?.length ?? 0,
      `${sourceRef}: ${scenario.caseId} should include check item result`,
    ).toBeGreaterThan(0);
  }

  private toStandardCheckPlatformRecord(
    scenario: StandardCheckScenario,
    taskId: string | number,
    runRecord: StandardCheckRunRecord,
    columnRecord: StandardCheckColumnRecord,
  ): CreatedPlatformRecord {
    return {
      recordType: "standard-check",
      recordName: `${scenario.tableName}.${scenario.columnName}:${scenario.partition}${
        scenario.carModelColumn ? `:${scenario.carModelColumn}` : ""
      }`,
      recordId: String(taskId),
      recordEnglishName: scenario.columnName,
      catalogName: SOURCE_CASE_CATALOG_NAME,
      status: `${scenario.expected.label}；标准达标率=${scenario.expected.quality}%；不达标/失败=${scenario.expected.noComplianceCount}/${scenario.expected.checkFailCount}`,
      route: "/standardCheck",
      evidence: `${scenario.evidence}；检查记录ID=${runRecord.id ?? "unknown"}；字段结果ID=${
        columnRecord.id ?? "unknown"
      }；状态=${runRecord.statusName ?? scenario.expected.status}`,
      api: "/dmetadata/v1/standardTableCheck/save",
    };
  }

  private async installProjectContext(): Promise<void> {
    const id = String(projectId());
    await this.page.addInitScript(
      ({ keys, value }: { keys: readonly string[]; value: string }) => {
        for (const key of keys) window.sessionStorage.setItem(key, value);
      },
      { keys: [...PROJECT_STORAGE_KEYS], value: id },
    );
  }

  private async applyProjectContext(): Promise<void> {
    const id = String(projectId());
    await this.page.evaluate(
      ({ keys, value }: { keys: readonly string[]; value: string }) => {
        for (const key of keys) window.sessionStorage.setItem(key, value);
      },
      { keys: [...PROJECT_STORAGE_KEYS], value: id },
    );
  }

  private async expectBodyTexts(sourceRef: string, labels: readonly string[]): Promise<void> {
    for (const label of labels) {
      await expect(this.body(), `${sourceRef}: body should contain ${label}`).toContainText(label, {
        timeout: 30_000,
      });
    }
  }

  private async expectTableHeaders(sourceRef: string, headers: readonly string[]): Promise<void> {
    const thead = this.page.locator(".ant-table-thead").first();
    await expect(thead, `${sourceRef}: table header should be visible`).toBeVisible({
      timeout: 20_000,
    });
    for (const header of headers) {
      await expect(thead, `${sourceRef}: table header should contain ${header}`).toContainText(
        header,
        {
          timeout: 20_000,
        },
      );
    }
  }

  private expectOkResponse(response: Response | null, apiPath: string, sourceRef: string): void {
    expect(response, `${sourceRef}: expected API response ${apiPath}`).not.toBeNull();
    expect(response?.ok(), `${sourceRef}: expected API ${apiPath} to return 2xx`).toBe(true);
  }

  private expectApiData<T>(action: string, response: ApiResponse<T>): T {
    if (response.code !== 1 || response.success === false) {
      throw new Error(`${action} failed: ${response.message ?? "unknown error"}`);
    }
    return response.data as T;
  }

  private async expectOkApiResponse<T>(
    response: Response | null,
    apiPath: string,
    sourceRef: string,
  ): Promise<T | undefined> {
    this.expectOkResponse(response, apiPath, sourceRef);
    const payload = (await response?.json().catch(() => null)) as ApiResponse<T> | null | undefined;
    if (payload && (payload.code !== 1 || payload.success === false)) {
      throw new Error(
        `${sourceRef}: ${apiPath} returned business failure: ${payload.message ?? "unknown error"}`,
      );
    }
    return payload?.data;
  }

  private async postJsonFromPage<T>(url: string, body: unknown): Promise<T> {
    return this.page.evaluate(
      async ({ requestUrl, payload }) => {
        const response = await fetch(requestUrl, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json;charset=UTF-8",
          },
          body: JSON.stringify(payload ?? {}),
        });
        return response.json();
      },
      { requestUrl: url, payload: body },
    ) as Promise<T>;
  }

  private async ensureSourceCaseRoot(
    input: SourceCaseRootInput,
    sourceRef: string,
  ): Promise<RootRecord> {
    const existing = await this.findRootRecordOptional(input.rootAbbreviation);
    this.expectApiData(
      `upsert source-case root ${input.rootAbbreviation}`,
      await this.postJsonFromPage<ApiResponse<string | number>>(
        "/dmetadata/v1/standardRoot/addOrUpdateRoot",
        {
          ...(existing ? { id: existing.id } : {}),
          rootAbbreviation: input.rootAbbreviation,
          rootFullName: input.rootFullName,
          rootCn: input.rootCn,
        },
      ),
    );

    const record = await this.findRootRecord(input.rootAbbreviation);
    expect(record.rootFullName, `${sourceRef}: root full name should follow source case`).toBe(
      input.rootFullName,
    );
    expect(record.rootCn, `${sourceRef}: root CN should follow source case`).toBe(input.rootCn);
    return record;
  }

  private async ensureSourceCaseCode(
    input: SourceCaseCodeInput,
    sourceRef: string,
  ): Promise<CodeRecord> {
    const catalog = await this.ensureCodeCatalog(input.catalogName);
    const existing = await this.findCodeRecordOptional(input.codeName);
    const existingDetail = existing ? await this.getCodeDetail(existing.id) : null;

    this.expectApiData(
      `upsert source-case code ${input.codeName}`,
      await this.postJsonFromPage<ApiResponse<string | number>>(
        "/dmetadata/v1/standardCode/addOrUpdateCode",
        {
          ...(existingDetail ?? {}),
          ...(existing ? { id: existing.id } : {}),
          codeName: input.codeName,
          codeNumber: input.codeNumber,
          catalogId: catalog.id,
          codeDesc: input.codeDesc,
          codeFrom: input.codeFrom,
          codeContent: input.codeContent,
        },
      ),
    );

    const record = await this.findCodeRecord(input.codeName);
    expect(record.codeNumber, `${sourceRef}: code number should follow source case`).toBe(
      input.codeNumber,
    );
    return record;
  }

  private async ensureSourceCaseStandard(
    input: SourceCaseStandardInput,
    sourceRef: string,
  ): Promise<StandardRow> {
    const catalog = await this.ensureStandardCatalog(input.catalogName);
    const existing = await this.findStandardRecordOptional(input.standardNameCn);
    const primaryTech = (input.techAttributes?.[0] ?? {}) as Record<string, unknown>;
    const dataTypeId =
      typeof primaryTech.dataTypeId === "number" ? primaryTech.dataTypeId : undefined;

    this.expectApiData(
      `upsert source-case standard ${input.standardNameCn}`,
      await this.postJsonFromPage<ApiResponse<string | number>>(
        "/dmetadata/v1/dataStandard/addOrUpdate",
        {
          ...(existing ? { id: existing.id } : {}),
          businessDefinition: input.businessDefinition ?? "",
          customAttribute: input.customAttribute ?? [],
          enumRange: [],
          codeContentItems: primaryTech.codeContentItems ?? [],
          dataType: dataTypeId ? dataTypeName(dataTypeId) : "",
          dataTypeId,
          nullable: primaryTech.nullable,
          standardNumber: input.standardNumber ?? "",
          repeatable: primaryTech.repeatable,
          standardFrom: input.standardFrom ?? "",
          catalogId: catalog.id,
          standardNameAbbreviation: input.standardNameAbbreviation,
          standardStatus: input.standardStatus,
          dataLengthOperator: primaryTech.dataLengthOperator,
          dataLength: primaryTech.dataLength,
          postPrecision: primaryTech.postPrecision,
          prePrecision: primaryTech.prePrecision,
          defaultValue: primaryTech.defaultValue ?? "",
          standardName: input.standardName,
          standardNameCn: input.standardNameCn,
          valueRange: primaryTech.valueRange ?? defaultValueRange(),
          precisionMultiple: primaryTech.precisionMultiple,
          deviation: primaryTech.deviation,
          standardCodeId: primaryTech.standardCodeId,
          standardCodeName: primaryTech.standardCodeName,
          carForests: input.carForests ?? [],
          techAttributes: input.techAttributes ?? [],
        },
      ),
    );

    const record = await this.findStandardRecord(input.standardNameCn);
    expect(
      record.standardName,
      `${sourceRef}: standard English name should follow source case`,
    ).toBe(input.standardName);
    return record;
  }

  private sourceCaseTechAttribute(input: {
    carModel?: string;
    dataTypeId?: number;
    dataLength?: string;
    prePrecision?: string;
    postPrecision?: string;
    valueRange?: Record<string, unknown>;
    precisionMultiple?: number;
    deviation?: number;
    enumCode?: CodeDetail;
  }): Record<string, unknown> {
    const dataTypeId = input.dataTypeId ?? 1;
    const codeContentItems = input.enumCode?.codeContent ?? [...SOURCE_CASE_ENUM_CODE_CONTENT];
    return {
      carModel: input.carModel ?? "",
      dataType: dataTypeName(dataTypeId),
      dataTypeId,
      dataLengthOperator: input.dataLength ? "<=" : undefined,
      dataLength: input.dataLength,
      prePrecision: input.prePrecision,
      postPrecision: input.postPrecision,
      defaultValue: "1",
      standardCodeId: input.enumCode?.id,
      nullable: 0,
      repeatable: 0,
      valueRange: input.valueRange ?? defaultValueRange(),
      precisionMultiple: input.precisionMultiple,
      deviation: input.deviation,
      codeContentItems,
      standardCodeName: input.enumCode?.codeName,
    };
  }

  private async inspectSourceCaseSparkThrift(
    sourceRef: string,
  ): Promise<SourceCasePreconditionReport["sparkThrift"]> {
    const dsData = this.expectApiData(
      "query source-case SparkThrift datasource",
      await this.postJsonFromPage<ApiResponse<RuntimeDataSource[]>>(
        "/dmetadata/v1/dataSource/getDataSourceByType",
        {
          dataSourceTypes: [SOURCE_CASE_SPARKTHRIFT_TYPE],
        },
      ),
    );
    const datasource = dsData.find((item) =>
      String(item.dataSourceName ?? item.name ?? "").includes(sourceCaseSparkThriftSource()),
    );
    const dataSourceId = datasource?.dataSourceId ?? datasource?.id;
    if (!datasource || dataSourceId === undefined || dataSourceId === null) {
      return {
        requiredTables: SOURCE_CASE_REQUIRED_TABLES,
        exactTables: [],
        missingTables: [...SOURCE_CASE_REQUIRED_TABLES],
        sampledTables: [],
      };
    }

    const dbData = this.expectApiData(
      "query source-case SparkThrift database",
      await this.postJsonFromPage<ApiResponse<RuntimeDb[]>>(
        "/dmetadata/v1/dataDb/getDbByDataSourceIds",
        {
          dataSourceIds: [dataSourceId],
        },
      ),
    );
    const db = dbData.find(
      (item) => String(item.value ?? item.dbName ?? item.name ?? "") === sourceCaseSparkThriftDb(),
    );
    const dbId = db?.key ?? db?.dbId ?? db?.id;
    if (!db || dbId === undefined || dbId === null) {
      return {
        dataSourceName: String(datasource.dataSourceName ?? datasource.name ?? ""),
        dataSourceId: String(dataSourceId),
        requiredTables: SOURCE_CASE_REQUIRED_TABLES,
        exactTables: [],
        missingTables: [...SOURCE_CASE_REQUIRED_TABLES],
        sampledTables: [],
      };
    }

    const tableData = this.expectApiData(
      "query source-case SparkThrift tables",
      await this.postJsonFromPage<ApiResponse<RuntimeTable[]>>(
        "/dmetadata/v1/dataTable/getTables",
        { dbId },
      ),
    );
    const sampledTables = tableData
      .map((table) => String(table.tableName ?? table.name ?? ""))
      .filter(Boolean)
      .slice(0, 50);
    const exactTables: Array<{ tableName: string; tableId: string; columns: string[] }> = [];
    for (const tableName of SOURCE_CASE_REQUIRED_TABLES) {
      const table = tableData.find(
        (item) => String(item.tableName ?? item.name ?? "") === tableName,
      );
      const tableId = table?.tableId ?? table?.id;
      if (table && tableId !== undefined && tableId !== null) {
        const columnsData = this.expectApiData(
          `query columns for source-case table ${tableName}`,
          await this.postJsonFromPage<ApiResponse<RuntimeColumn[]>>(
            "/dmetadata/v1/dataTable/getColumns",
            { tableId },
          ),
        );
        exactTables.push({
          tableName,
          tableId: String(tableId),
          columns: columnsData
            .map((column) => String(column.columnName ?? column.name ?? ""))
            .filter(Boolean),
        });
      }
    }
    const missingTables = SOURCE_CASE_REQUIRED_TABLES.filter(
      (tableName) => !exactTables.some((table) => table.tableName === tableName),
    );

    expect(
      String(datasource.dataSourceName ?? datasource.name ?? ""),
      `${sourceRef}: SparkThrift datasource should follow source case`,
    ).toContain(sourceCaseSparkThriftSource());

    return {
      dataSourceName: String(datasource.dataSourceName ?? datasource.name ?? ""),
      dataSourceId: String(dataSourceId),
      databaseName: String(db.value ?? db.dbName ?? db.name ?? ""),
      databaseId: String(dbId),
      requiredTables: SOURCE_CASE_REQUIRED_TABLES,
      exactTables,
      missingTables,
      sampledTables,
    };
  }

  private async publishSourceCaseStandards(
    standards: StandardRow[],
    sourceRef: string,
  ): Promise<StandardRow[]> {
    const unpublishedIds = standards
      .filter((standard) => standard.standardStatus !== 1)
      .map((standard) => standard.id);
    if (unpublishedIds.length > 0) {
      this.expectApiData(
        "publish source-case standards",
        await this.postJsonFromPage<ApiResponse<unknown>>("/dmetadata/v1/dataStandard/publish", {
          standardIds: unpublishedIds,
        }),
      );
    }

    await expect
      .poll(
        async () => {
          const latest = await Promise.all(
            standards.map((standard) => this.findStandardRecord(standard.standardNameCn)),
          );
          return latest.every((standard) => standard.standardStatus === 1);
        },
        {
          timeout: 60_000,
          message: `${sourceRef}: source-case standards should be published before mapping`,
        },
      )
      .toBe(true);

    return Promise.all(
      standards.map((standard) => this.findStandardRecord(standard.standardNameCn)),
    );
  }

  private async startSourceCaseStandardMapping(
    standard: StandardRow,
    sourceRef: string,
  ): Promise<{ record?: CreatedPlatformRecord; blocker?: SourceCaseBlocker }> {
    const runtime = await this.getSourceCaseRuntime(sourceRef);
    const standardDetail = await this.getStandardDetail(standard.id);
    const catalogId = standardDetail.catalogId ?? standard.catalogId;
    this.expectApiData(
      `start source-case standard mapping ${standard.standardNameCn}`,
      await this.postJsonFromPage<ApiResponse<unknown>>(
        "/dmetadata/v1/standardMapping/startMapping",
        {
          catalogIds: catalogId ? [catalogId] : [],
          standardIds: [standard.id],
          dataSourceTypes: [SOURCE_CASE_SPARKTHRIFT_TYPE],
          dataSourceIds: [runtime.dataSourceId],
          dbIds: [runtime.dbId],
        },
      ),
    );

    const isVisible = await expect
      .poll(
        async () => {
          const data = this.expectApiData(
            `query source-case mapping ${standard.standardNameCn}`,
            await this.postJsonFromPage<ApiResponse<PagedListData<Record<string, unknown>>>>(
              "/dmetadata/v1/standardMapping/mappingList",
              {
                asc: false,
                current: 1,
                size: 20,
                search: standard.standardNameCn,
              },
            ),
          );
          return (data.contentList ?? []).some(
            (item) => String(item.standardNameCn ?? "") === standard.standardNameCn,
          );
        },
        {
          timeout: 60_000,
          message: `${sourceRef}: source-case mapping ${standard.standardNameCn} should be visible`,
        },
      )
      .toBe(true)
      .then(() => true)
      .catch(() => false);

    if (!isVisible) {
      return {
        blocker: {
          caseId: `${SOURCE_CASE_ID}#步骤62/68/69`,
          reasonCategory: "data_prep",
          detail: `已调用标准 ${standard.standardNameCn} 的 startMapping，但 /standardMapping/mappingList 在 60s 内未产生可见记录；当前 SparkThrift2.x 库缺少源用例精确表/字段时，不能把空映射列表伪装成通过。`,
        },
      };
    }

    return {
      record: {
        recordType: "standard-mapping",
        recordName: standard.standardNameCn,
        recordId: String(standard.id),
        recordEnglishName: standard.standardName,
        catalogName: SOURCE_CASE_CATALOG_NAME,
        status: "已发起映射",
        route: "/standardMapping",
        evidence: `步骤62/68/69：${standard.standardNameCn} 已按 SparkThrift2.x 数据源 ${runtime.dataSourceName}/库 ${runtime.dbName} 发起映射`,
        api: "/dmetadata/v1/standardMapping/startMapping",
      },
    };
  }

  private async bindSourceCaseMappedField(
    standard: StandardRow,
    tableName: string,
    columnName: string,
    sourceRef: string,
  ): Promise<CreatedPlatformRecord> {
    const mappingResult = await this.startSourceCaseStandardMapping(standard, sourceRef);
    if (mappingResult.blocker) throw new Error(mappingResult.blocker.detail);
    const mappingDates = this.expectApiData(
      `query mapping date for ${standard.standardNameCn}`,
      await this.postJsonFromPage<ApiResponse<string[]>>(
        "/dmetadata/v1/standardMapping/mappingDate",
        {
          standardId: standard.id,
        },
      ),
    );
    const mappingDate = mappingDates?.[0];
    if (!mappingDate)
      throw new Error(`${sourceRef}: no mapping date returned for ${standard.standardNameCn}`);

    let matchedRecord: MappingRecord | null = null;
    await expect
      .poll(
        async () => {
          const data = this.expectApiData(
            `query mapping record ${tableName}.${columnName}`,
            await this.postJsonFromPage<ApiResponse<PagedListData<MappingRecord>>>(
              "/dmetadata/v1/standardMapping/pageQueryMappingRecord",
              {
                mappingDate,
                standardId: standard.id,
                current: 1,
                size: 100,
              },
            ),
          );
          matchedRecord =
            (data.contentList ?? []).find(
              (record) =>
                record.tableName === tableName &&
                record.columnName === columnName &&
                record.mappingId,
            ) ?? null;
          return matchedRecord?.mappingId ? String(matchedRecord.mappingId) : "";
        },
        {
          timeout: 120_000,
          message: `${sourceRef}: mapping record ${tableName}.${columnName} should be generated`,
        },
      )
      .not.toBe("");

    this.expectApiData(
      `bind mapped field ${tableName}.${columnName}`,
      await this.postJsonFromPage<ApiResponse<unknown>>("/dmetadata/v1/standardMapping/bind", {
        mappingIds: [matchedRecord!.mappingId],
        standardId: standard.id,
      }),
    );

    return {
      recordType: "standard-mapping",
      recordName: `${standard.standardNameCn}:${tableName}.${columnName}`,
      recordId: String(matchedRecord!.mappingId),
      recordEnglishName: standard.standardName,
      catalogName: SOURCE_CASE_CATALOG_NAME,
      status: "字段已绑定",
      route: "/standardMapping",
      evidence: `步骤70/71：${tableName}.${columnName} 已一键绑定到 ${standard.standardNameCn}`,
      api: "/dmetadata/v1/standardMapping/bind",
    };
  }

  private async getSourceCaseRuntime(sourceRef: string): Promise<{
    dataSourceId: string;
    dataSourceName: string;
    dbId: string;
    dbName: string;
  }> {
    const sparkThrift = await this.inspectSourceCaseSparkThrift(sourceRef);
    if (!sparkThrift.dataSourceId || !sparkThrift.databaseId) {
      throw new Error(`${sourceRef}: source-case SparkThrift datasource/database is not available`);
    }
    return {
      dataSourceId: sparkThrift.dataSourceId,
      dataSourceName: sparkThrift.dataSourceName ?? sourceCaseSparkThriftSource(),
      dbId: sparkThrift.databaseId,
      dbName: sparkThrift.databaseName ?? sourceCaseSparkThriftDb(),
    };
  }

  private async getCodeDetail(codeId: string | number): Promise<CodeDetail> {
    return this.expectApiData(
      "query source-case code detail",
      await this.postJsonFromPage<ApiResponse<CodeDetail>>(
        "/dmetadata/v1/standardCode/codeDetail",
        { codeId },
      ),
    );
  }

  private async getStandardDetail(standardId: string | number): Promise<StandardRow> {
    return this.expectApiData(
      "query source-case standard detail",
      await this.postJsonFromPage<ApiResponse<StandardRow>>("/dmetadata/v1/dataStandard/detail", {
        standardId,
      }),
    );
  }

  private toRootPlatformRecord(record: RootRecord, evidence: string): CreatedPlatformRecord {
    return {
      recordType: "standard-root",
      recordName: record.rootCn ?? record.rootAbbreviation,
      recordId: String(record.id),
      recordEnglishName: record.rootAbbreviation,
      status: "已创建/已校验",
      route: "/rootManage",
      evidence,
      api: "/dmetadata/v1/standardRoot/addOrUpdateRoot",
    };
  }

  private toCodePlatformRecord(
    record: CodeRecord,
    catalogName: string,
    evidence: string,
  ): CreatedPlatformRecord {
    return {
      recordType: "standard-code",
      recordName: record.codeName,
      recordId: String(record.id),
      recordEnglishName: record.codeNumber,
      catalogName,
      status: "已创建/已校验",
      route: "/codeTableManage",
      evidence,
      api: "/dmetadata/v1/standardCode/addOrUpdateCode",
    };
  }

  private toStandardPlatformRecord(
    record: StandardRow,
    catalogName: string,
    evidence: string,
  ): CreatedPlatformRecord {
    return {
      recordType: "standard-definition",
      recordName: record.standardNameCn,
      recordId: String(record.id),
      recordEnglishName: record.standardName,
      catalogName,
      status: statusText(record.standardStatus),
      route: "/dataStandard",
      evidence,
      api: "/dmetadata/v1/dataStandard/addOrUpdate",
    };
  }

  private async expectRootRow(record: RootRecord, sourceRef: string): Promise<void> {
    await this.goto("/rootManage", sourceRef, ["/dmetadata/v1/standardRoot/pageQuery"]);
    const row = this.page
      .locator(".ant-table-row")
      .filter({ hasText: record.rootAbbreviation })
      .filter({ hasText: record.rootCn ?? "" })
      .first();
    await expect(
      row,
      `${sourceRef}: source-case root row ${record.rootAbbreviation} should be visible`,
    ).toBeVisible({
      timeout: 30_000,
    });
  }

  private async expectCodeRow(record: CodeRecord, sourceRef: string): Promise<void> {
    await this.goto("/codeTableManage", sourceRef, ["/dmetadata/v1/standardCode/pageQuery"]);
    const row = this.page
      .locator(".ant-table-row")
      .filter({ hasText: record.codeName })
      .filter({ hasText: record.codeNumber })
      .first();
    await expect(
      row,
      `${sourceRef}: source-case code row ${record.codeName} should be visible`,
    ).toBeVisible({
      timeout: 30_000,
    });
  }

  private async ensureStandardCatalog(catalogName: string): Promise<CatalogNode> {
    const listCatalog = async () =>
      this.expectApiData(
        "list standard catalogs",
        await this.postJsonFromPage<ApiResponse<CatalogNode[]>>(
          "/dmetadata/v1/standardCatalog/listCatalog",
          {},
        ),
      ) ?? [];

    let catalog = findCatalogByName(await listCatalog(), catalogName);
    if (catalog) return catalog;

    this.expectApiData(
      "create standard catalog",
      await this.postJsonFromPage<ApiResponse<string>>("/dmetadata/v1/standardCatalog/addNode", {
        catalogName,
      }),
    );

    catalog = findCatalogByName(await listCatalog(), catalogName);
    if (!catalog) {
      throw new Error(`Standard catalog "${catalogName}" was not created successfully`);
    }
    return catalog;
  }

  private async ensureCodeCatalog(catalogName: string): Promise<CatalogNode> {
    const listCatalog = async () =>
      this.expectApiData(
        "list code catalogs",
        await this.postJsonFromPage<ApiResponse<CatalogNode[]>>(
          "/dmetadata/v1/standardCodeCatalog/listCatalog",
          {},
        ),
      ) ?? [];

    let catalog = findCatalogByName(await listCatalog(), catalogName);
    if (catalog) return catalog;

    this.expectApiData(
      "create code catalog",
      await this.postJsonFromPage<ApiResponse<string>>(
        "/dmetadata/v1/standardCodeCatalog/addNode",
        {
          catalogName,
        },
      ),
    );

    catalog = findCatalogByName(await listCatalog(), catalogName);
    if (!catalog) {
      throw new Error(`Code catalog "${catalogName}" was not created successfully`);
    }
    return catalog;
  }

  private async findRootRecord(rootAbbreviation: string): Promise<RootRecord> {
    const data = this.expectApiData(
      "query root records",
      await this.postJsonFromPage<ApiResponse<PagedListData<RootRecord>>>(
        "/dmetadata/v1/standardRoot/pageQuery",
        {
          asc: false,
          field: "update_at",
          search: rootAbbreviation,
          current: 1,
          size: 20,
        },
      ),
    );
    const record = (data.contentList ?? []).find(
      (item) => item.rootAbbreviation === rootAbbreviation,
    );
    if (!record) throw new Error(`Root record not found: ${rootAbbreviation}`);
    return record;
  }

  private async findRootRecordOptional(rootAbbreviation: string): Promise<RootRecord | null> {
    try {
      return await this.findRootRecord(rootAbbreviation);
    } catch {
      return null;
    }
  }

  private async findCodeRecord(codeName: string): Promise<CodeRecord> {
    const data = this.expectApiData(
      "query code records",
      await this.postJsonFromPage<ApiResponse<PagedListData<CodeRecord>>>(
        "/dmetadata/v1/standardCode/pageQuery",
        {
          asc: false,
          field: "update_at",
          search: codeName,
          current: 1,
          size: 20,
          onlyName: false,
        },
      ),
    );
    const record = (data.contentList ?? []).find((item) => item.codeName === codeName);
    if (!record) throw new Error(`Code record not found: ${codeName}`);
    return record;
  }

  private async findCodeRecordOptional(codeName: string): Promise<CodeRecord | null> {
    try {
      return await this.findCodeRecord(codeName);
    } catch {
      return null;
    }
  }

  private async findStandardRecord(standardNameCn: string): Promise<StandardRow> {
    const data = this.expectApiData(
      "query standard records",
      await this.postJsonFromPage<ApiResponse<PagedListData<StandardRow>>>(
        "/dmetadata/v1/dataStandard/pageQuery",
        {
          asc: false,
          current: 1,
          field: "create_at",
          search: standardNameCn,
          size: 20,
        },
      ),
    );
    const record = (data.contentList ?? []).find((item) => item.standardNameCn === standardNameCn);
    if (!record) throw new Error(`Standard record not found: ${standardNameCn}`);
    return record;
  }

  private async findStandardRecordOptional(standardNameCn: string): Promise<StandardRow | null> {
    try {
      return await this.findStandardRecord(standardNameCn);
    } catch {
      return null;
    }
  }

  private async fillModalFormInput(modal: Locator, label: string, value: string): Promise<void> {
    const field = modal
      .locator(".ant-form-item")
      .filter({ hasText: looseLabel(label) })
      .first();
    const input = field.locator("input").first();
    await expect(input, `input ${label} should be visible`).toBeVisible({ timeout: 10_000 });
    await input.fill(value);
    await expect(input, `input ${label} should have value`).toHaveValue(value);
  }

  private async listDatabaseCollections(): Promise<DatabaseCollectionRecord[]> {
    const data = this.expectApiData(
      "list database collections",
      await this.postJsonFromPage<ApiResponse<PagedListData<DatabaseCollectionRecord>>>(
        "/dmetadata/v1/databaseCollection/pageQueryCollection",
        {
          asc: false,
          current: 1,
          size: 50,
        },
      ),
    );
    return data.contentList ?? [];
  }

  private async createDatabaseCollection(
    typeLabel: "词根管理" | "数据标准",
    existingCollectionIds: Set<string>,
    sourceRef: string,
  ): Promise<DatabaseCollectionRecord> {
    const modal = await this.openDatabaseCollectModal(sourceRef);
    const selectedSource = await this.fillDatabaseCollectModal(modal, typeLabel, sourceRef);
    const saveResponse = this.page.waitForResponse(
      (response) => response.url().includes("/dmetadata/v1/databaseCollection/addCollection"),
      { timeout: 30_000 },
    );
    await modal.locator(".ant-modal-footer .ant-btn-primary").click();
    await this.expectOkApiResponse(
      await saveResponse,
      "/dmetadata/v1/databaseCollection/addCollection",
      sourceRef,
    );

    return this.waitForDatabaseCollection(
      (record) =>
        !existingCollectionIds.has(String(record.id)) &&
        Number(record.collectType) === (typeLabel === "词根管理" ? 0 : 1) &&
        String(record.collectFrom ?? "").includes(selectedSource) &&
        /1/.test(String(record.collectCondition ?? "")),
      `${sourceRef}: ${typeLabel} database collection should be created`,
    );
  }

  private async openDatabaseCollectModal(sourceRef: string): Promise<Locator> {
    const addBtn = this.page.getByRole("button", { name: looseLabel("新建拾取") }).first();
    await expect(
      addBtn,
      `${sourceRef}: add database collection button should be visible`,
    ).toBeVisible({
      timeout: 10_000,
    });
    await addBtn.click();

    const modal = this.page.locator(".ant-modal:visible").first();
    await expect(
      modal,
      `${sourceRef}: add database collection modal should be visible`,
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      modal,
      `${sourceRef}: add database collection modal should have title`,
    ).toContainText("新建拾取");
    return modal;
  }

  private async fillDatabaseCollectModal(
    modal: Locator,
    typeLabel: "词根管理" | "数据标准",
    sourceRef: string,
  ): Promise<string> {
    const typeRadio = modal
      .locator(".ant-radio-wrapper")
      .filter({ hasText: new RegExp(`^${escapeRegExp(typeLabel)}$`) })
      .first();
    await expect(typeRadio, `${sourceRef}: ${typeLabel} radio should be visible`).toBeVisible({
      timeout: 10_000,
    });
    await typeRadio.click();

    const sourceField = modal
      .locator(".ant-form-item")
      .filter({ hasText: /拾取来源/ })
      .first();
    const sourceSelect = sourceField.locator(".ant-select").first();
    await expect(
      sourceSelect,
      `${sourceRef}: collection source select should be visible`,
    ).toBeVisible({
      timeout: 10_000,
    });
    await sourceSelect.locator(".ant-select-selector").click();
    const sourceOptions = this.page.locator(".ant-select-dropdown:visible .ant-select-item-option");
    await expect(
      sourceOptions.first(),
      `${sourceRef}: collection source options should be available`,
    ).toBeVisible({
      timeout: 10_000,
    });
    const preferredSourceOption = sourceOptions
      .filter({ hasText: COLLECTION_SOURCE_PREFERENCE })
      .first();
    const sourceOption = (await preferredSourceOption
      .isVisible({ timeout: 1_000 })
      .catch(() => false))
      ? preferredSourceOption
      : sourceOptions.first();
    const selectedSource = (await sourceOption.innerText()).replace(/\s+/g, " ").trim();
    if (!selectedSource) {
      throw new Error(`${sourceRef}: selected database collection source text is empty`);
    }
    await sourceOption.click();
    await modal.locator(".ant-modal-title").click();
    await expect(sourceField, `${sourceRef}: selected source should be shown`).toContainText(
      selectedSource,
    );

    const conditionInput = modal
      .locator(".ant-form-item")
      .filter({ hasText: /拾取条件/ })
      .locator('input[role="spinbutton"], input.ant-input-number-input')
      .first();
    await expect(
      conditionInput,
      `${sourceRef}: collection condition input should be visible`,
    ).toBeVisible({
      timeout: 10_000,
    });
    await conditionInput.fill("1");
    await expect(conditionInput, `${sourceRef}: collection condition should be 1`).toHaveValue("1");
    return selectedSource;
  }

  private async waitForDatabaseCollection(
    matcher: (record: DatabaseCollectionRecord) => boolean,
    message: string,
  ): Promise<DatabaseCollectionRecord> {
    let matchedRecord: DatabaseCollectionRecord | null = null;
    await expect
      .poll(
        async () => {
          matchedRecord = (await this.listDatabaseCollections()).find(matcher) ?? null;
          return matchedRecord ? String(matchedRecord.id) : "";
        },
        {
          timeout: 60_000,
          message,
        },
      )
      .not.toBe("");
    return matchedRecord as unknown as DatabaseCollectionRecord;
  }

  private async waitForDatabaseCollectionComplete(
    collectionId: number | string,
    sourceRef: string,
  ): Promise<DatabaseCollectionRecord> {
    let matchedRecord: DatabaseCollectionRecord | null = null;
    await expect
      .poll(
        async () => {
          matchedRecord =
            (await this.listDatabaseCollections()).find(
              (record) => String(record.id) === String(collectionId),
            ) ?? null;
          return matchedRecord?.collectStatus ?? -1;
        },
        {
          timeout: 120_000,
          message: `${sourceRef}: database collection ${collectionId} should complete`,
        },
      )
      .toBe(1);
    return matchedRecord as unknown as DatabaseCollectionRecord;
  }

  private async expectDatabaseCollectionRow(
    record: DatabaseCollectionRecord,
    typeLabel: "词根管理" | "数据标准",
    sourceRef: string,
  ): Promise<void> {
    await this.goto("/databaseCollect", sourceRef, [
      "/dmetadata/v1/databaseCollection/pageQueryCollection",
    ]);
    const row = this.page
      .locator(".ant-table-row")
      .filter({ hasText: typeLabel })
      .filter({ hasText: "拾取完成" })
      .first();
    await expect(
      row,
      `${sourceRef}: ${typeLabel} database collection row should be visible`,
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(row, `${sourceRef}: collection source should be visible`).toContainText(
      String(record.collectFrom ?? ""),
    );
    await expect(row, `${sourceRef}: collection condition should be visible`).toContainText(
      String(record.collectCondition ?? 1),
    );
    await expect(row.getByRole("button", { name: looseLabel("查看拾取") }).first()).toBeVisible();
  }

  private toDatabaseCollectionPlatformRecord(
    record: DatabaseCollectionRecord,
    typeLabel: "词根管理" | "数据标准",
  ): CreatedPlatformRecord {
    return {
      recordType: "database-collection",
      recordName: `${typeLabel}拾取_${record.id}`,
      recordId: String(record.id),
      status: "拾取完成",
      route: "/databaseCollect",
      evidence: `${typeLabel}数据库拾取记录完成，拾取数量=${record.collectCount ?? "unknown"}`,
      api: "/dmetadata/v1/databaseCollection/addCollection",
    };
  }

  private activeDatasourceType(): number {
    const config = getEnvConfig();
    const datasourceName = config.runtime.defaultDatasource;
    const datasource = config.datasources[datasourceName];
    const typeId = datasource.ui?.sourceTypeId ?? datasource.metadata.typeId;
    if (!typeId) throw new Error(`No datasource type configured for ${datasourceName}`);
    return typeId;
  }

  private activeDatasourceName(): string {
    const config = getEnvConfig();
    const datasourceName = config.runtime.defaultDatasource;
    const name =
      config.datasources[datasourceName]?.metadata.name ??
      config.datasources[datasourceName]?.assets.name;
    if (!name) throw new Error(`No datasource name configured for ${datasourceName}`);
    return name;
  }

  private async findRuntimeDatasource(datasourceType: number): Promise<RuntimeDataSource> {
    const data = this.expectApiData(
      "query datasources by type",
      await this.postJsonFromPage<ApiResponse<RuntimeDataSource[]>>(
        "/dmetadata/v1/dataSource/getDataSourceByType",
        {
          dataSourceTypes: [datasourceType],
        },
      ),
    );
    const targetName = this.activeDatasourceName();
    const datasource =
      data.find((item) => String(item.dataSourceName ?? item.name ?? "").includes(targetName)) ??
      data[0];
    if (!datasource) throw new Error(`No datasource returned for type ${datasourceType}`);
    return datasource;
  }

  private async findRuntimeDb(
    dataSourceId: string | number,
    sourceRef: string,
  ): Promise<RuntimeDb> {
    const data = this.expectApiData(
      "query datasource databases",
      await this.postJsonFromPage<ApiResponse<RuntimeDb[]>>(
        "/dmetadata/v1/dataDb/getDbByDataSourceIds",
        {
          dataSourceIds: [dataSourceId],
        },
      ),
    );
    const targetDb =
      getEnvConfig().datasources[getEnvConfig().runtime.defaultDatasource]?.sql.database;
    const db =
      data.find((item) =>
        String(item.value ?? item.dbName ?? item.name ?? "").includes(targetDb),
      ) ?? data[0];
    if (!db) throw new Error(`${sourceRef}: no database returned for datasource ${dataSourceId}`);
    return db;
  }

  private async selectStandardCatalog(catalogName: string): Promise<void> {
    const catalogField = this.page
      .locator(".ant-form-item")
      .filter({ hasText: /标准目录/ })
      .first();
    const selector = catalogField.locator(".ant-select-selector").first();
    const option = this.page
      .locator(".ant-select-tree-title")
      .filter({ hasText: new RegExp(`^${escapeRegExp(catalogName)}$`) })
      .first();

    await selector.click();
    await expect(option, `standard catalog option ${catalogName} should be visible`).toBeVisible({
      timeout: 10_000,
    });
    await option.click();
    await expect(
      catalogField,
      `standard catalog field should contain ${catalogName}`,
    ).toContainText(catalogName);
  }

  private async isRouteShellOnly(): Promise<boolean> {
    const text = await this.body()
      .innerText({ timeout: 2_000 })
      .then((value) => value.replace(/\s+/g, " ").trim())
      .catch(() => "");
    return (
      text.includes("DataAssets") &&
      !/标准统计|词根管理|码表管理|行业模版|数据库拾取|标准定义|标准映射|落标检查/.test(text)
    );
  }

  private body() {
    return this.page.locator("body");
  }
}
