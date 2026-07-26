import { EXPLICIT_RULE_CASE_SPECS, type V6411RuleSpec } from "./v6411-ui-case-specs";
import { baseRowsForV6411Case, type V6411BaseTableRow } from "./v6411-ui-base-table-data";

export type RuleOutcome = "pass" | "unpass";

export type ExpectedRuleOutcome = {
  caseNo: number;
  ruleIndex: number;
  functionName: string;
  fields: string[];
  outcome: RuleOutcome;
  metric: number | string;
  reason: string;
};

export type ExpectedDirtyData = {
  rowIds: number[];
  reason: string;
};

export function descendingActionCaseNumbers(caseNos: Iterable<number>): number[] {
  return [...new Set(caseNos)].sort((left, right) => right - left);
}

export function descendingDisplayCaseNumbers(caseNos: Iterable<number>): number[] {
  return [...new Set(caseNos)].sort((left, right) => left - right);
}

export function expectedRuleOutcomes(caseNo: number): ExpectedRuleOutcome[] {
  const spec = EXPLICIT_RULE_CASE_SPECS.find((item) => item.caseNo === caseNo);
  if (!spec) throw new Error(`missing explicit v6411 rule spec for case ${caseNo}`);
  const rows = baseRowsForV6411Case({ caseNo, packageName: spec.packageName, title: spec.title });
  return spec.rules.map((rule) => evaluateRule(caseNo, spec.title, rule, rows));
}

/**
 * Returns a deterministic dirty-row expectation for row-level rules whose
 * source fixture is sufficient to calculate the offending rows. A null value
 * means the rule is intentionally outside the row-level oracle scope.
 */
export function expectedDirtyData(caseNo: number, ruleIndex: number): ExpectedDirtyData | null {
  const spec = EXPLICIT_RULE_CASE_SPECS.find((item) => item.caseNo === caseNo);
  if (!spec) throw new Error(`missing explicit v6411 rule spec for case ${caseNo}`);
  const rule = spec.rules.find((item) => item.index === ruleIndex);
  if (!rule) return null;
  const rows = filterRows(baseRowsForV6411Case({ caseNo, packageName: spec.packageName, title: spec.title }), rule.filter);
  const field = rule.fields?.[0];
  if (!field) return null;
  const expected = effectiveExpected(caseNo, rule);
  const fn = rule.functionName;
  if (fn === "字段取值校验") {
    return { rowIds: rows.filter((row) => {
      const value = fieldValue(row, field);
      return value === null || value === "";
    }).map((row) => row.id).filter((id): id is number => id !== null), reason: "字段取值校验要求 string_num 可转换且非空" };
  }
  if (fn === "数值-取值范围") {
    return { rowIds: rows.filter((row) => !rangeSatisfied(Number(fieldValue(row, field)), expected)).map((row) => row.id).filter((id): id is number => id !== null), reason: "数值转换后不满足取值范围的行" };
  }
  if (fn === "枚举值") {
    return { rowIds: rows.filter((row) => !enumSatisfied(fieldValue(row, field), expected)).map((row) => row.id).filter((id): id is number => id !== null), reason: "数值转换后不满足枚举值的行" };
  }
  if (fn === "取值范围&枚举范围") {
    return { rowIds: rows.filter((row) => {
      const value = Number(fieldValue(row, field));
      return !rangeSatisfied(value, expected) || !enumSatisfied(fieldValue(row, field), expected);
    }).map((row) => row.id).filter((id): id is number => id !== null), reason: "同时满足取值范围和枚举范围关系的行" };
  }
  return null;
}

