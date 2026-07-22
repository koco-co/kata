import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, type Locator, type Page } from "@playwright/test";
import { getEnvConfig } from "../../../../../../_shared/helpers";

type InventoryArea = "rule-set" | "rule-task" | "task-query";
type UiResultStatus = "validation-pass" | "validation-unpass" | "run-failed" | "running" | "unknown";

type InventoryStatusRecord = {
  caseNo: number | null;
  datasourceName: string | null;
  tableName: string | null;
  classification: UiResultStatus;
  statusText: string;
  rowText: string;
  tooltipTexts: string[];
};

type InventoryRecord = {
  generatedAt: string;
  area: InventoryArea;
  route: string;
  query: string;
  totalText: string;
  totalCount: number | null;
  rows: string[];
  caseNos: number[];
  duplicateCaseNos: number[];
  missingCaseNos: number[];
  statusCounts?: Record<UiResultStatus, number>;
  statusRecords?: InventoryStatusRecord[];
};

const FEATURE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT_DIR = path.resolve(
  process.env.V6411_UI_INVENTORY_OUT_DIR ?? defaultRunSubdir("ui-inventory", "runs/20260705-v6411-ui-inventory"),
);
const RESULT_JSON = path.join(OUT_DIR, "ui-inventory-results.json");
const ENV = getEnvConfig();
const BASE_URL = ENV.urls.baseUrl;
const PROJECT_ID = String(ENV.projects.quality.id);
const PROJECT_NAME = ENV.projects.quality.name;
const QUERY = process.env.V6411_UI_INVENTORY_QUERY ?? "test_info_1_";
const CASE_FILTER = parseCaseFilter(process.env.V6411_UI_INVENTORY_CASES ?? process.env.V6411_UI_REBUILD_CASES ?? "1-72");

function defaultRunSubdir(subdir: string, fallbackRelativePath: string): string {
  if (process.env.KATA_ALLURE_RESULTS_DIR) {
    return path.join(path.dirname(path.resolve(process.env.KATA_ALLURE_RESULTS_DIR)), subdir);
  }
  return path.join(FEATURE_DIR, fallbackRelativePath);
}

test.setTimeout(Number(process.env.V6411_UI_INVENTORY_TIMEOUT_MS ?? 10 * 60 * 1000));

test("盘点 v6411 当前 UI 业务记录", async ({ page }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const records: InventoryRecord[] = [];

  records.push(await inventoryArea(page, "rule-set", "/dq/ruleSet", /规则集管理/, QUERY));
  records.push(await inventoryArea(page, "rule-task", "/dq/rule", /规则任务管理/, QUERY));
  records.push(await inventoryArea(page, "task-query", "/dq/taskQuery", /校验结果查询/, QUERY));

  fs.writeFileSync(RESULT_JSON, JSON.stringify(records, null, 2));
  await test.info().attach("ui-inventory-results.json", {
    body: JSON.stringify(records, null, 2),
    contentType: "application/json",
  });
});

