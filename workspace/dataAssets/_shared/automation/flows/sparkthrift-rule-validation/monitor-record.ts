import { expect, type Page } from "@playwright/test";

import { loadPlaywrightAutomationConfig } from "../../../../../../runtime/automation/config/playwright";
import { waitForUiSettled } from "../../../../../../runtime/automation/playwright";
import { expectDqSuccess, waitForDqJson } from "../../pages/data-quality/api";
import type {
  DqApiResponse,
  DqMonitorRecord,
  DqMonitorRecordPage,
  SparkThriftQualityRuleValidationScenario,
  SparkThriftRuleValidationFusionChecks,
} from "../../pages/data-quality/contracts";
import { closeVisibleDqOverlayIfAny } from "../../pages/data-quality/form-controls";
import {
  gotoMonitorRecordQueryPage,
  submitMonitorRecordSearch,
} from "../../pages/data-quality/monitor-record-page";
import { getProjectId, PROJECT_STORAGE_KEY } from "../../pages/data-quality/project-context";
import {
  expectMonitorRecordPage,
  formatMonitorRecordStatus,
} from "../../pages/data-quality/record-assertions";
import { buildDataAssetsApiUrl } from "../../runtime/env-setup";

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

function monitorRecordDetailEntry(
  targetRow: ReturnType<Page["locator"]>,
): ReturnType<Page["locator"]> {
  return targetRow
    .getByRole("button", { name: /查看详情|详情/ })
    .or(targetRow.getByText(/查看详情|详情/))
    .or(targetRow.locator("td").first().getByRole("button"))
    .or(targetRow.locator("td").first())
    .first();
}

async function waitForMonitorRecordStatus(
  page: Page,
  sourceRef: string,
  ruleName: string,
  expectedStatus: RegExp,
): Promise<{ target: DqMonitorRecord; statusLabel: string }> {
  const timeoutMs = loadPlaywrightAutomationConfig().monitorTimeoutMs;
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

export async function expectArchiveMonitorRecordTableSearch(
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
    records.some(
      (record) => record.ruleName === ruleName && record.tableName === scenario.tableName,
    ),
    `${sourceRef}: 按表名搜索应包含当前规则任务实例`,
  ).toBe(true);
  const targetRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: scenario.tableName })
    .filter({ hasText: ruleName })
    .first();
  await expect(targetRow, `${sourceRef}: 按表名搜索列表应展示当前规则任务实例`).toBeVisible({
    timeout: 30000,
  });
}

export async function expectArchiveRuleValidationRecord(
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
  const { statusLabel } = await waitForMonitorRecordStatus(
    page,
    sourceRef,
    ruleName,
    options.expectedStatus,
  );
  await submitMonitorRecordSearch(page);

  const detailResponse = waitForDqJson<DqMonitorRecordDetail[]>(
    page,
    "/dassets/v1/valid/monitorRecord/detailReport",
  );
  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 校验结果列表应展示 ${ruleName}`).toBeVisible({
    timeout: 30000,
  });
  await expect(targetRow, `${sourceRef}: 校验结果列表应展示状态 ${statusLabel}`).toContainText(
    statusLabel,
    {
      timeout: 30000,
    },
  );
  if (options.passHasNoDirtyDetail) {
    await expect(
      targetRow,
      `${sourceRef}: 校验通过实例列表不应展示不通过明细入口`,
    ).not.toContainText(/查看明细|下载明细|脏数据/, { timeout: 5000 });
  }
  const detailEntry = monitorRecordDetailEntry(targetRow);
  await detailEntry.click({ timeout: 30000 });
  const detailRecords = expectDqSuccess(
    await detailResponse,
    `${sourceRef}: 规则校验实例详情应请求成功`,
  );
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
    detailRecords.some((record) =>
      String(record.partition ?? "").includes(
        options.expectedPartition.replace(/^.*='?([^']+)'?.*$/, "$1"),
      ),
    ),
    `${sourceRef}: 实例详情应仅统计目标分区 ${options.expectedPartition}`,
  ).toBe(true);
  if (options.expectedSamplingRows) {
    expect(detailText, `${sourceRef}: 实例详情应展示抽样信息`).toMatch(
      /抽样|采样|sample|sampling/i,
    );
    expect(
      detailText,
      `${sourceRef}: 实例详情应包含抽样行数 ${options.expectedSamplingRows}`,
    ).toContain(options.expectedSamplingRows);
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
      const dirtyScope = page
        .locator(".ant-modal:visible,.ant-drawer:visible,[role='dialog']:visible,body")
        .last();
      for (const expectedText of options.dirtyEvidence) {
        await expect(dirtyScope, `${sourceRef}: 不通过明细应包含「${expectedText}」`).toContainText(
          expectedText,
          {
            timeout: 30000,
          },
        );
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
        await expect(dirtyScope, `${sourceRef}: 不通过明细应展示下载明细入口`).toContainText(
          /下载|下载明细/,
          {
            timeout: 30000,
          },
        );
      }
    } else {
      for (const expectedText of options.dirtyEvidence) {
        expect(detailText, `${sourceRef}: 不通过详情应包含「${expectedText}」`).toContain(
          expectedText,
        );
      }
    }
  }
  await closeVisibleDqOverlayIfAny(page, sourceRef);
  await closeVisibleDqOverlayIfAny(page, sourceRef);
}

export async function expectNoMonitorRecordForRuleTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const response = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRecord/pageQuery"),
    {
      data: {
        currentPage: 1,
        pageSize: 20,
        projectId: getProjectId(),
        bizTime: 0,
        fuzzyName: ruleName,
      },
      timeout: 60000,
    },
  );
  expect(response.ok(), `${sourceRef}: 查询 T+1 任务实例 HTTP 应成功`).toBe(true);
  const payload = (await response.json()) as DqApiResponse<DqMonitorRecordPage>;
  const pageData = expectDqSuccess(payload, `${sourceRef}: 查询 T+1 任务实例应请求成功`);
  const records = pageData.data ?? [];
  expect(
    records.some((record) => record.ruleName === ruleName),
    `${sourceRef}: T+1 任务保存后未到调度时间不应立即生成实例`,
  ).toBe(false);
}
