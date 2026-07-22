// spec: cases/archive.md#v6411-sparkthrift-result-recheck
// intent: SR-INTENT-V6411-RESULT-RECHECK
// probe: SR-UI-PROBE-V6411-RESULT-RECHECK
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, type Locator, type Page } from "@playwright/test";
import { getEnvConfig } from "../../../../../../_shared/helpers";
import {
  EXPLICIT_RULE_CASE_SPECS,
  formatV6411ShortRuleName,
  loadV6411UiCaseMetas,
} from "../data/v6411-ui-case-specs";
import {
  expectedRuleOutcomes,
  expectedDirtyData,
  type ExpectedRuleOutcome,
} from "../data/v6411-result-oracle";

type UiResultStatus = "validation-pass" | "validation-unpass" | "run-failed" | "running" | "unknown" | "missing";

type EvidenceState = "confirmed" | "missing" | "not-checked";

type ModuleEvidence = {
  state: EvidenceState;
  rowText: string;
};

type ResultDetailEvidence = ModuleEvidence & {
  detailText: string;
  ruleTexts: string[];
  passRules: string[];
  unpassRules: string[];
  expectedPassRules: string[];
  expectedUnpassRules: string[];
  ruleMismatches: string[];
  dirtyData: DirtyDataEvidence[];
  dirtyDataMismatches: string[];
  planTimeCleared: boolean;
  screenshotPath?: string;
};

type DirtyDataEvidence = {
  rule: string;
  state: EvidenceState;
  dialogText: string;
  headers: string[];
  rows: string[][];
  expectedRowIds?: number[];
  actualRowIds: number[];
  mismatch?: string;
};

type RuleSqlEvidence = ModuleEvidence & {
  taskText: string;
  drawerText: string;
  sqlText: string;
  screenshotPath?: string;
};

type ExpectedEvidence = {
  ruleCount: number;
  titleExpectation: string;
  ruleOutcomes: ExpectedRuleOutcome[];
};

type SourceRecord = {
  caseNo: number;
  datasourceName: string;
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
  ruleSet: ModuleEvidence;
  task: ModuleEvidence;
  resultDetail: ResultDetailEvidence;
  ruleSql?: RuleSqlEvidence;
  expected: ExpectedEvidence;
  conclusion: string;
};

const FEATURE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const RUNS_DIR = path.join(FEATURE_DIR, "runs");
const OUT_DIR = path.resolve(
  process.env.V6411_UI_RESULT_RECHECK_OUT_DIR ?? defaultRunSubdir("result-recheck", "runs/20260706-v6411-ui-result-recheck"),
);
const RESULT_JSON = path.join(OUT_DIR, "ui-result-recheck.json");
const RESULT_JSONL = path.join(OUT_DIR, "ui-result-recheck.jsonl");
const RESULT_MD = path.join(OUT_DIR, "ui-result-recheck.md");
const SCREENSHOT_DIR = path.join(OUT_DIR, "screenshots");
const ENV = getEnvConfig();
const BASE_URL = ENV.urls.baseUrl;
const PROJECT_ID = String(ENV.projects.quality.id);
const PROJECT_NAME = ENV.projects.quality.name;
const GENERATED_CASE_SPEC_SOURCE = "__v6411_case_specs__";
const SKIP_DORIS_SQL = process.env.V6411_UI_RESULT_RECHECK_SKIP_DORIS_SQL === "1";
const CASE_FILTER = parseCaseFilter(
  process.env.V6411_UI_RESULT_RECHECK_CASES ?? process.env.V6411_UI_REBUILD_CASES ?? "1-72",
);

test.setTimeout(Number(process.env.V6411_UI_RESULT_RECHECK_TIMEOUT_MS ?? 35 * 60 * 1000));

function defaultRunSubdir(subdir: string, fallbackRelativePath: string): string {
  if (process.env.KATA_ALLURE_RESULTS_DIR) {
    return path.join(path.dirname(path.resolve(process.env.KATA_ALLURE_RESULTS_DIR)), subdir);
  }
  return path.join(FEATURE_DIR, fallbackRelativePath);
}

test("重查 v6411 规则任务结果与规则 SQL", async ({ page, context }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const appendResults = process.env.V6411_UI_RESULT_RECHECK_APPEND === "1";
  if (!appendResults) fs.writeFileSync(RESULT_JSONL, "");
  const sourcePath = resolveSourcePath();
  const allSourceRecords = readLatestSourceRecords(sourcePath);
  const sourceRecords = allSourceRecords.filter((record) => CASE_FILTER.has(record.caseNo));
  const missingSelectedCaseNos = [...CASE_FILTER]
    .filter((caseNo) => !sourceRecords.some((record) => record.caseNo === caseNo))
    .sort((left, right) => left - right);
  expect(missingSelectedCaseNos, "结果重查源文件必须包含所选用例记录").toEqual([]);

  const browser = context.browser();
  if (!browser) throw new Error("结果重查需要可创建独立 BrowserContext 的 Chromium 实例");
  const storageState = await context.storageState();
  const checked: RecheckRecord[] = appendResults ? readExistingRecheckRecords(RESULT_JSONL) : [];
  for (const source of [...sourceRecords].sort((left, right) => right.caseNo - left.caseNo)) {
    const sourceRef = `§${padCaseNo(source.caseNo)}`;
    const caseContext = await browser.newContext({ storageState });
    const casePage = await caseContext.newPage();
    try {
      await gotoTaskQueryPage(casePage);
      const result = await readCurrentResultRow(casePage, source, sourceRef);
      const ruleSet = await readRuleSetEvidence(casePage, source, sourceRef);
      const task = await readRuleTaskEvidence(casePage, source, sourceRef);
      const shouldInspectSql =
        (result.classification !== "validation-pass" && result.classification !== "missing") ||
        source.caseNo === 71 ||
        source.caseNo === 72;
      const ruleSql = shouldInspectSql && !(SKIP_DORIS_SQL && source.caseNo <= 36 && source.caseNo !== 71 && source.caseNo !== 72)
        ? await readRuleSqlEvidence(casePage, source, sourceRef)
        : undefined;
      const expected = expectedEvidence(source.caseNo);
      const conclusion = buildConclusion({ source, result, ruleSet, task, ruleSql, expected });
      const record: RecheckRecord = {
        ...source,
        generatedAt: new Date().toISOString(),
        ...result,
        ruleSet,
        task,
        ruleSql,
        expected,
        conclusion,
      };
      const previousIndex = checked.findIndex((item) => item.caseNo === record.caseNo);
      if (previousIndex >= 0) checked[previousIndex] = record;
      else checked.push(record);
      fs.appendFileSync(RESULT_JSONL, `${JSON.stringify(record)}\n`);
      await test.info().attach(`${sourceRef}-rule-outcomes.json`, {
        body: JSON.stringify({
          tableName: source.tableName,
          planTimeCleared: record.resultDetail.planTimeCleared,
          passRules: record.resultDetail.passRules,
          unpassRules: record.resultDetail.unpassRules,
          expectedPassRules: record.resultDetail.expectedPassRules,
          expectedUnpassRules: record.resultDetail.expectedUnpassRules,
          ruleMismatches: record.resultDetail.ruleMismatches,
          dirtyData: record.resultDetail.dirtyData,
          dirtyDataMismatches: record.resultDetail.dirtyDataMismatches,
        }, null, 2),
        contentType: "application/json",
      });
      console.log(
        `[v6411-result-recheck] ${sourceRef} ${source.datasourceName} ${source.tableName} ${record.classification} ${record.statusText}`,
      );
    } finally {
      await caseContext.close().catch(() => {});
    }
  }

  const summary = buildSummary(sourcePath, checked);
  fs.writeFileSync(RESULT_JSON, JSON.stringify(summary, null, 2));
  fs.writeFileSync(RESULT_MD, renderMarkdown(summary, checked));
  await test.info().attach("ui-result-recheck.json", {
    body: JSON.stringify(summary, null, 2),
    contentType: "application/json",
  });
  await test.info().attach("ui-result-recheck.jsonl", {
    body: checked.map((record) => JSON.stringify(record)).join("\n"),
    contentType: "application/jsonl",
  });
  await test.info().attach("ui-result-recheck.md", {
    body: fs.readFileSync(RESULT_MD),
    contentType: "text/markdown",
  });

  expect(summary.missingCaseNos, `${CASE_FILTER.size} 条所选结果行都应能从 UI 查到`).toEqual([]);
  const ruleMismatches = checked
    .filter((record) => CASE_FILTER.has(record.caseNo))
    .flatMap((record) => record.resultDetail.ruleMismatches.map((mismatch) => `§${padCaseNo(record.caseNo)} ${mismatch}`));
  expect(ruleMismatches, "校验结果详情中的通过/未通过规则必须与源表数据预期一致").toEqual([]);
  const dirtyDataMismatches = checked
    .filter((record) => CASE_FILTER.has(record.caseNo))
    .flatMap((record) => record.resultDetail.dirtyDataMismatches.map((mismatch) => `§${padCaseNo(record.caseNo)} ${mismatch}`));
  expect(dirtyDataMismatches, "校验未通过规则的查看明细脏数据必须与源表数据预期一致").toEqual([]);
  const unusableResults = checked
    .filter((record) => CASE_FILTER.has(record.caseNo))
    .filter((record) => !["validation-pass", "validation-unpass"].includes(record.classification))
    .map((record) => `§${padCaseNo(record.caseNo)} ${record.classification}: ${record.statusText || record.conclusion}`);
  expect(unusableResults, "所选结果不能处于运行中、运行失败、未知或缺失状态").toEqual([]);
});

