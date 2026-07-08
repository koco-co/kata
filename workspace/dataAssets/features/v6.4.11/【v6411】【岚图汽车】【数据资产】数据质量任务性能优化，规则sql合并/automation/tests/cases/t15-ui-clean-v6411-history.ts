import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, type Locator, type Page, test } from "@playwright/test";

import { formatV6411ShortRuleName, loadV6411UiCaseMetas } from "../data/v6411-ui-case-specs";

type CleanupTarget = {
  caseNo: number;
  datasourceName: string;
  fullTableName: string;
  tableName: string;
  ruleName: string;
  query: string;
  source: "automation-prefix" | "legacy-record-map" | "ui-rebuild-progress" | "current-short-name";
};

type CleanupResult = {
  area: "rule-task" | "rule-set";
  caseNo: number;
  source: CleanupTarget["source"];
  query: string;
  tableName: string;
  ruleName: string;
  status: "deleted" | "missing" | "failed";
  deletedCount: number;
  error?: string;
};

const FEATURE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const RECORDS_PATH = path.join(FEATURE_DIR, "automation/V6411-PW-72-RECORDS.md");
const RUNS_DIRS = [path.join(FEATURE_DIR, "automation/runs"), path.join(FEATURE_DIR, "runs")];
const OUT_DIR = path.resolve(
  process.env.V6411_UI_CLEAN_OUT_DIR ?? defaultRunSubdir("ui-clean-history", "runs/20260703-v6411-ui-clean-history"),
);
const RESULT_JSON = path.join(OUT_DIR, "ui-clean-history-results.json");
const PROGRESS_JSONL = path.join(OUT_DIR, "ui-clean-history-progress.jsonl");
const BASE_URL = process.env.V6411_DQ_BASE_URL ?? "http://shuzhan63-test-ltqc.k8s.dtstack.cn";
const PROJECT_ID = process.env.V6411_DQ_PROJECT_ID ?? "92";
const CLEAN_MAX_DELETE_ATTEMPTS = Number(process.env.V6411_CLEAN_MAX_DELETE_ATTEMPTS ?? 500);
const CLEAN_HISTORY_MODE = process.env.V6411_CLEAN_HISTORY_MODE ?? "latest";
const CLEAN_HISTORY_FILE_LIMIT = Number(process.env.V6411_CLEAN_HISTORY_FILE_LIMIT ?? 5);
const CLEAN_AUTOMATION_PREFIX = process.env.V6411_CLEAN_AUTOMATION_PREFIX ?? "test_info_1_";
const CLEAN_PREFIX_ONLY = process.env.V6411_CLEAN_PREFIX_ONLY !== "0";
const CLEAN_CONFIRM_TIMEOUT_MS = Number(process.env.V6411_CLEAN_CONFIRM_TIMEOUT_MS ?? 60_000);
const SESSION_PATH = path.resolve(
  process.cwd(),
  process.env.V6411_DQ_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
);
const CASE_FILTER = parseCaseFilter(
  process.env.V6411_CLEAN_CASES ?? process.env.V6411_UI_REBUILD_CASES ?? process.env.V6411_UI_CASES,
);

function defaultRunSubdir(subdir: string, fallbackRelativePath: string): string {
  if (process.env.KATA_ALLURE_RESULTS_DIR) {
    return path.join(path.dirname(path.resolve(process.env.KATA_ALLURE_RESULTS_DIR)), subdir);
  }
  return path.join(FEATURE_DIR, fallbackRelativePath);
}

test.use({ storageState: SESSION_PATH });
test.setTimeout(Number(process.env.V6411_UI_CLEAN_TIMEOUT_MS ?? 90 * 60 * 1000));