async function inventoryArea(
  page: Page,
  area: InventoryArea,
  route: string,
  heading: RegExp,
  query: string,
): Promise<InventoryRecord> {
  await gotoDataQualityPage(page, route);
  await expect(page.locator("body"), `${area}: 页面应打开`).toContainText(heading, { timeout: 30_000 });
  await searchByTableOrTask(page, area, query);
  await expect(page.locator(".ant-spin-spinning"), `${area}: 加载遮罩应消失`).toHaveCount(0, { timeout: 60_000 });
  await page.waitForTimeout(1_000);

  const totalText = await page
    .locator(".ant-pagination-total-text:visible")
    .last()
    .innerText({ timeout: 3_000 })
    .catch(() => "");
  const totalCount = parseTotalCount(totalText);
  const collected =
    area === "task-query"
      ? await collectTaskQueryRowsAcrossPages(page, totalCount)
      : { rows: await collectRowsAcrossPages(page, totalCount), statusRecords: undefined };
  const rows = collected.rows;
  const caseNos = rows
    .map(extractCaseNo)
    .filter((caseNo): caseNo is number => caseNo !== null && CASE_FILTER.has(caseNo));
  const duplicateCaseNos = findDuplicateCaseNos(caseNos);
  const missingCaseNos = findMissingCaseNos(caseNos, CASE_FILTER);
  const statusRecords = area === "task-query" ? collected.statusRecords : undefined;
  const statusCounts = statusRecords ? summarizeStatusRecords(statusRecords) : undefined;
  const record: InventoryRecord = {
    generatedAt: new Date().toISOString(),
    area,
    route,
    query,
    totalText,
    totalCount,
    rows,
    caseNos,
    duplicateCaseNos,
    missingCaseNos,
    statusCounts,
    statusRecords,
  };
  console.log(`[v6411-inventory] ${JSON.stringify(record)}`);
  await test.info().attach(`${area}-inventory.json`, {
    body: JSON.stringify(record, null, 2),
    contentType: "application/json",
  });
  await test.info().attach(`${area}-inventory.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  return record;
}

async function collectRowsAcrossPages(page: Page, totalCount: number | null): Promise<string[]> {
  const expectedPages = totalCount ? Math.ceil(totalCount / 20) : 1;
  const rows: string[] = [];
  for (let pageIndex = 1; pageIndex <= Math.max(1, expectedPages); pageIndex += 1) {
    rows.push(...(await visibleTableRows(page)));
    if (pageIndex >= expectedPages) break;
    const next = page.locator(".ant-pagination-next:visible").last();
    const className = await next.getAttribute("class").catch(() => "");
    if (className?.includes("ant-pagination-disabled")) break;
    await next.click({ timeout: 30_000 });
    await expect(page.locator(".ant-spin-spinning"), "翻页后加载遮罩应消失").toHaveCount(0, { timeout: 60_000 });
    await page.waitForTimeout(500);
  }
  return rows;
}

async function collectTaskQueryRowsAcrossPages(
  page: Page,
  totalCount: number | null,
): Promise<{ rows: string[]; statusRecords: InventoryStatusRecord[] }> {
  const expectedPages = totalCount ? Math.ceil(totalCount / 20) : 1;
  const rows: string[] = [];
  const statusRecords: InventoryStatusRecord[] = [];
  for (let pageIndex = 1; pageIndex <= Math.max(1, expectedPages); pageIndex += 1) {
    const pageRows = await collectTaskQueryVisibleRows(page);
    rows.push(...pageRows.map((item) => item.rowText));
    statusRecords.push(...pageRows.map((item) => parseStatusRecord(item.rowText, item.tooltipTexts)));
    if (pageIndex >= expectedPages) break;
    const next = page.locator(".ant-pagination-next:visible").last();
    const className = await next.getAttribute("class").catch(() => "");
    if (className?.includes("ant-pagination-disabled")) break;
    await next.click({ timeout: 30_000 });
    await expect(page.locator(".ant-spin-spinning"), "翻页后加载遮罩应消失").toHaveCount(0, { timeout: 60_000 });
    await page.waitForTimeout(500);
  }
  return { rows, statusRecords };
}

async function collectTaskQueryVisibleRows(page: Page): Promise<Array<{ rowText: string; tooltipTexts: string[] }>> {
  const result: Array<{ rowText: string; tooltipTexts: string[] }> = [];
  const tableRows = page.locator(".ant-table-tbody tr:visible");
  const count = await tableRows.count();
  for (let index = 0; index < count; index += 1) {
    const row = tableRows.nth(index);
    const rowText = ((await row.innerText({ timeout: 3_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
    if (!rowText || /暂无数据/.test(rowText)) continue;
    result.push({ rowText, tooltipTexts: await collectStatusTooltipTexts(page, row) });
  }
  return result;
}

async function collectStatusTooltipTexts(page: Page, row: Locator): Promise<string[]> {
  await page.keyboard.press("Escape").catch(() => {});
  const candidates = row
    .locator(".anticon-question-circle, [aria-label='question-circle'], .ant-tag, td")
    .filter({ hasText: /校验异常|异常|\?/ });
  const texts: string[] = [];
  const count = Math.min(await candidates.count().catch(() => 0), 8);
  for (let index = 0; index < count; index += 1) {
    const item = candidates.nth(index);
    if (!(await item.isVisible({ timeout: 500 }).catch(() => false))) continue;
    await item.hover({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(500);
    const tooltipTexts = await page
      .locator(".ant-tooltip:visible, [role='tooltip']:visible")
      .evaluateAll((items) => items.map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean))
      .catch(() => []);
    texts.push(...tooltipTexts);
  }
  await page.keyboard.press("Escape").catch(() => {});
  return [...new Set(texts)];
}

async function visibleTableRows(page: Page): Promise<string[]> {
  return page
    .locator(".ant-table-tbody tr:visible")
    .evaluateAll((items) =>
      items
        .map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim())
        .filter((text) => text && !/暂无数据/.test(text)),
    );
}

async function gotoDataQualityPage(page: Page, routePath: string): Promise<void> {
  await page.addInitScript(
    (projectId) => {
      for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
        sessionStorage.setItem(key, projectId);
        localStorage.setItem(key, projectId);
      }
    },
    PROJECT_ID,
  );
  await page.goto(`${BASE_URL}/dataAssets/#${routePath}?pid=${PROJECT_ID}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.evaluate((projectId) => {
    for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
      sessionStorage.setItem(key, projectId);
      localStorage.setItem(key, projectId);
    }
  }, PROJECT_ID);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await ensureQualityProjectSelected(page);
}

