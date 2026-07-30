import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getEnvConfig } from "../../../../../../_shared/automation/runtime/env-profile";

/** 从运行时环境解析 SparkThrift 数据源 UI 名称；未选环境时仅保留不可执行占位值。 */
function resolveSparkDatasourceName(): string {
  try {
    const datasource = getEnvConfig().datasources.sparkthrift;
    return datasource?.assets?.name ?? datasource?.metadata?.name ?? datasource?.batch?.name ?? "__unconfigured_sparkthrift__";
  } catch {
    return "__unresolved_sparkthrift__";
  }
}

/** 从运行时环境解析 Doris 数据源 UI 名称；未配置时不伪造客户数据源名称。 */
function resolveDorisDatasourceName(): string {
  try {
    const datasource = getEnvConfig().datasources.doris;
    return datasource?.assets?.name ?? datasource?.batch?.name ?? "__unconfigured_doris__";
  } catch {
    return "__unresolved_doris__";
  }
}

export type V6411RuleSpec = {
  index: number;
  category: string;
  scope?: string;
  fields?: string[];
  fieldLogic?: "and" | "or";
  functionName: string;
  filter?: string;
  method?: string;
  expected?: string;
  strength: "强规则" | "弱规则";
  unmergeable?: boolean;
  notes?: string;
};

export type V6411UiCaseSpec = {
  caseNo: number;
  title: string;
  packageName: string;
  packageCount: number;
  samplingEnabled: boolean;
  partitionEnabled: boolean;
  expectedRuleCount: number;
  rules: V6411RuleSpec[];
};

export type V6411UiCaseMeta = {
  caseNo: number;
  sourceCaseNo: number;
  sourceCaseId: string;
  datasourceName: string;
  datasourceType: "Doris3.x" | "SparkThrift2.x";
  fullTitle: string;
  shortRuleName: string;
  packageName: string;
  packageCount: number;
  samplingEnabled: boolean;
  partitionEnabled: boolean;
  monitorRuleCount: number;
  csvModule: string;
};

export type V6411SourceRuleAudit = {
  caseNo: number;
  sourceCaseNo: number;
  sourceCaseId: string;
  fullTitle: string;
  packageName: string;
  packageCount: number;
  ruleCount: number;
  duplicateFingerprints: string[];
  rules: V6411RuleSpec[];
};

export type V6411SourcePreconditionAudit = {
  caseNo: number;
  sourceCaseNo: number;
  sourceCaseId: string;
  fullTitle: string;
  precondition: string;
};

const FEATURE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CSV_PATH = path.join(FEATURE_DIR, "cases/imports/数据质量.csv");

type CsvRow = Record<string, string>;

let canonicalCsvRowsCache: CsvRow[] | undefined;
let sourceRuleAuditsCache: V6411SourceRuleAudit[] | undefined;
let sourcePreconditionAuditsCache: V6411SourcePreconditionAudit[] | undefined;
let caseMetasCache: V6411UiCaseMeta[] | undefined;

export const EXPECTED_CANONICAL_RULE_COUNTS = [
  21, 21, 21, 21, 15, 15, 15, 13, 13, 13, 10, 9, 9, 8, 9, 0, 0, 0, 4, 4, 4, 4, 4, 0, 0, 0,
  6, 6, 5, 5, 5, 5, 5, 5, 5, 5,
] as const;

