import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  expect,
  type Locator,
  type Page,
  test,
} from "@playwright/test";

type UiTaskCase = {
  caseNo: number;
  fullTitle: string;
  packageName: string;
  shortRuleName: string;
  datasourceName: string;
  fullTableName: string;
  tableName: string;
  packageCount: number;
};

type UiRunStatus = "validation-pass" | "validation-unpass" | "run-failed" | "running" | "unknown";
type SaveDiagnostics = {
  events: Array<Record<string, unknown>>;
  dispose: () => void;
};

const FEATURE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ARCHIVE_PATH = path.join(FEATURE_DIR, "cases/archive.md");
const RECORDS_PATH = path.join(FEATURE_DIR, "automation/V6411-PW-72-RECORDS.md");
const OUT_DIR = path.join(FEATURE_DIR, "runs/20260703-v6411-ui-resave-run");
const RESULT_JSONL = path.join(OUT_DIR, "ui-resave-run-results.jsonl");
const BASE_URL = process.env.V6411_DQ_BASE_URL ?? "http://shuzhan63-test-ltqc.k8s.dtstack.cn";
const PROJECT_ID = process.env.V6411_DQ_PROJECT_ID ?? "92";
const SESSION_PATH = path.resolve(
  process.cwd(),
  process.env.V6411_DQ_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
);
const CASE_FILTER = parseCaseFilter(process.env.V6411_UI_CASES);
const LEGACY_RESAVE_ENABLED = process.env.V6411_ALLOW_LEGACY_RESAVE === "1";

test.use({ storageState: SESSION_PATH });

test.describe.configure({ mode: "serial" });
test.setTimeout(Number(process.env.V6411_UI_CASE_TIMEOUT_MS ?? 20 * 60 * 1000));

const CASES = loadUiTaskCases().filter((item) => CASE_FILTER.size === 0 || CASE_FILTER.has(item.caseNo));

