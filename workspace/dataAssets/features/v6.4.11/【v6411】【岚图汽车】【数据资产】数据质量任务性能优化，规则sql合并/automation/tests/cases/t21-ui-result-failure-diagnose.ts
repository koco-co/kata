import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, type Locator, type Page } from "@playwright/test";

type CaseDiagnostic = {
  caseNo: number;
  rowText: string;
  tooltipTexts: string[];
  clickableTexts: string[];
  detailTexts: string[];
  logTexts: string[];
  routeAfterClicks: string;
};

type SourceRecord = {
  caseNo: number;
  tableName: string;
  ruleName: string;
};

const FEATURE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const RUNS_DIR = path.join(FEATURE_DIR, "runs");
const OUT_DIR = path.resolve(
  process.env.V6411_UI_FAILURE_DIAG_OUT_DIR ?? path.join(FEATURE_DIR, "runs/20260705-v6411-ui-failure-diagnose"),
);
const RESULT_JSON = path.join(OUT_DIR, "ui-result-failure-diagnose.json");
const RESULT_JSONL = path.join(OUT_DIR, "ui-result-failure-diagnose.jsonl");
const BASE_URL = process.env.V6411_DQ_BASE_URL ?? "http://shuzhan63-test-ltqc.k8s.dtstack.cn";
const PROJECT_ID = process.env.V6411_DQ_PROJECT_ID ?? "92";
const PROJECT_NAME = process.env.V6411_DQ_PROJECT_NAME ?? "pw_test";
const DIAG_DATE_FROM = process.env.V6411_UI_DIAG_DATE_FROM;
const DIAG_DATE_TO = process.env.V6411_UI_DIAG_DATE_TO;
const CASE_NOS = (process.env.V6411_UI_DIAG_CASES ?? "1,37")
  .split(",")
  .map((item) => Number(item.trim()))
  .filter((item) => Number.isInteger(item) && item >= 1 && item <= 72);
const SESSION_PATH = path.resolve(
  process.cwd(),
  process.env.V6411_DQ_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
);

test.use({ storageState: SESSION_PATH });
test.setTimeout(Number(process.env.V6411_UI_FAILURE_DIAG_TIMEOUT_MS ?? 10 * 60 * 1000));

