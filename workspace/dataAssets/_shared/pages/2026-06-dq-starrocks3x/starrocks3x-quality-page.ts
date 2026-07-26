import { waitForUiSettled } from "../../helpers/index";
import { expect, type Page } from "@playwright/test";

import { buildDataAssetsApiUrl, buildDataAssetsUrl, getEnvConfig } from "../../helpers/test-setup";

const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";
const DQ_PROJECT_STORAGE_KEY = "dq_project_id";
const initializedPages = new WeakSet<Page>();

export type DqApiResponse<T> = {
  code?: number;
  message?: string | null;
  data?: T;
  success?: boolean;
};

export type StarRocksMonitorSource = {
  id?: string | number;
  dtCenterSourceId?: string | number;
  dataSourceName?: string;
  dtCenterSourceName?: string;
  dataSourceType?: number;
  sourceTypeValue?: string;
  linkStatus?: number;
  syncStatus?: number;
  isValid?: number;
  projectId?: string | number;
};

export type DataSourceTypeOption = {
  value?: number;
  text?: string;
};

export type MonitorPageRecord = {
  ruleName?: string;
  tableName?: string;
  sourceTypeName?: string;
};

export type MonitorPageData = {
  data?: MonitorPageRecord[];
  total?: number;
  totalCount?: number;
  count?: number;
};

function envProfile() {
  return getEnvConfig();
}

/** 当前质量项目 id（取自 env profile，随环境切换；勿硬编码）。 */
export function projectId(): number {
  return envProfile().projects.quality.id;
}

function projectName(): string {
  return envProfile().projects.quality.name;
}

async function ensureProjectInit(page: Page): Promise<void> {
  if (initializedPages.has(page)) return;
  await page.addInitScript(
    ([assetKey, dqKey, id]) => {
      sessionStorage.setItem(assetKey, id);
      sessionStorage.setItem(dqKey, id);
      localStorage.setItem("currentProject", id);
    },
    [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(projectId())],
  );
  initializedPages.add(page);
}

async function injectProjectContext(page: Page): Promise<void> {
  await page.evaluate(
    ([assetKey, dqKey, id]) => {
      sessionStorage.setItem(assetKey, id);
      sessionStorage.setItem(dqKey, id);
      localStorage.setItem("currentProject", id);
    },
    [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(projectId())],
  );
}