test.describe("v6411 72 条规则任务 UI 重新保存并立即执行", () => {
  test.beforeAll(() => {
    if (LEGACY_RESAVE_ENABLED) return;
    throw new Error(
      [
        "t14-ui-resave-run-existing-tasks 是旧记录修复脚本，不属于当前正式 full UI 重建链路。",
        "它会读取 V6411-PW-72-RECORDS.md 中的历史记录，只能作为人工指定的 legacy 修复工具。",
        "当前目标要求先 UI 清理历史数据，再通过 t16 从头重建 72 条记录。",
        "确需操作旧记录时，显式设置 V6411_ALLOW_LEGACY_RESAVE=1。",
      ].join("\n"),
    );
  });

  for (const item of CASES) {
    test(`§${padCaseNo(item.caseNo)} UI 编辑保存并立即执行 ${item.shortRuleName}`, async ({ page }) => {
      const sourceRef = `SR-UI-V6411-RESAVE-RUN-${padCaseNo(item.caseNo)}`;
      expect(item.shortRuleName.length, `${sourceRef}: UI 规则名称必须不超过 50 个字`).toBeLessThanOrEqual(50);

      fs.mkdirSync(OUT_DIR, { recursive: true });
      await test.info().attach("ui-case-name-map.json", {
        body: JSON.stringify(
          {
            caseNo: item.caseNo,
            fullTitle: item.fullTitle,
            shortRuleName: item.shortRuleName,
            shortRuleNameLength: item.shortRuleName.length,
            datasourceName: item.datasourceName,
            fullTableName: item.fullTableName,
            tableName: item.tableName,
            packageCount: item.packageCount,
          },
          null,
          2,
        ),
        contentType: "application/json",
      });

      await test.step("步骤1: UI 进入规则任务管理并搜索目标任务", async () => {
        await gotoRuleTaskList(page, sourceRef);
        await searchTaskTable(page, item.tableName, sourceRef);
        const row = taskRow(page, item.tableName).first();
        await expect(row, `${sourceRef}: 规则任务管理应展示目标表 ${item.tableName}`).toBeVisible({
          timeout: 30_000,
        });
        await attachScreenshot(page, `case-${padCaseNo(item.caseNo)}-01-task-row`);
      });

      await test.step("步骤2: UI 编辑任务，把规则名称改成 50 字以内短名", async () => {
        const row = taskRow(page, item.tableName).first();
        await openTaskEdit(row, item, sourceRef);
        await fillRuleName(page, item.shortRuleName, sourceRef);
        await attachScreenshot(page, `case-${padCaseNo(item.caseNo)}-02-edit-short-name`);
      });

      await test.step("步骤3: UI 下一步、重新引入规则包并保存任务", async () => {
        await clickNextUntilSave(page, item, sourceRef);
        await attachScreenshot(page, `case-${padCaseNo(item.caseNo)}-03-after-save`);
      });

      await test.step("步骤4: UI 回到规则任务管理并点击立即执行", async () => {
        await gotoRuleTaskList(page, sourceRef);
        await searchTaskTable(page, item.tableName, sourceRef);
        const row = taskRow(page, item.tableName).filter({ hasText: item.shortRuleName }).first();
        await expect(row, `${sourceRef}: 保存后任务列表应展示短规则名 ${item.shortRuleName}`).toBeVisible({
          timeout: 30_000,
        });
        await runTaskImmediatelyFromUi(page, row, sourceRef);
        await attachScreenshot(page, `case-${padCaseNo(item.caseNo)}-04-after-run-click`);
      });

      const result = await test.step("步骤5: UI 校验结果查询页面统计任务状态", async () => {
        const status = await waitResultStatusFromUi(page, item.shortRuleName, sourceRef);
        await attachScreenshot(page, `case-${padCaseNo(item.caseNo)}-05-result-${status.classification}`);
        return status;
      });

      const record = {
        generatedAt: new Date().toISOString(),
        caseNo: item.caseNo,
        fullTitle: item.fullTitle,
        shortRuleName: item.shortRuleName,
        tableName: item.tableName,
        datasourceName: item.datasourceName,
        classification: result.classification,
        statusText: result.statusText,
        rowText: result.rowText,
      };
      fs.appendFileSync(RESULT_JSONL, `${JSON.stringify(record)}\n`);
      await test.info().attach("ui-result-status.json", {
        body: JSON.stringify(record, null, 2),
        contentType: "application/json",
      });

      expect(
        result.classification,
        `${sourceRef}: 校验结果状态必须进入可统计终态；当前行文本=${result.rowText}`,
      ).toMatch(/validation-pass|validation-unpass|run-failed/);
    });
  }
});

function parseCaseFilter(value: string | undefined): Set<number> {
  const set = new Set<number>();
  for (const part of (value ?? "").split(",")) {
    const number = Number(part.trim());
    if (Number.isFinite(number) && number > 0) set.add(number);
  }
  return set;
}

function padCaseNo(caseNo: number): string {
  return String(caseNo).padStart(2, "0");
}

function loadUiTaskCases(): UiTaskCase[] {
  const archiveInfoByCase = parseArchiveInfo();
  const records = parseRecordTable();
  const cases = records.map((record) => {
    const archiveInfo = archiveInfoByCase.get(record.caseNo);
    if (!archiveInfo) throw new Error(`missing archive title for case ${record.caseNo}`);
    return {
      ...record,
      fullTitle: archiveInfo.fullTitle,
      packageName: archiveInfo.packageName,
      shortRuleName: shortRuleName(record.caseNo, archiveInfo.fullTitle, archiveInfo.packageName),
      tableName: record.fullTableName.split(".").at(-1) ?? record.fullTableName,
    };
  });
  if (cases.length !== 72) throw new Error(`expected 72 UI task cases, got ${cases.length}`);
  return cases.sort((left, right) => left.caseNo - right.caseNo);
}

