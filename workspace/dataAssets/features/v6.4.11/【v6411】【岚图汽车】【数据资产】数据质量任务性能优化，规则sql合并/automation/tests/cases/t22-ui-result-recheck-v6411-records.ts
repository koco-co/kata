import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, type Locator, type Page } from "@playwright/test";

type UiResultStatus = "validation-pass" | "validation-unpass" | "run-failed" | "running" | "unknown" | "missing";

type SourceRecord = {
  caseNo: number;
  datasourceName: "doris70" | "pw_test_HADOOP";
  tableName: string;
  fullTableName: string;
  ruleName: string;
  fullTitle: string;
};

type RecheckRecord = SourceRecord & {
  generatedAt: string;
  classification: UiResultStatus;
  statusText: string;
  tooltipTexts: string[];
  rowText: string;
};

const FEATURE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const RUNS_DIR = path.join(FEATURE_DIR, "runs");
const OUT_DIR = path.resolve(
  process.env.V6411_UI_RESULT_RECHECK_OUT_DIR ?? defaultRunSubdir("result-recheck", "runs/20260706-v6411-ui-result-recheck"),
);
const RESULT_JSON = path.join(OUT_DIR, "ui-result-recheck.json");
const RESULT_JSONL = path.join(OUT_DIR, "ui-result-recheck.jsonl");
const BASE_URL = process.env.V6411_DQ_BASE_URL ?? "http://shuzhan63-test-ltqc.k8s.dtstack.cn";
const PROJECT_ID = process.env.V6411_DQ_PROJECT_ID ?? "92";
const PROJECT_NAME = process.env.V6411_DQ_PROJECT_NAME ?? "pw_test";
const SESSION_PATH = path.resolve(
  process.cwd(),
  process.env.V6411_DQ_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
);
const CASE_FILTER = parseCaseFilter(process.env.V6411_UI_RESULT_RECHECK_CASES ?? "1-72");

test.use({ storageState: SESSION_PATH });
test.setTimeout(Number(process.env.V6411_UI_RESULT_RECHECK_TIMEOUT_MS ?? 35 * 60 * 1000));

function defaultRunSubdir(subdir: string, fallbackRelativePath: string): string {
  if (process.env.KATA_ALLURE_RESULTS_DIR) {
    return path.join(path.dirname(path.resolve(process.env.KATA_ALLURE_RESULTS_DIR)), subdir);
  }
  return path.join(FEATURE_DIR, fallbackRelativePath);
}

test("重查 v6411 规则任务当前 UI 运行状态", async ({ page }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const sourcePath = resolveSourcePath();
  const allSourceRecords = readLatestSourceRecords(sourcePath);
  const sourceRecords = allSourceRecords.filter((record) => CASE_FILTER.has(record.caseNo));
  const missingSelectedCaseNos = [...CASE_FILTER]
    .filter((caseNo) => !sourceRecords.some((record) => record.caseNo === caseNo))
    .sort((left, right) => left - right);
  expect(missingSelectedCaseNos, "结果重查源文件必须包含所选用例记录").toEqual([]);

  await gotoTaskQueryPage(page);
  const checked: RecheckRecord[] = [];
  for (const source of sourceRecords) {
    const sourceRef = `§${padCaseNo(source.caseNo)}`;
    const result = await readCurrentResultRow(page, source, sourceRef);
    const record: RecheckRecord = {
      ...source,
      generatedAt: new Date().toISOString(),
      ...result,
    };
    checked.push(record);
    fs.appendFileSync(RESULT_JSONL, `${JSON.stringify(record)}\n`);
    console.log(
      `[v6411-result-recheck] ${sourceRef} ${source.datasourceName} ${source.tableName} ${record.classification} ${record.statusText}`,
    );
  }

  const summary = buildSummary(sourcePath, checked);
  fs.writeFileSync(RESULT_JSON, JSON.stringify(summary, null, 2));
  await test.info().attach("ui-result-recheck.json", {
    body: JSON.stringify(summary, null, 2),
    contentType: "application/json",
  });
  await test.info().attach("ui-result-recheck.jsonl", {
    body: checked.map((record) => JSON.stringify(record)).join("\n"),
    contentType: "application/jsonl",
  });

  expect(summary.missingCaseNos, "72 条结果行都应能从 UI 查到").toEqual([]);
});