test.describe("v6411 历史脏数据 UI 清理", () => {
  test("UI 删除旧规则任务和旧规则集记录", async ({ page }) => {
    const sourceRef = "SR-UI-V6411-CLEAN-HISTORY";
    const targets = loadCleanupTargets();
    expect(targets.length, `${sourceRef}: 清理目标不能为空`).toBeGreaterThan(0);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(PROGRESS_JSONL, "");

    const results: CleanupResult[] = [];
    let abortCleanup = false;

    await test.step("步骤1: UI 进入规则任务管理并删除旧任务", async () => {
      await gotoDataQualityPage(page, "/dq/rule");
      await expect(page.locator("body"), `${sourceRef}: 规则任务管理页面应可见`).toContainText("规则任务管理", {
        timeout: 30_000,
      });
      await attachScreenshot(page, "clean-01-rule-task-list-before");
      for (const target of targets) {
        const result = await deleteByTableName(page, "rule-task", target, sourceRef);
        results.push(result);
        recordProgress(result);
        if (result.status === "failed") {
          abortCleanup = true;
          break;
        }
      }
      await attachScreenshot(page, "clean-02-rule-task-list-after");
    });

    await test.step("步骤2: UI 进入规则集管理并删除旧规则集", async () => {
      if (abortCleanup) return;
      await gotoDataQualityPage(page, "/dq/ruleSet");
      await expect(page.locator("body"), `${sourceRef}: 规则集管理页面应可见`).toContainText("规则集管理", {
        timeout: 30_000,
      });
      await attachScreenshot(page, "clean-03-rule-set-list-before");
      for (const target of targets) {
        const result = await deleteByTableName(page, "rule-set", target, sourceRef);
        results.push(result);
        recordProgress(result);
        if (result.status === "failed") {
          abortCleanup = true;
          break;
        }
      }
      await attachScreenshot(page, "clean-04-rule-set-list-after");
    });

    fs.writeFileSync(RESULT_JSON, JSON.stringify(results, null, 2));
    await test.info().attach("ui-clean-history-results.json", {
      body: JSON.stringify(results, null, 2),
      contentType: "application/json",
    });
    await test.info().attach("ui-clean-history-progress.jsonl", {
      body: fs.readFileSync(PROGRESS_JSONL),
      contentType: "application/jsonl",
    });

    const failed = results.filter((item) => item.status === "failed");
    expect(failed, `${sourceRef}: UI 清理不应存在失败项，详见 ${RESULT_JSON}`).toEqual([]);
  });
});

function recordProgress(result: CleanupResult): void {
  const line = JSON.stringify({ at: new Date().toISOString(), ...result });
  fs.appendFileSync(PROGRESS_JSONL, `${line}\n`);
  console.log(
    `[v6411-clean] ${result.area} §${padCaseNo(result.caseNo)} ${result.source} query=${result.query} ${result.status} deleted=${result.deletedCount}${result.error ? ` error=${result.error}` : ""}`,
  );
}

function parseCaseFilter(value: string | undefined): Set<number> {
  const set = new Set<number>();
  for (const part of (value ?? "").split(",")) {
    const trimmed = part.trim();
    const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      for (let caseNo = Math.min(start, end); caseNo <= Math.max(start, end); caseNo += 1) {
        if (caseNo >= 1 && caseNo <= 72) set.add(caseNo);
      }
      continue;
    }
    const number = Number(trimmed);
    if (Number.isFinite(number) && number > 0) set.add(number);
  }
  return set;
}

function loadCleanupTargets(): CleanupTarget[] {
  const explicitTargets = loadExplicitCleanupTargets();
  if (explicitTargets.length > 0) return filterTargetsByCase(explicitTargets);
  if (CLEAN_PREFIX_ONLY && isFullCleanupScope()) return loadAutomationPrefixTargets();
  const targets = [
    ...(isFullCleanupScope() ? loadAutomationPrefixTargets() : []),
    ...loadLegacyRecordTargets(),
    ...loadUiRebuildProgressTargets(),
    ...loadCurrentShortNameTargets(),
  ];
  const byKey = new Map<string, CleanupTarget>();
  for (const target of targets) {
    if (!target.query) continue;
    byKey.set(`${target.caseNo}|${target.query}`, target);
  }
  const records = filterTargetsByCase(
    [...byKey.values()].sort((left, right) => left.caseNo - right.caseNo || left.query.localeCompare(right.query)),
  );
  const expectedMinimum = isFullCleanupScope() ? 72 : CASE_FILTER.size;
  if (records.length < expectedMinimum) throw new Error(`expected at least ${expectedMinimum} cleanup targets, got ${records.length}`);
  return records;
}

function filterTargetsByCase(targets: CleanupTarget[]): CleanupTarget[] {
  if (CASE_FILTER.size === 0) return targets;
  return targets.filter((item) => CASE_FILTER.has(item.caseNo));
}

function isFullCleanupScope(): boolean {
  return CASE_FILTER.size === 0 || CASE_FILTER.size === 72;
}