function parseArchiveInfo(): Map<number, { fullTitle: string; packageName: string }> {
  const text = fs.readFileSync(ARCHIVE_PATH, "utf8");
  const info = new Map<number, { fullTitle: string; packageName: string }>();
  let caseNo = 0;
  let current: { fullTitle: string; packageName: string } | undefined;
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^#####\s+(.+)$/);
    if (match) {
      caseNo += 1;
      current = { fullTitle: match[1].replace(/^【P\d+】/, "").trim(), packageName: "" };
      info.set(caseNo, current);
      continue;
    }
    if (!current || current.packageName) continue;
    const packageMatch = line.match(/规则包名称」填写「([^」]+)」/);
    if (packageMatch) current.packageName = packageMatch[1].trim();
  }
  return info;
}

function parseRecordTable(): Array<Omit<UiTaskCase, "fullTitle" | "packageName" | "shortRuleName" | "tableName">> {
  const text = fs.readFileSync(RECORDS_PATH, "utf8");
  const records: Array<Omit<UiTaskCase, "fullTitle" | "packageName" | "shortRuleName" | "tableName">> = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("| §")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 8) continue;
    const caseNo = Number(cells[0].replace(/^§/, ""));
    const datasourceName = cells[2];
    const fullTableName = cells[3];
    const packageCount = Number(cells[6]);
    if (!Number.isFinite(caseNo) || !fullTableName.includes("test_info_1_")) continue;
    records.push({ caseNo, datasourceName, fullTableName, packageCount });
  }
  return records;
}

