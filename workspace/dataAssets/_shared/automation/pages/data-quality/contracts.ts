export type DqRuleTaskRecord = {
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

export type DqRuleTaskPageQuery = {
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

export type DqRuleSetRecord = {
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

export type DqRuleSetPageData = {
  contentList?: DqRuleSetRecord[];
  current?: string | number;
  size?: string | number;
  total?: string | number;
};

export type DqRuleSetPackage = {
  packageName?: string;
  rules?: DqRuleSetRule[];
};

export type DqRuleSetRule = {
  functionName?: string | null;
  columnName?: string | null;
  description?: string | null;
  ruleLibraryId?: string | number | null;
  ruleLibraryValue?: string | null;
  standardRules?: DqRuleSetRule[] | null;
};

export type DqApiResponse<T> = {
  success?: boolean;
  code?: number;
  data?: T;
};

export type SparkThriftEnvParam = {
  name: string;
  value: string;
};

export type SparkThriftRuleValidationFusionChecks = {
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
  datasourceKey?: "sparkthrift" | "doris";
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

type DqRuleBaseCustomSqlParam = {
  param?: string;
  type?: number;
  paramName?: string;
  description?: string | null;
  value?: string | null;
};

export type DqRuleBaseCustomSqlRecord = {
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

export type DqRuleBaseCustomSqlPage = {
  contentList?: DqRuleBaseCustomSqlRecord[];
  total?: string | number;
};

export type DqMonitorRecord = {
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

export type DqMonitorRecordPage = {
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  totalPage?: number;
  data?: DqMonitorRecord[];
};