export async function gotoZszqDataAssetsPage(page: Page, path: string): Promise<void> {
  await ensureProjectInit(page);
  await page.goto(buildDataAssetsUrl(path, projectId()), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await injectProjectContext(page);
  expect(page.url(), `应保持在 DataAssets ${path} 路由`).toContain(`#${path}`);
  await expect(page.locator("body"), `项目选择器应显示 ${projectName()}`).toContainText(projectName(), {
    timeout: 30000,
  });
}

export async function postDataAssetsApi<T>(
  page: Page,
  path: string,
  data: Record<string, unknown> = {},
): Promise<DqApiResponse<T>> {
  const response = await page.request.post(buildDataAssetsApiUrl(path), {
    data,
    headers: {
      "Accept-Language": "zh-CN",
      "X-Valid-Project-ID": String(projectId()),
    },
  });
  expect(response.ok(), `${path} HTTP 状态应成功`).toBe(true);
  return (await response.json()) as DqApiResponse<T>;
}

export function expectDqApiSuccess<T>(payload: DqApiResponse<T>, sourceRef: string): T {
  expect(Boolean(payload.success ?? payload.code === 1), `${sourceRef}: API 应返回成功状态`).toBe(true);
  return payload.data as T;
}

export async function fetchStarRocksMonitorSources(page: Page): Promise<StarRocksMonitorSource[]> {
  const payload = await postDataAssetsApi<StarRocksMonitorSource[]>(
    page,
    "/dmetadata/v1/dataSource/monitor/list",
    { excludeType: [17, 37] },
  );
  return expectDqApiSuccess(payload, "SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ: monitor/list");
}

export function expectStarRocksMonitorSource(
  records: readonly StarRocksMonitorSource[],
  expected: {
    dataSourceName: string;
    sourceTypeValue: string;
    dataSourceType: number;
    assetsId: number;
    centerSourceId: number;
  },
): StarRocksMonitorSource {
  const record = records.find(
    (item) =>
      item.dataSourceName === expected.dataSourceName &&
      item.sourceTypeValue === expected.sourceTypeValue,
  );
  expect(record, `monitor/list 应返回 ${expected.dataSourceName}（${expected.sourceTypeValue}）`).toBeTruthy();
  expect(Number(record?.id), "数据资产侧数据源 ID 应匹配").toBe(expected.assetsId);
  expect(Number(record?.dtCenterSourceId), "中心数据源 ID 应匹配").toBe(expected.centerSourceId);
  expect(Number(record?.dataSourceType), "数据源类型编码应匹配 STAR_ROCKS_3.x").toBe(expected.dataSourceType);
  expect(Number(record?.projectId), "数据源授权项目应匹配当前质量项目").toBe(projectId());
  expect(record?.linkStatus, "数据源连接状态应为正常").toBe(1);
  expect(record?.isValid, "数据源应已授权给数据质量").toBe(1);
  return record as StarRocksMonitorSource;
}

export async function fetchDataSourceTypeOptions(page: Page): Promise<DataSourceTypeOption[]> {
  const payload = await postDataAssetsApi<DataSourceTypeOption[]>(
    page,
    "/dassets/v1/dataSource/getTableRowsDataSourceType",
    { projectId: projectId() },
  );
  return expectDqApiSuccess(payload, "SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ: getTableRowsDataSourceType");
}

export async function fetchRuleCollection(page: Page): Promise<unknown[]> {
  const payload = await postDataAssetsApi<unknown[]>(
    page,
    "/dassets/v1/valid/dataQuality/pageRuleCollection",
    { currentPage: 1, pageSize: 10, projectId: projectId() },
  );
  return expectDqApiSuccess(payload, "SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ: pageRuleCollection");
}

export async function fetchMonitorRecords(page: Page): Promise<MonitorPageData> {
  const payload = await postDataAssetsApi<MonitorPageData>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    { currentPage: 1, pageSize: 10, projectId: projectId() },
  );
  return expectDqApiSuccess(payload, "SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ: monitorRecord/pageQuery");
}

export async function expectRuleConfigShell(page: Page): Promise<void> {
  await gotoZszqDataAssetsPage(page, "/dq/rule");
  const body = page.locator("body");
  for (const label of ["规则配置", "规则集", "新建规则集", "规则", "最近修改人", "新建监控规则"]) {
    await expect(body, `规则配置页应展示「${label}」`).toContainText(label, { timeout: 30000 });
  }
  for (const header of ["表", "规则名称", "类型", "数据源", "执行周期", "是否关联任务", "操作"]) {
    await expect(body, `规则配置表格应展示列「${header}」`).toContainText(header, { timeout: 30000 });
  }
}

export async function expectPlatformDataSourceShell(page: Page): Promise<void> {
  await gotoZszqDataAssetsPage(page, "/dataSourceManage");
  const body = page.locator("body");
  for (const label of ["平台管理", "数据源管理", "引入数据源", "质量项目授权"]) {
    await expect(body, `平台数据源管理页应展示「${label}」`).toContainText(label, { timeout: 30000 });
  }
  for (const header of ["数据源名称", "数据源类型", "连接信息", "数据源状态", "支持模块", "操作"]) {
    await expect(body, `数据源管理表格应展示列「${header}」`).toContainText(header, { timeout: 30000 });
  }
}

export async function expectTaskQueryShell(page: Page): Promise<void> {
  await gotoZszqDataAssetsPage(page, "/dq/taskQuery");
  const body = page.locator("body");
  for (const label of ["任务查询", "最近修改人", "我收藏的表"]) {
    await expect(body, `任务查询页应展示「${label}」`).toContainText(label, { timeout: 30000 });
  }
  for (const header of ["表", "任务名称", "状态", "类型", "数据源", "执行周期", "是否关联任务"]) {
    await expect(body, `任务查询表格应展示列「${header}」`).toContainText(header, { timeout: 30000 });
  }
}