function resolveSourcePath(): string {
  if (process.env.V6411_UI_RESULT_RECHECK_SOURCE) {
    return process.env.V6411_UI_RESULT_RECHECK_SOURCE === GENERATED_CASE_SPEC_SOURCE
      ? GENERATED_CASE_SPEC_SOURCE
      : path.resolve(process.env.V6411_UI_RESULT_RECHECK_SOURCE);
  }
  if (process.env.KATA_ALLURE_RESULTS_DIR) {
    const currentRunSource = path.join(
      path.dirname(path.resolve(process.env.KATA_ALLURE_RESULTS_DIR)),
      "ui-rebuild",
      "ui-rebuild-results.jsonl",
    );
    if (selectedRecords(safeReadLatestRecords(currentRunSource)).length === CASE_FILTER.size) return currentRunSource;
  }
  const candidates = findFiles(RUNS_DIR, "ui-rebuild-results.jsonl")
    .map((filePath) => ({ filePath, records: safeReadLatestRecords(filePath), mtimeMs: fs.statSync(filePath).mtimeMs }))
    .filter((candidate) => selectedRecords(candidate.records).length === CASE_FILTER.size)
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  if (!candidates[0]) {
    const mappingPath = path.join(RUNS_DIR, "20260703-v6411-ui-rebuild", "ui-rebuild-case-mapping.json");
    if (selectedRecords(safeReadLatestRecords(mappingPath)).length === CASE_FILTER.size) return mappingPath;
    return GENERATED_CASE_SPEC_SOURCE;
  }
  return candidates[0].filePath;
}

