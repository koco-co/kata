// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L667,#L681,#L699,#L721,#L737,#L753,#L775,#L794,#L812,#L830,#L882,#L904
// intent: SR-INTENT-2099-01-MD-019
// probe: results/20260523-1810-mf-metadata-catalog-actions-01/playwright/ui-probe/probe.json
// page: inline shell assertions; metadata shell project bootstrap
// generated_at: 2026-05-23T18:10:00+08:00
// META: {"id":"MD-019","priority":"P1/P2/P3","title":"元数据数据目录、排序与订阅入口只读 Shell 可核验"}
// SourceRefs: SR-2099-01-MD-CATALOG-UI-L667, SR-2099-01-MD-CATALOG-CREATE-L681, SR-2099-01-MD-CATALOG-QUERY-L699, SR-2099-01-MD-CATALOG-EDIT-L721, SR-2099-01-MD-CATALOG-DELETE-L737, SR-2099-01-MD-CATALOG-MOVE-L753, SR-2099-01-MD-CATALOG-BATCH-MANUAL-L775, SR-2099-01-MD-CATALOG-BATCH-PUBLISH-L794, SR-2099-01-MD-CATALOG-WHOLE-DB-L812, SR-2099-01-MD-CATALOG-IMPORT-L830, SR-2099-01-MD-SUBSCRIBE-L882, SR-2099-01-MD-DATATABLE-PAGINATION-L904, SR-2099-01-MD-019, SR-UI-PROBE-20260523-MF-METADATA-CATALOG-ACTIONS-001, SR-SELF-RUN-20260523-MF-METADATA-CATALOG-ACTIONS-001
import { expect, type Locator, type Page, type Response } from "@playwright/test";

import { test } from "../../../../_shared/fixtures/step-screenshot";
import { gotoMetadataPage } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-shell-page";

test.setTimeout(120000);