test("诊断 v6411 校验异常结果的 UI 可见详情", async ({ page }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(RESULT_JSONL, "");
  const sources = readSourceRecords();
  await gotoTaskQuery(page);

  const diagnostics: CaseDiagnostic[] = [];
  for (const caseNo of CASE_NOS) {
    const source = sources.get(caseNo);
    await closeVisibleOverlays(page);
    await gotoTaskQuery(page);
    await searchTaskOrTable(page, source?.tableName ?? "");
    const row = source ? await findRowBySource(page, source) : await findRowByCaseNo(page, caseNo);
    await expect(row, `应找到 §${String(caseNo).padStart(2, "0")} 结果行`).toBeVisible({ timeout: 30_000 });

    const rowText = await normalizedInnerText(row);
    const tooltipTexts = await collectTooltipTexts(page, row);
    const clickableTexts = await collectClickableTexts(row);
    const { detailTexts, logTexts } = await tryOpenVisibleDetails(page, row, caseNo, source);
    const routeAfterClicks = page.url();
    const diagnostic: CaseDiagnostic = {
      caseNo,
      rowText,
      tooltipTexts,
      clickableTexts,
      detailTexts,
      logTexts,
      routeAfterClicks,
    };
    diagnostics.push(diagnostic);
    fs.writeFileSync(RESULT_JSON, JSON.stringify(diagnostics, null, 2));
    fs.appendFileSync(RESULT_JSONL, `${JSON.stringify(diagnostic)}\n`);
    console.log(
      `[v6411-failure-diagnose] ${JSON.stringify({
        caseNo,
        tooltipTexts,
        detailCount: detailTexts.length,
        logCount: logTexts.length,
        firstDetail: compactText(detailTexts[0] ?? "").slice(0, 300),
        firstLog: compactText(logTexts[0] ?? "").slice(0, 300),
      })}`,
    );
    await test.info().attach(`case-${caseNo}-diagnostic.json`, {
      body: JSON.stringify(diagnostic, null, 2),
      contentType: "application/json",
    });
    await test.info().attach(`case-${caseNo}-diagnostic.png`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  }

  fs.writeFileSync(RESULT_JSON, JSON.stringify(diagnostics, null, 2));
  await test.info().attach("ui-result-failure-diagnose.json", {
    body: JSON.stringify(diagnostics, null, 2),
    contentType: "application/json",
  });
});

function readSourceRecords(): Map<number, SourceRecord> {
  const sourcePath = process.env.V6411_UI_FAILURE_DIAG_SOURCE
    ? path.resolve(process.env.V6411_UI_FAILURE_DIAG_SOURCE)
    : resolveSourcePath();
  const result = new Map<number, SourceRecord>();
  for (const line of fs.readFileSync(sourcePath, "utf8").split(/\n/).filter(Boolean)) {
    const parsed = JSON.parse(line) as SourceRecord;
    if (!parsed.caseNo || !parsed.tableName || !parsed.ruleName) continue;
    result.set(parsed.caseNo, {
      caseNo: parsed.caseNo,
      tableName: parsed.tableName,
      ruleName: parsed.ruleName,
    });
  }
  return result;
}

function resolveSourcePath(): string {
  const candidates = findFiles(RUNS_DIR, "ui-rebuild-results.jsonl")
    .filter((filePath) => safeCountCases(filePath) >= 72)
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
  if (!candidates[0]) throw new Error(`未找到包含 72 条记录的 ui-rebuild-results.jsonl: ${RUNS_DIR}`);
  return candidates[0];
}

function findFiles(dir: string, filename: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...findFiles(fullPath, filename));
    if (entry.isFile() && entry.name === filename) files.push(fullPath);
  }
  return files;
}

function safeCountCases(filePath: string): number {
  try {
    const cases = new Set<number>();
    for (const line of fs.readFileSync(filePath, "utf8").split(/\n/).filter(Boolean)) {
      const parsed = JSON.parse(line) as SourceRecord;
      if (parsed.caseNo) cases.add(parsed.caseNo);
    }
    return cases.size;
  } catch {
    return 0;
  }
}

async function gotoTaskQuery(page: Page): Promise<void> {
  await page.addInitScript(
    (projectId) => {
      for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
        sessionStorage.setItem(key, projectId);
        localStorage.setItem(key, projectId);
      }
    },
    PROJECT_ID,
  );
  await page.goto(`${BASE_URL}/dataAssets/#/dq/taskQuery?pid=${PROJECT_ID}`, {
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
  await expect(page.locator("body")).toContainText(/校验结果查询/, { timeout: 30_000 });
  await applyOptionalDateRange(page);
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

async function searchTaskOrTable(page: Page, query: string): Promise<void> {
  await closeVisibleOverlays(page);
  const input = page.getByPlaceholder(/请输入表名\/任务名称搜索|请输入表名|任务名称/).or(page.locator("input[placeholder*='表名']")).first();
  await expect(input, "校验结果查询应展示搜索输入框").toBeVisible({ timeout: 30_000 });
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
  await expect(page.locator(".ant-spin-spinning"), "搜索后加载遮罩应消失").toHaveCount(0, { timeout: 60_000 });
  await page.waitForTimeout(800);
}

async function applyOptionalDateRange(page: Page): Promise<void> {
  if (!DIAG_DATE_FROM && !DIAG_DATE_TO) return;
  const from = DIAG_DATE_FROM ?? DIAG_DATE_TO;
  const to = DIAG_DATE_TO ?? DIAG_DATE_FROM;
  if (!from || !to) return;

  await setDateInput(page.getByPlaceholder("开始日期").first(), from);
  await setDateInput(page.getByPlaceholder("结束日期").first(), to);
  await page.keyboard.press("Escape").catch(() => {});
  await expect(page.locator(".ant-picker-dropdown:visible"), "日期选择浮层应关闭").toHaveCount(0, { timeout: 5_000 }).catch(() => {});
}

async function setDateInput(input: Locator, value: string): Promise<void> {
  await expect(input, `计划时间日期输入框应可见: ${value}`).toBeVisible({ timeout: 30_000 });
  await input.click({ timeout: 30_000 });
  await input.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await input.type(value, { delay: 10 });
  await input.press("Enter");
}

async function findRowByCaseNo(page: Page, caseNo: number): Promise<Locator> {
  const marker = new RegExp(`§\\s*0?${caseNo}(?!\\d)`);
  for (let pageIndex = 1; pageIndex <= 10; pageIndex += 1) {
    const row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: marker }).first();
    if (await row.isVisible({ timeout: 2_000 }).catch(() => false)) return row;
    const next = page.locator(".ant-pagination-next:visible").last();
    const className = await next.getAttribute("class").catch(() => "");
    if (!className || className.includes("ant-pagination-disabled")) break;
    await next.click({ timeout: 30_000 });
    await expect(page.locator(".ant-spin-spinning"), "翻页后加载遮罩应消失").toHaveCount(0, { timeout: 60_000 });
    await page.waitForTimeout(500);
  }
  return page.locator(".ant-table-tbody tr:visible").filter({ hasText: marker }).first();
}

