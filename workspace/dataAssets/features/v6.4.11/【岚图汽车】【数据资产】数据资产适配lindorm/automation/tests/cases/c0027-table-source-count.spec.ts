// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7226-L7290
// intent: SR-INTENT-2099-01-QUALITY-DATAMAP-SEARCH-027
// probe: results/20260523-mf-quality-datamap-search-01/playwright/ui-probe/probe.json
// generated_at: 2026-05-23T12:30:00Z
// META: {"id":"QUALITY-DATAMAP-027","priority":"P0","title":"数据地图标签/指标/字段结果页搜索 Shell 与 queryDetail 合同可核验"}
// SourceRefs: SR-INTENT-2099-01-QUALITY-DATAMAP-SEARCH-027, SR-UI-PROBE-20260523-MF-QUALITY-DATAMAP-SEARCH-001, SR-SELF-RUN-20260523-MF-QUALITY-DATAMAP-SEARCH-001
import { expect, type Page, type Response } from "@playwright/test";

import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { gotoMetadataPage } from "../pages/metadata-shell-page";

test.setTimeout(120000);

test("【P0】数据地图标签/指标/字段结果页搜索 Shell 与 queryDetail 合同可核验", async ({
  page,
  step,
}) => {
  await step("步骤1: 切换到智能标签结果页 → 业务口径搜索框和查询控件可见", async () => {
    await openDataMapSearch(page, "SR-2099-01-QUALITY-DATAMAP-027");
    await selectDataMapType(page, "智能标签", 7, "SR-2099-01-QUALITY-DATAMAP-027");
    await expectTagSearchShell(page, "SR-2099-01-QUALITY-DATAMAP-027");
  });

  await step("步骤2: 标签名称/业务口径关键词查询 → queryDetail 请求与响应合同可核验", async () => {
    await queryByKeyword(page, "请输入标签名称、业务口径", "高价值", 7, "SR-2099-01-QUALITY-DATAMAP-027");
    await queryByKeyword(
      page,
      "请输入标签名称、业务口径",
      "累计订单金额大于10万元",
      7,
      "SR-2099-01-QUALITY-DATAMAP-027",
    );
    await expectTagSearchShell(page, "SR-2099-01-QUALITY-DATAMAP-027");
  });

  await step("步骤3: 切换到指标结果页 → 业务口径搜索框和指标查询控件可见", async () => {
    await selectDataMapType(page, "指标", 10, "SR-2099-01-QUALITY-DATAMAP-027");
    await expectMetricSearchShell(page, "SR-2099-01-QUALITY-DATAMAP-027");
  });

  await step("步骤4: 指标名称/业务口径关键词查询 → queryDetail 请求与响应合同可核验", async () => {
    await queryByKeyword(page, "请输入指标名称、业务口径", "活跃", 10, "SR-2099-01-QUALITY-DATAMAP-027");
    await queryByKeyword(
      page,
      "请输入指标名称、业务口径",
      "近30天客户登录",
      10,
      "SR-2099-01-QUALITY-DATAMAP-027",
    );
    await expectMetricSearchShell(page, "SR-2099-01-QUALITY-DATAMAP-027");
  });

  await step("步骤5: 切换到字段结果页 → 模糊匹配开关、目录树和字段查询控件可见", async () => {
    await selectDataMapType(page, "字段", 2, "SR-2099-01-QUALITY-DATAMAP-027");
    await expectFieldSearchShell(page, "SR-2099-01-QUALITY-DATAMAP-027");
    await enableFuzzyMatch(page, "SR-2099-01-QUALITY-DATAMAP-027");
  });

  await step("步骤6: 字段关键词查询 → 模糊匹配 payload 与字段结果 Shell 可核验", async () => {
    await queryByKeyword(
      page,
      "请输入字段名、字段中文名、表名、库名、数据源名",
      "score",
      2,
      "SR-2099-01-QUALITY-DATAMAP-027",
      1,
    );
    const body = page.locator("body");
    await expect(body, "SR-2099-01-QUALITY-DATAMAP-027: 字段关键词查询后应展示 live 字段 score").toContainText(
      "score",
      { timeout: 30000 },
    );
    await expectFieldSearchShell(page, "SR-2099-01-QUALITY-DATAMAP-027");
  });
});