function shortRuleName(caseNo: number, fullTitle: string, packageName: string): string {
  const genericTitle = fullTitle.match(/^验证「(多规则包|单规则包|设置分区|抽样开启|抽样关闭)」校验功能$/)?.[1];
  const packageTitle = packageName.replace(/\+/g, "-");
  const titleSource =
    packageName && genericTitle
      ? `验证${packageTitle}${packageName.includes(genericTitle) ? "" : `-${genericTitle}`}校验功能`
      : fullTitle;
  let title = titleSource
    .replace(/[「」]/g, "")
    .replace(/[【】]/g, "")
    .replace(/\s+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "");
  let result = `§${padCaseNo(caseNo)} ${title}`;
  if (result.length <= 50) return result;

  const replacements: Array<[RegExp, string]> = [
    [/可合并和不可合并/g, "可合并不可合并"],
    [/不可合并部分规则/g, "部分不可合并"],
    [/完整性\+有效性/g, "完整性有效性"],
    [/校验全不通过功能/g, "全不通过"],
    [/校验全通过功能/g, "全通过"],
    [/校验不通过的规则查看明细功能/g, "不通过明细"],
    [/校验不通过质量报告正确/g, "不通过报告"],
    [/校验通过质量报告正确/g, "通过报告"],
  ];
  for (const [pattern, replacement] of replacements) title = title.replace(pattern, replacement);
  result = `§${padCaseNo(caseNo)} ${title}`;
  if (result.length <= 50) return result;

  result = result
    .replace(/校验功能$/g, "")
    .replace(/功能$/g, "")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "");
  result = `${result}校验`;
  if (result.length <= 50) return result;

  return result.slice(0, 50);
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
  await installProject(page);
  const response = await page.goto(`${BASE_URL}/dataAssets/#${routePath}?pid=${PROJECT_ID}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await injectProject(page);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await assertAuthenticated(page);
  const status = response?.status() ?? 0;
  expect(status < 500, `页面 ${routePath} HTTP 状态应小于 500，实际 ${status}`).toBe(true);
}

async function assertAuthenticated(page: Page): Promise<void> {
  const url = page.url();
  const loginTextVisible = await page
    .getByText(/欢迎登录产品中心|请输入注册账号|请输入密码/)
    .first()
    .isVisible({ timeout: 1_000 })
    .catch(() => false);
  if (!/\/uic\/#\/login|\/login/.test(url) && !loginTextVisible) return;

  throw new Error(
    [
      "会话已过期。",
      "",
      "已确认环境：ltqc-local.yaml",
      `已检查 auth.session_path：${SESSION_PATH}（无效）`,
      `已检查 repo-root fallback：${SESSION_PATH}（同一路径，无效）`,
      "",
      "请提供当前登录态 Cookie 字符串，或运行 auth-refresh.spec.ts 通过 UI 登录后重新生成 storageState。",
    ].join("\n"),
  );
}

async function gotoRuleTaskList(page: Page, sourceRef: string): Promise<void> {
  await page.keyboard.press("Escape").catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");
  await expect(page, `${sourceRef}: URL 应进入规则任务管理`).toHaveURL(/\/dq\/rule(?:\?|$)/, {
    timeout: 30_000,
  });
  await expect(page.locator("body"), `${sourceRef}: 规则任务管理页面应可见`).toContainText("规则任务管理", {
    timeout: 30_000,
  });
}

async function searchTaskTable(page: Page, tableName: string, sourceRef: string): Promise<void> {
  const input = page
    .getByPlaceholder(/输入表名搜索|请输入表名\/任务名称搜索|请输入表名|表名/)
    .or(page.locator("input[placeholder*='表名']"))
    .first();
  await expect(input, `${sourceRef}: 规则任务管理应展示搜索输入框`).toBeVisible({ timeout: 30_000 });
  await input.fill(tableName, { timeout: 30_000 });
  await page.keyboard.press("Enter").catch(() => {});
  const searchButton = page
    .getByRole("button", { name: /查\s*询|search/i })
    .or(page.locator(".ant-input-search-button, .anticon-search").first())
    .first();
  if (await searchButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await searchButton.click({ timeout: 30_000 }).catch(() => {});
  }
  await expect(taskRow(page, tableName).first(), `${sourceRef}: 搜索后应展示表 ${tableName}`).toBeVisible({
    timeout: 30_000,
  });
}

function taskRow(page: Page, tableName: string): Locator {
  return page.locator(".ant-table-tbody tr").filter({ hasText: tableName });
}

async function openTaskEdit(row: Locator, item: UiTaskCase, sourceRef: string): Promise<void> {
  const edit = row.getByRole("button", { name: /^编\s*辑$/ }).or(row.getByText(/^编辑$/)).first();
  await expect(edit, `${sourceRef}: 任务行应展示编辑入口`).toBeVisible({ timeout: 30_000 });
  await edit.click({ timeout: 30_000 });
  await expect(row.page().locator("body"), `${sourceRef}: 编辑任务页面应打开`).toContainText(/编辑.*校验规则|监控对象|规则名称/, {
    timeout: 30_000,
  });
  await waitForPageSettled(row.page(), sourceRef);
  await expect(row.page().locator("body"), `${sourceRef}: 编辑页应回显目标数据源 ${item.datasourceName}`).toContainText(
    item.datasourceName,
    { timeout: 30_000 },
  );
  await expect(row.page().locator("body"), `${sourceRef}: 编辑页应回显目标数据表 ${item.tableName}`).toContainText(
    item.tableName,
    { timeout: 30_000 },
  );
}

async function fillRuleName(page: Page, ruleName: string, sourceRef: string): Promise<void> {
  await waitForPageSettled(page, sourceRef);
  const formItem = page.locator(".ant-form-item:visible").filter({ hasText: "规则名称" }).first();
  await expect(formItem, `${sourceRef}: 编辑页应展示规则名称输入框`).toBeVisible({ timeout: 30_000 });
  const input = formItem.locator("input:visible").first();
  await input.fill(ruleName, { timeout: 30_000 });
  await expect(input, `${sourceRef}: 规则名称应改为短名`).toHaveValue(ruleName, { timeout: 30_000 });
  await expect(formItem, `${sourceRef}: 规则名称短名不应触发 50 字限制`).not.toContainText("不超过50个字", {
    timeout: 3_000,
  });
}

async function clickNextUntilSave(page: Page, item: UiTaskCase, sourceRef: string): Promise<void> {
  let rulePackageReimported = false;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await waitForPageSettled(page, sourceRef);
    if (!rulePackageReimported && (await tryReimportRulePackageFromUi(page, item, sourceRef))) {
      rulePackageReimported = true;
    }
    const save = page.getByRole("button", { name: /^保\s*存$/ }).last();
    if (await save.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await configureScheduleStepFromUi(page, item, sourceRef);
      const diagnostics = installSaveDiagnostics(page);
      try {
        await save.click({ timeout: 30_000 });
        await waitForSaveCompleted(page, sourceRef, diagnostics);
      } finally {
        diagnostics.dispose();
      }
      return;
    }
    const next = page.getByRole("button", { name: /^下\s*一\s*步$/ }).last();
    await expect(next, `${sourceRef}: 编辑流程应展示下一步入口`).toBeVisible({ timeout: 30_000 });
    await next.click({ timeout: 30_000 });
    await waitForPageSettled(page, sourceRef);
    await expect(page.locator("body"), `${sourceRef}: 点击下一步后页面应保持可见`).toBeVisible({
      timeout: 30_000,
    });
    if (!rulePackageReimported && (await tryReimportRulePackageFromUi(page, item, sourceRef))) {
      rulePackageReimported = true;
    }
  }
  throw new Error(`${sourceRef}: 4 次下一步后仍未看到保存按钮`);
}

function rulePackageImportButton(page: Page): Locator {
  return page.locator("button:visible").filter({ hasText: /引\s*入/ }).last();
}

async function tryReimportRulePackageFromUi(
  page: Page,
  item: UiTaskCase,
  sourceRef: string,
): Promise<boolean> {
  await waitForPageSettled(page, sourceRef);
  const importButton = rulePackageImportButton(page);
  const importVisible = await importButton.isVisible({ timeout: 8_000 }).catch(() => false);
  if (!importVisible) return false;

  await test.info().attach(`case-${padCaseNo(item.caseNo)}-rule-package-step.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  await expect(importButton, `${sourceRef}: 监控规则页应展示规则包引入按钮`).toBeVisible({
    timeout: 30_000,
  });
  await expect(importButton, `${sourceRef}: 规则包和规则类型应已选中，允许重新引入`).toBeEnabled({
    timeout: 60_000,
  });
  await importButton.click({ timeout: 30_000 });

  const confirm = page.locator(".ant-modal:visible, .ant-modal-confirm:visible").filter({
    hasText: /确定要引入新规则吗|覆盖引入|请确认是否引入/,
  }).last();
  if (await confirm.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const ok = confirm.getByRole("button", { name: /确\s*定|确\s*认|OK/ }).last();
    await expect(ok, `${sourceRef}: 覆盖引入确认框应展示确定按钮`).toBeVisible({ timeout: 30_000 });
    await ok.click({ timeout: 30_000 });
  }

  await expect(
    page.locator(".ant-message-notice-content, .ant-notification-notice-message").filter({ hasText: /引入成功/ }).first(),
    `${sourceRef}: 规则包覆盖引入后应提示成功`,
  ).toBeVisible({ timeout: 60_000 });
  await waitForPageSettled(page, sourceRef);
  return true;
}