async function findRowBySource(page: Page, source: SourceRecord): Promise<Locator> {
  const row = page
    .locator(".ant-table-tbody tr:visible")
    .filter({ hasText: source.tableName })
    .filter({ hasText: source.ruleName })
    .first();
  if (await row.isVisible({ timeout: 3_000 }).catch(() => false)) return row;
  return findRowByCaseNo(page, source.caseNo);
}

async function collectTooltipTexts(page: Page, row: Locator): Promise<string[]> {
  const candidates = row.locator(".anticon-question-circle, [aria-label='question-circle'], .ant-tag, td").filter({ hasText: /校验异常|异常|\?/ });
  const count = Math.min(await candidates.count().catch(() => 0), 8);
  const texts: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const item = candidates.nth(index);
    if (!(await item.isVisible({ timeout: 500 }).catch(() => false))) continue;
    await item.hover({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(500);
    const tooltipText = await page
      .locator(".ant-tooltip:visible, [role='tooltip']:visible")
      .evaluateAll((items) => items.map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean))
      .catch(() => []);
    texts.push(...tooltipText);
  }
  return [...new Set(texts)];
}

async function collectClickableTexts(row: Locator): Promise<string[]> {
  return row
    .locator("a:visible, button:visible, [role='button']:visible")
    .evaluateAll((items) => items.map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean))
    .catch(() => []);
}

