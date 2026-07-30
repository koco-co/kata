// Lindorm 数据资产适配用例的校验结果页面流程与断言。

import { buildDataAssetsApiUrl } from "../../../../../../../_shared/automation/runtime/env-setup";
import { existsSync, unlinkSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import {
  downloadDqArtifactWithSuggestedName,
  expectDownloadedArtifactContains,
  expectDqApiPaths,
  expectDqPage,
  selectDqDateRange,
} from "./page-context";
import {
  DqApiResponse,
  DqMonitorRecord,
  DqMonitorRecordPage,
  expectDqSuccess,
  expectMonitorRecordPage,
  expectNonEmptyString,
  getProjectId,
  gotoDataQualityPage,
  waitForDqJson,
} from "../../../../../../../_shared/automation/pages/data-quality/page-context";

type DqMonitorRecordCandidateOptions = {
  fuzzyName: string;
  status: number;
};

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

export async function expectDataQualityResultFilterContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
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
    await expect(body, `${sourceRef}: 校验结果查询列表应展示列「${header}」`).toContainText(
      header,
      {
        timeout: 30000,
      },
    );
  }

  await expectDqApiPaths(page, sourceRef, "/dq/taskQuery 筛选列表", [
    "/dassets/v1/valid/monitorRecord/pageQuery",
  ]);
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
  const ruleName = expectNonEmptyString(
    target.ruleName,
    `${sourceRef}: 校验失败实例应包含任务名称`,
  );
  await page.getByPlaceholder("请输入表名/任务名称搜索").fill(ruleName);
  await page.keyboard.press("Enter");
  const records = expectMonitorRecordPage(
    expectDqSuccess(await searchResponse, `${sourceRef}: 校验失败实例搜索应请求成功`),
    `${sourceRef}: 校验失败实例搜索应返回记录`,
  );
  const failedRecord = expectMonitorRecordById(records, target.id, sourceRef);
  expect(Number(failedRecord.status), `${sourceRef}: 目标实例应为校验失败`).toBe(4);
  const tableName = expectNonEmptyString(
    failedRecord.tableName,
    `${sourceRef}: 校验失败实例应包含表名`,
  );
  const row = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: ruleName })
    .filter({ hasText: tableName })
    .first();
  await expect(row, `${sourceRef}: 搜索后应展示校验失败实例`).toBeVisible({ timeout: 30000 });
  await expect(row, `${sourceRef}: 列表状态应展示校验失败`).toContainText("校验失败", {
    timeout: 30000,
  });

  await row.getByRole("button", { name: tableName }).click({ timeout: 30000 });
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 校验失败实例详情应打开`).toContainText("监控报告", {
    timeout: 30000,
  });

  const logEntry = body
    .getByRole("button", { name: /查看日志|日志/ })
    .or(body.getByText(/查看日志|日志/))
    .first();
  await expect(logEntry, `${sourceRef}: 校验失败实例应展示查看日志入口`).toBeVisible({
    timeout: 30000,
  });
  await logEntry.click({ timeout: 30000 });
  await expect(body, `${sourceRef}: 日志面板应展示失败原因`).toContainText(
    /日志|失败|error|exception/i,
    {
      timeout: 30000,
    },
  );
  const logText = await body.innerText();
  expect(logText, `${sourceRef}: 日志应包含执行时间或失败关键词`).toMatch(
    /失败|error|exception|执行|运行/i,
  );

  const downloadPath = await downloadDqArtifact(page, sourceRef, "failed-log", async () => {
    await body
      .getByRole("button", { name: /下载日志/ })
      .or(body.getByText("下载日志"))
      .first()
      .click({
        timeout: 30000,
      });
  });
  try {
    await expectDownloadedArtifactContains(downloadPath, [ruleName], sourceRef);
  } finally {
    if (existsSync(downloadPath)) unlinkSync(downloadPath);
  }
}

async function downloadDqArtifact(
  page: Page,
  sourceRef: string,
  suffix: string,
  trigger: () => Promise<void>,
): Promise<string> {
  return (await downloadDqArtifactWithSuggestedName(page, sourceRef, suffix, trigger)).path;
}

async function findMonitorRecordCandidate(
  page: Page,
  sourceRef: string,
  options: DqMonitorRecordCandidateOptions,
): Promise<DqMonitorRecord> {
  for (let currentPage = 1; currentPage <= 10; currentPage += 1) {
    const response = await page.request.post(
      buildDataAssetsApiUrl("/dassets/v1/valid/monitorRecord/pageQuery"),
      {
        data: {
          currentPage,
          pageSize: 20,
          projectId: getProjectId(),
          bizTime: 0,
          fuzzyName: options.fuzzyName,
        },
        timeout: 60000,
      },
    );
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