test("【P1/P2/P3】元数据数据目录、排序与订阅入口只读 Shell 可核验", async ({
  page,
  step,
}) => {
  await step("步骤1: 进入数据地图二级页 → 数据目录树、筛选区和排序入口可见", async () => {
    await openDataMapSearchShell(page, "SR-2099-01-MD-019");
    await expectDataCatalogReadOnlyShell(page, "SR-2099-01-MD-019");
    await expectDataCatalogManagementEntries(
      page,
      "SR-2099-01-MD-CATALOG-UI-L667, SR-2099-01-MD-CATALOG-CREATE-L681, SR-2099-01-MD-CATALOG-EDIT-L721, SR-2099-01-MD-CATALOG-DELETE-L737, SR-2099-01-MD-CATALOG-MOVE-L753",
    );
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

  await step("步骤4: 打开批量指定目录与目录导入入口 → 弹窗字段和下载入口 Shell 可核验后取消", async () => {
    await expectBatchAssignDirectoryShell(
      page,
      "SR-2099-01-MD-CATALOG-BATCH-MANUAL-L775, SR-2099-01-MD-CATALOG-BATCH-PUBLISH-L794, SR-2099-01-MD-CATALOG-WHOLE-DB-L812",
    );
    await expectCatalogImportShell(page, "SR-2099-01-MD-CATALOG-IMPORT-L830");
  });

  await step("步骤5: 数据表订阅与分页入口 → 当前选中、订阅按钮、分页和 PageSize 可核验", async () => {
    await expectSubscriptionAndPaginationShell(
      page,
      "SR-2099-01-MD-SUBSCRIBE-L882, SR-2099-01-MD-DATATABLE-PAGINATION-L904",
    );
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

async function expectDataCatalogManagementEntries(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const label of ["数据目录", "批量指定目录", "数据资源目录导入", "添加目录"]) {
    await expect(body, `${sourceRef}: 数据目录区域应展示「${label}」入口`).toContainText(label, {
      timeout: 30000,
    });
  }

  const catalogAction = page.locator(".ant-tree-title, [role='treeitem']").filter({ hasText: "pw_test" }).first();
  await expect(catalogAction, `${sourceRef}: 稳定目录 pw_test 应可见用于查询/展开/收缩验证`).toBeVisible({
    timeout: 30000,
  });
  await catalogAction.click();
  await expect(body, `${sourceRef}: 点击目录后右侧结果区应保持可见`).toContainText(/查询结果类型|数据表|暂无数据/, {
    timeout: 30000,
  });
}

async function expectBatchAssignDirectoryShell(page: Page, sourceRef: string): Promise<void> {
  await clickButtonOrText(page, "批量指定目录", sourceRef);
  const modal = await expectVisibleModal(page, sourceRef, [
    "批量指定目录",
    "资源类型",
    "数据表",
    "选择资源",
    "手动配置",
    "批量发布",
    "整库发布",
    "数据源",
    "数据库",
    "发布目录",
    "取 消",
    "确 定",
  ]);
  await closeModal(modal, sourceRef);
}

async function expectCatalogImportShell(page: Page, sourceRef: string): Promise<void> {
  await clickButtonOrText(page, "数据资源目录导入", sourceRef);
  const modal = await expectVisibleModal(page, sourceRef, [
    "数据资源目录导入",
    "上传文件",
    "下载模板",
    "取 消",
    "确 定",
  ]);
  await closeModal(modal, sourceRef);
}

async function expectSubscriptionAndPaginationShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 底部当前选中计数应展示`).toContainText(/当前选中:\s*\d+/, {
    timeout: 30000,
  });
  for (const label of ["订阅", "取消订阅"]) {
    await expect(body, `${sourceRef}: 数据表列表应展示「${label}」入口`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(body, `${sourceRef}: 数据表列表分页应展示总数`).toContainText(/共\s*\d+\s*条数据/, {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 数据表列表 PageSize 应展示 10 条/页`).toContainText(/10\s*条\/页/, {
    timeout: 30000,
  });
  const pageSize = page.locator(".ant-pagination-options .ant-select").first();
  if (await pageSize.isVisible({ timeout: 5000 })) {
    await pageSize.click();
    const options = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content");
    await expect(options.first(), `${sourceRef}: PageSize 下拉应展开`).toBeVisible({ timeout: 10000 });
    const optionTexts = (await options.allInnerTexts()).map((text) => text.replace(/\s+/g, " ").trim());
    for (const expected of ["10 条/页", "20 条/页", "50 条/页", "100 条/页"]) {
      expect(optionTexts, `${sourceRef}: PageSize 应包含 ${expected}`).toContain(expected);
    }
    await page.keyboard.press("Escape");
  }
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

async function clickButtonOrText(page: Page, text: string, sourceRef: string): Promise<void> {
  const button = page.getByRole("button", { name: new RegExp(text) }).first();
  if (await button.isVisible({ timeout: 5000 })) {
    await button.click();
    return;
  }
  const textEntry = page.getByText(text, { exact: false }).first();
  await expect(textEntry, `${sourceRef}: 入口「${text}」应可见`).toBeVisible({ timeout: 15000 });
  await textEntry.click();
}

async function expectVisibleModal(page: Page, sourceRef: string, labels: readonly string[]): Promise<Locator> {
  const modal = page.locator(".ant-modal:visible, [role='dialog']:visible").first();
  await expect(modal, `${sourceRef}: 弹窗应可见`).toBeVisible({ timeout: 15000 });
  for (const label of labels) {
    await expect(modal, `${sourceRef}: 弹窗应展示「${label}」`).toContainText(label, { timeout: 10000 });
  }
  return modal;
}

async function closeModal(modal: Locator, sourceRef: string): Promise<void> {
  const cancel = modal.getByRole("button", { name: /取\s*消|取消/ }).first();
  if (await cancel.isVisible({ timeout: 5000 })) {
    await cancel.click();
  } else {
    await modal.locator(".ant-modal-close").first().click();
  }
  await expect(modal, `${sourceRef}: 取消或关闭后弹窗应关闭`).toBeHidden({ timeout: 10000 });
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
