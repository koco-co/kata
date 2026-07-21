import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, type Locator, type Page } from "@playwright/test";
import { getEnvConfig } from "../../../../../../_shared/helpers";

type Area = "rule-set" | "rule-task" | "task-query";

const FEATURE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ENV = getEnvConfig();
const BASE_URL = ENV.urls.baseUrl;
const PROJECT_ID = String(ENV.projects.quality.id);
const PROJECT_NAME = ENV.projects.quality.name;
const DATABASE = ENV.datasources.sparkthrift?.batch?.database ?? ENV.datasources.sparkthrift?.sql?.database;
const SUFFIX = process.env.V6411_UI_TABLE_BATCH_SUFFIX?.trim();
const CASE_NOS = parseCaseRange(process.env.V6411_UI_SORT_CASES ?? "37-72");
const EXPECTED_DESC = [...CASE_NOS].sort((left, right) => right - left);
const OUT_DIR = path.resolve(
  process.env.V6411_UI_SORT_OUT_DIR ?? path.join(FEATURE_DIR, "runs/20260721-v6411-ui-sort-qzmkxjrp"),
);
const RESULT_JSON = path.join(OUT_DIR, "ui-sort-results.json");
const TASK_SEARCH_QUERY = process.env.V6411_UI_SORT_TASK_QUERY ?? "test_info_1_";
const RESULT_SEARCH_QUERY = process.env.V6411_UI_SORT_RESULT_QUERY ?? "test_info_1_";
const SKIP_EDIT_STAGES = process.env.V6411_UI_SORT_SKIP_EDIT_STAGES === "1";
const SKIP_IMMEDIATE_RUNS = process.env.V6411_UI_SORT_SKIP_IMMEDIATE_RUNS === "1";

if (!DATABASE) throw new Error("environment datasource sparkthrift database is not configured");
if (!SUFFIX || !/^[a-z]{8}$/.test(SUFFIX)) {
  throw new Error("V6411_UI_TABLE_BATCH_SUFFIX must be the same 8 lowercase letters used by the UI run");
}

test.setTimeout(Number(process.env.V6411_UI_SORT_TIMEOUT_MS ?? 90 * 60 * 1000));

test("v6411 Spark §37–§72 UI records are updated and ordered descending", async ({ page }, testInfo) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const evidence: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    suffix: SUFFIX,
    database: DATABASE,
    cases: EXPECTED_DESC,
    actions: { ruleSetEdits: [], taskEdits: [], immediateRuns: [] },
  };

  if (!SKIP_EDIT_STAGES) for (const caseNo of CASE_NOS) {
    const tableName = tableNameFor(caseNo);
    const sourceRef = `SORT-§${caseNo}`;
    await updateRuleSet(page, tableName, sourceRef, evidence);
  }
  const ruleSetOrder = await readOrderedArea(page, "rule-set", "/dq/ruleSet", "输入表名搜索|请输入表名", evidence);
  expect(ruleSetOrder.caseNos, "规则集管理应按更新时间降序排列").toEqual(EXPECTED_DESC);

  if (!SKIP_EDIT_STAGES) for (const caseNo of CASE_NOS) {
    const tableName = tableNameFor(caseNo);
    const sourceRef = `TASK-SORT-§${caseNo}`;
    await updateRuleTask(page, tableName, sourceRef, evidence);
  }
  const ruleTaskOrder = await readOrderedArea(page, "rule-task", "/dq/rule", "输入表名搜索|请输入表名", evidence);
  expect(ruleTaskOrder.caseNos, "规则任务管理应按最近修改时间降序排列").toEqual(EXPECTED_DESC);

  if (!SKIP_IMMEDIATE_RUNS) for (const caseNo of CASE_NOS) {
    const tableName = tableNameFor(caseNo);
    const sourceRef = `RUN-SORT-§${caseNo}`;
    await runTask(page, tableName, sourceRef, evidence);
  }
  const taskQueryOrder = await readOrderedArea(page, "task-query", "/dq/taskQuery", "请输入表名/任务名称搜索|请输入表名", evidence);
  expect(taskQueryOrder.caseNos, "校验结果查询应按最近执行时间降序排列").toEqual(EXPECTED_DESC);

  const result = { ...evidence, ruleSet: ruleSetOrder, ruleTask: ruleTaskOrder, taskQuery: taskQueryOrder };
  fs.writeFileSync(RESULT_JSON, JSON.stringify(result, null, 2));
  await testInfo.attach("ui-sort-results.json", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
});

