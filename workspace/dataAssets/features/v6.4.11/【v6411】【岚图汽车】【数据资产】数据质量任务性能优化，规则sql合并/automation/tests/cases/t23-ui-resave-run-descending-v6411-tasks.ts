import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, type Locator, type Page, test } from "@playwright/test";

type UiTaskRecord = {
  caseNo: number;
  sourceCaseId?: string;
  datasourceName: "doris70" | "pw_test_HADOOP";
  datasourceType: "Doris3.x" | "SparkThrift2.x";
  tableName: string;
  fullTableName: string;
  ruleName: string;
  fullTitle: string;
  packageName: string;
  packageCount: number;
  samplingEnabled: boolean;
  partitionEnabled: boolean;
};

type SaveDiagnostics = {
  events: Array<Record<string, unknown>>;
  dispose: () => void;
};

type SaveResult = {
  editSavedAt: string;
  saveAttempts: number;
  rowTextAfterSave: string;
  screenshotPath: string;
};

type DescRunResultRecord = {
  runId?: string;
  status?: string;
  order?: number;
  caseNo?: number;
  [key: string]: unknown;
};

const FEATURE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const BASELINE_RECORD_SOURCE = path.join(
  FEATURE_DIR,
  "automation/runs/20260706-005100-v6411-full-ui-rebuild-after-range-fix-escalated/ui-rebuild/ui-rebuild-results.jsonl",
);
const DEFAULT_OVERLAY_RECORD_SOURCES = [
  "automation/runs/20260706-125500-v6411-restore-deleted-seven-rule-tasks/ui-rebuild/ui-rebuild-results.jsonl",
  "automation/runs/20260706-131000-v6411-restore-deleted-six-rule-tasks-only/ui-rebuild/ui-rebuild-results.jsonl",
  "automation/runs/20260706-132000-v6411-verify-restored-case65-task-only/ui-rebuild/ui-rebuild-results.jsonl",
  "automation/runs/20260706-133000-v6411-restore-missed-59-70-task-only/ui-rebuild/ui-rebuild-results.jsonl",
].map((item) => path.join(FEATURE_DIR, item));

const RUN_ID = process.env.V6411_UI_DESC_RUN_ID ?? `${formatRunStamp(new Date())}-v6411-descending-resave-run`;
const OUT_DIR = path.join(FEATURE_DIR, "automation/runs", RUN_ID, "descending-resave-run");
const SCREENSHOT_DIR = path.join(OUT_DIR, "screenshots");
const RESULT_JSONL = path.join(OUT_DIR, "ui-descending-resave-run-results.jsonl");
const BASE_URL = process.env.V6411_DQ_BASE_URL ?? "http://shuzhan63-test-ltqc.k8s.dtstack.cn";
const PROJECT_ID = process.env.V6411_DQ_PROJECT_ID ?? "92";
const PROJECT_NAME = process.env.V6411_DQ_PROJECT_NAME ?? "pw_test";
const SESSION_PATH = path.resolve(
  process.cwd(),
  process.env.V6411_DQ_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
);
const START_CASE = parseCaseBound(process.env.V6411_UI_DESC_START_CASE, "V6411_UI_DESC_START_CASE");
const END_CASE = parseCaseBound(process.env.V6411_UI_DESC_END_CASE, "V6411_UI_DESC_END_CASE");
const APPEND_RESULTS = process.env.V6411_UI_DESC_APPEND === "1";
const CONTINUE_ON_ERROR = process.env.V6411_UI_DESC_CONTINUE_ON_ERROR === "1";
const FAST_SAVE_NAVIGATE = process.env.V6411_UI_FAST_SAVE_NAVIGATE === "1";
const ALLOW_PARTIAL = process.env.V6411_UI_DESC_ALLOW_PARTIAL === "1";
const SAVE_MAX_ATTEMPTS = parseBoundedInt(process.env.V6411_UI_SAVE_MAX_ATTEMPTS, "V6411_UI_SAVE_MAX_ATTEMPTS", 3, 1, 3);

const RECORDS = filterDescendingRecords(loadDescendingRecords());
let initialResultCount = 0;

test.use({ storageState: SESSION_PATH });
test.describe.configure({ mode: "serial" });
test.setTimeout(Number(process.env.V6411_UI_DESC_TIMEOUT_MS ?? 6 * 60 * 60 * 1000));