function loadAutomationPrefixTargets(): CleanupTarget[] {
  if (!CLEAN_AUTOMATION_PREFIX.trim()) return [];
  return [
    {
      caseNo: 1,
      datasourceName: "",
      fullTableName: "",
      tableName: CLEAN_AUTOMATION_PREFIX,
      ruleName: "",
      query: CLEAN_AUTOMATION_PREFIX,
      source: "automation-prefix",
    },
  ];
}

function loadExplicitCleanupTargets(): CleanupTarget[] {
  const value = process.env.V6411_UI_CLEAN_TARGETS;
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [caseNoPart, queryPart] = part.includes(":") ? part.split(/:(.+)/).filter(Boolean) : ["1", part];
      const caseNo = Number(caseNoPart);
      const query = (queryPart ?? "").trim();
      if (!Number.isFinite(caseNo) || caseNo < 1 || caseNo > 72 || !query) {
        throw new Error(`invalid V6411_UI_CLEAN_TARGETS item: ${part}`);
      }
      return {
        caseNo,
        datasourceName: "",
        fullTableName: query.includes(".") ? query : `pw_test.${query}`,
        tableName: query.split(".").at(-1) ?? query,
        ruleName: "",
        query,
        source: "ui-rebuild-progress" as const,
      };
    });
}

function loadLegacyRecordTargets(): CleanupTarget[] {
  const text = fs.readFileSync(RECORDS_PATH, "utf8");
  const records: CleanupTarget[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("| §")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 8) continue;
    const caseNo = Number(cells[0].replace(/^§/, ""));
    const ruleName = cells[1];
    const datasourceName = cells[2];
    const fullTableName = cells[3];
    if (!Number.isFinite(caseNo) || !fullTableName.includes("test_info_1_")) continue;
    const tableName = fullTableName.split(".").at(-1) ?? fullTableName;
    records.push({
      caseNo,
      datasourceName,
      fullTableName,
      tableName,
      ruleName,
      query: tableName,
      source: "legacy-record-map",
    });
  }
  return records;
}

function loadUiRebuildProgressTargets(): CleanupTarget[] {
  const files = selectHistoryRecordFiles(
    RUNS_DIRS.flatMap((dir) => findRunRecordFiles(dir, new Set(["ui-rebuild-created-records.jsonl", "ui-rebuild-results.jsonl"]))),
  );
  const records: CleanupTarget[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const parsed = parseJsonLine(line);
      const caseNo = Number(parsed?.caseNo);
      const tableName = String(parsed?.tableName ?? "").trim();
      const fullTableName = String(parsed?.fullTableName ?? (tableName ? `pw_test.${tableName}` : "")).trim();
      const ruleName = String(parsed?.ruleName ?? "").trim();
      const datasourceName = String(parsed?.datasourceName ?? "").trim();
      if (!Number.isFinite(caseNo) || !tableName.includes("test_info_1_")) continue;
      records.push({
        caseNo,
        datasourceName,
        fullTableName,
        tableName,
        ruleName,
        query: tableName,
        source: "ui-rebuild-progress",
      });
    }
  }
  return records;
}

function selectHistoryRecordFiles(files: string[]): string[] {
  if (CLEAN_HISTORY_MODE === "none") return [];
  const sorted = files.sort((left, right) => fileMtimeMs(right) - fileMtimeMs(left));
  if (CLEAN_HISTORY_MODE === "all") return sorted;
  return sorted.slice(0, Math.max(0, CLEAN_HISTORY_FILE_LIMIT));
}

function fileMtimeMs(file: string): number {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

function loadCurrentShortNameTargets(): CleanupTarget[] {
  return loadV6411UiCaseMetas().map((meta) => ({
    caseNo: meta.caseNo,
    datasourceName: meta.datasourceName,
    fullTableName: "",
    tableName: "",
    ruleName: formatV6411ShortRuleName(meta.caseNo, meta.fullTitle),
    query: formatV6411ShortRuleName(meta.caseNo, meta.fullTitle),
    source: "current-short-name" as const,
  }));
}

function parseJsonLine(line: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(line);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

function findRunRecordFiles(rootDir: string, filenames: Set<string>): string[] {
  if (!fs.existsSync(rootDir)) return [];
  const result: string[] = [];
  const visit = (dir: string, depth: number): void => {
    if (depth > 4) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && filenames.has(entry.name)) {
        result.push(fullPath);
        continue;
      }
      if (!entry.isDirectory()) continue;
      if (/^(allure-results|test-results|playwright)$/.test(entry.name)) continue;
      visit(fullPath, depth + 1);
    }
  };
  visit(rootDir, 0);
  return result;
}