export const CASE_01_SPEC: V6411UiCaseSpec = {
  caseNo: 1,
  title: "验证「可合并和不可合并」-「抽样开启」-「设置分区」-「不同过滤条件」-「包含强弱规则」-「多规则包」校验功能",
  packageName: "可合并+不可合并+抽样开启+设置分区+不同过滤条件+包含强弱规则+多规则包",
  packageCount: 10,
  samplingEnabled: true,
  partitionEnabled: true,
  expectedRuleCount: 21,
  rules: [
    {
      index: 1,
      category: "完整性校验",
      scope: "字段级",
      fields: ["id", "age"],
      fieldLogic: "and",
      functionName: "空值数",
      filter: "id<=100",
      method: "固定值",
      expected: "!=1",
      strength: "弱规则",
    },
    {
      index: 2,
      category: "完整性校验",
      scope: "字段级",
      fields: ["id", "age"],
      fieldLogic: "or",
      functionName: "空值率",
      method: "固定值",
      expected: "=0",
      strength: "强规则",
    },
    {
      index: 3,
      category: "完整性校验",
      scope: "字段级",
      fields: ["name"],
      functionName: "空串数",
      filter: "id<=100",
      method: "固定值",
      expected: ">0",
      strength: "强规则",
    },
    {
      index: 4,
      category: "完整性校验",
      scope: "字段级",
      fields: ["name"],
      functionName: "空串率",
      filter: "id<=80",
      method: "固定值",
      expected: "=1",
      strength: "弱规则",
    },
    {
      index: 5,
      category: "完整性校验",
      scope: "单表",
      functionName: "表行数",
      filter: "id<=100",
      method: "固定值",
      expected: ">0",
      strength: "弱规则",
    },
    {
      index: 6,
      category: "完整性校验",
      scope: "字段级",
      fields: ["string_num"],
      functionName: "字段取值校验",
      filter: "id<=100",
      expected: ">=1",
      strength: "弱规则",
      unmergeable: true,
    },
    {
      index: 7,
      category: "有效性校验",
      fields: ["id"],
      functionName: "数值-取值范围",
      filter: "id<=100",
      method: "固定值",
      expected: ">0且<=100",
      strength: "弱规则",
    },
    {
      index: 8,
      category: "有效性校验",
      fields: ["string_num"],
      functionName: "数值-枚举个数",
      filter: "id>=100 and id<300",
      method: "固定值",
      expected: ">=1",
      strength: "强规则",
    },
    {
      index: 9,
      category: "有效性校验",
      fields: ["age"],
      functionName: "枚举值",
      filter: "id<=100",
      expected: "not in 25,30,28,35",
      strength: "弱规则",
    },
    {
      index: 10,
      category: "有效性校验",
      fields: ["id"],
      functionName: "取值范围&枚举范围",
      expected: "取值范围>0且<5; 枚举值 in 1; 关系 且",
      strength: "强规则",
    },
    {
      index: 11,
      category: "有效性校验",
      fields: ["money"],
      functionName: "字符串长度",
      filter: "id<=100",
      method: "固定值",
      expected: ">=2",
      strength: "强规则",
      notes: "CSV row 185972 includes this rule; archive.md case 01 omitted it.",
    },
    {
      index: 12,
      category: "有效性校验",
      fields: ["address"],
      functionName: "字符串长度",
      filter: "id<=100",
      method: "固定值",
      expected: ">=1",
      strength: "弱规则",
      unmergeable: true,
    },
    {
      index: 13,
      category: "唯一性校验",
      fields: ["id"],
      functionName: "重复数",
      filter: "id<=100",
      method: "固定值",
      expected: "=0",
      strength: "弱规则",
    },
    {
      index: 14,
      category: "唯一性校验",
      fields: ["age"],
      functionName: "多表唯一性判断",
      filter: "id<=100",
      expected: "独立对比表; 对比字段 id",
      strength: "弱规则",
    },
    {
      index: 15,
      category: "统计性校验",
      fields: ["name"],
      functionName: "异常值检测",
      filter: "id<=100",
      method: "IQR离群点数量",
      expected: "=1",
      strength: "弱规则",
    },
    {
      index: 16,
      category: "自定义SQL",
      functionName: "自定义规则测试",
      method: "固定值",
      expected: "=1",
      strength: "弱规则",
      notes: "sql: select * from ${tableName} where ${colName} = ${value}; params tableName/id/1",
    },
    {
      index: 17,
      category: "一致性校验",
      scope: "多表数据一致性比对",
      fields: ["id", "name"],
      functionName: "多表数据一致性比对",
      expected: "主键 id; 独立对比表; 比对字段 id,name",
      strength: "弱规则",
    },
    {
      index: 18,
      category: "时效性校验",
      fields: ["buy_date"],
      functionName: "周期性校验（单字段时间差校验）",
      filter: "id<=100",
      expected: "排序字段 id; 时间差 >=1秒",
      strength: "弱规则",
    },
    {
      index: 19,
      category: "时效性校验",
      fields: ["id"],
      functionName: "及时性校验（多字段时间差校验）",
      filter: "id<=100",
      expected: "对比字段组 buy_date,dt; 时间差 <1分钟; buy_date<dt",
      strength: "弱规则",
    },
    {
      index: 20,
      category: "合理性校验",
      fields: ["age"],
      functionName: "数据变化趋势",
      filter: "id<=100",
      method: "单调递增",
      expected: "排序字段 id",
      strength: "弱规则",
    },
    {
      index: 21,
      category: "合理性校验",
      fields: ["age"],
      functionName: "字段值计算对比",
      filter: "id<=100",
      method: "计算结果与字段对比",
      expected: "cast(string_num as double)*(id+age); age<计算结果",
      strength: "弱规则",
    },
  ],
};

