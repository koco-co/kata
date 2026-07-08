import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, type Locator, type Page, type Response, test } from "@playwright/test";

import { applyRuntimeCookies, buildDataAssetsUrl } from "../../../../../../_shared/helpers";

type CapturedResponse = {
  url: string;
  status: number;
  responseJson?: unknown;
  responseText?: string;
};

const FEATURE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT_DIR =
  process.env.V6411_UI_PROBE_OUT_DIR ?? path.join(FEATURE_DIR, "runs/20260703-v6411-ui-metadata-probe");
const BASE_URL = process.env.V6411_DQ_BASE_URL ?? "http://shuzhan63-test-ltqc.k8s.dtstack.cn";
const PROJECT_ID = process.env.V6411_DQ_PROJECT_ID ?? "92";
const SESSION_PATH = path.resolve(
  process.cwd(),
  process.env.V6411_DQ_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
);
const TABLE_NAME = (process.env.V6411_UI_TABLE_NAME ?? "test_info_1_mr4yh7v1").toLowerCase();
const DATASOURCE = process.env.V6411_UI_DATASOURCE ?? "doris70";
const DATABASE = process.env.V6411_UI_DATABASE ?? "pw_test";
const DQ_DATASOURCE_LABEL = DATASOURCE === "doris70" ? "doris70（Doris3.x）" : `${DATASOURCE}（SparkThrift2.x）`;

test.use({ storageState: SESSION_PATH });
test.setTimeout(Number(process.env.V6411_UI_PROBE_TIMEOUT_MS ?? 10 * 60 * 1000));

test.describe("v6411 UI 元数据同步和质量表选择探测", () => {
  test("探测新建底表是否可被元数据同步和质量任务页面检索", async ({ page }) => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const captures: CapturedResponse[] = [];
    captureMatchingResponses(page, captures);
    const outPath = path.join(OUT_DIR, `${TABLE_NAME}-network.json`);

    try {
      await test.step("步骤1: 在元数据同步弹窗搜索底表", async () => {
        await applyRuntimeCookies(page);
        await page.goto(buildDataAssetsUrl("/metaDataSync"));
        await waitForPageReady(page);
        const existingSyncRow = page
          .locator(".ant-table-tbody tr")
          .filter({ hasText: DATASOURCE })
          .filter({ hasText: DATABASE })
          .filter({ hasText: TABLE_NAME })
          .first();
        if (await existingSyncRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await attachScreenshot(page, "01-metadata-sync-existing-row");
          test.info().annotations.push({
            type: "note",
            description: `元数据同步列表已存在 ${DATASOURCE}/${DATABASE}/${TABLE_NAME}，跳过新增同步弹窗探测`,
          });
          return;
        }
        const addButton = page.getByRole("button", { name: /新增周期同步任务/ }).first();
        await expect(addButton, "应展示新增周期同步任务按钮").toBeVisible({ timeout: 30_000 });
        if (await addButton.isDisabled().catch(() => false)) {
          await attachScreenshot(page, "01-metadata-sync-add-disabled");
          test.info().annotations.push({
            type: "note",
            description: "新增周期同步任务按钮不可用，继续探测质量页面表搜索",
          });
          return;
        }
        await addButton.click({ force: true, timeout: 30_000 });
        await waitForPageReady(page);
        const modal = page.locator(".ant-modal:visible, dialog:visible").first();
        await expect(modal, "元数据同步弹窗应打开").toBeVisible({ timeout: 30_000 });
        await chooseFromSelect(page, modal.locator(".ant-select").first(), DATASOURCE);
        await chooseFromSelect(page, modal.locator(".ant-table-row .ant-select").first(), DATABASE);
        await searchSelectWithoutChoosing(page, modal.locator(".ant-table-row .ant-select").nth(1), TABLE_NAME);
        await attachScreenshot(page, "01-metadata-sync-table-search");
        await page.keyboard.press("Escape").catch(() => {});
        await clickButton(page, /取\s*消/).catch(async () => page.keyboard.press("Escape").catch(() => {}));
      });

      await test.step("步骤2: 在规则集新增页搜索底表", async () => {
        await gotoDataQualityPage(page, "/dq/ruleSet/add");
        await selectExactFormOption(page, "选择数据源", DQ_DATASOURCE_LABEL);
        await selectExactFormOption(page, "选择数据库", DATABASE);
        await searchSelectWithoutChoosing(
          page,
          page
            .locator(".ant-form-item:visible")
            .filter({ has: page.locator("label:visible").filter({ hasText: /^选择数据表$/ }) })
            .first()
            .locator(".ant-select:visible")
            .first(),
          TABLE_NAME,
        );
        await attachScreenshot(page, "02-rule-set-table-search");
      });

      await test.step("步骤3: 在规则任务新增页搜索底表", async () => {
      await gotoDataQualityPage(page, "/dq/rule/add");
      await fillFormInput(page, /规则名称/, `probe_${TABLE_NAME}`);
      await selectFormOption(page, /数据源/, DQ_DATASOURCE_LABEL);
      await selectFormOption(page, /数据库/, DATABASE);
        await searchSelectWithoutChoosing(
          page,
          page.locator(".ant-form-item:visible").filter({ hasText: /数据表/ }).last().locator(".ant-select:visible").first(),
          TABLE_NAME,
        );
        await attachScreenshot(page, "03-rule-task-table-search");
      });
    } finally {
      fs.writeFileSync(outPath, JSON.stringify({ tableName: TABLE_NAME, datasource: DATASOURCE, database: DATABASE, captures }, null, 2));
      await test.info().attach("metadata-probe-network.json", {
        path: outPath,
        contentType: "application/json",
      });
    }

    const syncSearch = captures.find((item) => item.url.includes("/syncTask/realTimeTableList"));
    const existingSyncListRecord = captures.find(
      (item) => item.url.includes("/syncTask/pageTask") && JSON.stringify(item.responseJson).includes(TABLE_NAME),
    );
    const listValidDataSource = captures.find((item) => item.url.includes("/dataSource/listValidDataSource"));
    const getAllSchema = captures.find((item) => item.url.includes("/dataSource/getAllSchema"));
    const tableSearch = captures.find(
      (item) => item.url.includes("/dataSource/tablelist") && capturedPayloadText(item).includes(TABLE_NAME),
    );
    expect(syncSearch ?? existingSyncListRecord, "应捕获元数据同步实时表搜索请求或同步列表已有目标表").toBeTruthy();
    if (!listValidDataSource) {
      test.info().annotations.push({ type: "note", description: "质量数据源列表请求可能命中前端缓存，本次未捕获" });
    }
    expect(getAllSchema, "应捕获质量数据源 schema 请求").toBeTruthy();
    expect(tableSearch, "应捕获至少一个质量页面数据表搜索响应").toBeTruthy();
  });
});