function resolveSourcePath(): string {
  if (process.env.V6411_UI_RESULT_RECHECK_SOURCE) return path.resolve(process.env.V6411_UI_RESULT_RECHECK_SOURCE);
  if (process.env.KATA_ALLURE_RESULTS_DIR) {
    const currentRunSource = path.join(
      path.dirname(path.resolve(process.env.KATA_ALLURE_RESULTS_DIR)),
      "ui-rebuild",
      "ui-rebuild-results.jsonl",
    );
    if (safeReadLatestRecords(currentRunSource).length === 72) return currentRunSource;
  }
  const candidates = findFiles(RUNS_DIR, "ui-rebuild-results.jsonl")
    .map((filePath) => ({ filePath, records: safeReadLatestRecords(filePath), mtimeMs: fs.statSync(filePath).mtimeMs }))
    .filter((candidate) => candidate.records.length === 72)
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  if (!candidates[0]) throw new Error(`未找到包含 72 条记录的 ui-rebuild-results.jsonl: ${RUNS_DIR}`);
  return candidates[0].filePath;
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

function safeReadLatestRecords(filePath: string): SourceRecord[] {
  try {
    return readLatestSourceRecords(filePath);
  } catch {
    return [];
  }
}

function readLatestSourceRecords(filePath: string): SourceRecord[] {
  const latest = new Map<number, SourceRecord>();
  for (const line of fs.readFileSync(filePath, "utf8").split(/\n/).filter(Boolean)) {
    const parsed = JSON.parse(line) as SourceRecord;
    if (!parsed.caseNo || !parsed.tableName || !parsed.ruleName) continue;
    latest.set(parsed.caseNo, parsed);
  }
  return [...latest.values()].sort((left, right) => left.caseNo - right.caseNo);
}

function parseCaseFilter(value: string | undefined): Set<number> {
  const result = new Set<number>();
  for (const item of (value ?? "").split(",")) {
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
  if (result.size === 0) throw new Error(`V6411_UI_RESULT_RECHECK_CASES 未匹配到有效用例: ${value}`);
  return result;
}

async function gotoTaskQueryPage(page: Page): Promise<void> {
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
  await expect(page.locator("body"), "校验结果查询页面应打开").toContainText("校验结果查询", { timeout: 30_000 });
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

async function readCurrentResultRow(
  page: Page,
  source: SourceRecord,
  sourceRef: string,
): Promise<{ classification: UiResultStatus; statusText: string; tooltipTexts: string[]; rowText: string }> {
  const input = page.getByPlaceholder("请输入表名/任务名称搜索").or(page.locator("input[placeholder*='任务名称']")).first();
  await expect(input, `${sourceRef}: 校验结果查询应展示搜索框`).toBeVisible({ timeout: 30_000 });
  await input.fill(source.tableName, { timeout: 30_000 });
  await input.press("Enter").catch(() => {});
  const search = input
    .locator("xpath=ancestor::*[contains(@class, 'ant-input-search')][1]")
    .locator("button:visible")
    .filter({ has: page.locator(".anticon-search") })
    .first();
  if (await search.isVisible({ timeout: 2_000 }).catch(() => false)) await search.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
  await page.waitForTimeout(800);

  const row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: source.tableName }).filter({ hasText: source.ruleName }).first();
  if (!(await row.isVisible({ timeout: 10_000 }).catch(() => false))) {
    const rows = await page
      .locator(".ant-table-tbody tr:visible")
      .evaluateAll((items) => items.map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean))
      .catch(() => []);
    return {
      classification: "missing",
      statusText: "未查到结果行",
      tooltipTexts: [],
      rowText: `query=${source.tableName}; expectedRuleName=${source.ruleName}; rows=${JSON.stringify(rows.slice(0, 5))}`,
    };
  }

  const rowText = ((await row.innerText({ timeout: 10_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
  const statusText = await readResultStatusCellText(row);
  const tooltipTexts = await collectStatusTooltipTexts(page, row);
  return { ...classifyResult(statusText || rowText, tooltipTexts), tooltipTexts, rowText };
}

async function readResultStatusCellText(row: Locator): Promise<string> {
  const statusPattern = /校验异常|运行失败|提交失败|校验不通过|校验通过|运行中|校验中|等待|未运行|停止中/;
  const cells = row.locator("td:visible");
  for (const index of [2, 3]) {
    const cell = cells.nth(index);
    const text = ((await cell.innerText({ timeout: 1_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
    if (statusPattern.test(text)) return text;
  }
  const status = row
    .locator(".ant-badge-status-text:visible, .ant-tag:visible, .ant-typography:visible, span:visible")
    .filter({ hasText: statusPattern })
    .first();
  return ((await status.innerText({ timeout: 1_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
}

async function collectStatusTooltipTexts(page: Page, row: Locator): Promise<string[]> {
  await page.keyboard.press("Escape").catch(() => {});
  const texts: string[] = [];

  const candidateGroups = [
    row.locator("td:visible").nth(2),
    row.locator("td:visible").nth(2).locator(".anticon, svg, span"),
    row.locator(".anticon-question-circle, [aria-label='question-circle'], .ant-tag"),
    row.locator("td, span, button").filter({ hasText: /校验异常|异常|\?/ }),
  ];

  for (const candidates of candidateGroups) {
    const count = Math.min(await candidates.count().catch(() => 0), 8);
    for (let index = 0; index < count; index += 1) {
      const item = candidates.nth(index);
      if (!(await item.isVisible({ timeout: 500 }).catch(() => false))) continue;
      await item.scrollIntoViewIfNeeded({ timeout: 2_000 }).catch(() => {});
      await item.hover({ timeout: 5_000, force: true }).catch(() => {});
      await page.waitForTimeout(800);
      const tooltipTexts = await page
        .locator(".ant-tooltip:visible, [role='tooltip']:visible")
        .evaluateAll((items) => items.map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean))
        .catch(() => []);
      texts.push(...tooltipTexts);
    }
    if (texts.some((text) => /运行失败|校验通过|校验不通过|校验未通过/.test(text))) break;
  }
  await page.keyboard.press("Escape").catch(() => {});
  return [...new Set(texts)];
}

function classifyResult(rowText: string, tooltipTexts: string[] = []): { classification: UiResultStatus; statusText: string } {
  const tooltipText = tooltipTexts.join(" ");
  if (/运行失败|提交失败/.test(rowText) || countFromTooltip(tooltipText, /运行失败/) > 0) {
    return { classification: "run-failed", statusText: "校验异常/失败" };
  }
  const unpassCount = countFromTooltip(tooltipText, /校验不通过|校验未通过/);
  const passCount = countFromTooltip(tooltipText, /校验通过/);
  if (/校验异常/.test(rowText) && (unpassCount > 0 || passCount > 0)) {
    return { classification: unpassCount > 0 ? "validation-unpass" : "validation-pass", statusText: rowText };
  }
  if (/校验不通过|校验未通过/.test(rowText)) return { classification: "validation-unpass", statusText: "校验不通过" };
  if (/校验通过/.test(rowText)) return { classification: "validation-pass", statusText: "校验通过" };
  if (/运行中|校验中|等待|未运行|停止中/.test(rowText)) return { classification: "running", statusText: "运行中/等待" };
  if (/校验异常/.test(rowText)) return { classification: "unknown", statusText: rowText };
  return { classification: "unknown", statusText: "" };
}

function countFromTooltip(text: string, label: RegExp): number {
  const match = text.match(new RegExp(`(?:${label.source})\\s*[:：]\\s*(\\d+)`));
  return match ? Number(match[1]) : 0;
}

async function waitForSpin(page: Page, sourceRef: string): Promise<void> {
  await expect(page.locator(".ant-spin-spinning:visible"), `${sourceRef}: 页面可见加载遮罩应消失`).toHaveCount(0, {
    timeout: 60_000,
  });
}

function buildSummary(sourcePath: string, records: RecheckRecord[]) {
  const counts: Record<UiResultStatus, number> = {
    "validation-pass": 0,
    "validation-unpass": 0,
    "run-failed": 0,
    running: 0,
    unknown: 0,
    missing: 0,
  };
  const byDatasource: Record<string, Record<UiResultStatus, number>> = {};
  for (const record of records) {
    counts[record.classification] += 1;
    byDatasource[record.datasourceName] ??= {
      "validation-pass": 0,
      "validation-unpass": 0,
      "run-failed": 0,
      running: 0,
      unknown: 0,
      missing: 0,
    };
    byDatasource[record.datasourceName][record.classification] += 1;
  }
  return {
    generatedAt: new Date().toISOString(),
    sourcePath,
    resultJsonl: RESULT_JSONL,
    total: records.length,
    counts,
    byDatasource,
    failedCaseNos: records.filter((record) => record.classification === "run-failed").map((record) => record.caseNo),
    missingCaseNos: records.filter((record) => record.classification === "missing").map((record) => record.caseNo),
    records,
  };
}

function padCaseNo(caseNo: number): string {
  return String(caseNo).padStart(2, "0");
}