export async function openSingleTableRuleWizard(page: Page): Promise<void> {
  await gotoZszqDataAssetsPage(page, "/dq/rule/add");
  const body = page.locator("body");
  for (const label of ["配置规则", "新建单表校验规则", "监控对象", "规则名称", "选择数据源", "选择数据表", "数据预览", "下一步"]) {
    await expect(body, `新建单表校验规则页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
}

function dataSourceFormItem(page: Page) {
  return page
    .locator(".ant-form-item:visible")
    .filter({ has: page.locator("label", { hasText: "选择数据源" }) })
    .first();
}

function tableFormItem(page: Page) {
  return page
    .locator(".ant-form-item:visible")
    .filter({ has: page.locator("label", { hasText: "选择数据表" }) })
    .last();
}

export async function expectDatasourceDropdownContainsStarRocks(
  page: Page,
  expectedDisplayText: string,
): Promise<string[]> {
  const formItem = dataSourceFormItem(page);
  await expect(formItem, "应展示选择数据源表单项").toBeVisible({ timeout: 30000 });
  await formItem.locator(".ant-select-selector").click({ timeout: 30000 });
  const target = page
    .locator(".ant-select-dropdown:visible .ant-select-item-option-content")
    .filter({ hasText: expectedDisplayText })
    .first();
  await expect(target, `数据源下拉应包含 ${expectedDisplayText}`).toBeVisible({ timeout: 30000 });
  return page
    .locator(".ant-select-dropdown:visible .ant-select-item-option-content")
    .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean));
}

export async function selectStarRocksDatasource(
  page: Page,
  expectedDisplayText: string,
): Promise<void> {
  const formItem = dataSourceFormItem(page);
  await formItem.locator(".ant-select-selector").click({ timeout: 30000 });
  // 输入关键字过滤选数据源（项目下数据源多时下拉不全量渲染，必须搜索而非翻列表）。
  // 关键字取显示名「（」前缀（如 "pw_sr3（STAR_ROCKS_3X）" → "pw_sr3"）。
  const keyword = expectedDisplayText.split(/[（(]/)[0].trim();
  await formItem
    .locator("input.ant-select-selection-search-input")
    .first()
    .fill(keyword)
    .catch(() => {});
  await waitForUiSettled(page);
  const target = page
    .locator(".ant-select-dropdown:visible .ant-select-item-option-content")
    .filter({ hasText: expectedDisplayText })
    .first();
  await expect(target, `应可选择 ${expectedDisplayText}`).toBeVisible({ timeout: 30000 });
  await target.click();
  await expect(target, "数据源下拉选项被选择后应关闭").not.toBeVisible({ timeout: 30000 });
  await expect(formItem, `选择后应回显 ${expectedDisplayText}`).toContainText(expectedDisplayText, {
    timeout: 30000,
  });
  await expect(tableFormItem(page), "选择数据源后应展示或启用选择数据表").toBeVisible({
    timeout: 30000,
  });
}

export async function expectLoadedTableOptions(
  page: Page,
  expectedTables: readonly string[],
): Promise<string[]> {
  const formItem = tableFormItem(page);
  await formItem.locator(".ant-select-selector").click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible");
  await expect(
    dropdown.locator(".ant-select-item-option-content").first(),
    "选择数据表下拉应加载至少一个 StarRocks 表",
  ).toBeVisible({ timeout: 30000 });
  // 注意：执行质量规则会让 DQ 引擎在 schema 里生成 dq_monitor_*/temp_data_* 临时表，挤占下拉首屏；
  // 故逐个在搜索框过滤目标表名来稳健校验其可加载，而非断言首屏未过滤的列表内容。
  const search = formItem.locator("input.ant-select-selection-search-input").first();
  for (const t of expectedTables) {
    await search.fill(t);
    await waitForUiSettled(page);
    await expect(
      dropdown.locator(".ant-select-item-option-content", { hasText: t }).first(),
      `选择数据表下拉应能搜索到本需求 StarRocks 表 ${t}`,
    ).toBeVisible({ timeout: 30000 });
  }
  await search.fill("");
  return [...expectedTables];
}