export const CASE_02_SPEC: V6411UiCaseSpec = {
  caseNo: 2,
  title: "验证「可合并和不可合并」-「抽样开启」-「设置分区」-「不同过滤条件」-「单规则包」校验功能",
  packageName: "可合并+不可合并+抽样开启+设置分区+不同过滤条件+单规则包",
  packageCount: 1,
  samplingEnabled: true,
  partitionEnabled: true,
  expectedRuleCount: 21,
  rules: cloneCase01RulesWithOverrides(allWeakOverrides()),
};

export const CASE_03_SPEC: V6411UiCaseSpec = {
  caseNo: 3,
  title: "验证「可合并和不可合并」-「抽样开启」-「设置分区」-「相同过滤条件」-「包含强弱规则」-「多规则包」校验功能",
  packageName: "可合并+不可合并+抽样开启+设置分区+相同过滤条件+包含强弱规则+多规则包",
  packageCount: 10,
  samplingEnabled: true,
  partitionEnabled: true,
  expectedRuleCount: 21,
  rules: cloneCase01RulesWithOverrides(sameFilterOverrides()),
};

export const CASE_04_SPEC: V6411UiCaseSpec = {
  caseNo: 4,
  title: "验证「可合并和不可合并」-「抽样开启」-「设置分区」-「相同过滤条件」-「单规则包」校验功能",
  packageName: "可合并+不可合并+抽样开启+设置分区+相同过滤条件+单规则包",
  packageCount: 1,
  samplingEnabled: true,
  partitionEnabled: true,
  expectedRuleCount: 21,
  rules: cloneCase01RulesWithOverrides({
    ...allWeakOverrides(),
    ...sameFilterOverrides(),
  }),
};