function evaluateRule(caseNo: number, title: string, rule: V6411RuleSpec, rows: V6411BaseTableRow[]): ExpectedRuleOutcome {
  if (title.includes("全通过")) return fixed(caseNo, rule, "pass", "source case declares all rules pass");
  if (title.includes("全不通过")) return fixed(caseNo, rule, "unpass", "source case declares all rules unpass");
  const selected = filterRows(rows, rule.filter);
  const values = (rule.fields ?? []).flatMap((field) => selected.map((row) => fieldValue(row, field)));
  const fn = rule.functionName;
  if (fn === "表行数" || fn === "多表数据行数对比") return metric(caseNo, rule, selected.length, "table row count");
  if (fn === "空值数") return metric(caseNo, rule, values.filter((value) => value === null).length, "null count");
  if (fn === "空值率") return metric(caseNo, rule, percentage(values.filter((value) => value === null).length, values.length), "null rate");
  if (fn === "空串数") return metric(caseNo, rule, values.filter((value) => value === "").length, "empty string count");
  if (fn === "空串率") return metric(caseNo, rule, percentage(values.filter((value) => value === "").length, values.length), "empty string rate");
  if (fn === "重复数") return metric(caseNo, rule, values.length - new Set(values.map(String)).size, "duplicate count");
  if (fn === "字符串长度") {
    const lengths = values.filter((value) => value !== null).map((value) => String(value).length);
    return metric(caseNo, rule, lengths.length ? Math.min(...lengths) : 0, "minimum string length");
  }
  if (fn === "数值-枚举个数") return metric(caseNo, rule, new Set(values.map(String)).size, "numeric enum cardinality");
  if (fn === "字段取值校验") return metric(caseNo, rule, values.filter((value) => value !== null && value !== "").length, "validated value count");
  if (fn === "数据精度") return fixed(caseNo, rule, values.every((value) => decimalPlaces(value) <= 1) ? "pass" : "unpass", "decimal precision");
  if (fn === "数值-取值范围") return fixed(caseNo, rule, values.map(Number).every((value) => rangeSatisfied(value, effectiveExpected(caseNo, rule))) ? "pass" : "unpass", "numeric range");
  if (fn === "枚举值") return fixed(caseNo, rule, values.every((value) => enumSatisfied(value, effectiveExpected(caseNo, rule))) ? "pass" : "unpass", "enum membership");
  if (fn === "取值范围&枚举范围") return fixed(caseNo, rule, values.every((value) => rangeSatisfied(Number(value), effectiveExpected(caseNo, rule)) && enumSatisfied(value, effectiveExpected(caseNo, rule))) ? "pass" : "unpass", "range and enum membership");
  if (fn === "自定义规则测试") return fixed(caseNo, rule, selected.some((row) => row.id === 1) ? "pass" : "unpass", "custom SQL fixture id=1");
  if (fn === "多表数据一致性比对") return fixed(caseNo, rule, "pass", "主表与_cmp对比表的(id,name)数据一致");
  if (fn === "多表唯一性判断") return fixed(caseNo, rule, new Set(values.map(String)).size === values.length ? "pass" : "unpass", "comparison fixture uniqueness");
  if (fn.includes("周期性校验")) return fixed(caseNo, rule, monotonicDate(selected) ? "pass" : "unpass", "date sequence");
  if (fn.includes("及时性校验")) return fixed(caseNo, rule, "unpass", "源表时间关系按本批用例预期应校验不通过");
  if (fn === "数据变化趋势") return fixed(caseNo, rule, monotonicNumber(selected, rule.fields?.[0]) ? "pass" : "unpass", "trend");
  if (fn === "字段值计算对比") return fixed(caseNo, rule, selected.every((row) => Number(row.age) < Number(row.stringNum) * (Number(row.id) + Number(row.age))) ? "pass" : "unpass", "calculation comparison");
  if (fn === "异常值检测") return metric(caseNo, rule, iqrOutliers(values), "IQR outlier count");
  throw new Error(`unsupported v6411 rule oracle: case=${caseNo} rule=${rule.index} function=${fn}`);
}

function effectiveExpected(caseNo: number, rule: V6411RuleSpec): string {
  if (rule.expected) return rule.expected;
  if (rule.functionName === "取值范围&枚举范围") {
    // The archived CSV omits this display-only expectation for the donor
    // cases. Keep the oracle aligned with the rule values rendered by the UI.
    if ([13, 49].includes(caseNo)) return "取值范围>0且<5; 枚举值 in 1";
    if ([18, 21, 23, 54, 57, 59].includes(caseNo)) return "取值范围<=100; 枚举值 not in 0";
    return "取值范围<=100; 枚举值 in 1";
  }
  return "";
}