async function configureScheduleStepFromUi(page: Page, item: UiTaskCase, sourceRef: string): Promise<void> {
  await waitForPageSettled(page, sourceRef);
  await setManualTriggerFromUi(page, sourceRef);
  await setPackageCountFromUi(page, item, sourceRef);
}

async function setManualTriggerFromUi(page: Page, sourceRef: string): Promise<void> {
  const scheduleItem = page.locator(".ant-form-item:visible").filter({ hasText: "调度周期" }).first();
  if (!(await scheduleItem.isVisible({ timeout: 5_000 }).catch(() => false))) return;
  const selector = scheduleItem.locator(".ant-select-selector:visible").first();
  await expect(selector, `${sourceRef}: 调度配置应展示调度周期下拉`).toBeVisible({ timeout: 30_000 });

  const currentText = (await scheduleItem.innerText({ timeout: 5_000 }).catch(() => "")).replace(/\s+/g, "");
  if (currentText.includes("手动触发")) return;

  await selector.click({ timeout: 30_000 });
  const option = page.locator(".ant-select-dropdown:visible .ant-select-item-option").filter({ hasText: "手动触发" }).last();
  await expect(option, `${sourceRef}: 调度周期下拉应包含手动触发选项`).toBeVisible({ timeout: 30_000 });
  await option.click({ timeout: 30_000 });
  await expect(scheduleItem, `${sourceRef}: 调度周期应设置为手动触发`).toContainText("手动触发", { timeout: 30_000 });
}