export const CASE_05_SPEC = sourceDerivedUiCaseSpec(5);
export const CASE_06_SPEC = sourceDerivedUiCaseSpec(6);
export const CASE_07_SPEC = sourceDerivedUiCaseSpec(7);
export const CASE_08_SPEC = sourceDerivedUiCaseSpec(8);
export const CASE_09_SPEC = sourceDerivedUiCaseSpec(9);
export const CASE_10_SPEC = sourceDerivedUiCaseSpec(10);
export const CASE_11_SPEC = sourceDerivedUiCaseSpec(11);
export const CASE_12_SPEC = sourceDerivedUiCaseSpec(12);
export const CASE_13_SPEC = sourceDerivedUiCaseSpec(13);
export const CASE_14_SPEC = sourceDerivedUiCaseSpec(14);
export const CASE_15_SPEC = sourceDerivedUiCaseSpec(15);
export const CASE_19_SPEC = sourceDerivedUiCaseSpec(19);
export const CASE_20_SPEC = sourceDerivedUiCaseSpec(20);
export const CASE_21_SPEC = sourceDerivedUiCaseSpec(21);
export const CASE_22_SPEC = sourceDerivedUiCaseSpec(22);
export const CASE_23_SPEC = sourceDerivedUiCaseSpec(23);
export const CASE_16_SPEC = preconditionDerivedUiCaseSpec(16, 20, "可合并有效性规则");
export const CASE_17_SPEC = preconditionDerivedUiCaseSpec(17, 20, "可合并有效性规则");
export const CASE_18_SPEC = preconditionDerivedUiCaseSpec(18, 21, "可合并有效性规则");
export const CASE_27_SPEC = sourceDerivedUiCaseSpec(27);
export const CASE_28_SPEC = sourceDerivedUiCaseSpec(28);
export const CASE_29_SPEC = sourceDerivedUiCaseSpec(29);
export const CASE_30_SPEC = sourceDerivedUiCaseSpec(30);
export const CASE_31_SPEC = sourceDerivedUiCaseSpec(31);
export const CASE_32_SPEC = sourceDerivedUiCaseSpec(32);
export const CASE_24_SPEC = preconditionDerivedUiCaseSpec(24, 31, "可合并完整性规则");
export const CASE_25_SPEC = preconditionDerivedUiCaseSpec(25, 31, "可合并完整性规则");
export const CASE_26_SPEC = preconditionDerivedUiCaseSpec(26, 32, "可合并完整性规则");
export const CASE_33_SPEC = sourceDerivedUiCaseSpec(33);
export const CASE_34_SPEC = sourceDerivedUiCaseSpec(34);
export const CASE_35_SPEC = sourceDerivedUiCaseSpec(35);
export const CASE_36_SPEC = sourceDerivedUiCaseSpec(36);

export const PRECONDITION_RULE_DONOR_CASES = [
  { caseNo: 16, donorCaseNo: 20, packageName: "可合并有效性规则" },
  { caseNo: 17, donorCaseNo: 20, packageName: "可合并有效性规则" },
  { caseNo: 18, donorCaseNo: 21, packageName: "可合并有效性规则" },
  { caseNo: 24, donorCaseNo: 31, packageName: "可合并完整性规则" },
  { caseNo: 25, donorCaseNo: 31, packageName: "可合并完整性规则" },
  { caseNo: 26, donorCaseNo: 32, packageName: "可合并完整性规则" },
  { caseNo: 52, donorCaseNo: 56, packageName: "可合并有效性规则" },
  { caseNo: 53, donorCaseNo: 56, packageName: "可合并有效性规则" },
  { caseNo: 54, donorCaseNo: 57, packageName: "可合并有效性规则" },
  { caseNo: 60, donorCaseNo: 67, packageName: "可合并完整性规则" },
  { caseNo: 61, donorCaseNo: 67, packageName: "可合并完整性规则" },
  { caseNo: 62, donorCaseNo: 68, packageName: "可合并完整性规则" },
] as const;

export const DORIS_RULE_CASE_SPECS = [
  CASE_01_SPEC,
  CASE_02_SPEC,
  CASE_03_SPEC,
  CASE_04_SPEC,
  CASE_05_SPEC,
  CASE_06_SPEC,
  CASE_07_SPEC,
  CASE_08_SPEC,
  CASE_09_SPEC,
  CASE_10_SPEC,
  CASE_11_SPEC,
  CASE_12_SPEC,
  CASE_13_SPEC,
  CASE_14_SPEC,
  CASE_15_SPEC,
  CASE_16_SPEC,
  CASE_17_SPEC,
  CASE_18_SPEC,
  CASE_19_SPEC,
  CASE_20_SPEC,
  CASE_21_SPEC,
  CASE_22_SPEC,
  CASE_23_SPEC,
  CASE_24_SPEC,
  CASE_25_SPEC,
  CASE_26_SPEC,
  CASE_27_SPEC,
  CASE_28_SPEC,
  CASE_29_SPEC,
  CASE_30_SPEC,
  CASE_31_SPEC,
  CASE_32_SPEC,
  CASE_33_SPEC,
  CASE_34_SPEC,
  CASE_35_SPEC,
  CASE_36_SPEC,
] as const;

