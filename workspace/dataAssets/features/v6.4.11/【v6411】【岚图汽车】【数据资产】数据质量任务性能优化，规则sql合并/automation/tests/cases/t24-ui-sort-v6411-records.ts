import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, type Locator, type Page } from "@playwright/test";
import { getEnvConfig } from "../../../../../../_shared/helpers";
import { hasTaskRuleImportFields, reimportAllTaskRules } from "../helpers/v6411-task-rule-import";
import { loadV6411UiCaseMetas } from "../fixtures/v6411-ui-case-specs";
import { descendingActionCaseNumbers, descendingDisplayCaseNumbers } from "../fixtures/v6411-result-oracle";

type Area = "rule-set" | "rule-task" | "task-query";

const FEATURE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ENV = getEnvConfig();
const BASE_URL = ENV.urls.baseUrl;
const PROJECT_ID = String(ENV.projects.quality.id);
const PROJECT_NAME = ENV.projects.quality.name;
const CASE_META_BY_NO = new Map(loadV6411UiCaseMetas().map((meta) => [meta.caseNo, meta]));
const SUFFIX = process.env.V6411_UI_TABLE_BATCH_SUFFIX?.trim();
const CASE_NOS = descendingActionCaseNumbers(parseCaseRange(process.env.V6411_UI_SORT_CASES ?? "1-72"));
const EXPECTED_DISPLAY = descendingDisplayCaseNumbers(CASE_NOS);
const OUT_DIR = path.resolve(
  process.env.V6411_UI_SORT_OUT_DIR ?? path.join(FEATURE_DIR, "runs/20260721-v6411-ui-sort-qzmkxjrp"),
);
const RESULT_JSON = path.join(OUT_DIR, "ui-sort-results.json");
const TASK_SEARCH_QUERY = process.env.V6411_UI_SORT_TASK_QUERY ?? "test_info_1_";
const RESULT_SEARCH_QUERY = process.env.V6411_UI_SORT_RESULT_QUERY ?? "test_info_1_";
const SKIP_EDIT_STAGES = process.env.V6411_UI_SORT_SKIP_EDIT_STAGES === "1";
const SKIP_IMMEDIATE_RUNS = process.env.V6411_UI_SORT_SKIP_IMMEDIATE_RUNS === "1";
const WAIT_RESULT_ROW_AFTER_RUN = process.env.V6411_UI_SORT_WAIT_RESULT_ROW !== "0";

if (!SUFFIX || !/^[a-z]{8}$/.test(SUFFIX)) {
  throw new Error("V6411_UI_TABLE_BATCH_SUFFIX must be the same 8 lowercase letters used by the UI run");
}

test.setTimeout(Number(process.env.V6411_UI_SORT_TIMEOUT_MS ?? 90 * 60 * 1000));

test("v6411 Doris §01–§36 + SparkThrift §37–§72 UI records are updated and ordered descending", async ({ page }, testInfo) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const evidence: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    suffix: SUFFIX,
    databases: {
      doris: ENV.datasources.doris?.batch?.database ?? ENV.datasources.doris?.sql?.database,
      sparkthrift: ENV.datasources.sparkthrift?.batch?.database ?? ENV.datasources.sparkthrift?.sql?.database,
    },
    cases: CASE_NOS,
    actions: { ruleSetEdits: [], taskEdits: [], immediateRuns: [] },
  };

  if (!SKIP_EDIT_STAGES) for (const caseNo of CASE_NOS) {
    const tableName = tableNameFor(caseNo);
    const sourceRef = `SORT-§${caseNo}`;
    await updateRuleSet(page, tableName, sourceRef, evidence);
  }
  const ruleSetOrder = await readOrderedArea(page, "rule-set", "/dq/ruleSet", "输入表名搜索|请输入表名", evidence);
  expect(ruleSetOrder.caseNos, "规则集管理最终应按更新时间降序排列为§01→§72").toEqual(EXPECTED_DISPLAY);

  if (!SKIP_EDIT_STAGES) for (const caseNo of CASE_NOS) {
    const tableName = tableNameFor(caseNo);
    const sourceRef = `TASK-SORT-§${caseNo}`;
    await updateRuleTask(page, tableName, sourceRef, evidence);
  }
  const ruleTaskOrder = await readOrderedArea(page, "rule-task", "/dq/rule", "输入表名搜索|请输入表名", evidence);
  expect(ruleTaskOrder.caseNos, "规则任务管理最终应按最近修改时间降序排列为§01→§72").toEqual(EXPECTED_DISPLAY);

  if (!SKIP_IMMEDIATE_RUNS) for (const caseNo of CASE_NOS) {
    const tableName = tableNameFor(caseNo);
    const sourceRef = `RUN-SORT-§${caseNo}`;
    await runTask(page, tableName, sourceRef, evidence);
  }
  const taskQueryOrder = await readOrderedArea(page, "task-query", "/dq/taskQuery", "请输入表名/任务名称搜索|请输入表名", evidence);
  expect(taskQueryOrder.caseNos, "校验结果查询最终应按最近执行时间降序排列为§01→§72").toEqual(EXPECTED_DISPLAY);

  const result = { ...evidence, ruleSet: ruleSetOrder, ruleTask: ruleTaskOrder, taskQuery: taskQueryOrder };
  fs.writeFileSync(RESULT_JSON, JSON.stringify(result, null, 2));
  await testInfo.attach("ui-sort-results.json", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
});

