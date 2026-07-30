import { expect } from "@playwright/test";

import type {
  DqMonitorRecord,
  DqMonitorRecordPage,
  DqRuleSetPageData,
  DqRuleSetRecord,
} from "./contracts";

export function formatRuleBaseCustomRuleType(ruleType: unknown, sourceRef: string): string {
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

export function formatRuleBaseCustomRelationRange(
  relationRange: unknown,
  sourceRef: string,
): string {
  const labels = new Map<unknown, string>([
    [1, "多表"],
    [2, "单表"],
    [3, "字段"],
  ]);
  const label = labels.get(relationRange);
  expect(label, `${sourceRef}: 自定义规则关联范围编码应可映射`).toBeTruthy();
  return label as string;
}

export function getRuleSetPageRecordsAllowEmpty(
  pageData: DqRuleSetPageData,
  message: string,
): DqRuleSetRecord[] {
  const records = pageData.contentList ?? [];
  expect(Number(pageData.current), `${message}: current 应为数字`).toBeGreaterThan(0);
  expect(Number(pageData.size), `${message}: size 应为数字`).toBeGreaterThan(0);
  expect(Number(pageData.total), `${message}: total 应为数字`).not.toBeNaN();
  return records;
}

export function expectNonEmptyString(value: unknown, message: string): string {
  expect(typeof value, message).toBe("string");
  const text = value as string;
  expect(text.length, message).toBeGreaterThan(0);
  return text;
}

export function expectMonitorRecordPage(
  pageData: DqMonitorRecordPage,
  message: string,
): DqMonitorRecord[] {
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

export function formatMonitorRecordStatus(status: unknown, sourceRef: string): string {
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
