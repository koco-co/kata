import { expect, type Page } from "@playwright/test";

import { buildDataAssetsApiUrl } from "../../runtime/env-setup";
import type {
  DqApiResponse,
  DqRuleBaseCustomSqlPage,
  DqRuleBaseCustomSqlRecord,
  DqRuleSetPageData,
  DqRuleSetRecord,
  DqRuleTaskPageQuery,
  DqRuleTaskRecord,
} from "./contracts";
import { getProjectId, PROJECT_STORAGE_KEY } from "./project-context";
import { getRuleSetPageRecordsAllowEmpty } from "./record-assertions";

export function waitForDqJson<T>(
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

export function expectDqSuccess<T>(payload: DqApiResponse<T>, message: string): T {
  expect(payload.success ?? payload.code === 1, message).toBe(true);
  expect(payload.data, `${message}: data 应存在`).toBeTruthy();
  return payload.data as T;
}

export async function deleteCustomSqlByNameBestEffort(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const records = await listCustomSqlRecords(page, sourceRef);
  for (const record of records.filter((item) => item.ruleName === ruleName)) {
    expect(
      Number(record.associationRuleCount),
      `${sourceRef}: 清理同名自定义 SQL 前不应存在引用规则`,
    ).toBe(0);
    await deleteCustomSqlById(page, sourceRef, record.id);
  }
}

export async function listCustomSqlRecords(
  page: Page,
  sourceRef: string,
): Promise<DqRuleBaseCustomSqlRecord[]> {
  const response = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleCustom/pageList"),
    {
      data: { current: 1, size: 100 },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    },
  );
  expect(response.ok(), `${sourceRef}: 查询自定义 SQL 模版列表 HTTP 应成功`).toBe(true);
  const payload = (await response.json()) as DqApiResponse<DqRuleBaseCustomSqlPage>;
  return (
    expectDqSuccess(payload, `${sourceRef}: 查询自定义 SQL 模版列表应请求成功`).contentList ?? []
  );
}

export async function deleteCustomSqlById(
  page: Page,
  sourceRef: string,
  ruleId: string | number | undefined,
): Promise<void> {
  expect(ruleId, `${sourceRef}: 删除自定义 SQL 模版应有 id`).toBeTruthy();
  const response = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleCustom/delete"),
    {
      data: { id: String(ruleId) },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    },
  );
  expect(response.ok(), `${sourceRef}: 删除自定义 SQL 模版 HTTP 应成功`).toBe(true);
  expectDqSuccess(
    (await response.json()) as DqApiResponse<boolean>,
    `${sourceRef}: 删除自定义 SQL 模版应请求成功`,
  );
}

export async function queryRuleSetRecords(
  page: Page,
  tableName: string,
): Promise<DqRuleSetRecord[]> {
  const response = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleSet/pageQuery"),
    {
      data: { current: 1, size: 100, tableName },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    },
  );
  expect(response.ok(), `查询规则集列表 HTTP 应成功`).toBe(true);
  const pageData = expectDqSuccess(
    (await response.json()) as DqApiResponse<DqRuleSetPageData>,
    `查询规则集列表应请求成功`,
  );
  return getRuleSetPageRecordsAllowEmpty(pageData, `查询规则集列表应返回分页结构`);
}

export function getDqRuleTaskRecords(payload: DqRuleTaskPageQuery): DqRuleTaskRecord[] {
  return (
    payload.data?.data ?? payload.data?.rows ?? payload.data?.list ?? payload.data?.records ?? []
  );
}

export function waitForRuleTaskPageQuery(page: Page): Promise<DqRuleTaskPageQuery> {
  return page
    .waitForResponse(
      (response) =>
        response.url().includes("/dassets/v1/valid/monitor/pageQuery") && response.status() === 200,
      { timeout: 60000 },
    )
    .then((response) => response.json() as Promise<DqRuleTaskPageQuery>);
}