export const SPARK_RULE_CASE_SPECS = DORIS_RULE_CASE_SPECS.map((spec) => sparkMirrorUiCaseSpec(spec));

export const EXPLICIT_RULE_CASE_SPECS = [...DORIS_RULE_CASE_SPECS, ...SPARK_RULE_CASE_SPECS] as const;

type RuleOverridesByIndex = Record<number, Partial<V6411RuleSpec>>;

function cloneCase01RulesWithOverrides(overrides: RuleOverridesByIndex): V6411RuleSpec[] {
  return CASE_01_SPEC.rules.map((rule) => ({
    ...rule,
    fields: rule.fields ? [...rule.fields] : undefined,
    ...overrides[rule.index],
  }));
}

function allWeakOverrides(): RuleOverridesByIndex {
  return Object.fromEntries(CASE_01_SPEC.rules.map((rule) => [rule.index, { strength: "弱规则" as const }]));
}

function sameFilterOverrides(): RuleOverridesByIndex {
  return {
    2: { filter: "id<=100" },
    4: { filter: "id<=100" },
    8: { filter: "id<=100" },
    10: { filter: "id<=100" },
  };
}

function sourceDerivedUiCaseSpec(caseNo: number): V6411UiCaseSpec {
  const audit = loadV6411SourceRuleAudits().find((item) => item.caseNo === caseNo);
  if (!audit) throw new Error(`missing v6411 source audit for §${padCaseNo(caseNo)}`);
  return {
    caseNo,
    title: audit.fullTitle,
    packageName: audit.packageName,
    packageCount: audit.packageCount,
    ...deriveTaskSettingsFromTitle(audit.fullTitle),
    expectedRuleCount: EXPECTED_CANONICAL_RULE_COUNTS[caseNo - 1],
    rules: audit.rules.map((rule) => ({
      ...rule,
      fields: rule.fields ? [...rule.fields] : undefined,
    })),
  };
}

function preconditionDerivedUiCaseSpec(caseNo: number, donorCaseNo: number, packageName: string): V6411UiCaseSpec {
  const meta = loadV6411UiCaseMetas().find((item) => item.caseNo === caseNo);
  if (!meta) throw new Error(`missing v6411 case meta for §${padCaseNo(caseNo)}`);
  const donor = sourceDerivedUiCaseSpec(donorCaseNo);
  return {
    caseNo,
    title: meta.fullTitle,
    packageName,
    packageCount: meta.packageCount,
    samplingEnabled: donor.samplingEnabled,
    partitionEnabled: donor.partitionEnabled,
    expectedRuleCount: donor.expectedRuleCount,
    rules: donor.rules.map((rule) => ({
      ...rule,
      fields: rule.fields ? [...rule.fields] : undefined,
      notes: `前置规则类用例 §${padCaseNo(caseNo)} 复用 §${padCaseNo(donorCaseNo)} 规则明细；${rule.notes ?? ""}`,
    })),
  };
}

function sparkMirrorUiCaseSpec(dorisSpec: V6411UiCaseSpec): V6411UiCaseSpec {
  const caseNo = dorisSpec.caseNo + 36;
  const meta = loadV6411UiCaseMetas().find((item) => item.caseNo === caseNo);
  if (!meta) throw new Error(`missing v6411 Spark mirror meta for §${padCaseNo(caseNo)}`);
  return {
    caseNo,
    title: meta.fullTitle,
    packageName: meta.packageName,
    packageCount: dorisSpec.packageCount,
    samplingEnabled: dorisSpec.samplingEnabled,
    partitionEnabled: dorisSpec.partitionEnabled,
    expectedRuleCount: dorisSpec.expectedRuleCount,
    rules: dorisSpec.rules.map((rule) => ({
      ...rule,
      fields: rule.fields ? [...rule.fields] : undefined,
      notes: `SparkThrift 镜像 §${padCaseNo(caseNo)} 复用 Doris §${padCaseNo(dorisSpec.caseNo)} 规则明细；${rule.notes ?? ""}`,
    })),
  };
}