test.describe("v6411 规则任务倒序 UI 重保存并立即执行", () => {
  test.beforeAll(async () => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    if (!APPEND_RESULTS) {
      fs.rmSync(RESULT_JSONL, { force: true });
      fs.writeFileSync(RESULT_JSONL, "", "utf8");
      initialResultCount = 0;
      return;
    }
    initialResultCount = existingJsonlLineCount(RESULT_JSONL);
    if (APPEND_RESULTS && !fs.existsSync(RESULT_JSONL)) fs.writeFileSync(RESULT_JSONL, "", "utf8");
  });

  test("按 §72 到 §01 依次编辑保存、进入详情并立即执行", async ({ page }) => {
    await test.info().attach("descending-record-source-summary.json", {
      body: JSON.stringify(
        {
          runId: RUN_ID,
          outputDir: OUT_DIR,
          resultJsonl: RESULT_JSONL,
          baselineRecordSource: BASELINE_RECORD_SOURCE,
          overlayRecordSources: overlayRecordSources(),
          appendResults: APPEND_RESULTS,
          continueOnError: CONTINUE_ON_ERROR,
          fastSaveNavigate: FAST_SAVE_NAVIGATE,
          allowPartial: ALLOW_PARTIAL,
          saveMaxAttempts: SAVE_MAX_ATTEMPTS,
          initialResultCount,
          selectedTotal: RECORDS.length,
          firstCaseNo: RECORDS[0]?.caseNo,
          lastCaseNo: RECORDS.at(-1)?.caseNo,
          startCase: START_CASE,
          endCase: END_CASE,
          datasourceDistribution: datasourceDistribution(RECORDS),
        },
        null,
        2,
      ),
      contentType: "application/json",
    });

    let order = initialResultCount;
    const totalTarget = initialResultCount + RECORDS.length;
    for (const item of RECORDS) {
      order += 1;
      const sourceRef = `SR-UI-V6411-DESC-${padCaseNo(item.caseNo)}`;
      console.log(`[v6411-desc-run] ${order}/${totalTarget} §${padCaseNo(item.caseNo)} ${item.tableName}`);

      try {
        await test.step(`§${padCaseNo(item.caseNo)} 搜索并打开编辑页`, async () => {
          await gotoRuleTaskList(page, sourceRef);
          await searchTaskTable(page, item, sourceRef);
          const row = await expectFirstTaskRow(page, item, sourceRef, "before-edit");
          await attachText(`${sourceRef}-row-before-edit.txt`, await rowText(row));
          await attachScreenshot(page, item, "01-row-before-edit");
          await openTaskEdit(row, item, sourceRef);
          await attachScreenshot(page, item, "02-edit-page-opened");
        });

        const saveResult = await test.step(`§${padCaseNo(item.caseNo)} 下一步、下一步并保存，最多 ${SAVE_MAX_ATTEMPTS} 次`, async () =>
          saveCurrentEditWithRetry(page, item, sourceRef),
        );

        const runEvidence = await test.step(`§${padCaseNo(item.caseNo)} 点击表名详情并立即执行`, async () => {
          await searchTaskTable(page, item, sourceRef);
          const savedRow = await expectFirstTaskRow(page, item, sourceRef, "before-run");
          const detailEvidence = await openTaskDetailByTableName(page, savedRow, item, sourceRef);
          await attachScreenshot(page, item, "04-detail-opened");
          await triggerImmediateRunFromDetail(page, detailEvidence.scope, item, sourceRef);
          const screenshotPath = await attachScreenshot(page, item, "05-immediate-run-clicked");
          return {
            runTriggeredAt: new Date().toISOString(),
            detailUrl: detailEvidence.url,
            detailTextSnippet: detailEvidence.textSnippet,
            screenshotPath,
          };
        });

        await appendCaseResult(sourceRef, {
          status: "success",
          generatedAt: new Date().toISOString(),
          order,
          caseNo: item.caseNo,
          sourceCaseId: item.sourceCaseId,
          datasourceName: item.datasourceName,
          datasourceType: item.datasourceType,
          tableName: item.tableName,
          fullTableName: item.fullTableName,
          ruleName: item.ruleName,
          fullTitle: item.fullTitle,
          packageName: item.packageName,
          packageCount: item.packageCount,
          editSavedAt: saveResult.editSavedAt,
          saveAttempts: saveResult.saveAttempts,
          saveScreenshotPath: saveResult.screenshotPath,
          rowTextAfterSave: saveResult.rowTextAfterSave,
          runTriggeredAt: runEvidence.runTriggeredAt,
          detailUrl: runEvidence.detailUrl,
          detailTextSnippet: runEvidence.detailTextSnippet,
          screenshotPath: runEvidence.screenshotPath,
        });
      } catch (error) {
        const pageClosed =
          page.isClosed() ||
          /Target page, context or browser has been closed|Test was interrupted/i.test(error instanceof Error ? error.message : String(error));
        const screenshotPath = await attachScreenshot(page, item, "error").catch(() => "");
        const errorRecord = {
          status: "error",
          generatedAt: new Date().toISOString(),
          order,
          caseNo: item.caseNo,
          sourceCaseId: item.sourceCaseId,
          datasourceName: item.datasourceName,
          datasourceType: item.datasourceType,
          tableName: item.tableName,
          fullTableName: item.fullTableName,
          ruleName: item.ruleName,
          fullTitle: item.fullTitle,
          packageName: item.packageName,
          packageCount: item.packageCount,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          screenshotPath,
        };
        await appendCaseResult(sourceRef, errorRecord);
        if (pageClosed) throw error;
        if (!CONTINUE_ON_ERROR) throw error;
        test.info().annotations.push({
          type: "warning",
          description: `${sourceRef}: 该条失败但 V6411_UI_DESC_CONTINUE_ON_ERROR=1，继续下一条。error=${errorRecord.errorMessage}`,
        });
        await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
      }
    }

    const persisted = readResultJsonl(RESULT_JSONL);
    const currentRunRecords = persisted.filter((record) => record.runId === RUN_ID);
    await test.info().attach("ui-descending-resave-run-summary.json", {
      body: JSON.stringify(
        {
          runId: RUN_ID,
          resultJsonl: RESULT_JSONL,
          totalPersistedLines: persisted.length,
          currentRunLines: currentRunRecords.length,
          ignoredNonCurrentRunLines: persisted.length - currentRunRecords.length,
          expectedCaseNos: RECORDS.map((record) => record.caseNo),
          actualCaseNos: currentRunRecords.map((record) => record.caseNo),
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
    if (!ALLOW_PARTIAL) assertRunResultSequence(currentRunRecords, RECORDS, initialResultCount);
    await test.info().attach("ui-descending-resave-run-results.jsonl", {
      body: fs.readFileSync(RESULT_JSONL),
      contentType: "application/jsonl",
    });
  });
});

async function appendCaseResult(sourceRef: string, record: Record<string, unknown>): Promise<void> {
  const enriched = { runId: RUN_ID, ...record };
  fs.appendFileSync(RESULT_JSONL, `${JSON.stringify(enriched)}\n`, "utf8");
  await test.info().attach(`${sourceRef}-result.json`, {
    body: JSON.stringify(enriched, null, 2),
    contentType: "application/json",
  });
}

function readResultJsonl(filePath: string): DescRunResultRecord[] {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as DescRunResultRecord;
      } catch (error) {
        throw new Error(`${filePath}:${index + 1} 不是合法 JSONL: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
}

function assertRunResultSequence(records: DescRunResultRecord[], expectedRecords: UiTaskRecord[], orderOffset: number): void {
  expect(records, "本轮倒序执行结果 JSONL 行数必须等于目标任务数").toHaveLength(expectedRecords.length);
  for (const [index, expectedRecord] of expectedRecords.entries()) {
    const actual = records[index];
    const expectedOrder = orderOffset + index + 1;
    const expectedCaseLabel = `§${padCaseNo(expectedRecord.caseNo)}`;
    expect(actual?.runId, `第 ${index + 1} 行必须属于当前 runId`).toBe(RUN_ID);
    expect(actual?.status, `第 ${index + 1} 行 ${expectedCaseLabel} 必须成功`).toBe("success");
    expect(actual?.order, `第 ${index + 1} 行 ${expectedCaseLabel} order 不正确`).toBe(expectedOrder);
    expect(actual?.caseNo, `第 ${index + 1} 行必须是 ${expectedCaseLabel}`).toBe(expectedRecord.caseNo);
    expect(actual?.tableName, `第 ${index + 1} 行 ${expectedCaseLabel} 表名不正确`).toBe(expectedRecord.tableName);
    expect(actual?.ruleName, `第 ${index + 1} 行 ${expectedCaseLabel} 任务名称不正确`).toBe(expectedRecord.ruleName);
    expect(actual?.saveAttempts, `第 ${index + 1} 行 ${expectedCaseLabel} 必须记录保存尝试次数`).toEqual(expect.any(Number));
    expect(Number(actual?.saveAttempts), `第 ${index + 1} 行 ${expectedCaseLabel} 保存尝试次数必须在 1..${SAVE_MAX_ATTEMPTS}`).toBeGreaterThanOrEqual(1);
    expect(Number(actual?.saveAttempts), `第 ${index + 1} 行 ${expectedCaseLabel} 保存尝试次数必须在 1..${SAVE_MAX_ATTEMPTS}`).toBeLessThanOrEqual(
      SAVE_MAX_ATTEMPTS,
    );
  }
}

function loadDescendingRecords(): UiTaskRecord[] {
  const map = new Map<number, UiTaskRecord>();
  for (const record of loadJsonlRecords(recordSourcePath())) map.set(record.caseNo, record);
  for (const sourcePath of overlayRecordSources()) {
    if (!fs.existsSync(sourcePath)) continue;
    for (const record of loadJsonlRecords(sourcePath)) map.set(record.caseNo, record);
  }

  const missing: number[] = [];
  for (let caseNo = 1; caseNo <= 72; caseNo += 1) {
    if (!map.has(caseNo)) missing.push(caseNo);
  }
  if (!ALLOW_PARTIAL && missing.length) throw new Error(`缺少用例记录: ${missing.map(padCaseNo).join(", ")}`);

  const records = Array.from(map.values()).sort((left, right) => right.caseNo - left.caseNo);
  if (!ALLOW_PARTIAL && records.length !== 72) throw new Error(`期望 72 条记录，实际 ${records.length}`);
  if (!ALLOW_PARTIAL && (records[0]?.caseNo !== 72 || records.at(-1)?.caseNo !== 1)) {
    throw new Error(`倒序排序失败: first=${records[0]?.caseNo}, last=${records.at(-1)?.caseNo}`);
  }
  if (ALLOW_PARTIAL && records.length === 0) throw new Error("允许部分执行时，记录来源至少要包含 1 条任务");

  for (const record of records) {
    if (!record.tableName || !record.fullTableName || !record.ruleName) {
      throw new Error(`§${padCaseNo(record.caseNo)} 记录缺少 tableName/fullTableName/ruleName`);
    }
    if (!record.ruleName.startsWith(`§${padCaseNo(record.caseNo)}`)) {
      throw new Error(`§${padCaseNo(record.caseNo)} 规则名称未以用例编号开头: ${record.ruleName}`);
    }
    if (record.ruleName.length > 50) {
      throw new Error(`§${padCaseNo(record.caseNo)} 规则名称超过 50 字: ${record.ruleName} (${record.ruleName.length})`);
    }
  }

  const distribution = datasourceDistribution(records);
  if (!ALLOW_PARTIAL && (distribution.doris70 !== 36 || distribution.pw_test_HADOOP !== 36)) {
    throw new Error(`数据源分布必须 doris70=36, pw_test_HADOOP=36，实际 ${JSON.stringify(distribution)}`);
  }
  return records;
}

function filterDescendingRecords(records: UiTaskRecord[]): UiTaskRecord[] {
  return records.filter((record) => {
    if (START_CASE !== undefined && record.caseNo > START_CASE) return false;
    if (END_CASE !== undefined && record.caseNo < END_CASE) return false;
    return true;
  });
}

function parseCaseBound(value: string | undefined, name: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 72) {
    throw new Error(`${name} 必须是 1..72 的整数，实际=${value}`);
  }
  return parsed;
}

function parseBoundedInt(value: string | undefined, name: string, fallback: number, min: number, max: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} 必须是 ${min}..${max} 的整数，实际=${value}`);
  }
  return parsed;
}

function existingJsonlLineCount(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean).length;
}

function recordSourcePath(): string {
  return path.resolve(process.cwd(), process.env.V6411_UI_DESC_SOURCE ?? BASELINE_RECORD_SOURCE);
}

function overlayRecordSources(): string[] {
  const value = process.env.V6411_UI_DESC_RESTORE_SOURCES;
  if (value === "none" || value === "__none__") return [];
  if (!value) return DEFAULT_OVERLAY_RECORD_SOURCES;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => path.resolve(process.cwd(), item));
}