function capturedPayloadText(item: CapturedResponse): string {
  if (item.responseJson !== undefined) return JSON.stringify(item.responseJson).toLowerCase();
  return (item.responseText ?? "").toLowerCase();
}

function captureMatchingResponses(page: Page, captures: CapturedResponse[]): void {
  page.on("response", async (response: Response) => {
    const url = response.url();
    if (
      !url.includes("/syncTask/realTimeTableList") &&
      !url.includes("/dataSource/") &&
      !url.includes("/syncTask/pageTask") &&
      !url.includes("/syncJob/pageQuery")
    ) {
      return;
    }
    const item: CapturedResponse = {
      url,
      status: response.status(),
    };
    try {
      item.responseJson = await response.json();
    } catch {
      item.responseText = await response.text().catch(() => "");
    }
    captures.push(item);
  });
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
  await waitForPageReady(page);
  await assertAuthenticated(page);
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

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.locator(".ant-spin-spinning").first().waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});
}

async function clickButton(page: Page, label: RegExp): Promise<void> {
  const button = page.getByRole("button", { name: label }).or(page.locator("button").filter({ hasText: label })).last();
  await expect(button, `应展示按钮 ${label}`).toBeVisible({ timeout: 30_000 });
  await button.click({ force: true, timeout: 30_000 });
  await waitForPageReady(page);
}

async function chooseFromSelect(page: Page, select: Locator, option: string): Promise<void> {
  await expect(select, `下拉框应可见: ${option}`).toBeVisible({ timeout: 30_000 });
  await select.click({ force: true, timeout: 30_000 });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
  await page.keyboard.type(option);
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  const target = dropdown
    .locator(".ant-select-item-option:not(.ant-select-item-option-disabled):visible")
    .filter({ hasText: new RegExp(escapeRegExp(option), "i") })
    .first();
  await expect(target, `下拉应包含 ${option}`).toBeVisible({ timeout: 30_000 });
  await target.click({ timeout: 30_000 });
  await waitForPageReady(page);
}

async function searchSelectWithoutChoosing(page: Page, select: Locator, search: string): Promise<string> {
  await expect(select, `搜索下拉框应可见: ${search}`).toBeVisible({ timeout: 30_000 });
  await select.click({ force: true, timeout: 30_000 });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A").catch(() => {});
  await page.keyboard.type(search);
  await page.waitForTimeout(3000);
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  if (!(await dropdown.isVisible({ timeout: 5_000 }).catch(() => false))) return "";
  return ((await dropdown.innerText({ timeout: 10_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
}

async function selectFormOption(page: Page, label: RegExp, option: string): Promise<void> {
  const field = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await chooseFromSelect(page, field.locator(".ant-select:visible").first(), option);
}

async function selectExactFormOption(page: Page, labelText: string, option: string): Promise<void> {
  const field = page
    .locator(".ant-form-item:visible")
    .filter({ has: page.locator("label:visible").filter({ hasText: new RegExp(`^${escapeRegExp(labelText)}$`) }) })
    .first();
  await expect(field, `应展示表单项 ${labelText}`).toBeVisible({ timeout: 30_000 });
  await chooseFromSelect(page, field.locator(".ant-select:visible").first(), option);
  const selectedText = (
    (await field
      .locator(".ant-select-selection-item:visible, .ant-select-selection-item-content:visible")
      .first()
      .innerText({ timeout: 10_000 })
      .catch(() => "")) ?? ""
  ).replace(/\s+/g, "");
  if (selectedText) {
    expect(selectedText, `表单项 ${labelText} 应回显 ${option}`).toContain(option.replace(/\s+/g, ""));
  } else {
    test.info().annotations.push({
      type: "note",
      description: `表单项 ${labelText} 已点击选项 ${option}，但 AntD 可见回显文本为空，继续通过后续表搜索请求验证选中状态`,
    });
  }
}

async function fillFormInput(page: Page, label: RegExp, value: string): Promise<void> {
  const field = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await expect(field, `表单项应可见: ${label}`).toBeVisible({ timeout: 30_000 });
  const input = field.locator("input:visible, textarea:visible").first();
  await expect(input, `表单项应可输入: ${label}`).toBeVisible({ timeout: 30_000 });
  await input.fill(value, { timeout: 30_000 });
}

async function attachScreenshot(page: Page, name: string): Promise<void> {
  await test.info().attach(`${name}.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