async function openDataMapSearch(page: Page, sourceRef: string): Promise<void> {
  const queryPromise = waitForQueryDetail(page);
  const catalogPromise = waitForCatalogQuery(page);
  await gotoMetadataPage(page, "/metaDataSearch");
  const [queryResponse, catalogResponse] = await Promise.all([queryPromise, catalogPromise]);
  expect(queryResponse.status(), `${sourceRef}: 数据地图初始 queryDetail 应返回 200`).toBe(200);
  expect(catalogResponse.status(), `${sourceRef}: 数据目录接口应返回 200`).toBe(200);
  await expect(page.locator("body"), `${sourceRef}: 数据地图二级页应完成渲染`).toContainText("数据地图", {
    timeout: 30000,
  });
  await expectCatalogTree(page, sourceRef);
}

async function selectDataMapType(
  page: Page,
  label: "智能标签" | "指标" | "字段",
  expectedMetaType: number,
  sourceRef: string,
): Promise<void> {
  const searchTypeSelect = page.locator(".ant-select-selector").first();
  await expect(searchTypeSelect, `${sourceRef}: 数据地图顶部搜索类型下拉应可见`).toBeVisible({
    timeout: 30000,
  });
  await searchTypeSelect.click();
  const dropdown = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)").last();
  await expect(dropdown, `${sourceRef}: 搜索类型下拉应展开`).toBeVisible({ timeout: 15000 });
  await expect(
    dropdown.locator(".ant-select-item-option-content").filter({ hasText: label }).first(),
    `${sourceRef}: 搜索类型下拉应包含 ${label}`,
  ).toBeVisible({ timeout: 15000 });

  const responsePromise = waitForQueryDetail(page);
  await dropdown.locator(".ant-select-item-option-content").filter({ hasText: label }).first().click();
  const response = await responsePromise;
  expect(response.status(), `${sourceRef}: 切换 ${label} 后 queryDetail 应返回 200`).toBe(200);
  expectQueryRequest(response, "", expectedMetaType, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 切换后页面应展示 ${label}`).toContainText(label, {
    timeout: 30000,
  });
}

async function expectTagSearchShell(page: Page, sourceRef: string): Promise<void> {
  await expectPlaceholder(page, "请输入标签名称、业务口径", sourceRef);
  const body = page.locator("body");
  for (const label of ["智能标签", "标签类型", "标签", "发布人", "实体", "数据目录", "搜索热度", "修改时间"]) {
    await expect(body, `${sourceRef}: 标签结果页应展示查询控件「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expectCatalogTree(page, sourceRef);
}