function loadJsonlRecords(filePath: string): UiTaskRecord[] {
  const text = fs.readFileSync(filePath, "utf8");
  const records: UiTaskRecord[] = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const parsed = JSON.parse(line) as Partial<UiTaskRecord>;
    if (!Number.isFinite(parsed.caseNo)) throw new Error(`${filePath}:${index + 1} 缺少 caseNo`);
    records.push({
      caseNo: parsed.caseNo,
      sourceCaseId: parsed.sourceCaseId,
      datasourceName: parsed.datasourceName as UiTaskRecord["datasourceName"],
      datasourceType: parsed.datasourceType as UiTaskRecord["datasourceType"],
      tableName: requiredString(parsed.tableName, filePath, index, "tableName"),
      fullTableName: requiredString(parsed.fullTableName, filePath, index, "fullTableName"),
      ruleName: requiredString(parsed.ruleName, filePath, index, "ruleName"),
      fullTitle: requiredString(parsed.fullTitle, filePath, index, "fullTitle"),
      packageName: requiredString(parsed.packageName, filePath, index, "packageName"),
      packageCount: Number(parsed.packageCount),
      samplingEnabled: Boolean(parsed.samplingEnabled),
      partitionEnabled: Boolean(parsed.partitionEnabled),
    });
  }
  return records;
}