export function explicitRuleCaseNumbers(): number[] {
  return EXPLICIT_RULE_CASE_SPECS.map((spec) => spec.caseNo);
}

export function loadV6411UiCaseMetas(): V6411UiCaseMeta[] {
  if (caseMetasCache) return caseMetasCache;
  const canonicalRows = loadCanonicalCsvRows();

  if (canonicalRows.length !== 36) {
    throw new Error(`expected 36 canonical v6411 UI cases, got ${canonicalRows.length}`);
  }

  const sparkName = resolveSparkDatasourceName();
  const dorisName = resolveDorisDatasourceName();
  const cases: V6411UiCaseMeta[] = [];
  for (const [index, row] of canonicalRows.entries()) {
    cases.push(buildCaseMeta(row, index + 1, index + 1, dorisName, "Doris3.x"));
  }
  for (const [index, row] of canonicalRows.entries()) {
    cases.push(buildCaseMeta(row, index + 37, index + 1, sparkName, "SparkThrift2.x"));
  }
  caseMetasCache = cases;
  return caseMetasCache;
}

export function loadV6411SourceRuleAudits(): V6411SourceRuleAudit[] {
  if (sourceRuleAuditsCache) return sourceRuleAuditsCache;
  const canonicalRows = loadCanonicalCsvRows();
  const audits: V6411SourceRuleAudit[] = [];
  for (const [index, row] of canonicalRows.entries()) {
    audits.push(buildSourceRuleAudit(row, index + 1, index + 1));
  }
  for (const [index, row] of canonicalRows.entries()) {
    audits.push(buildSourceRuleAudit(row, index + 37, index + 1));
  }
  sourceRuleAuditsCache = audits;
  return sourceRuleAuditsCache;
}

export function loadV6411SourcePreconditionAudits(): V6411SourcePreconditionAudit[] {
  if (sourcePreconditionAuditsCache) return sourcePreconditionAuditsCache;
  const canonicalRows = loadCanonicalCsvRows();
  const audits: V6411SourcePreconditionAudit[] = [];
  for (const [index, row] of canonicalRows.entries()) {
    audits.push(buildSourcePreconditionAudit(row, index + 1, index + 1));
  }
  for (const [index, row] of canonicalRows.entries()) {
    audits.push(buildSourcePreconditionAudit(row, index + 37, index + 1));
  }
  sourcePreconditionAuditsCache = audits;
  return sourcePreconditionAuditsCache;
}

export function ruleFingerprint(rule: V6411RuleSpec): string {
  return [
    rule.category,
    rule.scope ?? "",
    (rule.fields ?? []).join(","),
    rule.fieldLogic ?? "",
    rule.functionName,
    rule.filter ?? "",
    rule.method ?? "",
    rule.expected ?? "",
    rule.strength,
    rule.unmergeable ? "UNMERGEABLE" : "",
  ].join("|||");
}

export function formatV6411ShortRuleName(caseNo: number, fullTitle: string): string {
  const title = fullTitle
    .replace(/[「」]/g, "")
    .replace(/[【】]/g, "")
    .replace(/\s+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "");
  const result = `§${padCaseNo(caseNo)} ${title}`;
  if (result.length > 50) {
    throw new Error(`v6411 short rule name exceeds 50 chars (${result.length}): ${result}`);
  }
  return result;
}

function buildCaseMeta(
  row: CsvRow,
  caseNo: number,
  sourceCaseNo: number,
  datasourceName: V6411UiCaseMeta["datasourceName"],
  datasourceType: V6411UiCaseMeta["datasourceType"],
): V6411UiCaseMeta {
  const fullTitle = extractCaseTitle(row["用例标题"] ?? "");
  const steps = row["步骤"] ?? "";
  const precondition = row["前置条件"] ?? "";
  const packageCounts = [...steps.matchAll(/规则拼接包」为「(\d+)」/g)].map((match) => Number(match[1]));
  const packageName = extractPackageName(steps, precondition);
  const monitorRuleCount = (steps.match(/「监控规则\d+」配置如下/g) ?? []).length;
  return {
    caseNo,
    sourceCaseNo,
    sourceCaseId: row["用例编号"] ?? "",
    datasourceName,
    datasourceType,
    fullTitle,
    shortRuleName: formatV6411ShortRuleName(caseNo, fullTitle),
    packageName,
    packageCount: packageCounts.at(-1) ?? 1,
    ...deriveTaskSettingsFromTitle(fullTitle),
    monitorRuleCount,
    csvModule: row["所属模块"] ?? "",
  };
}