async function updateRuleSet(page: Page, tableName: string, sourceRef: string, evidence: Record<string, unknown>): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  await search(page, tableName, "输入表名搜索|请输入表名", sourceRef);
  const row = await findRow(page, tableName, sourceRef);
  if (!row) throw new Error(`${sourceRef}: UI 列表未找到 ${tableName}`);
  const edit = row.locator("a:visible, button:visible").filter({ hasText: /^编辑$/ }).first();
  await expect(edit, `${sourceRef}: 规则集行应展示编辑`).toBeVisible({ timeout: 30_000 });
  await edit.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 规则集编辑页面应打开`).toContainText(/编辑|监控规则|规则包/, { timeout: 30_000 });
  await clickNext(page, sourceRef);
  await save(page, sourceRef, true);
  await expect(page.locator("body"), `${sourceRef}: 保存后应回到规则集管理`).toContainText(/规则集管理/, { timeout: 60_000 });
  appendEvidence(evidence, "ruleSetEdits", { caseNo: caseNoFor(tableName), tableName, saved: true });
}

async function updateRuleTask(page: Page, tableName: string, sourceRef: string, evidence: Record<string, unknown>): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule");
  await search(page, TASK_SEARCH_QUERY, "输入表名搜索|请输入表名", sourceRef);
  let row = await findRow(page, tableName, sourceRef, false);
  if (!row) {
    await search(page, tableName, "输入表名搜索|请输入表名", sourceRef);
    row = await findRow(page, tableName, sourceRef);
  }
  if (!row) throw new Error(`${sourceRef}: UI 列表未找到 ${tableName}`);
  const edit = row.locator("a:visible, button:visible").filter({ hasText: /^编辑$/ }).first();
  await expect(edit, `${sourceRef}: 规则任务行应展示编辑`).toBeVisible({ timeout: 30_000 });
  await edit.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 规则任务编辑页应打开`).toContainText(/编辑|监控对象|规则名称/, { timeout: 30_000 });
  await clickNext(page, sourceRef);
  await clickNext(page, sourceRef);
  await save(page, sourceRef, false);
  await expect(page.locator("body"), `${sourceRef}: 任务保存后应回到规则任务管理`).toContainText(/规则任务管理/, { timeout: 60_000 });
  appendEvidence(evidence, "taskEdits", { caseNo: caseNoFor(tableName), tableName, saved: true });
}

async function runTask(page: Page, tableName: string, sourceRef: string, evidence: Record<string, unknown>): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule");
  await search(page, TASK_SEARCH_QUERY, "输入表名搜索|请输入表名", sourceRef);
  let row = await findRow(page, tableName, sourceRef, false);
  if (!row) {
    await search(page, tableName, "输入表名搜索|请输入表名", sourceRef);
    row = await findRow(page, tableName, sourceRef);
  }
  if (!row) throw new Error(`${sourceRef}: UI 列表未找到 ${tableName}`);
  const tableCell = row.locator("td").nth(1);
  await expect(tableCell, `${sourceRef}: 任务表名单元格应可见`).toBeVisible({ timeout: 30_000 });
  await tableCell.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
  const drawer = page.locator(".ant-drawer:visible, .ant-drawer-content-wrapper:visible, .ant-modal:visible, [role='dialog']:visible").last();
  await expect(drawer, `${sourceRef}: 任务详情抽屉应打开`).toBeVisible({ timeout: 30_000 });
  const execute = drawer.getByRole("button", { name: /立即执行/ }).or(drawer.getByText("立即执行")).last();
  await expect(execute, `${sourceRef}: 详情抽屉应展示立即执行`).toBeVisible({ timeout: 30_000 });
  await execute.click({ timeout: 30_000 });
  const confirm = page.locator(".ant-popover:visible, .ant-modal-confirm:visible, .ant-modal:visible").last();
  if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const ok = confirm.getByRole("button", { name: /确\s*定|确\s*认|OK|是/ }).last();
    if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) await ok.click({ timeout: 30_000 });
  }
  await waitForSpin(page, sourceRef);
  await page.waitForTimeout(1_000);
  appendEvidence(evidence, "immediateRuns", { caseNo: caseNoFor(tableName), tableName, submitted: true });
}

