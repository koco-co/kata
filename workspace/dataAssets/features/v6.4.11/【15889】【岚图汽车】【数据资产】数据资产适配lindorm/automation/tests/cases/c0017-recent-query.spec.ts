// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L928-L940,#L1014-L1033
// intent: SR-INTENT-2099-01-MD-017
// probe: live self-run against ltqc-local data map detail shell
// generated_at: 2026-05-23T17:05:00+08:00
// META: {"id":"MD-017","priority":"P3","title":"元数据数据表详情页 Shell 与表结构字段可核验"}
// SourceRefs: SR-2099-01-MD-017, SR-UI-PROBE-20260523-MF-METADATA-DETAIL-001, SR-SELF-RUN-20260523-MF-METADATA-DETAIL-001
import { expect, type Page } from "@playwright/test";

import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { gotoMetadataPage } from "../pages/metadata-shell-page";

test.setTimeout(120000);

test("【P3】元数据数据表详情页 Shell 与表结构字段可核验", async ({ page, step }) => {
  await step("步骤1: 搜索并打开稳定数据表 → 表详情页基础 Shell 可见", async () => {
    await openMetadataTableDetail(page, "test_table", "SR-2099-01-MD-017");
    await expectTableDetailShell(page, "SR-2099-01-MD-017");
  });

  await step("步骤2: 查看表结构字段模块 → 字段列表列名与搜索入口可见", async () => {
    await expectTableFieldsShell(page, "SR-2099-01-MD-017");
  });
});

async function openMetadataTableDetail(page: Page, keyword: string, sourceRef: string): Promise<void> {
  await gotoMetadataPage(page, "/metaDataSearch");

  const searchInput = page.getByPlaceholder("请输入表名、表中文名、库名、数据源名").first();
  await expect(searchInput, `${sourceRef}: 数据表二级页搜索框应可见`).toBeVisible({
    timeout: 30000,
  });

  const queryResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/datamap/queryDetail") &&
      response.request().method() === "POST",
    { timeout: 45000 },
  );
  await searchInput.fill(keyword);
  await searchInput.press("Enter");

  const queryResponse = await queryResponsePromise;
  expect(queryResponse.status(), `${sourceRef}: 数据地图查询接口应返回 200`).toBe(200);
  const queryBody = (await queryResponse.json()) as DataMapQueryResponse;
  const rows = readQueryRows(queryBody);
  expect(rows.length, `${sourceRef}: 查询 ${keyword} 应返回至少一条数据表记录`).toBeGreaterThan(0);
  const targetTableName = readTargetTableName(rows, keyword);
  expect(targetTableName, `${sourceRef}: 查询结果应包含表 ${keyword}`).toBe(keyword);

  const targetTable = page.locator(`:text-is("${targetTableName}")`).first();
  await expect(targetTable, `${sourceRef}: 查询结果中表 ${targetTableName} 应可见`).toBeVisible({
    timeout: 30000,
  });

  const detailResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/") &&
      response.status() === 200 &&
      /detail|metadata|table|asset|column/i.test(response.url()),
    { timeout: 45000 },
  );
  await targetTable.click();
  const detailResponse = await detailResponsePromise;
  expect(detailResponse.status(), `${sourceRef}: 打开详情时元数据详情相关接口应返回 200`).toBe(200);
}

async function expectTableDetailShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const label of [
    "表结构",
    "数据预览",
    "血缘关系",
    "任务依赖",
    "版本变更",
    "操作记录",
    "基本信息",
    "技术属性",
    "业务属性",
    "热度统计",
  ]) {
    await expect(body, `${sourceRef}: 表详情页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expect(
    page.getByRole("button", { name: /导\s*出/ }).first(),
    `${sourceRef}: 表详情页应展示导出按钮但本用例不点击`,
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole("button", { name: /订\s*阅/ }).first(),
    `${sourceRef}: 表详情页应展示订阅按钮但本用例不点击`,
  ).toBeVisible({ timeout: 15000 });
}

async function expectTableFieldsShell(page: Page, sourceRef: string): Promise<void> {
  await clickTab(page, "表结构", sourceRef);
  await clickTab(page, "字段", sourceRef);

  const body = page.locator("body");
  for (const label of [
    "字段名",
    "字段描述",
    "字段标签",
    "字段中文名",
    "数据类型",
  ]) {
    await expect(body, `${sourceRef}: 表结构字段模块应展示列「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  const fieldSearch = page
    .locator("input[placeholder*='字段'], input[placeholder*='搜索'], input[placeholder*='请输入']")
    .first();
  await expect(fieldSearch, `${sourceRef}: 表结构字段模块应展示字段搜索入口`).toBeVisible({
    timeout: 15000,
  });
  await expect(body, `${sourceRef}: 表结构字段模块应展示实际字段 id`).toContainText("id", {
    timeout: 30000,
  });
}

async function clickTab(page: Page, label: string, sourceRef: string): Promise<void> {
  const tab = page.getByRole("tab", { name: new RegExp(escapeRegExp(label)) }).first();
  if (await tab.isVisible({ timeout: 5000 })) {
    await tab.click();
    return;
  }
  const textTab = page.locator(".ant-tabs-tab, .ant-segmented-item, button").filter({ hasText: label }).first();
  if (await textTab.isVisible({ timeout: 5000 })) {
    await textTab.click();
    return;
  }
  const radioTab = page.getByText(label, { exact: true }).first();
  await expect(radioTab, `${sourceRef}: 应可切换到「${label}」`).toBeVisible({ timeout: 15000 });
  await radioTab.click();
}

function readQueryRows(response: DataMapQueryResponse): unknown[] {
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  for (const key of ["contentList", "list", "rows", "records", "content"]) {
    const value = data[key];
    if (Array.isArray(value)) return value;
  }
  const nestedData = data.data;
  if (Array.isArray(nestedData)) return nestedData;
  if (nestedData && typeof nestedData === "object") {
    const nestedRecord = nestedData as Record<string, unknown>;
    for (const key of ["contentList", "list", "rows", "records", "content"]) {
      const value = nestedRecord[key];
      if (Array.isArray(value)) return value;
    }
  }
  return [];
}

function readTargetTableName(rows: unknown[], keyword: string): string {
  const match = rows
    .map((row) => (row && typeof row === "object" ? (row as Record<string, unknown>).tableName : undefined))
    .find((tableName): tableName is string => tableName === keyword);
  return match ?? "";
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface DataMapQueryResponse {
  readonly data?: unknown[] | Record<string, unknown>;
}