function requiredString(value: unknown, filePath: string, index: number, key: string): string {
  if (typeof value === "string" && value.trim()) return value;
  throw new Error(`${filePath}:${index + 1} 缺少 ${key}`);
}

function datasourceDistribution(records: UiTaskRecord[]): Record<string, number> {
  return records.reduce<Record<string, number>>((acc, record) => {
    acc[record.datasourceName] = (acc[record.datasourceName] ?? 0) + 1;
    return acc;
  }, {});
}

async function gotoRuleTaskList(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule", sourceRef);
  await expect(page, `${sourceRef}: URL 应进入规则任务管理`).toHaveURL(/\/dq\/rule(?:\?|$)/, {
    timeout: 30_000,
  });
  await expect(page.locator("body"), `${sourceRef}: 规则任务管理页面应可见`).toContainText("规则任务管理", {
    timeout: 30_000,
  });
}

async function gotoDataQualityPage(page: Page, routePath: string, sourceRef: string): Promise<void> {
  await page.keyboard.press("Escape").catch(() => {});
  await page.locator(".ant-drawer-close:visible, .ant-modal-close:visible").last().click({ timeout: 2_000 }).catch(() => {});
  await page.addInitScript(
    (projectId) => {
      for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
        sessionStorage.setItem(key, projectId);
        localStorage.setItem(key, projectId);
      }
    },
    PROJECT_ID,
  );

  const targetUrl = `${BASE_URL}/dataAssets/#${routePath}?pid=${PROJECT_ID}`;
  const appUrl = `${BASE_URL}/dataAssets/`;
  let responseStatus = 0;
  let lastGotoError = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await page.goto(targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      responseStatus = response?.status() ?? 0;
      if (responseStatus < 500) {
        lastGotoError = "";
        break;
      }
      lastGotoError = `HTTP ${responseStatus}`;
    } catch (error) {
      lastGotoError = error instanceof Error ? error.message : String(error);
      try {
        const response = await page.goto(appUrl, {
          waitUntil: "domcontentloaded",
          timeout: 90_000,
        });
        responseStatus = response?.status() ?? 0;
        if (responseStatus < 500) {
          await page.evaluate(
            ([projectId, hash]) => {
              for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
                sessionStorage.setItem(key, projectId);
                localStorage.setItem(key, projectId);
              }
              window.location.hash = hash;
            },
            [PROJECT_ID, `${routePath}?pid=${PROJECT_ID}`],
          );
          await page.waitForURL(new RegExp(`#${escapeRegExp(routePath)}(?:\\?|$)`), { timeout: 30_000 });
          lastGotoError = "";
          break;
        }
        lastGotoError = `fallback ${appUrl} HTTP ${responseStatus}; original=${lastGotoError}`;
      } catch (fallbackError) {
        lastGotoError = `original=${lastGotoError}; fallback=${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`;
      }
    }
    if (attempt < 3) {
      await test.info().attach(`${sourceRef}-goto-retry-${attempt}.txt`, {
        body: `target=${targetUrl}\nstatus=${responseStatus}\nerror=${lastGotoError}`,
        contentType: "text/plain",
      });
      await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(3_000);
    }
  }

  if (responseStatus >= 500 || lastGotoError) {
    await test.info().attach(`${sourceRef}-goto-final.txt`, {
      body: `target=${targetUrl}\nstatus=${responseStatus}\nerror=${lastGotoError}`,
      contentType: "text/plain",
    });
    throw new Error(`${sourceRef}: ${routePath} 导航失败，target=${targetUrl}, status=${responseStatus}, error=${lastGotoError}`);
  }

  await page.evaluate((projectId) => {
    for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
      sessionStorage.setItem(key, projectId);
      localStorage.setItem(key, projectId);
    }
  }, PROJECT_ID);
  await expect(page, `${sourceRef}: 应导航到 ${routePath}`).toHaveURL(new RegExp(`#${escapeRegExp(routePath)}(?:\\?|$)`), {
    timeout: 30_000,
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await assertAuthenticated(page);
  await ensureQualityProjectSelected(page, sourceRef);
  expect(responseStatus < 500, `${sourceRef}: HTTP 状态应小于 500；lastGotoError=${lastGotoError}`).toBe(true);
}

async function assertAuthenticated(page: Page): Promise<void> {
  const url = page.url();
  const loginTextVisible = await page
    .getByText(/欢迎登录产品中心|请输入注册账号|请输入密码/)
    .first()
    .isVisible({ timeout: 1_000 })
    .catch(() => false);
  if (!/\/uic\/#\/login|\/login/.test(url) && !loginTextVisible) return;
  throw new Error(`会话已过期，请刷新登录态：${SESSION_PATH}`);
}

async function ensureQualityProjectSelected(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const notAddedVisible = await page
      .getByText(/暂未被添加至\s*质量项目/)
      .first()
      .isVisible({ timeout: 1_000 })
      .catch(() => false);
    const sider = page.locator(".ant-layout-sider:visible, aside:visible, [class*='sider']:visible").first();
    const siderText = ((await sider.innerText({ timeout: 2_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
    if (siderText.includes(PROJECT_NAME) && !notAddedVisible) return;

    try {
      const projectSelect = page
        .locator(".ant-layout-sider:visible .ant-select:visible, aside:visible .ant-select:visible, [class*='sider']:visible .ant-select:visible")
        .first();
      await expect(projectSelect, `${sourceRef}: 应展示质量项目下拉`).toBeVisible({ timeout: 30_000 });
      const selected = await chooseFromSelect(page, projectSelect, PROJECT_NAME, sourceRef, { maxScrollAttempts: 8 });
      expect(selected, `${sourceRef}: 应能通过 UI 选择质量项目 ${PROJECT_NAME}`).toBe(true);
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      await expect(body, `${sourceRef}: 质量项目应切换到 ${PROJECT_NAME}`).not.toContainText(/暂未被添加至\s*质量项目/, {
        timeout: 30_000,
      });
      return;
    } catch (error) {
      lastError = error;
      await test.info().attach(`${sourceRef}-project-select-reload-${attempt}.txt`, {
        body: `选择质量项目 ${PROJECT_NAME} 第 ${attempt} 次失败，刷新页面后重试。error=${String(error)}`,
        contentType: "text/plain",
      });
      await page.keyboard.press("Escape").catch(() => {});
      await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    }
  }
  throw lastError;
}

async function searchTaskTable(page: Page, item: UiTaskRecord, sourceRef: string): Promise<void> {
  const input = page
    .getByPlaceholder(/输入表名搜索|请输入表名\/任务名称搜索|请输入表名|表名/)
    .or(page.locator("input[placeholder*='表名']"))
    .first();
  await expect(input, `${sourceRef}: 规则任务管理应展示搜索输入框`).toBeVisible({ timeout: 30_000 });
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await input.click({ timeout: 30_000 });
    await input.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
    await input.fill("", { timeout: 10_000 }).catch(() => {});
    await input.fill(item.tableName, { timeout: 30_000 });
    await expect(input, `${sourceRef}: 搜索框应回显 ${item.tableName}`).toHaveValue(item.tableName, { timeout: 30_000 });

    let search = input
      .locator("xpath=ancestor::*[contains(@class, 'ant-input-search')][1]")
      .locator("button:visible")
      .filter({ has: page.locator(".anticon-search") })
      .first();
    if (!(await search.isVisible({ timeout: 2_000 }).catch(() => false))) {
      search = page.locator("button:visible").filter({ has: page.locator(".anticon-search") }).first();
    }
    await expect(search, `${sourceRef}: 列表应展示可见搜索按钮`).toBeVisible({ timeout: 30_000 });
    await search.click({ timeout: 30_000 });
    await waitForPageSettled(page, sourceRef);
    await page.waitForTimeout(1_500);
    await attachVisibleTableRows(page, `${sourceRef}-search-${sanitizeAttachmentName(item.tableName)}-attempt-${attempt}-rows.txt`);
    const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: item.tableName }).first();
    if (await targetRow.isVisible({ timeout: 2_000 }).catch(() => false)) return;
  }
}

async function expectFirstTaskRow(page: Page, item: UiTaskRecord, sourceRef: string, stage: string): Promise<Locator> {
  const firstRow = page.locator(".ant-table-tbody tr:visible").first();
  await expect(firstRow, `${sourceRef}: ${stage} 后规则任务列表第一条记录应可见`).toBeVisible({ timeout: 30_000 });
  const text = await rowText(firstRow);
  await attachText(`${sourceRef}-${sanitizeAttachmentName(stage)}-first-row.txt`, text || "<empty first row>");
  expect(text, `${sourceRef}: ${stage} 后第一条记录不能是空数据行`).not.toMatch(/暂无数据|No Data/i);
  expect(text, `${sourceRef}: ${stage} 后第一条记录必须是表 ${item.tableName}`).toContain(item.tableName);
  expect(text, `${sourceRef}: ${stage} 后第一条记录必须是用例 §${padCaseNo(item.caseNo)}`).toContain(`§${padCaseNo(item.caseNo)}`);
  return firstRow;
}

async function saveCurrentEditWithRetry(page: Page, item: UiTaskRecord, sourceRef: string): Promise<SaveResult> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= SAVE_MAX_ATTEMPTS; attempt += 1) {
    const attemptRef = `${sourceRef}-SAVE-${attempt}`;
    try {
      if (attempt > 1) await reopenTaskEditForSaveRetry(page, item, sourceRef, attempt);
      await clickNextNextAndSave(page, attemptRef);
      await gotoRuleTaskList(page, sourceRef);
      await searchTaskTable(page, item, sourceRef);
      const savedRow = await expectFirstTaskRow(page, item, sourceRef, `after-save-attempt-${attempt}`);
      await expect(savedRow, `${sourceRef}: 保存后执行周期应仍为手动触发`).toContainText("手动触发", {
        timeout: 30_000,
      });
      const rowTextAfterSave = await rowText(savedRow);
      await attachText(`${sourceRef}-row-after-save.txt`, rowTextAfterSave);
      const screenshotPath = await attachScreenshot(page, item, `03-row-after-save-attempt-${attempt}`);
      return {
        editSavedAt: new Date().toISOString(),
        saveAttempts: attempt,
        rowTextAfterSave,
        screenshotPath,
      };
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await test.info().attach(`${attemptRef}-save-attempt-failed.txt`, {
        body: `attempt=${attempt}/${SAVE_MAX_ATTEMPTS}\nerror=${errorMessage}`,
        contentType: "text/plain",
      });
      await attachScreenshot(page, item, `save-attempt-${attempt}-failed`).catch(() => "");
      if (attempt >= SAVE_MAX_ATTEMPTS) {
        throw new Error(`${sourceRef}: 保存失败，已重试 ${SAVE_MAX_ATTEMPTS} 次。最后错误: ${errorMessage}`);
      }
      await page.keyboard.press("Escape").catch(() => {});
      await page.locator(".ant-drawer-close:visible, .ant-modal-close:visible").last().click({ timeout: 2_000 }).catch(() => {});
      await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(2_000 * attempt);
    }
  }
  throw lastError;
}