function deriveTaskSettingsFromTitle(fullTitle: string): { samplingEnabled: boolean; partitionEnabled: boolean } {
  return {
    samplingEnabled: fullTitle.includes("抽样开启"),
    partitionEnabled: fullTitle.includes("设置分区"),
  };
}

function buildSourceRuleAudit(row: CsvRow, caseNo: number, sourceCaseNo: number): V6411SourceRuleAudit {
  const steps = row["步骤"] ?? "";
  const precondition = row["前置条件"] ?? "";
  const rules = extractSourceRuleSpecs(steps);
  const fingerprints = rules.map(ruleFingerprint);
  const duplicateFingerprints = fingerprints.filter((item, index) => fingerprints.indexOf(item) !== index);
  const packageCounts = [...steps.matchAll(/规则拼接包」为「(\d+)」/g)].map((match) => Number(match[1]));
  return {
    caseNo,
    sourceCaseNo,
    sourceCaseId: row["用例编号"] ?? "",
    fullTitle: extractCaseTitle(row["用例标题"] ?? ""),
    packageName: extractPackageName(steps, precondition),
    packageCount: packageCounts.at(-1) ?? 1,
    ruleCount: rules.length,
    duplicateFingerprints: [...new Set(duplicateFingerprints)],
    rules,
  };
}

function buildSourcePreconditionAudit(row: CsvRow, caseNo: number, sourceCaseNo: number): V6411SourcePreconditionAudit {
  return {
    caseNo,
    sourceCaseNo,
    sourceCaseId: row["用例编号"] ?? "",
    fullTitle: extractCaseTitle(row["用例标题"] ?? ""),
    precondition: row["前置条件"] ?? "",
  };
}

function extractSourceRuleSpecs(steps: string): V6411RuleSpec[] {
  const numberedSteps = [...steps.matchAll(/(?:^|\n)(\d+)\.\s*([\s\S]*?)(?=\n\d+\.\s|$)/g)];
  if (!numberedSteps.length) {
    const matches = [
      ...steps.matchAll(/「监控规则(\d+)」配置如下[：:]([\s\S]*?)(?=(?:\n?\d+、)|(?:\n?「监控规则\d+」)|$)/g),
    ];
    return matches.map((match, index) => sourceRuleFromText(Number(match[1]) || index + 1, match[0]));
  }

  const rules: V6411RuleSpec[] = [];
  let currentCategory = "";
  for (const step of numberedSteps) {
    const stepText = step[2] ?? "";
    const category = stepText.match(/添加规则[-—]([^】\]\n]+)/)?.[1]?.trim();
    if (category) currentCategory = normalizeRuleCategory(category);
    const ruleMatch = stepText.match(/「监控规则(\d+)」配置如下[：:]([\s\S]*)/);
    if (ruleMatch) {
      rules.push(sourceRuleFromText(Number(ruleMatch[1]) || rules.length + 1, ruleMatch[0], currentCategory));
    }
  }
  return rules;
}