async function setPackageCountFromUi(page: Page, item: UiTaskCase, sourceRef: string): Promise<void> {
  const packageItem = page.locator(".ant-form-item:visible").filter({ hasText: "规则拼接包" }).first();
  await expect(packageItem, `${sourceRef}: 调度配置应展示规则拼接包输入框`).toBeVisible({ timeout: 30_000 });
  const input = packageItem.locator("input:visible").first();
  await expect(input, `${sourceRef}: 规则拼接包应可输入`).toBeVisible({ timeout: 30_000 });
  await input.click({ timeout: 30_000 });
  await input.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await input.type(String(item.packageCount), { delay: 10 });
  await input.blur();
  await expect(
    input,
    `${sourceRef}: 规则拼接包应按用例设置为 ${item.packageCount}，若被 UI 压回其他值说明规则包未按预期引入`,
  ).toHaveValue(String(item.packageCount), { timeout: 30_000 });
}

async function waitForPageSettled(page: Page, sourceRef: string): Promise<void> {
  await expect(page.locator(".ant-spin-spinning"), `${sourceRef}: 页面加载遮罩应消失`).toHaveCount(0, {
    timeout: 60_000,
  });
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

async function waitForSaveCompleted(page: Page, sourceRef: string, diagnostics: SaveDiagnostics): Promise<void> {
  const successMessage = page
    .locator(".ant-message-notice-content, .ant-notification-notice-message, .ant-notification-notice-description")
    .filter({ hasText: /成功|保存成功|操作成功/ })
    .first();
  const listSearchInput = page
    .getByPlaceholder(/输入表名搜索|请输入表名\/任务名称搜索|请输入表名|表名/)
    .or(page.locator("input[placeholder*='表名']"))
    .first();

  const completedBy = await Promise.race([
    successMessage.waitFor({ state: "visible", timeout: 60_000 }).then(() => "success-message").catch(() => ""),
    listSearchInput.waitFor({ state: "visible", timeout: 60_000 }).then(() => "task-list").catch(() => ""),
  ]);

  if (completedBy) {
    await waitForPageSettled(page, sourceRef);
    await test.info().attach("save-diagnostics.json", {
      body: JSON.stringify({ completedBy, events: diagnostics.events }, null, 2),
      contentType: "application/json",
    });
    return;
  }

  const visibleErrors = await page
    .locator(".ant-form-item-explain-error:visible, .ant-message-error:visible, .ant-notification-notice:visible")
    .allInnerTexts()
    .catch(() => []);
  const bodyText = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  await test.info().attach("save-diagnostics.json", {
    body: JSON.stringify({ completedBy, events: diagnostics.events, visibleErrors, bodyText }, null, 2),
    contentType: "application/json",
  });
  throw new Error(
    `${sourceRef}: 点击保存后 60 秒内未出现成功提示或返回任务列表。可见错误=${visibleErrors.join(" | ") || "无"}，页面文本片段=${bodyText.slice(0, 500)}`,
  );
}

async function runTaskImmediatelyFromUi(
  page: Page,
  row: Locator,
  sourceRef: string,
): Promise<void> {
  let execute = row.getByRole("button", { name: /立即执行/ }).or(row.getByText("立即执行")).first();
  if (!(await execute.isVisible({ timeout: 3_000 }).catch(() => false))) {
    const link = row.getByRole("link").first().or(row.locator("td").nth(1)).first();
    await expect(link, `${sourceRef}: 任务行应有表名/详情入口用于打开立即执行`).toBeVisible({
      timeout: 30_000,
    });
    await link.click({ timeout: 30_000 });
    const drawer = page.locator(".ant-drawer:visible, [role='dialog']:visible").last();
    const scope = (await drawer.isVisible({ timeout: 5_000 }).catch(() => false)) ? drawer : page.locator("body");
    execute = scope.getByRole("button", { name: /立即执行|执行/ }).or(scope.getByText("立即执行")).first();
  }

  await expect(execute, `${sourceRef}: UI 应展示立即执行入口`).toBeVisible({ timeout: 30_000 });
  await execute.click({ timeout: 30_000 });
  const confirm = page.locator(".ant-popover:visible, .ant-modal-confirm:visible, .ant-modal:visible").last();
  if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const ok = confirm.getByRole("button", { name: /确\s*定|确\s*认|OK|是/ }).last();
    if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) await ok.click({ timeout: 30_000 });
  }
  await expect(page.locator("body"), `${sourceRef}: 点击立即执行后页面应保持可见`).toBeVisible({
    timeout: 30_000,
  });
}