async function reopenTaskEditForSaveRetry(page: Page, item: UiTaskRecord, sourceRef: string, attempt: number): Promise<void> {
  await gotoRuleTaskList(page, `${sourceRef}-retry-${attempt}`);
  await searchTaskTable(page, item, sourceRef);
  const row = await expectFirstTaskRow(page, item, sourceRef, `retry-${attempt}-before-edit`);
  await attachText(`${sourceRef}-retry-${attempt}-row-before-edit.txt`, await rowText(row));
  await attachScreenshot(page, item, `retry-${attempt}-row-before-edit`);
  await openTaskEdit(row, item, `${sourceRef}-retry-${attempt}`);
  await attachScreenshot(page, item, `retry-${attempt}-edit-page-opened`);
}

async function expectFirstTaskInUnfilteredList(page: Page, item: UiTaskRecord, sourceRef: string, stage: string): Promise<Locator> {
  await clearTaskSearch(page, sourceRef);
  await attachVisibleTableRows(page, `${sourceRef}-${sanitizeAttachmentName(stage)}-unfiltered-rows.txt`);
  return expectFirstTaskRow(page, item, sourceRef, stage);
}

async function clearTaskSearch(page: Page, sourceRef: string): Promise<void> {
  const input = page
    .getByPlaceholder(/输入表名搜索|请输入表名\/任务名称搜索|请输入表名|表名/)
    .or(page.locator("input[placeholder*='表名']"))
    .first();
  await expect(input, `${sourceRef}: 清空搜索前应展示规则任务搜索框`).toBeVisible({ timeout: 30_000 });
  await input.click({ timeout: 30_000 });
  await input.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
  await input.fill("", { timeout: 10_000 }).catch(() => {});
  await expect(input, `${sourceRef}: 搜索框应已清空以校验未过滤列表第一行`).toHaveValue("", { timeout: 30_000 });
  let search = input
    .locator("xpath=ancestor::*[contains(@class, 'ant-input-search')][1]")
    .locator("button:visible")
    .filter({ has: page.locator(".anticon-search") })
    .first();
  if (!(await search.isVisible({ timeout: 2_000 }).catch(() => false))) {
    search = page.locator("button:visible").filter({ has: page.locator(".anticon-search") }).first();
  }
  await search.click({ timeout: 30_000 });
  await waitForPageSettled(page, sourceRef);
  await page.waitForTimeout(1_500);
}