async function tryOpenVisibleDetails(
  page: Page,
  row: Locator,
  caseNo: number,
  source: SourceRecord | undefined,
): Promise<{ detailTexts: string[]; logTexts: string[] }> {
  const details: string[] = [];
  const logTexts: string[] = [];
  const clickable = row.locator("a:visible, button:visible, [role='button']:visible").first();
  if (!(await clickable.isVisible({ timeout: 1_000 }).catch(() => false))) return { detailTexts: details, logTexts };

  await clickable.click({ timeout: 10_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(Number(process.env.V6411_UI_FAILURE_DIAG_DETAIL_WAIT_MS ?? 3_000));
  await page.getByText(/完整性校验|监控报告|表级报告|重跑失败规则/).first().waitFor({ timeout: 10_000 }).catch(() => {});

  const overlays = page.locator(".ant-drawer:visible, .dtc-drawer:visible, .ant-modal:visible");
  const overlayCount = await overlays.count().catch(() => 0);
  for (let index = 0; index < overlayCount; index += 1) {
    const text = await normalizedInnerText(overlays.nth(index)).catch(() => "");
    if (text) details.push(text);
  }
  const bodyText = await normalizedInnerText(page.locator("body")).catch(() => "");
  if (bodyText && !details.includes(bodyText)) details.push(`[body after detail click]\n${bodyText}`);
  await collectOptionalReportDetails(page, details);
  const detailOverlay = overlays.last();
  const logCount = await detailOverlay.getByText(/查看日志/).count().catch(() => 0);

  if (details.length === 0 && page.url().includes("/dq/taskQuery") === false) {
    details.push(await normalizedInnerText(page.locator("body")).catch(() => ""));
  }

  await test.info().attach(`case-${caseNo}-detail-after-click.txt`, {
    body: details.join("\n\n---\n\n") || "(no visible detail)",
    contentType: "text/plain",
  });
  await closeVisibleOverlays(page);

  logTexts.push(...(await tryOpenAllLogsByReopening(page, caseNo, logCount, source)));

  await test.info().attach(`case-${caseNo}-all-logs.txt`, {
    body: logTexts.join("\n\n--- log ---\n\n") || "(no visible log text)",
    contentType: "text/plain",
  });
  return { detailTexts: details, logTexts };
}

async function collectOptionalReportDetails(page: Page, details: string[]): Promise<void> {
  const max = Number(process.env.V6411_UI_FAILURE_DIAG_CLICK_DETAIL_COUNT ?? 0);
  if (!Number.isFinite(max) || max <= 0) return;
  const detailLinks = page.getByText("查看明细");
  for (let index = 0; index < max; index += 1) {
    const link = detailLinks.nth(index);
    if (!(await link.isVisible({ timeout: 1_000 }).catch(() => false))) break;
    const beforeOverlayCount = await visibleOverlayCount(page);
    await link.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => {});
    await link.click({ timeout: 10_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(Number(process.env.V6411_UI_FAILURE_DIAG_DETAIL_WAIT_MS ?? 3_000));

    const overlayText = await collectTopLogOverlayText(page, beforeOverlayCount).catch(() => "");
    const bodyText = await normalizedInnerText(page.locator("body")).catch(() => "");
    details.push(`[查看明细 ${index + 1}]\n${overlayText || bodyText || "(no detail text)"}`);
    await closeVisibleOverlays(page);
  }
}

async function normalizedInnerText(locator: Locator): Promise<string> {
  return ((await locator.innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
}

function compactText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

async function tryOpenAllLogsByReopening(
  page: Page,
  caseNo: number,
  logCount: number,
  source: SourceRecord | undefined,
): Promise<string[]> {
  const result: string[] = [];
  const maxLogs = Math.min(logCount, Number(process.env.V6411_UI_FAILURE_DIAG_MAX_LOGS_PER_CASE ?? 30));

  for (let index = 0; index < maxLogs; index += 1) {
    await closeVisibleOverlays(page);
    await gotoTaskQuery(page);
    await searchTaskOrTable(page, source?.tableName ?? "");
    const row = source ? await findRowBySource(page, source) : await findRowByCaseNo(page, caseNo);
    if (!(await row.isVisible({ timeout: 30_000 }).catch(() => false))) {
      result.push(`[log ${index + 1}] 未重新找到 §${String(caseNo).padStart(2, "0")} 结果行；query=${source?.tableName ?? ""}`);
      continue;
    }
    await openRowDetail(row);

    const detailOverlay = page.locator(".ant-drawer:visible, .dtc-drawer:visible, .ant-modal:visible").last();
    await expect(detailOverlay, `§${String(caseNo).padStart(2, "0")} 第 ${index + 1} 条日志采集前应展示详情`).toBeVisible({ timeout: 30_000 });
    const logEntry = detailOverlay.getByText(/查看日志/).nth(index);
    if (!(await logEntry.isVisible({ timeout: 1_000 }).catch(() => false))) continue;

    const label = await logEntry
      .locator("xpath=ancestor::*[self::tr or contains(@class, 'ant-descriptions-row') or contains(@class, 'ant-row') or contains(@class, 'ant-card') or contains(@class, 'rule')][1]")
      .innerText({ timeout: 1_000 })
      .catch(() => `log-${index + 1}`);
    const beforeOverlayCount = await visibleOverlayCount(page);
    await logEntry.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => {});
    await logEntry.click({ timeout: 10_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(1_500);

    const logText = await collectTopLogOverlayText(page, beforeOverlayCount);
    if (logText) {
      result.push(`[log ${index + 1}] ${compactText(label).slice(0, 220)}\n${logText}`);
    }
    await closeVisibleOverlays(page);
  }

  return result;
}

async function openRowDetail(row: Locator): Promise<void> {
  const clickable = row.locator("a:visible, button:visible, [role='button']:visible").first();
  await expect(clickable, "结果行应有可打开详情的入口").toBeVisible({ timeout: 30_000 });
  await clickable.click({ timeout: 10_000 }).catch(() => {});
  await row.page().waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  await row.page().waitForTimeout(1_500);
}

async function collectTopLogOverlayText(page: Page, beforeOverlayCount: number): Promise<string> {
  const overlays = page.locator(".ant-drawer:visible, .dtc-drawer:visible, .ant-modal:visible");
  const count = await overlays.count().catch(() => 0);
  const items = count > beforeOverlayCount ? [overlays.nth(count - 1)] : [overlays.last()];
  const texts: string[] = [];
  for (const item of items) {
    const firstPageText = await normalizedInnerText(item).catch(() => "");
    if (firstPageText) texts.push(`--- log first page ---\n${firstPageText}`);

    const tailPageText = await collectLogTailPageText(page, item);
    if (tailPageText && tailPageText !== firstPageText) texts.push(`--- log tail page ---\n${tailPageText}`);
  }
  return texts.join("\n\n--- visible overlay ---\n\n");
}

async function collectLogTailPageText(page: Page, overlay: Locator): Promise<string> {
  const paginationItems = overlay.locator(".ant-pagination-item:visible");
  const count = await paginationItems.count().catch(() => 0);
  if (count <= 1) return "";

  const lastPage = paginationItems.nth(count - 1);
  const className = (await lastPage.getAttribute("class").catch(() => "")) ?? "";
  if (!className.includes("ant-pagination-item-active")) {
    await lastPage.scrollIntoViewIfNeeded({ timeout: 2_000 }).catch(() => {});
    await lastPage.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(1_000);
  }
  return normalizedInnerText(overlay).catch(() => "");
}

async function visibleOverlayCount(page: Page): Promise<number> {
  return page.locator(".ant-drawer:visible, .dtc-drawer:visible, .ant-modal:visible").count().catch(() => 0);
}

async function closeTopVisibleOverlay(page: Page): Promise<void> {
  const overlay = page.locator(".ant-drawer:visible, .dtc-drawer:visible, .ant-modal:visible").last();
  if (!(await overlay.isVisible({ timeout: 500 }).catch(() => false))) return;
  const close = overlay.locator(".ant-drawer-close, .dtc-drawer-close, .ant-modal-close, button[aria-label='Close']").first();
  if (await close.isVisible({ timeout: 500 }).catch(() => false)) {
    await close.click({ timeout: 5_000 }).catch(() => {});
  } else {
    await page.keyboard.press("Escape").catch(() => {});
  }
}

async function closeVisibleOverlays(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const overlay = page.locator(".ant-drawer:visible, .dtc-drawer:visible, .ant-modal:visible").last();
    if (!(await overlay.isVisible({ timeout: 500 }).catch(() => false))) return;
    const close = overlay.locator(".ant-drawer-close, .dtc-drawer-close, .ant-modal-close, button[aria-label='Close']").first();
    if (await close.isVisible({ timeout: 500 }).catch(() => false)) {
      await close.click({ timeout: 5_000 }).catch(() => {});
    } else {
      await page.keyboard.press("Escape").catch(() => {});
    }
    await page.waitForTimeout(800);
  }
}
