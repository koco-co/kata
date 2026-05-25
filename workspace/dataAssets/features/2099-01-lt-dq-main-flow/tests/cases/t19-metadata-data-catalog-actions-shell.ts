// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L681-L910
// intent: SR-INTENT-2099-01-MD-019
// probe: results/20260523-1810-mf-metadata-catalog-actions-01/playwright/ui-probe/probe.json
// page: inline shell assertions; metadata shell project bootstrap
// generated_at: 2026-05-23T18:10:00+08:00
// META: {"id":"MD-019","priority":"P1/P2/P3","title":"元数据数据目录、排序与订阅入口只读 Shell 可核验"}
// SourceRefs: SR-2099-01-MD-019, SR-UI-PROBE-20260523-MF-METADATA-CATALOG-ACTIONS-001, SR-SELF-RUN-20260523-MF-METADATA-CATALOG-ACTIONS-001
import { expect, type Page, type Response } from "@playwright/test";

import { test } from "../../../../_shared/fixtures/step-screenshot";
import { gotoMetadataPage } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-shell-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(120000);

test("【P1/P2/P3】元数据数据目录、排序与订阅入口只读 Shell 可核验", async ({
  page,
  step,
}) => {
  await step("步骤1: 进入数据地图二级页 → 数据目录树、筛选区和排序入口可见", async () => {
    await openDataMapSearchShell(page, "SR-2099-01-MD-019");
    await expectDataCatalogReadOnlyShell(page, "SR-2099-01-MD-019");
  });

  await step("步骤2: 输入稳定表名关键词 → 精确/模糊匹配结果与订阅入口可见", async () => {
    await searchTableKeyword(page, "test_table", "SR-2099-01-MD-019");
    await expectSearchResultAndSubscriptionEntries(page, "SR-2099-01-MD-019");
  });

  await step("步骤3: 输入大小写与特殊字符关键词 → 查询接口保持可用且目录 Shell 不消失", async () => {
    await searchTableKeyword(page, "TEST_TABLE", "SR-2099-01-MD-019");
    await expectDataCatalogReadOnlyShell(page, "SR-2099-01-MD-019");
    await searchTableKeyword(page, "!@#$%^&*", "SR-2099-01-MD-019");
    await expectEmptyResultShell(page, "SR-2099-01-MD-019");
  });
});

async function openDataMapSearchShell(page: Page, sourceRef: string): Promise<void> {
  const catalogResponsePromise = waitForResourceCatalogQuery(page);
  await gotoMetadataPage(page, "/metaDataSearch");
  const catalogResponse = await catalogResponsePromise;
  expect(catalogResponse.status(), `${sourceRef}: 数据目录初始查询接口应返回 200`).toBe(200);
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 数据地图二级页应完成渲染`).toContainText("数据地图", {
    timeout: 30000,
  });
  await expect(
    page.getByPlaceholder("请输入表名、表中文名、库名、数据源名").first(),
    `${sourceRef}: 数据表搜索框应展示真实 placeholder`,
  ).toBeVisible({ timeout: 30000 });
}

async function expectDataCatalogReadOnlyShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const label of [
    "查询结果类型",
    "数据表",
    "数据源类型",
    "数据源",
    "数据库",
    "负责人",
    "表标签",
    "数据目录",
    "搜索热度",
    "修改时间",
  ]) {
    await expect(body, `${sourceRef}: 数据地图二级页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expect(
    page.locator(".ant-tree-title, [role='treeitem']").filter({ hasText: "pw_test" }).first(),
    `${sourceRef}: 数据目录树应展示 ltqc-local 稳定目录 pw_test`,
  ).toBeVisible({ timeout: 30000 });
  await expect(body, `${sourceRef}: 底部应展示当前选中计数`).toContainText(/当前选中:\s*\d+/, {
    timeout: 30000,
  });
  await expect(
    page.getByRole("button", { name: /^订\s*阅$/ }).first(),
    `${sourceRef}: 底部订阅入口应可见但本用例不点击`,
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole("button", { name: /取消订阅/ }).first(),
    `${sourceRef}: 底部取消订阅入口应可见但本用例不点击`,
  ).toBeVisible({ timeout: 15000 });
}

async function searchTableKeyword(page: Page, keyword: string, sourceRef: string): Promise<QueryDetailBody> {
  const searchInput = page.getByPlaceholder("请输入表名、表中文名、库名、数据源名").first();
  await expect(searchInput, `${sourceRef}: 数据表搜索框应可输入关键词 ${keyword}`).toBeVisible({
    timeout: 30000,
  });

  const queryResponsePromise = waitForQueryDetail(page);
  await searchInput.fill(keyword);
  await searchInput.press("Enter");
  const queryResponse = await queryResponsePromise;
  expect(queryResponse.status(), `${sourceRef}: 数据地图查询接口应返回 200`).toBe(200);
  return (await queryResponse.json()) as QueryDetailBody;
}

async function expectSearchResultAndSubscriptionEntries(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const tableName of ["test_table", "test_table1", "test_table2"]) {
    await expect(body, `${sourceRef}: 稳定查询结果应展示 ${tableName}`).toContainText(tableName, {
      timeout: 30000,
    });
  }
  await expect(body, `${sourceRef}: 查询结果应展示资源资产类型`).toContainText("资产类型", {
    timeout: 30000,
  });
  await expect(
    page.getByRole("button", { name: /^订阅$/ }).first(),
    `${sourceRef}: 行级订阅入口应可见但本用例不点击`,
  ).toBeVisible({ timeout: 15000 });
}

async function expectEmptyResultShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 特殊字符搜索后应展示暂无数据`).toContainText("暂无数据", {
    timeout: 30000,
  });
  await expectDataCatalogReadOnlyShell(page, sourceRef);
}

function waitForQueryDetail(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/datamap/queryDetail") &&
      response.request().method() === "POST",
    { timeout: 45000 },
  );
}

function waitForResourceCatalogQuery(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/resourceCatalog/listCatalogByQuery") &&
      response.request().method() === "POST",
    { timeout: 45000 },
  );
}

interface QueryDetailBody {
  readonly data?: unknown[] | Record<string, unknown>;
}