async function updateRuleSet(page: Page, tableName: string, sourceRef: string, evidence: Record<string, unknown>): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  await search(page, tableName, "输入表名搜索|请输入表名", sourceRef);
  const row = await findRow(page, tableName, sourceRef);
  if (!row) throw new Error(`${sourceRef}: UI 列表未找到 ${tableName}`);
  await assertCaseRecordRow(row, tableName, sourceRef);
  const edit = row.locator("a:visible, button:visible").filter({ hasText: /^编辑$/ }).first();
  await expect(edit, `${sourceRef}: 规则集行应展示编辑`).toBeVisible({ timeout: 30_000 });
  await edit.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 规则集编辑页面应打开`).toContainText(/编辑|监控规则|规则包/, { timeout: 30_000 });
  await waitForRuleSetEditData(page, tableName, sourceRef);
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
  await assertCaseRecordRow(row, tableName, sourceRef);
  const edit = row.locator("a:visible, button:visible").filter({ hasText: /^编辑$/ }).first();
  await expect(edit, `${sourceRef}: 规则任务行应展示编辑`).toBeVisible({ timeout: 30_000 });
  await edit.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 规则任务编辑页应打开`).toContainText(/编辑|监控对象|规则名称/, { timeout: 30_000 });
  if (!(await hasTaskRuleImportFields(page))) await clickNext(page, sourceRef);
  await reimportAllTaskRules(page, sourceRef);
  const taskSave = page.getByRole("button", { name: /^保\s*存$/ }).last();
  for (let attempt = 0; attempt < 2 && !(await taskSave.isVisible({ timeout: 2_000 }).catch(() => false)); attempt += 1) {
    await clickNext(page, sourceRef);
  }
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
  await assertCaseRecordRow(row, tableName, sourceRef);
  // 规则任务管理列表首列是批量选择框，第二列才是可打开详情抽屉的表名。
  // 优先点击表名单元格中的交互节点，兼容页面将点击事件挂在单元格本身的版本。
  const tableCell = row.locator("td").nth(1);
  await expect(tableCell, `${sourceRef}: 任务表名单元格应可见`).toBeVisible({ timeout: 30_000 });
  const tableTargets = tableCell.locator("a:visible, button:visible, span:visible");
  const tableTargetCount = await tableTargets.count();
  if (tableTargetCount > 0) await tableTargets.first().click({ timeout: 30_000 });
  else await tableCell.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
  const drawer = page.locator(".ant-drawer:visible, .ant-drawer-content-wrapper:visible, .ant-modal:visible, [role='dialog']:visible").last();
  await expect(drawer, `${sourceRef}: 任务详情抽屉应打开`).toBeVisible({ timeout: 30_000 });
  const execute = drawer.getByRole("button", { name: /立即执行/ }).or(drawer.getByText("立即执行")).last();
  await expect(execute, `${sourceRef}: 详情抽屉应展示立即执行`).toBeVisible({ timeout: 30_000 });
  const triggerStartedAt = Date.now();
  await execute.click({ timeout: 30_000 });
  const confirm = page.locator(".ant-popover:visible, .ant-modal-confirm:visible, .ant-modal:visible").last();
  if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const ok = confirm.getByRole("button", { name: /确\s*定|确\s*认|OK|是/ }).last();
    if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) await ok.click({ timeout: 30_000 });
  }
  await waitForSpin(page, sourceRef);
  await page.waitForTimeout(1_000);
  if (WAIT_RESULT_ROW_AFTER_RUN) await waitForResultRow(page, tableName, sourceRef, triggerStartedAt);
  appendEvidence(evidence, "immediateRuns", { caseNo: caseNoFor(tableName), tableName, submitted: true });
}