async function expectMetricSearchShell(page: Page, sourceRef: string): Promise<void> {
  await expectPlaceholder(page, "请输入指标名称、业务口径", sourceRef);
  const body = page.locator("body");
  for (const label of ["指标", "指标类型", "标签", "发布人", "数据目录", "搜索热度", "修改时间"]) {
    await expect(body, `${sourceRef}: 指标结果页应展示查询控件「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expectCatalogTree(page, sourceRef);
}

async function expectFieldSearchShell(page: Page, sourceRef: string): Promise<void> {
  await expectPlaceholder(page, "请输入字段名、字段中文名、表名、库名、数据源名", sourceRef);
  const body = page.locator("body");
  for (const label of ["字段", "是否开启模糊匹配", "数据源类型", "数据源", "数据库", "负责人", "字段标签", "数据目录"]) {
    await expect(body, `${sourceRef}: 字段结果页应展示查询控件「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expectCatalogTree(page, sourceRef);
}

async function enableFuzzyMatch(page: Page, sourceRef: string): Promise<void> {
  const fuzzySwitch = page.locator(".ant-switch").first();
  await expect(fuzzySwitch, `${sourceRef}: 字段页模糊匹配开关应可见`).toBeVisible({
    timeout: 30000,
  });
  await expect(fuzzySwitch, `${sourceRef}: 模糊匹配开关初始应关闭`).toHaveAttribute("aria-checked", "false", {
    timeout: 15000,
  });
  await fuzzySwitch.click();
  await expect(fuzzySwitch, `${sourceRef}: 模糊匹配开关点击后应开启`).toHaveAttribute("aria-checked", "true", {
    timeout: 15000,
  });
}

async function queryByKeyword(
  page: Page,
  placeholder: string,
  keyword: string,
  expectedMetaType: number,
  sourceRef: string,
  expectedMatchMode?: number,
): Promise<QueryDetailData> {
  const input = page.getByPlaceholder(placeholder).first();
  await expect(input, `${sourceRef}: 搜索框「${placeholder}」应可输入 ${keyword}`).toBeVisible({
    timeout: 30000,
  });
  const responsePromise = waitForQueryDetail(page);
  await input.fill(keyword);
  await input.press("Enter");
  const response = await responsePromise;
  expect(response.status(), `${sourceRef}: 关键词「${keyword}」queryDetail 应返回 200`).toBe(200);
  expectQueryRequest(response, keyword, expectedMetaType, sourceRef, expectedMatchMode);
  const data = await expectQueryResponse(response, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 查询后数据地图 Shell 应保持可见`).toContainText("数据地图", {
    timeout: 30000,
  });
  return data;
}

async function expectPlaceholder(page: Page, placeholder: string, sourceRef: string): Promise<void> {
  await expect(
    page.getByPlaceholder(placeholder).first(),
    `${sourceRef}: 搜索框 placeholder 应为「${placeholder}」`,
  ).toBeVisible({ timeout: 30000 });
}

async function expectCatalogTree(page: Page, sourceRef: string): Promise<void> {
  await expect(
    page.locator(".ant-tree-title, [role='treeitem']").filter({ hasText: "pw_test" }).first(),
    `${sourceRef}: 数据目录树应展示当前项目目录 pw_test`,
  ).toBeVisible({ timeout: 30000 });
}

function waitForQueryDetail(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/datamap/queryDetail") &&
      response.request().method() === "POST",
    { timeout: 45000 },
  );
}

function waitForCatalogQuery(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/resourceCatalog/listCatalogByQuery") &&
      response.request().method() === "POST",
    { timeout: 45000 },
  );
}

function expectQueryRequest(
  response: Response,
  keyword: string,
  expectedMetaType: number,
  sourceRef: string,
  expectedMatchMode?: number,
): void {
  const postData = response.request().postData() ?? "";
  const payload = JSON.parse(postData) as Record<string, unknown>;
  expect(payload.metaType, `${sourceRef}: queryDetail payload 应使用 metaType=${expectedMetaType}`).toBe(
    expectedMetaType,
  );
  if (keyword) {
    expect(postData, `${sourceRef}: queryDetail payload 应包含关键词「${keyword}」`).toContain(keyword);
  }
  if (expectedMatchMode !== undefined) {
    expect(payload.matchMode, `${sourceRef}: 字段模糊匹配开启后 payload 应携带 matchMode=${expectedMatchMode}`).toBe(
      expectedMatchMode,
    );
  }
}

async function expectQueryResponse(response: Response, sourceRef: string): Promise<QueryDetailData> {
  const json = (await response.json()) as QueryDetailResponse;
  expect(json.data, `${sourceRef}: queryDetail 响应应包含 data 对象`).toBeTruthy();
  const data = json.data;
  expect(Array.isArray(data.contentList), `${sourceRef}: queryDetail.data.contentList 应为数组`).toBe(true);
  expect(Number.isFinite(Number(data.current)), `${sourceRef}: queryDetail.data.current 应可解析为数字`).toBe(true);
  expect(Number.isFinite(Number(data.size)), `${sourceRef}: queryDetail.data.size 应可解析为数字`).toBe(true);
  expect(Number.isFinite(Number(data.total)), `${sourceRef}: queryDetail.data.total 应可解析为数字`).toBe(true);
  return data;
}

interface QueryDetailResponse {
  readonly data: QueryDetailData;
}

interface QueryDetailData {
  readonly contentList: unknown[];
  readonly current: string | number;
  readonly size: string | number;
  readonly total: string | number;
}