async function readOrderedArea(
  page: Page,
  area: Area,
  route: string,
  placeholder: string,
  evidence: Record<string, unknown>,
): Promise<{ area: Area; route: string; query: string; rows: string[]; caseNos: number[]; expected: number[]; pass: boolean }> {
  await gotoDataQualityPage(page, route);
  const query = area === "task-query" ? RESULT_SEARCH_QUERY : "test_info_1_";
  let rows: string[] = [];
  const waitDeadline = Date.now() + Number(process.env.V6411_UI_SORT_RESULT_APPEAR_TIMEOUT_MS ?? 12 * 60 * 1000);
  while (true) {
    await search(page, query, placeholder, `ORDER-${area}`);
    rows = await collectRowsAcrossPages(page);
    const selectedCount = rows.filter((row) => row.includes(`test_info_1_${SUFFIX}_`)).length;
    if (area !== "task-query" || selectedCount >= EXPECTED_DESC.length || Date.now() >= waitDeadline) break;
    await page.waitForTimeout(Number(process.env.V6411_UI_SORT_RESULT_POLL_MS ?? 5_000));
  }
  const selected = rows.filter((row) => row.includes(`test_info_1_${SUFFIX}_`));
  const caseNos = selected.map(extractCaseNo).filter((value): value is number => value !== null);
  const record = { area, route, query, rows: selected, caseNos, expected: EXPECTED_DESC, pass: JSON.stringify(caseNos) === JSON.stringify(EXPECTED_DESC) };
  await test.info().attach(`${area}-order.txt`, { body: selected.join("\n"), contentType: "text/plain" });
  await test.info().attach(`${area}-order.png`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  appendEvidence(evidence, "orderChecks", record);
  return record;
}

async function gotoDataQualityPage(page: Page, routePath: string): Promise<void> {
  await page.addInitScript((projectId) => {
    for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
      sessionStorage.setItem(key, projectId);
      localStorage.setItem(key, projectId);
    }
  }, PROJECT_ID);
  await page.goto(`${BASE_URL}/dataAssets/#${routePath}?pid=${PROJECT_ID}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await ensureQualityProjectSelected(page);
  await expect(page.locator("body"), `${routePath}: 页面应打开`).toContainText(routeHeading(routePath), { timeout: 30_000 });
}

async function ensureQualityProjectSelected(page: Page): Promise<void> {
  const sider = page.locator(".ant-layout-sider:visible, aside:visible, [class*='sider']:visible").first();
  if (((await sider.innerText({ timeout: 3_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").includes(PROJECT_NAME)) return;
  const select = page.locator(".ant-layout-sider:visible .ant-select:visible, aside:visible .ant-select:visible, [class*='sider']:visible .ant-select:visible").first();
  await expect(select, `应展示质量项目下拉 ${PROJECT_NAME}`).toBeVisible({ timeout: 30_000 });
  await select.click({ timeout: 30_000 });
  const option = page.locator(".ant-select-dropdown:visible .ant-select-item-option").filter({ hasText: PROJECT_NAME }).first();
  await expect(option, `质量项目下拉应包含 ${PROJECT_NAME}`).toBeVisible({ timeout: 30_000 });
  await option.click({ timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
}

async function search(page: Page, value: string, placeholder: string, sourceRef: string): Promise<void> {
  await dismissStaleOverlay(page, sourceRef);
  const input = page.getByPlaceholder(new RegExp(placeholder)).or(page.locator("input[placeholder*='表名']")).first();
  await expect(input, `${sourceRef}: 应展示搜索框`).toBeVisible({ timeout: 30_000 });
  await input.fill(value, { timeout: 30_000 });
  const searchButton = input.locator("xpath=ancestor::*[contains(@class, 'ant-input-search')][1]").locator("button:visible").filter({ has: page.locator(".anticon-search") }).first();
  if (await searchButton.isVisible({ timeout: 2_000 }).catch(() => false)) await searchButton.click({ timeout: 30_000 });
  else await input.press("Enter");
  await waitForSpin(page, sourceRef);
  await page.waitForTimeout(700);
}

async function dismissStaleOverlay(page: Page, sourceRef: string): Promise<void> {
  await page.keyboard.press("Escape").catch(() => {});
  const savePrompt = page.locator(".ant-modal-wrap:visible, .ant-modal:visible").filter({ hasText: /保存提示|修改后不会影响/ }).last();
  if (await savePrompt.isVisible({ timeout: 1_000 }).catch(() => false)) {
    const confirmSave = savePrompt.locator("button:visible").filter({ hasText: /^保\s*存$/ }).last();
    await expect(confirmSave, `${sourceRef}: 残留保存提示应完成确认保存`).toBeVisible({ timeout: 10_000 });
    await confirmSave.click({ timeout: 30_000 });
    await expect(savePrompt, `${sourceRef}: 残留保存提示应关闭`).toBeHidden({ timeout: 60_000 });
    return;
  }
  const modal = page.locator(".ant-modal-wrap:visible, .ant-modal:visible").last();
  if (!(await modal.isVisible({ timeout: 500 }).catch(() => false))) return;
  await test.info().attach(`${sourceRef}-stale-overlay.txt`, {
    body: ((await modal.innerText({ timeout: 2_000 }).catch(() => "")) ?? "").replace(/\s+/g, " "),
    contentType: "text/plain",
  });
  const close = modal.locator(".ant-modal-close:visible").last();
  if (await close.isVisible({ timeout: 1_000 }).catch(() => false)) await close.click({ force: true, timeout: 5_000 });
  else await page.keyboard.press("Escape").catch(() => {});
  await expect(modal, `${sourceRef}: 列表操作前残留弹层应关闭`).toBeHidden({ timeout: 10_000 });
}

async function findRow(page: Page, tableName: string, sourceRef: string, required = true): Promise<Locator | null> {
  const totalText = await page.locator(".ant-pagination-total-text:visible").last().innerText({ timeout: 3_000 }).catch(() => "");
  const total = Number(totalText.match(/共\s*(\d+)\s*条/)?.[1] ?? 0);
  const maxPages = total ? Math.max(1, Math.ceil(total / 20)) : 5;
  for (let index = 0; index < maxPages; index += 1) {
    const rows = page.locator(".ant-table-tbody tr:visible");
    const texts = await rows.allInnerTexts();
    const rowIndex = texts.findIndex((text) => text.includes(tableName));
    if (rowIndex >= 0) return rows.nth(rowIndex);
    const next = page.locator(".ant-pagination-next:visible").last();
    if (!(await next.isVisible({ timeout: 2_000 }).catch(() => false))) break;
    if (((await next.getAttribute("class").catch(() => "")) ?? "").includes("ant-pagination-disabled")) break;
    await next.click({ timeout: 30_000 });
    await waitForSpin(page, sourceRef);
  }
  if (!required) return null;
  throw new Error(`${sourceRef}: UI 列表未找到 ${tableName}`);
}

async function collectRowsAcrossPages(page: Page): Promise<string[]> {
  const totalText = await page.locator(".ant-pagination-total-text:visible").last().innerText({ timeout: 3_000 }).catch(() => "");
  const total = Number(totalText.match(/共\s*(\d+)\s*条/)?.[1] ?? 0);
  const maxPages = total ? Math.max(1, Math.ceil(total / 20)) : 5;
  const result: string[] = [];
  for (let index = 0; index < maxPages; index += 1) {
    result.push(...await page.locator(".ant-table-tbody tr:visible").evaluateAll((items) => items.map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean)));
    const next = page.locator(".ant-pagination-next:visible").last();
    if (!(await next.isVisible({ timeout: 2_000 }).catch(() => false))) break;
    if (((await next.getAttribute("class").catch(() => "")) ?? "").includes("ant-pagination-disabled")) break;
    await next.click({ timeout: 30_000 });
    await waitForSpin(page, "ORDER-PAGE");
  }
  return result;
}

async function clickNext(page: Page, sourceRef: string): Promise<void> {
  const next = page.locator("button:visible").filter({ hasText: /^下\s*一\s*步$/ }).last();
  await expect(next, `${sourceRef}: 应展示下一步`).toBeVisible({ timeout: 30_000 });
  await next.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
}

async function save(page: Page, sourceRef: string, requiresPrompt: boolean): Promise<void> {
  const button = page.locator("button:visible").filter({ hasText: /^保\s*存$/ }).last();
  await expect(button, `${sourceRef}: 应展示保存`).toBeVisible({ timeout: 30_000 });
  await button.click({ timeout: 30_000 });
  if (requiresPrompt) {
    const confirm = page.locator(".ant-modal-wrap:visible, .ant-modal:visible").filter({ hasText: /保存提示|修改后不会影响/ }).last();
    await expect(confirm, `${sourceRef}: 保存后应展示保存提示确认弹窗`).toBeVisible({ timeout: 15_000 });
    const confirmSave = confirm.locator("button:visible").filter({ hasText: /^保\s*存$/ }).last();
    await expect(confirmSave, `${sourceRef}: 保存提示弹窗应展示确认保存`).toBeVisible({ timeout: 30_000 });
    await confirmSave.click({ timeout: 30_000 });
    await expect(confirm, `${sourceRef}: 保存提示弹窗应关闭`).toBeHidden({ timeout: 60_000 });
  }
  await waitForSpin(page, sourceRef);
  if (!requiresPrompt) {
    await expect(page, `${sourceRef}: 规则任务保存后应返回任务列表`).toHaveURL(/#\/dq\/rule(?:\?|$)/, { timeout: 60_000 });
    await expect(page.getByPlaceholder(/输入表名搜索|请输入表名/).or(page.locator("input[placeholder*='表名']")).first(), `${sourceRef}: 保存后任务列表搜索框应可见`).toBeVisible({ timeout: 30_000 });
  }
  await page.waitForTimeout(1_000);
}

async function waitForSpin(page: Page, sourceRef: string): Promise<void> {
  await expect(page.locator(".ant-spin-spinning:visible"), `${sourceRef}: 加载应结束`).toHaveCount(0, { timeout: 60_000 });
}

function routeHeading(route: string): RegExp {
  if (route.endsWith("ruleSet")) return /规则集管理/;
  if (route.endsWith("/rule")) return /规则任务管理/;
  return /校验结果查询/;
}

function tableNameFor(caseNo: number): string {
  return `test_info_1_${SUFFIX}_${caseNo}`;
}

function caseNoFor(tableName: string): number {
  const match = /_(\d+)$/.exec(tableName);
  if (!match) throw new Error(`无法从表名解析用例序号: ${tableName}`);
  return Number(match[1]);
}

function extractCaseNo(row: string): number | null {
  const match = new RegExp(`test_info_1_${SUFFIX}_(\\d+)`).exec(row);
  return match ? Number(match[1]) : null;
}

function parseCaseRange(value: string): number[] {
  const match = /^(\d+)-(\d+)$/.exec(value.trim());
  if (!match) throw new Error(`V6411_UI_SORT_CASES 必须是 start-end，实际=${value}`);
  const start = Number(match[1]);
  const end = Number(match[2]);
  const result = Array.from({ length: end - start + 1 }, (_, index) => start + index).filter((caseNo) => caseNo >= 1 && caseNo <= 72);
  if (result.length !== end - start + 1 || result.length === 0) throw new Error(`V6411_UI_SORT_CASES 超出 1-72: ${value}`);
  return result;
}

function appendEvidence(target: Record<string, unknown>, key: string, value: unknown): void {
  const list = target[key];
  if (Array.isArray(list)) list.push(value);
  else target[key] = [value];
}