function sourceRuleFromText(index: number, text: string, categoryContext = ""): V6411RuleSpec {
  const inferredCategory = inferRuleCategory(text) || categoryContext;
  const scope = sourceValue(text, "生效范围") || sourceValue(text, "校验类型") || undefined;
  return {
    index,
    category: inferredCategory,
    scope,
    fields: splitSourceFields(sourceValue(text, "字段") || sourceValue(text, "选择校验字段")),
    functionName:
      sourceValue(text, "统计函数") || sourceValue(text, "统计规则") || sourceValue(text, "引用规则") || scope || inferredCategory,
    filter: normalizeSourceFilter(sourceValue(text, "过滤条件")) || undefined,
    method: sourceValue(text, "校验方法") || sourceValue(text, "对比方法") || undefined,
    expected: sourceValue(text, "期望值") || sourceValue(text, "枚举值信息") || undefined,
    strength: text.includes("强规则") ? "强规则" : "弱规则",
    unmergeable: text.includes("（不合并）") || undefined,
    notes: compactSourceText(text),
  };
}

function inferRuleCategory(text: string): string {
  if (text.includes("完整性")) return "完整性校验";
  if (text.includes("有效性")) return "有效性校验";
  if (text.includes("唯一性")) return "唯一性校验";
  if (text.includes("统计性")) return "统计性校验";
  if (text.includes("自定义SQL")) return "自定义SQL";
  if (text.includes("一致性")) return "一致性校验";
  if (text.includes("时效性")) return "时效性校验";
  if (text.includes("合理性")) return "合理性校验";
  return "";
}

function normalizeRuleCategory(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed === "自定义SQL" || trimmed.endsWith("校验")) return trimmed;
  return `${trimmed}校验`;
}

function sourceValue(text: string, key: string): string {
  const patterns = [
    new RegExp(`「${key}」[：:]「([^」]*)」`),
    new RegExp(`「${key}」选择「([^」]*)」`),
    new RegExp(`「${key}」输入「([^」]*)」`),
    new RegExp(`「${key}」[：:]([^，,。；;]+)`),
  ];
  for (const pattern of patterns) {
    const matched = text.match(pattern);
    if (matched?.[1]) return matched[1].trim();
  }
  return "";
}

function splitSourceFields(value: string): string[] | undefined {
  const fields = value
    .split(/[，,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return fields.length ? fields : undefined;
}

function normalizeSourceFilter(value: string): string {
  return value
    .replace(/^手动配置[:：]/, "")
    .trim()
    .replace(/^(\w+)\s*>=\s*(\d+(?:\.\d+)?)\s*且\s*<\s*(\d+(?:\.\d+)?)$/, "$1>=$2 and $1<$3");
}

function compactSourceText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractCaseTitle(rawTitle: string): string {
  const verifyIndex = rawTitle.indexOf("验证");
  if (verifyIndex < 0) return rawTitle.trim();
  return rawTitle.slice(verifyIndex).trim();
}

function extractPackageName(steps: string, precondition: string): string {
  const direct = steps.match(/规则包名称」填写「([^」]+)」/)?.[1]?.trim();
  if (direct) return normalizePackageName(direct);

  const imported = steps.match(/引入规则包「([^」]+)」/)?.[1]?.trim();
  if (imported) return normalizePackageName(imported);

  const existingRule = precondition.match(/规则[“"「]([^”"」]+)[”"」]/)?.[1]?.trim();
  return existingRule ? normalizePackageName(existingRule) : "";
}

function normalizePackageName(value: string): string {
  return value.replace(/^完完整性\+/, "完整性+");
}

function loadCanonicalCsvRows(): CsvRow[] {
  if (canonicalCsvRowsCache) return canonicalCsvRowsCache;
  const rows = parseCsvTable(fs.readFileSync(CSV_PATH, "utf8"));
  canonicalCsvRowsCache = rows.filter((row) => {
    const modulePath = row["所属模块"] ?? "";
    return modulePath.includes("数据质量任务性能优化，规则sql合并") && !modulePath.includes("doris3.x");
  });
  return canonicalCsvRowsCache;
}

function padCaseNo(caseNo: number): string {
  return String(caseNo).padStart(2, "0");
}

function parseCsvTable(text: string): CsvRow[] {
  const rows = parseCsvRows(text);
  const header = rows.shift();
  if (!header) return [];
  return rows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => Object.fromEntries(header.map((name, index) => [name, row[index] ?? ""])));
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}