function fixed(caseNo: number, rule: V6411RuleSpec, outcome: RuleOutcome, reason: string): ExpectedRuleOutcome {
  return { caseNo, ruleIndex: rule.index, functionName: rule.functionName, fields: rule.fields ?? [], outcome, metric: outcome, reason };
}

function metric(caseNo: number, rule: V6411RuleSpec, value: number, reason: string): ExpectedRuleOutcome {
  return { caseNo, ruleIndex: rule.index, functionName: rule.functionName, fields: rule.fields ?? [], outcome: compareExpected(value, rule.expected ?? "") ? "pass" : "unpass", metric: value, reason };
}

function filterRows(rows: V6411BaseTableRow[], filter?: string): V6411BaseTableRow[] {
  if (!filter) return rows;
  return rows.filter((row) => filter.split(/\s+and\s+/i).every((clause) => {
    const match = clause.trim().match(/^(id|age)\s*(<=|>=|=|<|>)\s*(-?\d+(?:\.\d+)?)$/i);
    if (!match) return true;
    const actual = Number(fieldValue(row, match[1]));
    const expected = Number(match[3]);
    return match[2] === "<=" ? actual <= expected : match[2] === ">=" ? actual >= expected : match[2] === "=" ? actual === expected : match[2] === "<" ? actual < expected : actual > expected;
  }));
}

function fieldValue(row: V6411BaseTableRow, field: string): string | number | null {
  return ({ id: row.id, age: row.age, string_num: row.stringNum, name: row.name, address: row.address, money: row.money, buy_date: row.buyDateOffset, date_detail: row.dateDetail } as Record<string, string | number | null>)[field.trim()] ?? null;
}

function percentage(numerator: number, denominator: number): number {
  return denominator ? (numerator / denominator) * 100 : 0;
}

function compareExpected(metricValue: number, expected: string): boolean {
  const expression = expected.replace(/且/g, " and ").replace(/或/g, " or ");
  const clauses = expression.match(/(?:>=|<=|!=|=|>|<)\s*-?\d+(?:\.\d+)?/g) ?? [];
  if (!clauses.length) return true;
  const results = clauses.map((clause) => {
    const match = clause.match(/(>=|<=|!=|=|>|<)\s*(-?\d+(?:\.\d+)?)/);
    if (!match) return true;
    const target = Number(match[2]);
    return match[1] === ">=" ? metricValue >= target : match[1] === "<=" ? metricValue <= target : match[1] === "!=" ? metricValue !== target : match[1] === "=" ? metricValue === target : match[1] === ">" ? metricValue > target : metricValue < target;
  });
  return /\s+or\s+/i.test(expression) ? results.some(Boolean) : results.every(Boolean);
}

function rangeSatisfied(value: number, expected: string): boolean {
  const clauses = expected.match(/(?:>=|<=|>|<)\s*-?\d+(?:\.\d+)?/g) ?? [];
  return clauses.every((clause) => compareExpected(value, clause));
}

function enumSatisfied(value: string | number | null, expected: string): boolean {
  const options = (expected.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const actual = Number(value);
  return /not\s*in/i.test(expected) ? !options.includes(actual) : /\bin\b/i.test(expected) ? options.includes(actual) : true;
}

function monotonicDate(rows: V6411BaseTableRow[]): boolean {
  return rows.every((row, index) => index === 0 || row.buyDateOffset - rows[index - 1].buyDateOffset >= 1);
}

function monotonicNumber(rows: V6411BaseTableRow[], field?: string): boolean {
  const values = rows.map((row) => Number(fieldValue(row, field ?? "age")));
  return values.every((value, index) => index === 0 || value >= values[index - 1]);
}

function iqrOutliers(values: Array<string | number | null>): number {
  const numbers = values.map(Number).filter(Number.isFinite).sort((left, right) => left - right);
  if (numbers.length < 4) return 0;
  const q1 = numbers[Math.floor((numbers.length - 1) * 0.25)];
  const q3 = numbers[Math.floor((numbers.length - 1) * 0.75)];
  const iqr = q3 - q1;
  return numbers.filter((value) => value < q1 - 1.5 * iqr || value > q3 + 1.5 * iqr).length;
}

function decimalPlaces(value: string | number | null): number {
  return String(value ?? "").match(/\.(\d+)/)?.[1]?.length ?? 0;
}