async function openTaskEdit(row: Locator, item: UiTaskRecord, sourceRef: string): Promise<void> {
  const edit = row.getByRole("button", { name: /^编\s*辑$/ }).or(row.getByText(/^编辑$/)).first();
  await expect(edit, `${sourceRef}: 任务行应展示编辑入口`).toBeVisible({ timeout: 30_000 });
  await edit.click({ timeout: 30_000 });
  const page = row.page();
  await expect(page.locator("body"), `${sourceRef}: 编辑任务页面应打开`).toContainText(/编辑.*校验规则|监控对象|规则名称/, {
    timeout: 30_000,
  });
  await waitForPageSettled(page, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 编辑页应回显目标数据源 ${item.datasourceName}`).toContainText(
    item.datasourceName,
    { timeout: 30_000 },
  );
  await expect(page.locator("body"), `${sourceRef}: 编辑页应回显目标数据表 ${item.tableName}`).toContainText(item.tableName, {
    timeout: 30_000,
  });
}

async function clickNextNextAndSave(page: Page, sourceRef: string): Promise<void> {
  for (let step = 1; step <= 2; step += 1) {
    await waitForPageSettled(page, sourceRef);
    const next = page.getByRole("button", { name: /^下\s*一\s*步$/ }).last();
    await expect(next, `${sourceRef}: 第 ${step} 次下一步入口应可见`).toBeVisible({ timeout: 30_000 });
    await next.click({ timeout: 30_000 });
    await waitForPageSettled(page, sourceRef);
  }

  await expect(page.locator("body"), `${sourceRef}: 第二次下一步后应进入调度属性页`).toContainText(/调度|执行周期|规则拼接包|手动触发/, {
    timeout: 30_000,
  });
  const save = page.getByRole("button", { name: /^保\s*存$/ }).last();
  await expect(save, `${sourceRef}: 调度属性页应展示保存按钮`).toBeVisible({ timeout: 30_000 });
  const diagnostics = installSaveDiagnostics(page);
  try {
    await save.click({ timeout: 30_000 });
    if (FAST_SAVE_NAVIGATE) {
      const waitMs = Number(process.env.V6411_UI_FAST_SAVE_WAIT_MS ?? 5_000);
      await page.waitForTimeout(waitMs);
      await test.info().attach(`${sourceRef}-save-diagnostics.json`, {
        body: JSON.stringify(
          {
            completedBy: "fast-save-clicked",
            waitMs,
            events: diagnostics.events,
            bodyText: await page.locator("body").innerText({ timeout: 3_000 }).catch(() => ""),
          },
          null,
          2,
        ),
        contentType: "application/json",
      });
      await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {});
      return;
    }
    await waitForSaveCompleted(page, sourceRef, diagnostics, save);
  } finally {
    diagnostics.dispose();
  }
}

async function waitForSaveCompleted(
  page: Page,
  sourceRef: string,
  diagnostics: SaveDiagnostics,
  save: Locator,
): Promise<void> {
  const successMessage = page
    .locator(".ant-message-notice-content, .ant-notification-notice-message, .ant-notification-notice-description")
    .filter({ hasText: /成功|保存成功|操作成功/ })
    .first();
  const listSearchInput = page
    .getByPlaceholder(/输入表名搜索|请输入表名\/任务名称搜索|请输入表名|表名/)
    .or(page.locator("input[placeholder*='表名']"))
    .first();

  const deadline = Date.now() + Number(process.env.V6411_UI_SAVE_TIMEOUT_MS ?? 180_000);
  let sawSuccessMessage = false;
  let lastSaveClass = "";
  let lastBodyText = "";
  let lastSpinCount = 0;
  while (Date.now() < deadline) {
    lastSpinCount = await page.locator(".ant-spin-spinning").count().catch(() => 0);
    if (await listSearchInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await test.info().attach(`${sourceRef}-save-diagnostics.json`, {
        body: JSON.stringify({ completedBy: "task-list", sawSuccessMessage, lastSaveClass, lastSpinCount, events: diagnostics.events }, null, 2),
        contentType: "application/json",
      });
      return;
    }
    if (await successMessage.isVisible({ timeout: 500 }).catch(() => false)) sawSuccessMessage = true;
    lastSaveClass = (await save.getAttribute("class").catch(() => "")) ?? "";
    const saveVisible = await save.isVisible({ timeout: 500 }).catch(() => false);
    const saveLoading = saveVisible && lastSaveClass.includes("ant-btn-loading");
    if (sawSuccessMessage && !saveLoading) {
      await test.info().attach(`${sourceRef}-save-diagnostics.json`, {
        body: JSON.stringify({ completedBy: "success-message-and-save-not-loading", sawSuccessMessage, lastSaveClass, lastSpinCount, events: diagnostics.events }, null, 2),
        contentType: "application/json",
      });
      return;
    }
    lastBodyText = await page.locator("body").innerText({ timeout: 2_000 }).catch(() => "");
    const visibleErrors = await page
      .locator(".ant-form-item-explain-error:visible, .ant-message-error:visible, .ant-notification-notice:visible")
      .allInnerTexts()
      .catch(() => []);
    if (visibleErrors.length && !saveLoading) {
      await test.info().attach(`${sourceRef}-save-diagnostics.json`, {
        body: JSON.stringify({ completedBy: "", sawSuccessMessage, lastSaveClass, lastSpinCount, visibleErrors, bodyText: lastBodyText, events: diagnostics.events }, null, 2),
        contentType: "application/json",
      });
      throw new Error(`${sourceRef}: 保存出现可见错误: ${visibleErrors.join(" | ")}`);
    }
    await page.waitForTimeout(2_000);
  }

  const visibleErrors = await page
    .locator(".ant-form-item-explain-error:visible, .ant-message-error:visible, .ant-notification-notice:visible")
    .allInnerTexts()
    .catch(() => []);
  await test.info().attach(`${sourceRef}-save-diagnostics.json`, {
    body: JSON.stringify({ completedBy: "", sawSuccessMessage, lastSaveClass, lastSpinCount, events: diagnostics.events, visibleErrors, bodyText: lastBodyText }, null, 2),
    contentType: "application/json",
  });
  throw new Error(
    `${sourceRef}: 点击保存后未在超时时间内返回任务列表或结束保存 loading。可见错误=${visibleErrors.join(" | ") || "无"}，lastSaveClass=${lastSaveClass}，页面文本片段=${lastBodyText.slice(0, 500)}`,
  );
}

function installSaveDiagnostics(page: Page): SaveDiagnostics {
  const events: Array<Record<string, unknown>> = [];
  const push = (event: Record<string, unknown>) => {
    events.push({ at: new Date().toISOString(), ...event });
    if (events.length > 200) events.shift();
  };
  const onConsole = (message: { type: () => string; text: () => string }) =>
    push({ type: "console", level: message.type(), text: message.text() });
  const onPageError = (error: Error) => push({ type: "pageerror", message: error.message, stack: error.stack });
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  return {
    events,
    dispose: () => {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    },
  };
}

async function openTaskDetailByTableName(
  page: Page,
  row: Locator,
  item: UiTaskRecord,
  sourceRef: string,
): Promise<{ scope: Locator; url: string; textSnippet: string }> {
  const beforeUrl = page.url();
  const tableLink = await tableNameEntry(row, item);
  await expect(tableLink, `${sourceRef}: 任务行表名入口应可点击以打开详情`).toBeVisible({ timeout: 30_000 });
  await tableLink.click({ timeout: 30_000 });
  await waitForPageSettled(page, sourceRef);
  await page.waitForTimeout(1_000);

  const dialog = page.locator(".ant-drawer:visible, .ant-modal:visible, [role='dialog']:visible").last();
  const dialogVisible = await dialog.isVisible({ timeout: 2_000 }).catch(() => false);
  const scope = dialogVisible ? dialog : page.locator("body");
  const currentUrl = page.url();
  const detailText = ((await scope.innerText({ timeout: 10_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
  const detailOpened =
    dialogVisible ||
    currentUrl !== beforeUrl ||
    (/立即执行/.test(detailText) && /监控对象|监控规则|调度属性|基本信息|任务详情|规则名称/.test(detailText));

  if (!detailOpened) {
    await attachScreenshot(page, item, "detail-open-failed");
    await attachText(`${sourceRef}-detail-open-failed.txt`, `beforeUrl=${beforeUrl}\nafterUrl=${currentUrl}\ntext=${detailText}`);
    throw new Error(`${sourceRef}: 点击表名后未打开可识别的详情区域`);
  }
  expect(detailText, `${sourceRef}: 详情区域应包含规则名称 ${item.ruleName}`).toContain(item.ruleName);
  return { scope, url: currentUrl, textSnippet: detailText.slice(0, 800) };
}

async function tableNameEntry(row: Locator, item: UiTaskRecord): Promise<Locator> {
  const tableCell = row.locator("td").filter({ hasText: item.tableName }).first();
  const candidates = [
    row.getByRole("link").filter({ hasText: item.fullTableName }).first(),
    row.getByRole("link").filter({ hasText: item.tableName }).first(),
    tableCell.locator("a:visible, button:visible").filter({ hasText: item.tableName }).first(),
    tableCell.locator("a:visible, button:visible").first(),
  ];
  for (const candidate of candidates) {
    if (await candidate.isVisible({ timeout: 1_000 }).catch(() => false)) return candidate;
  }
  return tableCell;
}

async function triggerImmediateRunFromDetail(page: Page, scope: Locator, item: UiTaskRecord, sourceRef: string): Promise<void> {
  const execute = scope
    .getByRole("button", { name: /立即执行/ })
    .or(scope.getByRole("link", { name: /立即执行/ }))
    .or(scope.locator("button:visible, a:visible").filter({ hasText: /立即执行/ }))
    .first();
  await expect(execute, `${sourceRef}: 表名详情中应展示立即执行入口`).toBeVisible({ timeout: 30_000 });
  await execute.click({ timeout: 30_000 });

  const confirm = page.locator(".ant-popover:visible, .ant-modal-confirm:visible, .ant-modal:visible").last();
  if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const ok = confirm.getByRole("button", { name: /确\s*定|确\s*认|OK|是/ }).last();
    if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) await ok.click({ timeout: 30_000 });
  }
  await waitForPageSettled(page, sourceRef);
  await waitForExecuteSubmitToLeaveLoading(page, execute, item, sourceRef);
}

async function waitForExecuteSubmitToLeaveLoading(
  page: Page,
  execute: Locator,
  item: UiTaskRecord,
  sourceRef: string,
): Promise<void> {
  const timeoutMs = Number(process.env.V6411_UI_EXECUTE_SUBMIT_WAIT_MS ?? 45_000);
  const deadline = Date.now() + timeoutMs;
  let lastClassName = "";
  while (Date.now() < deadline) {
    const className = (await execute.getAttribute("class").catch(() => "")) ?? "";
    lastClassName = className;
    if (!className.includes("ant-btn-loading")) {
      await page.waitForTimeout(2_000);
      return;
    }
    await page.waitForTimeout(1_000);
  }
  const screenshotPath = await attachScreenshot(page, item, "execute-button-still-loading");
  test.info().annotations.push({
    type: "warning",
    description: `${sourceRef}: 立即执行按钮 ${timeoutMs}ms 后仍处于 loading，继续下一条；lastClass=${lastClassName}; screenshot=${screenshotPath}`,
  });
}

async function chooseFromSelect(
  page: Page,
  select: Locator,
  option: string,
  sourceRef: string,
  options: { required?: boolean; maxScrollAttempts?: number } = {},
): Promise<boolean> {
  const attempts = options.required === false ? 1 : 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await chooseFromSelectOnce(page, select, option, sourceRef, options);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) break;
      await test.info().attach(`${sourceRef}-select-${sanitizeAttachmentName(option)}-retry-${attempt}.txt`, {
        body: `下拉选择 ${option} 第 ${attempt} 次失败，关闭下拉后等待联动加载再重试。error=${String(error)}`,
        contentType: "text/plain",
      });
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(2_000 * attempt);
    }
  }
  throw lastError;
}

async function chooseFromSelectOnce(
  page: Page,
  select: Locator,
  option: string,
  sourceRef: string,
  options: { required?: boolean; maxScrollAttempts?: number } = {},
): Promise<boolean> {
  await page.keyboard.press("Escape").catch(() => {});
  await select.click({ force: true, timeout: 30_000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  let target = dropdown
    .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible")
    .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(option)}\\s*$`, "i") })
    .first();
  if (!(await target.isVisible({ timeout: 1_000 }).catch(() => false))) {
    const searchInput = select.locator("input.ant-select-selection-search-input, input[role='combobox']").first();
    if (await searchInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await searchInput.focus().catch(() => {});
      await searchInput.fill(option, { timeout: 3_000 }).catch(async () => {
        await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
        await page.keyboard.type(option);
      });
    } else {
      await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
      await page.keyboard.type(option);
    }
    await page.waitForTimeout(800);
    target = dropdown.locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible").filter({ hasText: option }).first();
  }
  if (!(await target.isVisible({ timeout: options.required === false ? 3_000 : 30_000 }).catch(() => false))) {
    await scrollDropdownToOption(dropdown, option, options.maxScrollAttempts ?? 40);
  }
  if (!(await target.isVisible({ timeout: options.required === false ? 3_000 : 30_000 }).catch(() => false))) {
    const dropdownText = ((await dropdown.innerText({ timeout: 3_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
    await page.keyboard.press("Escape").catch(() => {});
    if (options.required === false) return false;
    await expect(target, `${sourceRef}: 下拉应包含 ${option}; 当前下拉=${dropdownText}`).toBeVisible({ timeout: 30_000 });
  }
  const clicked =
    (await target.click({ timeout: 4_000 }).then(() => true).catch(() => false)) ||
    (await target.click({ force: true, timeout: 4_000 }).then(() => true).catch(() => false));
  if (!clicked) await page.keyboard.press("Enter").catch(() => {});
  await waitForPageSettled(page, sourceRef);
  return true;
}

async function scrollDropdownToOption(dropdown: Locator, option: string, maxAttempts: number): Promise<void> {
  const page = dropdown.page();
  const holder = dropdown.locator(".rc-virtual-list-holder, .ant-select-dropdown").first();
  if (!(await holder.isVisible({ timeout: 1_000 }).catch(() => false))) return;
  await holder
    .evaluate((element) => {
      element.scrollTop = 0;
    })
    .catch(() => {});
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const target = dropdown
      .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible")
      .filter({ hasText: option })
      .first();
    if (await target.isVisible({ timeout: 300 }).catch(() => false)) return;
    const scrolled = await holder
      .evaluate((element) => {
        const before = element.scrollTop;
        element.scrollTop += element.clientHeight || 240;
        return element.scrollTop !== before;
      })
      .catch(() => false);
    if (!scrolled) await page.mouse.wheel(0, 600).catch(() => {});
    await page.waitForTimeout(200);
  }
}

async function waitForPageSettled(page: Page, sourceRef: string): Promise<void> {
  await expect(page.locator(".ant-spin-spinning"), `${sourceRef}: 页面加载遮罩应消失`).toHaveCount(0, {
    timeout: 60_000,
  });
}

async function attachVisibleTableRows(page: Page, name: string): Promise<void> {
  const rows = await page
    .locator(".ant-table-tbody tr:visible")
    .evaluateAll((items) =>
      items
        .map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 30),
    )
    .catch((error) => [`<failed to read rows: ${String(error)}>`]);
  await attachText(name, rows.length ? rows.join("\n") : "<no visible rows>");
}

async function rowText(row: Locator): Promise<string> {
  return ((await row.innerText({ timeout: 10_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
}

async function attachText(name: string, body: string): Promise<void> {
  await test.info().attach(name, {
    body,
    contentType: "text/plain",
  });
}

async function attachScreenshot(page: Page, item: UiTaskRecord, suffix: string): Promise<string> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const filename = `${padCaseNo(item.caseNo)}-${sanitizeAttachmentName(item.tableName)}-${sanitizeAttachmentName(suffix)}.png`;
  const screenshotPath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await test.info().attach(filename, {
    body: fs.readFileSync(screenshotPath),
    contentType: "image/png",
  });
  return screenshotPath;
}

function padCaseNo(caseNo: number): string {
  return String(caseNo).padStart(2, "0");
}

function sanitizeAttachmentName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatRunStamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}