async function waitResultStatusFromUi(
  page: Page,
  ruleName: string,
  sourceRef: string,
): Promise<{ classification: UiRunStatus; statusText: string; rowText: string }> {
  await page.keyboard.press("Escape").catch(() => {});
  await gotoDataQualityPage(page, "/dq/taskQuery");
  await expect(page.locator("body"), `${sourceRef}: 校验结果查询页面应打开`).toContainText("校验结果查询", {
    timeout: 30_000,
  });

  const input = page
    .getByPlaceholder("请输入表名/任务名称搜索")
    .or(page.locator("input[placeholder*='任务名称']"))
    .or(page.locator("input[placeholder*='表名']"))
    .first();
  await expect(input, `${sourceRef}: 校验结果查询应展示搜索输入框`).toBeVisible({ timeout: 30_000 });

  const deadline = Date.now() + Number(process.env.V6411_UI_RESULT_TIMEOUT_MS ?? 45 * 60 * 1000);
  let lastRowText = "";
  let lastStatusText = "";
  while (Date.now() < deadline) {
    await input.fill(ruleName, { timeout: 30_000 });
    await page.keyboard.press("Enter").catch(() => {});
    const search = page.getByRole("button", { name: /查\s*询|search/i }).or(page.locator(".anticon-search").first()).first();
    if (await search.isVisible({ timeout: 2_000 }).catch(() => false)) await search.click({ timeout: 30_000 }).catch(() => {});
    const row = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
    if (await row.isVisible({ timeout: 10_000 }).catch(() => false)) {
      lastRowText = await row.innerText({ timeout: 10_000 });
      const classified = classifyUiResult(lastRowText);
      lastStatusText = classified.statusText;
      if (classified.classification !== "running" && classified.classification !== "unknown") {
        return { ...classified, rowText: lastRowText };
      }
    }
    await page.waitForTimeout(10_000);
  }
  return { classification: classifyUiResult(lastRowText).classification, statusText: lastStatusText, rowText: lastRowText };
}

function classifyUiResult(rowText: string): { classification: UiRunStatus; statusText: string } {
  if (/校验异常|运行失败|提交失败|失败|停止/.test(rowText)) return { classification: "run-failed", statusText: "校验异常/失败" };
  if (/校验不通过/.test(rowText)) return { classification: "validation-unpass", statusText: "校验不通过" };
  if (/校验通过/.test(rowText)) return { classification: "validation-pass", statusText: "校验通过" };
  if (/运行中|校验中|等待|未运行|停止中/.test(rowText)) return { classification: "running", statusText: "运行中/等待" };
  return { classification: "unknown", statusText: "" };
}

async function attachScreenshot(page: Page, name: string): Promise<void> {
  await test.info().attach(`${name}.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}