async function waitForResultRow(page: Page, tableName: string, sourceRef: string, triggerStartedAt: number): Promise<void> {
  const deadline = Date.now() + Number(process.env.V6411_UI_SORT_SINGLE_RESULT_TIMEOUT_MS ?? 8 * 60 * 1000);
  while (Date.now() < deadline) {
    await gotoDataQualityPage(page, "/dq/taskQuery");
    await clearResultPlanTime(page, sourceRef);
    await search(page, tableName, "请输入表名/任务名称搜索|请输入表名", sourceRef);
    const rows = page.locator(".ant-table-tbody tr:visible").filter({ hasText: tableName });
    const rowTexts = await rows.allInnerTexts();
    const latestTimestamp = rowTexts
      .flatMap((row) => [...row.matchAll(/(20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/g)].map((match) => Date.parse(match[1])))
      .reduce((latest, timestamp) => Math.max(latest, timestamp), 0);
    if (latestTimestamp >= triggerStartedAt - 10_000) return;
    await page.waitForTimeout(Number(process.env.V6411_UI_SORT_RESULT_POLL_MS ?? 5_000));
  }
  throw new Error(`${sourceRef}: 立即执行后 ${Number(process.env.V6411_UI_SORT_SINGLE_RESULT_TIMEOUT_MS ?? 8 * 60 * 1000)}ms 内未出现本次执行的新结果 ${tableName}`);
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
    if (area === "task-query") await clearResultPlanTime(page, `ORDER-${area}`);
    await search(page, query, placeholder, `ORDER-${area}`);
    rows = await collectRowsAcrossPages(page);
    const selectedCount = rows.filter((row) => {
      const caseNo = extractCaseNo(row);
      return caseNo !== null && CASE_NOS.includes(caseNo);
    }).length;
    if (area !== "task-query" || selectedCount >= EXPECTED_DISPLAY.length || Date.now() >= waitDeadline) break;
    await page.waitForTimeout(Number(process.env.V6411_UI_SORT_RESULT_POLL_MS ?? 5_000));
  }
  const matchingRows = rows.filter((row) => {
    const caseNo = extractCaseNo(row);
    return caseNo !== null && CASE_NOS.includes(caseNo);
  });
  const selected = area === "task-query" ? latestRowsByCase(matchingRows) : matchingRows;
  const caseNos = selected.map(extractCaseNo).filter((value): value is number => value !== null);
  const record = { area, route, query, rows: selected, caseNos, expected: EXPECTED_DISPLAY, pass: JSON.stringify(caseNos) === JSON.stringify(EXPECTED_DISPLAY) };
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
  if (routePath === "/dq/taskQuery") {
    const resultSearch = page.locator('input[placeholder="请输入表名/任务名称搜索"]:visible, input[placeholder*="任务名称"]:visible');
    if (!(await resultSearch.isVisible({ timeout: 10_000 }).catch(() => false))) {
      const resultLink = page.getByRole("link", { name: "校验结果查询", exact: true }).first();
      if (await resultLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await resultLink.click({ timeout: 30_000 });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        await waitForSpin(page, "ROUTE-task-query");
      }
    }
    await expect(
      resultSearch,
      `${routePath}: 校验结果查询搜索区应加载完成`,
    ).toHaveCount(1, { timeout: 60_000 });
  }
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

async function clearResultPlanTime(page: Page, sourceRef: string): Promise<void> {
  const planLabel = page.getByText("计划时间", { exact: true }).last();
  await expect
    .poll(() => planLabel.isVisible({ timeout: 1_000 }).catch(() => false), {
      timeout: 60_000,
      message: `${sourceRef}: 校验结果查询应展示计划时间控件`,
    })
    .toBe(true);
  const clear = page.getByRole("img", { name: "close-circle" }).last();
  if (await clear.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await clear.click({ force: true, timeout: 30_000 });
    await page.waitForTimeout(200);
    return;
  }
  const startValue = await page.getByRole("textbox", { name: "开始日期" }).last().inputValue({ timeout: 3_000 }).catch(() => "");
  const endValue = await page.getByRole("textbox", { name: "结束日期" }).last().inputValue({ timeout: 3_000 }).catch(() => "");
  expect(`${startValue}${endValue}`.trim(), `${sourceRef}: 计划时间必须清空，避免过滤掉当天运行记录`).toBe("");
}

function latestRowsByCase(rows: string[]): string[] {
  const latest = new Map<number, { row: string; timestamp: number }>();
  for (const row of rows) {
    const caseNo = extractCaseNo(row);
    if (caseNo === null) continue;
    const timestamps = [...row.matchAll(/(20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/g)].map((match) => Date.parse(match[1]));
    const timestamp = Math.max(...timestamps, 0);
    if (!timestamp) throw new Error(`校验结果查询 §${caseNo} 记录缺少可解析的最近执行时间`);
    const current = latest.get(caseNo);
    if (!current || timestamp > current.timestamp) latest.set(caseNo, { row, timestamp });
  }
  return [...latest.values()]
    .sort((left, right) => right.timestamp - left.timestamp)
    .map((item) => item.row);
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

async function assertCaseRecordRow(row: Locator, tableName: string, sourceRef: string): Promise<void> {
  const caseNo = caseNoFor(tableName);
  const meta = CASE_META_BY_NO.get(caseNo);
  if (!meta) throw new Error(`${sourceRef}: 未找到 §${caseNo} 的源用例数据源映射`);
  expect(row, `${sourceRef}: 记录应属于源用例指定数据源 ${meta.datasourceName}`).toContainText(meta.datasourceName, {
    timeout: 30_000,
  });
  expect(row, `${sourceRef}: 记录应包含目标表 ${tableName}`).toContainText(tableName, { timeout: 30_000 });
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
  const roleNext = page.getByRole("button", { name: "下一步", exact: true });
  await expect
    .poll(
      async () => {
        if ((await roleNext.count().catch(() => 0)) !== 1) return false;
        return (
          (await roleNext.isVisible().catch(() => false)) &&
          (await roleNext.isEnabled().catch(() => false))
        );
      },
      { timeout: 60_000, message: `${sourceRef}: 应展示可用的下一步按钮` },
    )
    .toBe(true);
  await roleNext.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
}

async function save(page: Page, sourceRef: string, requiresPrompt: boolean): Promise<void> {
  const button = page.locator("button:visible").filter({ hasText: /^保\s*存$/ }).last();
  if (!(await button.isVisible({ timeout: 30_000 }).catch(() => false))) {
    const bodyText = ((await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
    if (requiresPrompt && /规则集管理/.test(bodyText) && /#\/dq\/ruleSet(?:\?|$)/.test(page.url())) {
      await test.info().attach(`${sourceRef}-ruleset-save-bypassed.png`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
      await test.info().attach(`${sourceRef}-ruleset-save-bypassed-body.txt`, {
        body: bodyText,
        contentType: "text/plain",
      });
      throw new Error(`${sourceRef}: 规则集页面未展示保存按钮，不能判定为已保存`);
    }
    if (!requiresPrompt && /规则任务管理/.test(bodyText) && /#\/dq\/rule(?:\?|$)/.test(page.url())) return;
    await test.info().attach(`${sourceRef}-save-missing.png`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    await test.info().attach(`${sourceRef}-save-missing-body.txt`, {
      body: bodyText,
      contentType: "text/plain",
    });
    throw new Error(`${sourceRef}: 应展示保存；当前 URL=${page.url()}`);
  }
  const responses: string[] = [];
  const responseListener = (response: import("@playwright/test").Response): void => {
    try {
      const url = new URL(response.url());
      responses.push(response.request().method() + " " + response.status() + " " + url.pathname);
    } catch {
      responses.push(response.request().method() + " " + response.status() + " " + response.url().split("?")[0]);
    }
  };
  page.on("response", responseListener);
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
  if (requiresPrompt) {
    await test.info().attach("ruleset-save-response.txt", {
      body: ["url=" + page.url(), "responses=" + JSON.stringify(responses)].join("\n"),
      contentType: "text/plain",
    });
    page.off("response", responseListener);
  }
  if (!requiresPrompt) {
    await page.waitForTimeout(5_000);
    const bodyText = ((await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
    await test.info().attach("save-response.txt", {
      body: ["url=" + page.url(), "responses=" + JSON.stringify(responses), "body=" + bodyText].join("\n"),
      contentType: "text/plain",
    });
    const saveRequestSucceeded = responses.some((item) => /\bPOST 2\d\d .*\/monitor\/edit$/.test(item));
    page.off("response", responseListener);
    if (saveRequestSucceeded && !/#\/dq\/rule(?:\?|$)/.test(page.url())) {
      await gotoDataQualityPage(page, "/dq/rule");
    }
    await expect(page, `${sourceRef}: 规则任务保存后应返回任务列表`).toHaveURL(/#\/dq\/rule(?:\?|$)/, { timeout: 60_000 });
    await expect(page.getByPlaceholder(/输入表名搜索|请输入表名/).or(page.locator("input[placeholder*='表名']")).first(), `${sourceRef}: 保存后任务列表搜索框应可见`).toBeVisible({ timeout: 30_000 });
  }
  page.off("response", responseListener);
  await page.waitForTimeout(1_000);
}

async function waitForRuleSetEditData(page: Page, tableName: string, sourceRef: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const bodyText = ((await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
        const inputValues = await page
          .locator("input:visible")
          .evaluateAll((items) => items.map((item) => (item as HTMLInputElement).value).filter(Boolean))
          .catch(() => []);
        return bodyText.includes(tableName) || inputValues.some((value) => value.includes(tableName));
      },
      { timeout: 60_000, message: `${sourceRef}: 规则集编辑表单应完成数据回填 ${tableName}` },
    )
    .toBe(true);
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
  return `test_info_1_${SUFFIX}_${String(caseNo).padStart(2, "0")}`;
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