async function installProject(page: Page): Promise<void> {
  await page.addInitScript(
    (projectId) => {
      for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
        sessionStorage.setItem(key, projectId);
        localStorage.setItem(key, projectId);
      }
    },
    PROJECT_ID,
  );
}

async function injectProject(page: Page): Promise<void> {
  await page.evaluate((projectId) => {
    for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
      sessionStorage.setItem(key, projectId);
      localStorage.setItem(key, projectId);
    }
  }, PROJECT_ID);
}

async function gotoDataQualityPage(page: Page, routePath: string): Promise<void> {
  await page.keyboard.press("Escape").catch(() => {});
  await installProject(page);
  const response = await gotoAppHash(page, routePath);
  await injectProject(page);
  await expect(page, `应导航到 ${routePath}`).toHaveURL(new RegExp(`#${escapeRegExp(routePath)}(?:\\?|$)`), {
    timeout: 30_000,
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await assertAuthenticated(page);
  const status = response?.status() ?? 0;
  expect(status < 500, `页面 ${routePath} HTTP 状态应小于 500，实际 ${status}`).toBe(true);
}

async function gotoAppHash(page: Page, routePath: string) {
  const targetUrl = `${BASE_URL}/dataAssets/#${routePath}?pid=${PROJECT_ID}`;
  try {
    return await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
  } catch {
    const response = await page.goto(`${BASE_URL}/dataAssets/`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await injectProject(page);
    await page.evaluate((hash) => {
      window.location.hash = hash;
    }, `${routePath}?pid=${PROJECT_ID}`);
    return response;
  }
}

async function assertAuthenticated(page: Page): Promise<void> {
  const url = page.url();
  const loginTextVisible = await page
    .getByText(/欢迎登录产品中心|请输入注册账号|请输入密码/)
    .first()
    .isVisible({ timeout: 1_000 })
    .catch(() => false);
  if (!/\/uic\/#\/login|\/login/.test(url) && !loginTextVisible) return;
  throw new Error(`会话已过期，请先运行 auth-refresh.spec.ts 刷新登录态：${SESSION_PATH}`);
}

async function deleteByTableName(
  page: Page,
  area: CleanupResult["area"],
  target: CleanupTarget,
  sourceRef: string,
): Promise<CleanupResult> {
  let deletedCount = 0;
  try {
    await searchByTarget(page, target.query, sourceRef, { attachRows: true });
    for (let attempt = 0; attempt < CLEAN_MAX_DELETE_ATTEMPTS; attempt += 1) {
      if (page.isClosed()) throw new Error("页面已关闭，停止清理");
      await waitTableSettled(page);
      const row = tableRow(page, target.query).first();
      if (!(await row.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await attachVisibleTableRows(page, `${sourceRef}-search-${sanitizeAttachmentName(target.query)}-remaining-rows.txt`);
        return {
          area,
          caseNo: target.caseNo,
          source: target.source,
          query: target.query,
          tableName: target.tableName,
          ruleName: target.ruleName,
          status: deletedCount > 0 ? "deleted" : "missing",
          deletedCount,
        };
      }
      const beforeRowText = normalizeRowText(await row.innerText({ timeout: 5_000 }).catch(() => ""));
      if (area === "rule-task") await closeTaskDetectionIfOpen(page, row, target, `${sourceRef}-${area}-§${padCaseNo(target.caseNo)}`);
      await deleteVisibleRow(page, row, `${sourceRef}-${area}-§${padCaseNo(target.caseNo)}`);
      await searchByTarget(page, target.query, sourceRef);
      const afterRows = await visibleTableRowTexts(page);
      const deletedRowStillVisible = beforeRowText.length > 0 && afterRows.includes(beforeRowText);
      if (deletedRowStillVisible) {
        await attachVisibleTableRows(page, `${sourceRef}-delete-no-progress-${sanitizeAttachmentName(target.query)}-rows.txt`);
        return {
          area,
          caseNo: target.caseNo,
          source: target.source,
          query: target.query,
          tableName: target.tableName,
          ruleName: target.ruleName,
          status: "failed",
          deletedCount,
          error: `删除后目标行仍在当前搜索结果中: ${beforeRowText.slice(0, 160)}`,
        };
      }
      deletedCount += 1;
      console.log(
        `[v6411-clean] ${area} §${padCaseNo(target.caseNo)} ${target.source} query=${target.query} deleting-progress=${deletedCount}`,
      );
    }
    return {
      area,
      caseNo: target.caseNo,
      source: target.source,
      query: target.query,
      tableName: target.tableName,
      ruleName: target.ruleName,
      status: "failed",
      deletedCount,
      error: `${CLEAN_MAX_DELETE_ATTEMPTS} 次删除后仍能搜索到记录`,
    };
  } catch (error) {
    return {
      area,
      caseNo: target.caseNo,
      source: target.source,
      query: target.query,
      tableName: target.tableName,
      ruleName: target.ruleName,
      status: "failed",
      deletedCount,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function searchByTarget(
  page: Page,
  query: string,
  sourceRef: string,
  options: { attachRows?: boolean } = {},
): Promise<void> {
  const input = page
    .getByPlaceholder(/输入表名搜索|请输入表名\/任务名称搜索|请输入表名|表名/)
    .or(page.locator("input[placeholder*='表名']"))
    .first();
  await expect(input, `${sourceRef}: 页面应展示表名搜索输入框`).toBeVisible({ timeout: 30_000 });
  await input.click({ timeout: 30_000 });
  await input.fill(query, { timeout: 30_000 });
  await expect(input, `${sourceRef}: 搜索框应回显 ${query}`).toHaveValue(query, { timeout: 30_000 });
  let searchButton = input
    .locator("xpath=ancestor::*[contains(@class, 'ant-input-search')][1]")
    .locator("button:visible")
    .filter({ has: page.locator(".anticon-search") })
    .first();
  if (!(await searchButton.isVisible({ timeout: 2_000 }).catch(() => false))) {
    searchButton = page.locator("button:visible").filter({ has: page.locator(".anticon-search") }).first();
  }
  await expect(searchButton, `${sourceRef}: 页面应展示可见搜索按钮`).toBeVisible({ timeout: 30_000 });
  await searchButton.click({ timeout: 30_000 });
  await waitTableSettled(page);
  await page.waitForTimeout(1_000);
  if (options.attachRows) {
    await attachVisibleTableRows(page, `${sourceRef}-search-${sanitizeAttachmentName(query)}-rows.txt`);
  }
}

async function attachVisibleTableRows(page: Page, name: string): Promise<void> {
  const rows = await visibleTableRowTexts(page).catch((error) => [`<failed to read rows: ${String(error)}>`]);
  await test.info().attach(name, {
    body: rows.length ? rows.join("\n") : "<no visible rows>",
    contentType: "text/plain",
  });
}

async function visibleTableRowTexts(page: Page): Promise<string[]> {
  const rawTexts = await page
    .locator(".ant-table-tbody tr:visible")
    .evaluateAll((items) => items.map((item) => item.textContent ?? ""));
  return rawTexts.map(normalizeRowText).filter(Boolean).slice(0, 30);
}

function normalizeRowText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeAttachmentName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tableRow(page: Page, query: string): Locator {
  return page.locator(".ant-table-tbody tr").filter({ hasText: query });
}

async function closeTaskDetectionIfOpen(page: Page, row: Locator, target: CleanupTarget, sourceRef: string): Promise<void> {
  const rowText = ((await row.innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
  if (!/已开启检测/.test(rowText)) return;
  await centerRowInViewport(page, row);
  const checkbox = row.locator(".ant-checkbox-wrapper:visible, input[type='checkbox']:visible").first();
  await expect(checkbox, `${sourceRef}: 已开启检测任务应可勾选后关闭检测`).toBeVisible({ timeout: 30_000 });
  await checkbox.click({ force: true, timeout: 30_000 });
  const closeButton = page.locator("button:visible").filter({ hasText: /^关\s*闭\s*检\s*测$/ }).last();
  await expect(closeButton, `${sourceRef}: 勾选任务后应展示关闭检测按钮`).toBeVisible({ timeout: 30_000 });
  await closeButton.click({ force: true, timeout: 30_000 });
  const confirm = page
    .locator(".ant-modal-wrap:visible, .ant-popover:visible, .ant-modal-confirm:visible, .ant-modal:visible")
    .filter({ hasText: /批量关闭检测|关闭检测|确认|确定/ })
    .last();
  await expect(confirm, `${sourceRef}: 关闭检测后应展示确认框`).toBeVisible({ timeout: 30_000 });
  const ok = confirm.locator("button:visible").filter({ hasText: /确\s*定|确\s*认|OK|是/ }).last();
  await expect(ok, `${sourceRef}: 关闭检测确认框应展示确定按钮`).toBeVisible({ timeout: 30_000 });
  await ok.click({ force: true, timeout: 30_000 });
  await expect(confirm, `${sourceRef}: 关闭检测确认框应关闭`).toBeHidden({ timeout: 60_000 });
  await waitTableSettled(page);
  await searchByTarget(page, target.query, sourceRef);
  const refreshedRow = tableRow(page, target.query).first();
  await expect(refreshedRow, `${sourceRef}: 关闭检测后目标任务行仍应存在以便删除`).toBeVisible({ timeout: 30_000 });
  await expect(refreshedRow, `${sourceRef}: 关闭检测后任务不应继续显示已开启检测`).not.toContainText("已开启检测", {
    timeout: 60_000,
  });
}

async function deleteVisibleRow(page: Page, row: Locator, sourceRef: string): Promise<void> {
  await clickRowDeleteEntry(page, row, sourceRef);

  const confirm = page
    .locator(".ant-popover:visible, .ant-modal-confirm:visible, .ant-modal:visible")
    .filter({ hasText: /删除|确认|确定/ })
    .last();
  await expect(confirm, `${sourceRef}: 删除后应展示二次确认`).toBeVisible({ timeout: 30_000 });
  const ok = confirm.getByRole("button", { name: /删\s*除|确\s*定|确\s*认|OK|是/ }).last();
  await expect(ok, `${sourceRef}: 删除确认框应展示确定按钮`).toBeVisible({ timeout: 30_000 });
  const success = page
    .locator(".ant-message-notice-content, .ant-notification-notice-message")
    .filter({ hasText: /删除成功|成功|操作成功/ })
    .first();
  const successPromise = success.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
  if (await isButtonLoading(ok)) {
    await waitDeleteOutcome(page, confirm, success, CLEAN_CONFIRM_TIMEOUT_MS);
    await successPromise;
    await waitTableSettled(page);
    return;
  }
  try {
    await ok.click({ timeout: 5_000, force: true });
  } catch (error) {
    const submitted = await waitDeleteOutcome(page, confirm, success, 2_000).catch(() => false);
    if (!submitted) {
      const loading = await isButtonLoading(ok);
      if (!loading) {
        await clickButtonByDom(ok).catch(() => {
          throw error;
        });
      }
    }
  }
  await waitDeleteOutcome(page, confirm, success, CLEAN_CONFIRM_TIMEOUT_MS);
  await successPromise;
  await waitTableSettled(page);
}

async function clickRowDeleteEntry(page: Page, row: Locator, sourceRef: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await waitTableSettled(page);
      await centerRowInViewport(page, row);
      const deleteButton = row.locator("a:visible, button:visible").filter({ hasText: /^删\s*除$/ }).last();
      await expect(deleteButton, `${sourceRef}: 行内应展示删除入口`).toBeVisible({ timeout: 30_000 });
      await deleteButton.click({ timeout: 10_000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 3) break;
      await page.waitForTimeout(1_000);
    }
  }
  throw lastError;
}

async function centerRowInViewport(page: Page, row: Locator): Promise<void> {
  await row
    .evaluate((element) => {
      element.scrollIntoView({ block: "center", inline: "nearest" });
    })
    .catch(() => {});
  await page.waitForTimeout(200);
}

async function clickButtonByDom(button: Locator): Promise<void> {
  await button.evaluate((element) => {
    (element as HTMLElement).click();
  });
}

async function waitDeleteOutcome(page: Page, confirm: Locator, success: Locator, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await success.isVisible({ timeout: 500 }).catch(() => false)) return true;
    if (await confirm.isHidden({ timeout: 500 }).catch(() => false)) return true;
    await page.waitForTimeout(500);
  }
  throw new Error(`删除确认提交后 ${timeoutMs}ms 内未返回成功或关闭确认框`);
}

async function isButtonLoading(button: Locator): Promise<boolean> {
  return button
    .evaluate((element) => {
      const className = typeof element.className === "string" ? element.className : "";
      return className.includes("ant-btn-loading") || element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
    })
    .catch(() => false);
}

async function waitTableSettled(page: Page): Promise<void> {
  await expect(page.locator(".ant-spin-spinning:visible")).toHaveCount(0, { timeout: 60_000 });
}

function padCaseNo(caseNo: number): string {
  return String(caseNo).padStart(2, "0");
}

async function attachScreenshot(page: Page, name: string): Promise<void> {
  await test.info().attach(`${name}.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}