function selectedRecords(records: SourceRecord[]): SourceRecord[] {
  return records.filter((record) => CASE_FILTER.has(record.caseNo));
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

function readExistingRecheckRecords(filePath: string): RecheckRecord[] {
  if (!fs.existsSync(filePath)) return [];
  const records = new Map<number, RecheckRecord>();
  for (const line of fs.readFileSync(filePath, "utf8").split(/\n/).filter(Boolean)) {
    try {
      const record = JSON.parse(line) as RecheckRecord;
      if (record.caseNo && record.tableName && record.classification) records.set(record.caseNo, record);
    } catch {
      // Ignore an incomplete trailing line from an interrupted chunk.
    }
  }
  return [...records.values()].sort((left, right) => left.caseNo - right.caseNo);
}

function readLatestSourceRecords(filePath: string): SourceRecord[] {
  if (filePath === GENERATED_CASE_SPEC_SOURCE) {
    const sparkDatasource = ENV.datasources.sparkthrift;
    const dorisDatasource = ENV.datasources.doris;
    if (!sparkDatasource) throw new Error("environment datasource sparkthrift is not configured");
    if (!dorisDatasource) throw new Error("environment datasource doris is not configured");
    const suffix = process.env.V6411_UI_TABLE_BATCH_SUFFIX?.trim();
    if (!suffix || !/^[a-z]{8}$/.test(suffix)) {
      throw new Error("V6411_UI_TABLE_BATCH_SUFFIX must be the same 8 lowercase letters used by the UI run");
    }
    return loadV6411UiCaseMetas()
      .filter((meta) => CASE_FILTER.has(meta.caseNo))
      .map((meta) => {
        const datasource = meta.caseNo <= 36 ? dorisDatasource : sparkDatasource;
        return {
          caseNo: meta.caseNo,
          datasourceName: meta.datasourceName,
          tableName: v6411TableName(suffix, meta.caseNo),
          fullTableName: `${datasource.sql.database}.${v6411TableName(suffix, meta.caseNo)}`,
          ruleName: formatV6411ShortRuleName(meta.caseNo, meta.fullTitle),
          fullTitle: meta.fullTitle,
        };
      })
      .sort((left, right) => left.caseNo - right.caseNo);
  }
  if (filePath.endsWith("ui-rebuild-case-mapping.json")) {
    const mappings = JSON.parse(fs.readFileSync(filePath, "utf8")) as Array<{
      caseNo: number;
      datasourceName: string;
      compareTableName: string;
      fullCompareTableName: string;
      ruleName: string;
      fullTitle: string;
    }>;
    return mappings
      .map((mapping) => ({
        caseNo: mapping.caseNo,
        datasourceName: mapping.datasourceName,
        tableName: mapping.compareTableName.replace(/_cmp$/, ""),
        fullTableName: mapping.fullCompareTableName.replace(/_cmp$/, ""),
        ruleName: mapping.ruleName,
        fullTitle: mapping.fullTitle,
      }))
      .sort((left, right) => left.caseNo - right.caseNo);
  }
  const latest = new Map<number, SourceRecord>();
  for (const line of fs.readFileSync(filePath, "utf8").split(/\n/).filter(Boolean)) {
    const parsed = JSON.parse(line) as SourceRecord;
    if (!parsed.caseNo || !parsed.tableName || !parsed.ruleName) continue;
    latest.set(parsed.caseNo, parsed);
  }
  return [...latest.values()].sort((left, right) => left.caseNo - right.caseNo);
}

function v6411TableName(suffix: string, caseNo: number): string {
  return `test_info_1_${suffix}_${String(caseNo).padStart(2, "0")}`;
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
): Promise<{
  classification: UiResultStatus;
  statusText: string;
  tooltipTexts: string[];
  rowText: string;
  resultDetail: ResultDetailEvidence;
}> {
  const input = page.getByPlaceholder("请输入表名/任务名称搜索").or(page.locator("input[placeholder*='任务名称']")).first();
  await expect(input, `${sourceRef}: 校验结果查询应展示搜索框`).toBeVisible({ timeout: 30_000 });
  const planTimeCleared = await clearResultPlanTime(page, sourceRef);
  expect(planTimeCleared, `${sourceRef}: 校验结果查询必须清除计划时间筛选`).toBe(true);
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

  const currentRows = page.locator(".ant-table-tbody tr:visible").filter({ hasText: source.tableName }).filter({ hasText: source.ruleName });
  let row: Locator | null = await selectLatestResultRow(currentRows, sourceRef);
  if (!row) {
    await submitSearch(page, input, "test_info_1_", sourceRef);
    row = await selectLatestResultRow(
      page.locator(".ant-table-tbody tr:visible").filter({ hasText: source.tableName }).filter({ hasText: source.ruleName }),
      sourceRef,
    );
    row ??= await findMatchingRowAcrossPages(page, source.tableName, source.ruleName, sourceRef);
  }
  if (!row || !(await row.isVisible({ timeout: 10_000 }).catch(() => false))) {
    const rows = await page
      .locator(".ant-table-tbody tr:visible")
      .evaluateAll((items) => items.map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean))
      .catch(() => []);
    return {
      classification: "missing",
      statusText: "未查到结果行",
      tooltipTexts: [],
      rowText: `query=${source.tableName}; expectedRuleName=${source.ruleName}; rows=${JSON.stringify(rows.slice(0, 5))}`,
      resultDetail: {
        state: "missing",
        rowText: "未查到结果行",
        detailText: "",
        ruleTexts: [],
        passRules: [],
        unpassRules: [],
        expectedPassRules: [],
        expectedUnpassRules: [],
        ruleMismatches: [],
        dirtyData: [],
        dirtyDataMismatches: [],
        planTimeCleared,
      },
    };
  }

  const rowText = ((await row.innerText({ timeout: 10_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
  const statusText = await readResultStatusCellText(row);
  const tooltipTexts = await collectStatusTooltipTexts(page, row);
  const resultDetail = await readResultDetailEvidence(page, row, source, sourceRef, planTimeCleared);
  return { ...classifyResult(statusText || rowText, tooltipTexts), tooltipTexts, rowText, resultDetail };
}

async function readResultDetailEvidence(
  page: Page,
  row: Locator,
  source: SourceRecord,
  sourceRef: string,
  planTimeCleared: boolean,
): Promise<ResultDetailEvidence> {
  const tableCell = row
    .getByRole("button", { name: source.tableName, exact: true })
    .or(row.getByText(source.tableName, { exact: true }))
    .or(row.locator("td").first().getByRole("button"))
    .or(row.locator("td").first())
    .first();
  if (!(await tableCell.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return {
      state: "missing",
      rowText: "结果行没有可见的详情入口",
      detailText: "",
      ruleTexts: [],
      passRules: [],
      unpassRules: [],
      expectedPassRules: [],
      expectedUnpassRules: [],
      ruleMismatches: ["结果行没有可见的详情入口"],
      planTimeCleared,
    };
  }
  await tableCell.click({ timeout: 30_000 });

  await expect(page.locator("body"), `${sourceRef}: 校验结果详情应打开`).toContainText("监控报告", {
    timeout: 30_000,
  });
  const panel = await visiblePanel(page);
  await expandResultDetailPanel(page, panel, sourceRef);
  const monitorTab = panel.getByRole("tab", { name: "监控报告", exact: true }).first();
  if (await monitorTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await monitorTab.click({ timeout: 30_000 });
    await waitForSpin(page, sourceRef);
  }
  const monitorReport = panel.getByRole("tabpanel", { name: "监控报告", exact: true }).first();
  const detailPanel = (await monitorReport.isVisible({ timeout: 3_000 }).catch(() => false)) ? monitorReport : panel;
  await waitForSpin(page, sourceRef);
  const detailText = ((await detailPanel.innerText({ timeout: 10_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
  if (!/校验通过|校验未通过/.test(detailText)) {
    if (/运行失败/.test(detailText)) {
      await test.info().attach(`${sourceRef}-run-failed-detail.txt`, {
        body: detailText,
        contentType: "text/plain",
      });
      await closeVisiblePanel(page);
      return {
        state: detailText ? "confirmed" : "missing",
        rowText: detailText.slice(0, 2_000),
        detailText,
        ruleTexts: [],
        passRules: [],
        unpassRules: [],
        expectedPassRules: [],
        expectedUnpassRules: [],
        ruleMismatches: [],
        dirtyData: [],
        dirtyDataMismatches: [],
        planTimeCleared,
      };
    }
    await expect(detailPanel, `${sourceRef}: 结果详情应加载校验通过/未通过规则页签`).toContainText(/校验通过|校验未通过/, { timeout: 30_000 });
  }
  const ruleTexts = await detailPanel
    .locator("tr:visible, .ant-card:visible, .ant-collapse-item:visible")
    .allTextContents({ timeout: 10_000 })
    .catch(() => []);
  const tabTexts: Record<"pass" | "unpass", string> = { pass: "", unpass: "" };
  for (const kind of ["unpass", "pass"] as const) {
    const tab = detailPanel
      .locator("button:visible, [role='tab']:visible, .ant-tabs-tab:visible, .ant-radio-wrapper:visible, label:visible")
      .filter({ hasText: kind === "unpass" ? /校验未通过/ : /校验通过/ })
      .first();
    if (!(await tab.isVisible({ timeout: 3_000 }).catch(() => false))) continue;
    await tab.click({ timeout: 30_000 });
    tabTexts[kind] = await readAllScrollableText(page, panel);
  }
  const expected = expectedEvidence(source.caseNo);
  const passRules: string[] = [];
  const unpassRules: string[] = [];
  const ruleMismatches: string[] = [];
  for (const expectedRule of expected.ruleOutcomes) {
    const label = ruleLabel(expectedRule);
    const passVisible = ruleDescriptorVisible(tabTexts.pass, expectedRule);
    const unpassVisible = ruleDescriptorVisible(tabTexts.unpass, expectedRule);
    const actual = passVisible && !unpassVisible ? "pass" : unpassVisible && !passVisible ? "unpass" : "missing";
    if (actual === "pass") passRules.push(label);
    if (actual === "unpass") unpassRules.push(label);
    if (actual !== expectedRule.outcome) {
      ruleMismatches.push(`${label}: expected=${expectedRule.outcome}; actual=${actual}; metric=${String(expectedRule.metric)}; reason=${expectedRule.reason}`);
    }
  }
  reconcileSummaryOnlyRules(expected.ruleOutcomes, detailText, passRules, unpassRules, ruleMismatches);
  const dirtyData = await readDirtyDataEvidence(page, detailPanel, source, sourceRef, expected.ruleOutcomes.filter((rule) => unpassRules.includes(ruleLabel(rule))));
  const dirtyDataMismatches = dirtyData.flatMap((item) => item.mismatch ? [`${item.rule}: ${item.mismatch}`] : []);
  const screenshotPath = path.join(SCREENSHOT_DIR, `${source.tableName}-result.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  await closeVisiblePanel(page);
  return {
    state: detailText ? "confirmed" : "missing",
    rowText: detailText.slice(0, 2_000),
    detailText,
    ruleTexts: ruleTexts.map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 100),
    passRules,
    unpassRules,
    expectedPassRules: expected.ruleOutcomes.filter((item) => item.outcome === "pass").map(ruleLabel),
    expectedUnpassRules: expected.ruleOutcomes.filter((item) => item.outcome === "unpass").map(ruleLabel),
    ruleMismatches,
    dirtyData,
    dirtyDataMismatches,
    planTimeCleared,
    screenshotPath,
  };
}

async function readAllScrollableText(page: Page, panel: Locator): Promise<string> {
  const snapshots: string[] = [];
  for (let step = 0; step <= 8; step += 1) {
    await panel.evaluate((root, progress) => {
      const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]
        .filter((element): element is HTMLElement => element instanceof HTMLElement && element.scrollHeight > element.clientHeight + 16);
      for (const element of elements) {
        element.scrollTop = Math.round((element.scrollHeight - element.clientHeight) * progress);
      }
    }, step / 8).catch(() => {});
    await page.waitForTimeout(180);
    snapshots.push(((await panel.innerText({ timeout: 10_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim());
  }
  return [...new Set(snapshots)].join(" ");
}

async function readDirtyDataEvidence(
  page: Page,
  detailPanel: Locator,
  source: SourceRecord,
  sourceRef: string,
  actualUnpassRules: ExpectedRuleOutcome[],
): Promise<DirtyDataEvidence[]> {
  const checks = actualUnpassRules
    .map((rule) => ({ rule, expected: expectedDirtyData(source.caseNo, rule.ruleIndex) }))
    .filter((item): item is { rule: ExpectedRuleOutcome; expected: NonNullable<ReturnType<typeof expectedDirtyData>> } => item.expected !== null);
  if (!checks.length) return [];

  const unpassTab = detailPanel
    .locator("button:visible, [role='tab']:visible, .ant-tabs-tab:visible, .ant-radio-wrapper:visible, label:visible")
    .filter({ hasText: /校验未通过/ });
  const unpassTabCount = await unpassTab.count().catch(() => 0);
  if (unpassTabCount > 0) {
    const selectedTab = unpassTab.nth(0);
    await selectedTab.click({ timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(300);
  }

  const sections = detailPanel.locator("section.ruleView:visible");
  const sectionCount = await sections.count().catch(() => 0);
  const sectionTexts = await sections.allTextContents({ timeoutMs: 10_000 }).catch(() => []);
  const usedSectionIndexes = new Set<number>();
  const evidence: DirtyDataEvidence[] = [];
  for (const check of checks) {
    const label = ruleLabel(check.rule);
    const expectedText = normalizeVisibleText(`${check.rule.functionName} ${(check.rule.fields ?? []).join(" ")}`);
    let sectionIndex = -1;
    for (let index = 0; index < sectionCount; index += 1) {
      if (usedSectionIndexes.has(index)) continue;
      const sectionText = normalizeVisibleText(sectionTexts[index] ?? "");
      const functionNames = check.rule.functionName === "字段取值校验"
        ? ["字段取值校验", "字段取值范围校验"]
        : [check.rule.functionName];
      if (functionNames.some((functionName) => sectionText.includes(normalizeVisibleText(functionName))) &&
        (check.rule.fields ?? []).every((field) => sectionText.includes(normalizeVisibleText(field)))) {
        sectionIndex = index;
        break;
      }
    }
    if (sectionIndex < 0) {
      evidence.push({ rule: label, state: "missing", dialogText: "", headers: [], rows: [], expectedRowIds: check.expected.rowIds, actualRowIds: [], mismatch: `未找到规则详情卡片: ${expectedText}` });
      continue;
    }
    usedSectionIndexes.add(sectionIndex);
    const section = sections.nth(sectionIndex);
    const detailButton = section.getByText("查看明细", { exact: true });
    const detailButtonCount = await detailButton.count().catch(() => 0);
    if (detailButtonCount === 0) {
      evidence.push({ rule: label, state: "missing", dialogText: "", headers: [], rows: [], expectedRowIds: check.expected.rowIds, actualRowIds: [], mismatch: "未找到查看明细按钮" });
      continue;
    }
    await detailButton.nth(0).click({ timeout: 30_000 });
    await waitForSpin(page, sourceRef);
    const dialogs = page.locator(".ant-drawer:visible, .ant-modal:visible, [role='dialog']:visible").filter({ hasText: "明细" });
    const dialogCount = await dialogs.count().catch(() => 0);
    if (dialogCount === 0) {
      evidence.push({ rule: label, state: "missing", dialogText: "", headers: [], rows: [], expectedRowIds: check.expected.rowIds, actualRowIds: [], mismatch: "点击查看明细后未打开明细抽屉" });
      await page.keyboard.press("Escape").catch(() => {});
      continue;
    }
    const dialog = dialogs.nth(dialogCount - 1);
    const rawDialogText = (await dialog.innerText({ timeout: 10_000 }).catch(() => "")) ?? "";
    const dialogText = rawDialogText.replace(/\s+/g, " ").trim();
    const readTablePage = async (): Promise<{ headers: string[]; rows: string[][] }> => {
      const tables = dialog.locator("table:visible");
      const tableCount = await tables.count().catch(() => 0);
      const matrix = tableCount > 0
        ? await tables.nth(0).evaluate((element) => {
          const tableRows = Array.from(element.querySelectorAll("tr")).map((row) => Array.from(row.querySelectorAll("th,td")).map((cell) => (cell.textContent ?? "").replace(/\s+/g, " ").trim()));
          const headerIndex = tableRows.findIndex((_, index) => Boolean(element.querySelectorAll("tr")[index]?.querySelector("th")));
          return { rows: tableRows, headerIndex: headerIndex >= 0 ? headerIndex : tableRows.length > 0 ? 0 : -1 };
        }).catch(() => ({ rows: [], headerIndex: -1 }))
        : { rows: [], headerIndex: -1 };
      let pageHeaders = matrix.headerIndex >= 0 ? matrix.rows[matrix.headerIndex] : [];
      let pageRows = matrix.headerIndex >= 0 ? matrix.rows.slice(matrix.headerIndex + 1) : matrix.rows;
      if (!pageRows.length) {
        const textLines = ((await dialog.innerText({ timeout: 10_000 }).catch(() => "")) ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        const textHeaderIndex = textLines.findIndex((line) => line.split(/\t/).length >= 5 && line.includes("id") && line.includes("string_num"));
        if (textHeaderIndex >= 0) {
          pageHeaders = textLines[textHeaderIndex].split(/\t/).map((item) => item.trim());
          pageRows = textLines.slice(textHeaderIndex + 1).map((line) => line.split(/\t/).map((item) => item.trim())).filter((row) => row.length >= pageHeaders.length);
        }
      }
      return { headers: pageHeaders, rows: pageRows };
    };
    let { headers, rows } = await readTablePage();
    const totalMatch = rawDialogText.match(/共\s*(\d+)\s*条数据/);
    const pageSizeMatch = rawDialogText.match(/每页显示\s*(\d+)\s*条/);
    const totalRows = totalMatch ? Number(totalMatch[1]) : rows.length;
    const pageSize = pageSizeMatch ? Number(pageSizeMatch[1]) : rows.length;
    const pageCount = pageSize > 0 ? Math.ceil(totalRows / pageSize) : 1;
    for (let pageIndex = 1; pageIndex < pageCount; pageIndex += 1) {
      const next = dialog.locator(".ant-pagination-next:visible, button[aria-label='下一页']:visible, button[title='下一页']:visible").last();
      if (!(await next.isVisible({ timeout: 1_000 }).catch(() => false))) break;
      if (await next.isDisabled().catch(() => false)) break;
      await next.click({ timeout: 30_000 });
      await page.waitForTimeout(300);
      const nextPage = await readTablePage();
      if (nextPage.headers.length) headers = nextPage.headers;
      rows = rows.concat(nextPage.rows);
    }
    const idIndex = headers.findIndex((header) => normalizeVisibleText(header) === "id");
    const actualRowIds = rows.map((row) => Number(idIndex >= 0 ? row[idIndex] : row[0])).filter(Number.isFinite);
    const expectedRowIds = [...check.expected.rowIds].sort((left, right) => left - right);
    const actualSorted = [...actualRowIds].sort((left, right) => left - right);
    const mismatch = JSON.stringify(actualSorted) === JSON.stringify(expectedRowIds)
      ? undefined
      : `脏数据行不符合预期: expected=${JSON.stringify(expectedRowIds)} actual=${JSON.stringify(actualSorted)} reason=${check.expected.reason}`;
    evidence.push({ rule: label, state: "confirmed", dialogText, headers, rows: rows.slice(0, 200), expectedRowIds, actualRowIds: actualSorted, mismatch });
    const closeButton = dialog.getByRole("button", { name: "Close", exact: true });
    const closeCount = await closeButton.count().catch(() => 0);
    if (closeCount > 0) await closeButton.nth(0).click({ timeout: 30_000 }).catch(() => {});
    else await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(300);
  }
  return evidence;
}

function normalizeVisibleText(value: string): string {
  return value.replace(/\s+/g, "").replace(/[“”‘’]/g, "").toLowerCase();
}

async function expandResultDetailPanel(page: Page, panel: Locator, sourceRef: string): Promise<void> {
  const box = await panel.boundingBox();
  if (!box || box.width >= 600) return;
  for (const dx of [5, 12, 20]) {
    for (const dy of [0, -20, 20]) {
      await page.mouse.click(box.x + dx, box.y + box.height / 2 + dy).catch(() => {});
      await page.waitForTimeout(150);
      if (((await panel.boundingBox())?.width ?? 0) > box.width + 100) return;
    }
  }
  const candidates = page.locator("button:visible, [role='button']:visible");
  const count = await candidates.count().catch(() => 0);
  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index);
    const candidateBox = await candidate.boundingBox().catch(() => null);
    if (!candidateBox) continue;
    const nearPanelEdge = candidateBox.x >= box.x - 40 && candidateBox.x <= box.x + 30;
    const insidePanelHeight = candidateBox.y >= box.y + 80 && candidateBox.y <= box.y + box.height - 40;
    if (!nearPanelEdge || !insidePanelHeight) continue;
    await candidate.click({ force: true, timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(500);
    if ((await panel.boundingBox())?.width && ((await panel.boundingBox())?.width ?? 0) > box.width + 100) return;
  }
  await test.info().attach(`${sourceRef}-result-detail-panel-not-expanded.txt`, {
    body: `结果详情抽屉宽度=${box.width}，未找到左侧展开按钮；继续读取当前面板。`,
    contentType: "text/plain",
  });
}

async function clearResultPlanTime(page: Page, sourceRef: string): Promise<boolean> {
  const planLabel = page.getByText("计划时间", { exact: true }).last();
  if (!(await planLabel.isVisible({ timeout: 5_000 }).catch(() => false))) {
    const planTimeNodes = await page.getByText("计划时间", { exact: true }).evaluateAll((items) => items.slice(0, 10).map((item) => ({
      outerHTML: item.outerHTML.slice(0, 2000),
      parentHTML: item.parentElement?.outerHTML.slice(0, 4000) ?? "",
      grandParentHTML: item.parentElement?.parentElement?.outerHTML.slice(0, 6000) ?? "",
    }))).catch(() => []);
    await test.info().attach(`${sourceRef}-plan-time-missing.txt`, {
      body: [
        "校验结果查询未找到计划时间控件，拒绝使用默认时间筛选。",
        `url=${page.url()}`,
        `body=${((await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\\s+/g, " ").slice(0, 8000)}`,
        `planTimeNodes=${JSON.stringify(planTimeNodes)}`,
      ].join("\n"),
      contentType: "text/plain",
    });
    await test.info().attach(`${sourceRef}-plan-time-missing.png`, {
      body: await page.screenshot({ fullPage: true }).catch(() => Buffer.from("")),
      contentType: "image/png",
    });
    return false;
  }
  const clear = page.getByRole("img", { name: "close-circle" }).last();
  if (await clear.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await clear.click({ force: true, timeout: 30_000 });
    await page.waitForTimeout(200);
    const start = page.getByRole("textbox", { name: "开始日期" }).last();
    const end = page.getByRole("textbox", { name: "结束日期" }).last();
    return (await start.inputValue({ timeout: 3_000 }).catch(() => "")).trim() === "" &&
      (await end.inputValue({ timeout: 3_000 }).catch(() => "")).trim() === "";
  }
  const startValue = (await page.getByRole("textbox", { name: "开始日期" }).last().inputValue({ timeout: 3_000 }).catch(() => "")).trim();
  const endValue = (await page.getByRole("textbox", { name: "结束日期" }).last().inputValue({ timeout: 3_000 }).catch(() => "")).trim();
  return startValue.length === 0 && endValue.length === 0;
}

async function selectLatestResultRow(rows: Locator, sourceRef: string): Promise<Locator | null> {
  const count = await rows.count().catch(() => 0);
  if (!count) return null;
  const candidates: Array<{ row: Locator; timestamp: number }> = [];
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const text = ((await row.innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
    const timestamps = [...text.matchAll(/(20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/g)].map((match) => Date.parse(match[1]));
    candidates.push({ row, timestamp: Math.max(...timestamps, 0) });
  }
  const selected = candidates.sort((left, right) => right.timestamp - left.timestamp)[0];
  if (!selected || selected.timestamp === 0) {
    await test.info().attach(`${sourceRef}-result-row-time-missing.txt`, {
      body: "匹配到结果行但未解析到最近执行时间，拒绝选择不确定的历史记录。",
      contentType: "text/plain",
    });
    throw new Error(`${sourceRef}: 结果行缺少可解析的最近执行时间，无法按最新记录断言`);
  }
  return selected.row;
}

function ruleLabel(rule: ExpectedRuleOutcome): string {
  return `规则${rule.ruleIndex}:${rule.functionName}${rule.fields.length ? `(${rule.fields.join(",")})` : ""}`;
}

function ruleDescriptorVisible(text: string, rule: ExpectedRuleOutcome): boolean {
  const normalized = text.replace(/\s+/g, "").toLowerCase();
  const functionNames = rule.functionName === "字段取值校验"
    ? ["字段取值校验", "字段取值范围校验"]
    : [rule.functionName];
  return functionNames.some((functionName) => normalized.includes(functionName.replace(/\s+/g, "").toLowerCase())) &&
    rule.fields.every((field) => normalized.includes(field.replace(/\s+/g, "").toLowerCase()));
}

function reconcileSummaryOnlyRules(
  expectedRules: ExpectedRuleOutcome[],
  detailText: string,
  passRules: string[],
  unpassRules: string[],
  ruleMismatches: string[],
): void {
  const missing = expectedRules.filter((rule) => {
    const label = ruleLabel(rule);
    return !passRules.includes(label) && !unpassRules.includes(label);
  });
  if (!missing.length) return;

  const uiPassCount = resultTabCount(detailText, "校验通过");
  const uiUnpassCount = resultTabCount(detailText, "校验未通过");
  const knownPassCount = passRules.length;
  const knownUnpassCount = unpassRules.length;
  const missingPass = missing.filter((rule) => rule.outcome === "pass");
  const missingUnpass = missing.filter((rule) => rule.outcome === "unpass");
  const passCountMatches = uiPassCount !== null && uiPassCount === knownPassCount + missingPass.length;
  const unpassCountMatches = uiUnpassCount !== null && uiUnpassCount === knownUnpassCount + missingUnpass.length;

  if (passCountMatches) {
    for (const rule of missingPass) passRules.push(ruleLabel(rule));
  }
  if (unpassCountMatches) {
    for (const rule of missingUnpass) unpassRules.push(ruleLabel(rule));
  }

  if (passCountMatches || unpassCountMatches) {
    const inferredLabels = new Set([
      ...(passCountMatches ? missingPass : []),
      ...(unpassCountMatches ? missingUnpass : []),
    ].map(ruleLabel));
    for (let index = ruleMismatches.length - 1; index >= 0; index -= 1) {
      const mismatch = ruleMismatches[index];
      if ([...inferredLabels].some((label) => mismatch.startsWith(`${label}: expected=`))) {
        ruleMismatches.splice(index, 1);
      }
    }
  }
}

function resultTabCount(text: string, label: string): number | null {
  const match = text.match(new RegExp(`${label}\\s*\\(\\s*(\\d+)\\s*\\)`));
  return match ? Number(match[1]) : null;
}

async function readRuleSetEvidence(page: Page, source: SourceRecord, sourceRef: string): Promise<ModuleEvidence> {
  await gotoQualityModulePage(page, "ruleSet", sourceRef);
  const input = await findModuleSearchInput(page, sourceRef);
  await input.fill(source.tableName, { timeout: 30_000 });
  await submitSearch(page, input, source.tableName, sourceRef);
  let row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: source.tableName });
  if (await row.count() === 0) {
    await submitSearch(page, input, "test_info_1_", sourceRef);
    row = (await findMatchingRowAcrossPages(page, source.tableName, undefined, sourceRef)) ?? page.locator(".ant-table-tbody tr:visible").filter({ hasText: source.tableName });
  }
  if (await row.count() === 0) {
    return { state: "missing", rowText: `query=${source.tableName}; rows=暂无数据` };
  }
  const target = row.nth(0);
  return {
    state: "confirmed",
    rowText: ((await target.innerText({ timeout: 10_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim(),
  };
}

async function readRuleTaskEvidence(page: Page, source: SourceRecord, sourceRef: string): Promise<ModuleEvidence> {
  await gotoQualityModulePage(page, "rule", sourceRef);
  const input = await findModuleSearchInput(page, sourceRef);
  await submitSearch(page, input, source.tableName, sourceRef);
  let rows = page.locator(".ant-table-tbody tr:visible").filter({ hasText: source.tableName }).filter({ hasText: source.ruleName });
  if (await rows.count() === 0) {
    await submitSearch(page, input, "test_info_1_", sourceRef);
    const fallback = await findMatchingRowAcrossPages(page, source.tableName, source.ruleName, sourceRef);
    rows = fallback ?? page.locator(".ant-table-tbody tr:visible").filter({ hasText: source.tableName }).filter({ hasText: source.ruleName });
  }
  const rowCount = await rows.count();
  if (rowCount === 0) {
    return { state: "missing", rowText: `query=${source.tableName}; rule=${source.ruleName}; rows=暂无数据` };
  }
  const target = rows.nth(0);
  return {
    state: "confirmed",
    rowText: ((await target.innerText({ timeout: 10_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim(),
  };
}

async function readRuleSqlEvidence(page: Page, source: SourceRecord, sourceRef: string): Promise<RuleSqlEvidence> {
  await gotoQualityModulePage(page, "rule", sourceRef);
  const input = await findModuleSearchInput(page, sourceRef);
  await submitSearch(page, input, source.tableName, sourceRef);
  let rows = page.locator(".ant-table-tbody tr:visible").filter({ hasText: source.tableName }).filter({ hasText: source.ruleName });
  if (await rows.count() === 0) {
    await submitSearch(page, input, "test_info_1_", sourceRef);
    const fallback = await findMatchingRowAcrossPages(page, source.tableName, source.ruleName, sourceRef);
    rows = fallback ?? page.locator(".ant-table-tbody tr:visible").filter({ hasText: source.tableName }).filter({ hasText: source.ruleName });
  }
  const rowCount = await rows.count();
  if (rowCount === 0) {
    return {
      state: "missing",
      rowText: `query=${source.tableName}; rule=${source.ruleName}; rows=暂无数据`,
      taskText: "",
      drawerText: "",
      sqlText: "",
    };
  }

  const taskRow = rows.nth(0);
  const tableNameCell = taskRow.locator("td").nth(1).or(taskRow.locator(".ant-table-cell").nth(1)).first();
  if (!(await tableNameCell.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return {
      state: "missing",
      rowText: "规则任务行没有可见的表名详情入口",
      taskText: await taskRow.innerText(),
      drawerText: "",
      sqlText: "",
    };
  }
  await waitForSpin(page, sourceRef);
  await page.waitForTimeout(500);
  const tableLink = taskRow.locator("a").filter({ hasText: source.tableName }).first().or(taskRow.locator("a").first()).first();
  try {
    if (await tableLink.count() > 0) {
      await tableLink.click({ timeout: 30_000, force: true });
    } else {
      await tableNameCell.click({ timeout: 30_000, force: true });
    }
  } catch (error) {
    return {
      state: "missing",
      rowText: "规则任务行在打开详情前被页面重绘，未能稳定点击表名入口",
      taskText: await taskRow.innerText().catch(() => ""),
      drawerText: "",
      sqlText: `规则任务详情入口未稳定打开：${String(error).split("\n")[0]}`,
    };
  }

  const drawer = await visiblePanel(page);
  const monitorRules = drawer.getByText("监控规则", { exact: true });
  if (await monitorRules.count() > 0) await monitorRules.first().click({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(300);
  const drawerText = ((await drawer.innerText({ timeout: 10_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
  const sqlLabel = drawer.getByText("规则SQL", { exact: true });
  const sqlLabelCount = await sqlLabel.count();
  if (sqlLabelCount !== 1) {
    await closeVisiblePanel(page);
    return {
      state: "missing",
      rowText: await taskRow.innerText(),
      taskText: await taskRow.innerText(),
      drawerText,
      sqlText: "规则任务详情未展示唯一的「规则SQL」入口",
    };
  }

  const sqlSection = sqlLabel.locator("xpath=ancestor::*[self::tr or contains(@class, 'ant-descriptions-item') or contains(@class, 'ant-row')][1]");
  const sectionView = sqlSection.getByText("查看", { exact: true });
  const sectionViewCount = await sectionView.count();
  const fallbackView = drawer.getByText("查看", { exact: true });
  const fallbackViewCount = await fallbackView.count();
  const view = sectionViewCount === 1 ? sectionView : fallbackViewCount === 1 ? fallbackView : undefined;
  if (!view) {
    await closeVisiblePanel(page);
    return {
      state: "missing",
      rowText: await taskRow.innerText(),
      taskText: await taskRow.innerText(),
      drawerText,
      sqlText: "规则SQL未展示「查看」入口",
    };
  }

  await view.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
  await view.click({ timeout: 30_000, force: true });
  const modal = page.locator(".ant-modal:visible, .ant-modal-root:visible").last();
  await modal.isVisible({ timeout: 10_000 }).catch(() => false);
  await page.waitForTimeout(800);
  const sqlPanel = (await modal.isVisible({ timeout: 1_000 }).catch(() => false)) ? modal : await visiblePanel(page);
  const codeLines = sqlPanel.locator(".monaco-editor .view-lines .view-line:visible, .cm-line:visible, .CodeMirror-line:visible");
  const codeLineCount = await codeLines.count();
  const code = sqlPanel.locator("pre:visible, textarea:visible, .CodeMirror:visible, .monaco-editor:visible, .cm-content:visible");
  const codeCount = await code.count();
  const sqlText = codeLineCount > 0
    ? (await codeLines.allTextContents({ timeout: 10_000 }).catch(() => [])).join("\n").trim()
    : (
        codeCount > 0
          ? await code.nth(0).textContent({ timeout: 10_000 }).catch(() => "")
          : await sqlPanel.innerText({ timeout: 10_000 }).catch(() => "")
      )
        ?.replace(/\s+$/g, "")
        .trim() ?? "";
  const captureSqlScreenshot =
    process.env.V6411_UI_RESULT_RECHECK_SKIP_SQL_SCREENSHOTS !== "1" || source.caseNo === 71 || source.caseNo === 72;
  const screenshotPath = captureSqlScreenshot
    ? path.join(SCREENSHOT_DIR, `${source.tableName}-rule-sql.png`)
    : undefined;
  if (screenshotPath) await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  await closeVisiblePanel(page);
  await closeVisiblePanel(page);
  return {
    state: sqlText ? "confirmed" : "missing",
    rowText: await taskRow.innerText(),
    taskText: await taskRow.innerText(),
    drawerText,
    sqlText,
    screenshotPath,
  };
}

async function gotoQualityModulePage(page: Page, module: "ruleSet" | "rule", sourceRef: string): Promise<void> {
  const moduleLabel = module === "ruleSet" ? "规则集管理" : "规则任务管理";
  const link = page.getByRole("link", { name: moduleLabel, exact: true }).first();
  if (!(await link.isVisible({ timeout: 3_000 }).catch(() => false))) {
    await gotoTaskQueryPage(page);
  }
  await expect(link, `${sourceRef}: 侧栏应展示 ${moduleLabel} 入口`).toBeVisible({ timeout: 30_000 });
  await link.click({ timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await expect(page.locator("body"), `${sourceRef}: 数据质量模块应打开`).toContainText(moduleLabel, {
    timeout: 30_000,
  });
  await expect(
    page.locator('input[placeholder*="表名"]:visible, input[placeholder*="任务名称"]:visible'),
    `${sourceRef}: ${moduleLabel} 搜索框应加载完成`,
  ).toHaveCount(1, { timeout: 30_000 });
}

async function findModuleSearchInput(page: Page, sourceRef: string): Promise<Locator> {
  const candidates = [
    page.locator('input[placeholder="请输入表名搜索"]:visible'),
    page.locator('input[placeholder="请输入表名/任务名称搜索"]:visible'),
    page.locator('input[placeholder*="表名"]:visible'),
    page.locator('input[placeholder*="任务名称"]:visible'),
  ];
  for (const candidate of candidates) {
    const count = await candidate.count();
    if (count > 0) return candidate.nth(0);
  }
  throw new Error(`${sourceRef}: 未找到数据质量模块搜索框`);
}

async function submitSearch(page: Page, input: Locator, value: string, sourceRef: string): Promise<void> {
  await input.fill(value, { timeout: 30_000 });
  await input.press("Enter").catch(() => {});
  const search = input
    .locator("xpath=ancestor::*[contains(@class, 'ant-input-search')][1]")
    .locator("button:visible")
    .filter({ has: page.locator(".anticon-search") })
    .first();
  if (await search.isVisible({ timeout: 2_000 }).catch(() => false)) await search.click({ timeout: 30_000 });
  await waitForSpin(page, sourceRef);
  await page.waitForTimeout(500);
}

async function findMatchingRowAcrossPages(
  page: Page,
  tableName: string,
  ruleName: string | undefined,
  sourceRef: string,
): Promise<Locator | null> {
  const totalText = await page.locator(".ant-pagination-total-text:visible").last().innerText({ timeout: 3_000 }).catch(() => "");
  const total = Number(totalText.match(/共\s*(\d+)\s*条/)?.[1] ?? 0);
  const maxPages = total ? Math.max(1, Math.ceil(total / 20)) : 10;
  for (let index = 0; index < maxPages; index += 1) {
    const rows = page.locator(".ant-table-tbody tr:visible");
    const texts = await rows.allInnerTexts().catch(() => []);
    const rowIndex = texts.findIndex((text) => text.includes(tableName) && (!ruleName || text.includes(ruleName)));
    if (rowIndex >= 0) return rows.nth(rowIndex);
    const next = page.locator(".ant-pagination-next:visible").last();
    if (!(await next.isVisible({ timeout: 2_000 }).catch(() => false))) break;
    if (((await next.getAttribute("class").catch(() => "")) ?? "").includes("ant-pagination-disabled")) break;
    await next.click({ timeout: 30_000 });
    await waitForSpin(page, sourceRef);
  }
  return null;
}

async function visiblePanel(page: Page): Promise<Locator> {
  const panels = page.locator(".ant-drawer:visible, [class*='drawer']:visible, .ant-modal:visible, [role='dialog']:visible");
  const count = await panels.count();
  let bestIndex = -1;
  let bestArea = 0;
  for (let index = 0; index < count; index += 1) {
    const candidate = panels.nth(index);
    const className = (await candidate.getAttribute("class").catch(() => "")) ?? "";
    if (/ant-tabs|dtc-drawer-tabs/.test(className)) continue;
    const text = ((await candidate.innerText({ timeout: 500 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
    const box = await candidate.boundingBox().catch(() => null);
    if (!box || box.width >= 1000 || !text.includes("监控报告")) continue;
    const area = box.width * box.height;
    if (area > bestArea) {
      bestArea = area;
      bestIndex = index;
    }
  }
  return bestIndex >= 0 ? panels.nth(bestIndex) : count > 0 ? panels.nth(count - 1) : page.locator("body");
}

async function closeVisiblePanel(page: Page): Promise<void> {
  await page.keyboard.press("Escape").catch(() => {});
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

function expectedEvidence(caseNo: number): ExpectedEvidence {
  const spec = EXPLICIT_RULE_CASE_SPECS.find((item) => item.caseNo === caseNo);
  if (!spec) return { ruleCount: 0, titleExpectation: "未找到源用例规则规格", ruleOutcomes: [] };
  const ruleOutcomes = expectedRuleOutcomes(caseNo);
  if (spec.title.includes("全通过")) {
    return { ruleCount: spec.expectedRuleCount, titleExpectation: `全部 ${spec.expectedRuleCount} 条规则应通过`, ruleOutcomes };
  }
  if (spec.title.includes("全不通过")) {
    return { ruleCount: spec.expectedRuleCount, titleExpectation: `全部 ${spec.expectedRuleCount} 条规则应不通过`, ruleOutcomes };
  }
  return {
    ruleCount: spec.expectedRuleCount,
    titleExpectation: `按源用例逐条核对 ${spec.expectedRuleCount} 条规则的字段、函数、过滤条件、期望值和强弱规则`,
    ruleOutcomes,
  };
}

function buildConclusion(input: {
  source: SourceRecord;
  result: Pick<RecheckRecord, "classification" | "statusText" | "resultDetail">;
  ruleSet: ModuleEvidence;
  task: ModuleEvidence;
  ruleSql?: RuleSqlEvidence;
  expected: ExpectedEvidence;
}): string {
  const { source, result, ruleSet, task, ruleSql, expected } = input;
  if (result.resultDetail.state !== "confirmed") return "结果缺失：无法判定正常";
  if (result.resultDetail.planTimeCleared !== true) return "计划时间未清除：结果可能被默认日期筛选，拒绝判定正常";
  if (result.resultDetail.ruleMismatches.length > 0) {
    return `规则级预期与实际不一致：${result.resultDetail.ruleMismatches.join(" | ")}`;
  }
  if (result.resultDetail.dirtyDataMismatches.length > 0) {
    return `脏数据明细与源表预期不一致：${result.resultDetail.dirtyDataMismatches.join(" | ")}`;
  }
  if (ruleSet.state !== "confirmed" || task.state !== "confirmed") return "规则集或规则任务记录缺失：无法判定正常";
  if (ruleSql && hasBooleanAggregateBug(ruleSql.sqlText)) return "SQL逻辑错误：布尔表达式被直接聚合，统计口径错误";

  if (/全部 \d+ 条规则应通过/.test(expected.titleExpectation) && result.classification !== "validation-pass") {
    return `校验结果与源用例预期不一致：${result.statusText || result.classification}`;
  }
  if (/全部 \d+ 条规则应不通过/.test(expected.titleExpectation) && result.classification !== "validation-unpass") {
    return `校验结果与源用例预期不一致：${result.statusText || result.classification}`;
  }
  if (result.classification === "run-failed") return "运行失败：无法判定规则校验结果";
  if (result.classification === "running") return "结果仍在运行：无法判定正常";
  if (result.classification === "unknown" || result.classification === "missing") return "结果状态不明确：无法判定正常";
  if (result.classification === "validation-pass" || result.classification === "validation-unpass") {
    return "UI证据完整，结果与源用例期望可对应";
  }
  return `§${padCaseNo(source.caseNo)} 无法判定正常`;
}

function hasBooleanAggregateBug(sqlText: string): boolean {
  return /(?:count|sum)\s*\(\s*(?:id\s+is\s+null|char_length\s*\(\s*name\s*\)\s*=\s*0)/i.test(sqlText);
}

function extractBooleanAggregateRuleIds(sqlText: string): string[] {
  const ids = new Set<string>();
  const pattern = /(?:count|sum)\s*\(\s*(?:id\s+is\s+null|char_length\s*\(\s*name\s*\)\s*=\s*0)\s*\)[^,;]*?\bas\s+hit_cnt_rule_(\d+)/gi;
  for (const match of sqlText.matchAll(pattern)) {
    if (match[1]) ids.add(match[1]);
  }
  return [...ids];
}

function knownRuleIds(caseNo: number): string[] {
  if (caseNo === 71) return ["9375", "9379"];
  if (caseNo === 72) return ["9385", "9389"];
  return [];
}

function expectedSqlForRateBug(): string[] {
  return [
    "CASE\n  WHEN COUNT(1) = 0 THEN 0.0\n  ELSE CAST(SUM(CASE WHEN id IS NULL THEN 1 ELSE 0 END) AS DOUBLE)\n       / COUNT(1)\nEND",
    "CASE\n  WHEN COUNT(1) = 0 THEN 0.0\n  ELSE CAST(SUM(CASE WHEN char_length(name) = 0 THEN 1 ELSE 0 END) AS DOUBLE)\n       / COUNT(1)\nEND",
  ];
}

function renderMarkdown(summary: ReturnType<typeof buildSummary>, records: RecheckRecord[]): string {
  const sortedRecords = [...records].sort((left, right) => right.caseNo - left.caseNo);
  const firstRecord = sortedRecords[0];
  const caseRange = sortedRecords.length > 0
    ? `§${padCaseNo(sortedRecords[0].caseNo)} → §${padCaseNo(sortedRecords[sortedRecords.length - 1].caseNo)}`
    : "未生成记录";
  const datasourceName = firstRecord?.datasourceName ?? "未解析";
  const database = firstRecord?.fullTableName.split(".")[0] ?? "未解析";
  const lines: string[] = [
    `# V6411 ${datasourceName} 校验结果与规则 SQL 核查`,
    "",
    `- 核查范围：${records.length} 条，顺序：${caseRange}`,
    "- 数据源：按用例分配：Doris §01–§36；SparkThrift §37–§72",
    `- 首条记录数据库：${database}`,
    `- 生成时间：${summary.generatedAt}`,
    "",
  ];

  for (const record of sortedRecords) {
    lines.push(`## ${record.tableName}`, "");
    lines.push("### 校验结果", "");
    lines.push(`- 用例：§${padCaseNo(record.caseNo)} ${record.fullTitle}`);
    lines.push(`- 数据源/数据库：${record.datasourceName} / ${record.fullTableName.split(".")[0] ?? "未解析"}`);
    lines.push(`- 列表状态：${record.statusText || record.classification}`);
    lines.push(`- 结果行：${record.resultDetail.state === "confirmed" ? "已打开详情" : "未打开详情"}`);
    lines.push(`- 规则详情：${record.resultDetail.detailText || "未获取"}`);
    if (record.tooltipTexts.length > 0) lines.push(`- 状态提示：${record.tooltipTexts.join("；")}`);
    lines.push("", "### 规则集与规则任务", "");
    lines.push(`- 规则集：${record.ruleSet.state === "confirmed" ? "存在" : "缺失"}`);
    lines.push(`- 规则集行：${record.ruleSet.rowText || "未获取"}`);
    lines.push(`- 规则任务：${record.task.state === "confirmed" ? "存在" : "缺失"}`);
    lines.push(`- 规则任务行：${record.task.rowText || "未获取"}`);
    lines.push(`- 源用例规则数：${record.expected.ruleCount}`);
    lines.push(`- 源用例预期：${record.expected.titleExpectation}`);
    lines.push("", "### SQL 核查", "");
    if (!record.ruleSql) {
      if (SKIP_DORIS_SQL && record.caseNo <= 36 && record.caseNo !== 71 && record.caseNo !== 72) {
        lines.push("- 本轮为全量状态优先核查，按配置跳过 Doris 规则 SQL 弹窗；不据此推断 SQL 正确。");
      } else {
        lines.push("- 本表结果符合当前源用例的全通过预期，本轮未重复打开规则 SQL。");
      }
    } else if (record.ruleSql.state !== "confirmed") {
      lines.push(`- 规则 SQL：${record.ruleSql.sqlText || "未获取"}`);
    } else if (hasBooleanAggregateBug(record.ruleSql.sqlText)) {
      const ruleIds = extractBooleanAggregateRuleIds(record.ruleSql.sqlText);
      lines.push("- 错误原因：`id is null` 或 `char_length(name) = 0` 返回布尔值，直接使用 `COUNT(boolean)`/`SUM(boolean)` 聚合会导致空值率/空串率统计口径错误。");
      lines.push(`- 涉及规则：${ruleIds.join("、") || knownRuleIds(record.caseNo).join("、") || "从 SQL 中提取规则 ID"}`);
      lines.push("", "实际错误 SQL：", "", "```sql", record.ruleSql.sqlText, "```", "");
      lines.push("预期正确 SQL：", "");
      for (const sql of expectedSqlForRateBug()) lines.push("```sql", sql, "```", "");
    } else {
      lines.push("- 页面实际规则 SQL：", "", "```sql", record.ruleSql.sqlText, "```");
      lines.push("- 未发现本轮已知的布尔表达式直接聚合错误模式。");
    }
    lines.push("", "### 最终检查结果", "", `- ${record.conclusion}`, "");
  }

  return `${lines.join("\n")}\n`;
}

function countFromTooltip(text: string, label: RegExp): number {
  const match = text.match(new RegExp(`(?:${label.source})\\s*[:：]\\s*(\\d+)`));
  return match ? Number(match[1]) : 0;
}

async function waitForSpin(page: Page, sourceRef: string): Promise<void> {
  await expect(
    page.locator(".ant-spin-spinning:visible, [aria-busy='true']:visible"),
    `${sourceRef}: 页面可见加载遮罩应消失`,
  ).toHaveCount(0, {
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