async function ensureQualityProjectSelected(page: Page): Promise<void> {
  const sider = page.locator(".ant-layout-sider:visible, aside:visible, [class*='sider']:visible").first();
  const siderText = ((await sider.innerText({ timeout: 3_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
  if (siderText.includes(PROJECT_NAME)) return;

  const projectSelect = page
    .locator(".ant-layout-sider:visible .ant-select:visible, aside:visible .ant-select:visible, [class*='sider']:visible .ant-select:visible")
    .first();
  await expect(projectSelect, `应展示质量项目下拉并选择 ${PROJECT_NAME}`).toBeVisible({ timeout: 30_000 });
  await projectSelect.click({ timeout: 30_000 });
  const option = page.locator(".ant-select-dropdown:visible .ant-select-item-option").filter({ hasText: PROJECT_NAME }).first();
  await expect(option, `质量项目下拉应包含 ${PROJECT_NAME}`).toBeVisible({ timeout: 30_000 });
  await option.click({ timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
}

async function searchByTableOrTask(page: Page, area: InventoryArea, query: string): Promise<void> {
  const placeholder =
    area === "task-query"
      ? /请输入表名\/任务名称搜索|请输入表名|任务名称/
      : /输入表名搜索|请输入表名\/任务名称搜索|请输入表名|表名/;
  const input = page.getByPlaceholder(placeholder).or(page.locator("input[placeholder*='表名']")).first();
  await expect(input, `${area}: 应展示搜索输入框`).toBeVisible({ timeout: 30_000 });
  await input.fill(query, { timeout: 30_000 });
  const search = input
    .locator("xpath=ancestor::*[contains(@class, 'ant-input-search')][1]")
    .locator("button:visible")
    .filter({ has: page.locator(".anticon-search") })
    .first();
  if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await search.click({ timeout: 30_000 });
  } else {
    await input.press("Enter");
  }
}

function parseTotalCount(text: string): number | null {
  const match = /共\s*(\d+)\s*条/.exec(text);
  return match ? Number(match[1]) : null;
}

function extractCaseNo(text: string): number | null {
  const match = /§\s*(\d{1,2})/.exec(text);
  if (!match) return null;
  const caseNo = Number(match[1]);
  return Number.isFinite(caseNo) ? caseNo : null;
}

function findDuplicateCaseNos(caseNos: number[]): number[] {
  const seen = new Set<number>();
  const duplicates = new Set<number>();
  for (const caseNo of caseNos) {
    if (seen.has(caseNo)) duplicates.add(caseNo);
    seen.add(caseNo);
  }
  return [...duplicates].sort((left, right) => left - right);
}

function findMissingCaseNos(caseNos: number[], selectedCases: Set<number>): number[] {
  const set = new Set(caseNos);
  const missing: number[] = [];
  for (const caseNo of selectedCases) {
    if (!set.has(caseNo)) missing.push(caseNo);
  }
  return missing;
}

function parseStatusRecord(rowText: string, tooltipTexts: string[] = []): InventoryStatusRecord {
  const normalized = rowText.replace(/\s+/g, " ").trim();
  const sparkName = resolveSparkName();
  const dorisName = resolveDorisName();
  const database = resolveSparkDatabase();
  return {
    caseNo: extractCaseNo(normalized),
    datasourceName: normalized.includes(sparkName)
      ? sparkName
      : dorisName && normalized.includes(dorisName)
        ? dorisName
        : null,
    tableName: normalized.match(new RegExp(`${escapeRegExp(database)}\\.(test_info_1_[a-z0-9_]+)`))?.[1] ?? null,
    ...classifyResultRow(normalized, tooltipTexts),
    rowText: normalized,
    tooltipTexts,
  };
}

function resolveSparkName(): string {
  const name = ENV.datasources.sparkthrift?.batch?.name;
  if (!name) throw new Error("environment datasource sparkthrift is not configured");
  return name;
}
function resolveDorisName(): string | undefined {
  return ENV.datasources.doris?.assets?.name ?? ENV.datasources.doris?.batch?.name;
}
function resolveSparkDatabase(): string {
  const database = ENV.datasources.sparkthrift?.batch?.database;
  if (!database) throw new Error("environment datasource sparkthrift database is not configured");
  return database;
}

function parseCaseFilter(value: string): Set<number> {
  const result = new Set<number>();
  for (const item of value.split(",")) {
    const trimmed = item.trim();
    const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      for (let caseNo = Math.min(start, end); caseNo <= Math.max(start, end); caseNo += 1) {
        if (caseNo >= 1 && caseNo <= 72) result.add(caseNo);
      }
      continue;
    }
    const caseNo = Number(trimmed);
    if (Number.isFinite(caseNo) && caseNo >= 1 && caseNo <= 72) result.add(caseNo);
  }
  if (result.size === 0) throw new Error(`V6411_UI_INVENTORY_CASES 未匹配到有效用例: ${value}`);
  return result;
}

function summarizeStatusRecords(records: InventoryStatusRecord[]): Record<UiResultStatus, number> {
  const counts: Record<UiResultStatus, number> = {
    "validation-pass": 0,
    "validation-unpass": 0,
    "run-failed": 0,
    running: 0,
    unknown: 0,
  };
  for (const record of records) counts[record.classification] += 1;
  return counts;
}

function classifyResultRow(rowText: string, tooltipTexts: string[] = []): { classification: UiResultStatus; statusText: string } {
  const statusText = extractResultStatusText(rowText);
  const tooltipText = tooltipTexts.join(" ");
  if (/运行失败|提交失败/.test(statusText) || countFromTooltip(tooltipText, /运行失败/) > 0) {
    return { classification: "run-failed", statusText };
  }
  const unpassCount = countFromTooltip(tooltipText, /校验不通过|校验未通过/);
  const passCount = countFromTooltip(tooltipText, /校验通过/);
  if (/校验异常/.test(statusText) && (unpassCount > 0 || passCount > 0)) {
    return { classification: unpassCount > 0 ? "validation-unpass" : "validation-pass", statusText };
  }
  if (/校验不通过/.test(statusText)) return { classification: "validation-unpass", statusText };
  if (/校验通过/.test(statusText)) return { classification: "validation-pass", statusText };
  if (/运行中|校验中|等待|未运行|停止中/.test(statusText)) return { classification: "running", statusText };
  if (/校验异常/.test(statusText)) return { classification: "unknown", statusText };
  return { classification: "unknown", statusText };
}

function countFromTooltip(text: string, label: RegExp): number {
  const match = text.match(new RegExp(`(?:${label.source})\\s*[:：]\\s*(\\d+)`));
  return match ? Number(match[1]) : 0;
}

function extractResultStatusText(rowText: string): string {
  const knownStatuses = ["校验异常", "校验不通过", "校验通过", "运行中", "校验中", "运行失败", "提交失败", "未运行", "等待"];
  const markerIndex = rowText.search(/Doris3\.x|SparkThrift2\.x/);
  const beforeDatasource = markerIndex >= 0 ? rowText.slice(0, markerIndex) : rowText;
  const titleMatch = beforeDatasource.match(/§\s*\d{1,2}\s+验证.+?(校验异常|校验不通过|校验通过|运行中|校验中|运行失败|提交失败|未运行|等待)$/);
  if (titleMatch?.[1]) return titleMatch[1];
  for (const status of knownStatuses) {
    if (beforeDatasource.endsWith(status)) return status;
  }
  for (const status of knownStatuses) {
    if (rowText.includes(status)) return status;
  }
  return "";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
