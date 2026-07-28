// 临时探测：对比新旧 Doris 数据源的连通性与可选数据库。
// 1) 数据源管理页行信息 + 测试连接结果；2) 元数据同步弹窗中数据库下拉的实时选项。
import fs from "node:fs";
import path from "node:path";

import { test, type Page } from "@playwright/test";

import { getEnvConfig } from "../../../../../../_shared/helpers";

const ENV = getEnvConfig();
const BASE_URL = ENV.urls.baseUrl;
const PROJECT_ID = String(ENV.projects.quality.id);
const OUT_DIR = path.join(process.env.KATA_RUN_PATH ?? ".", "probe-doris-datasources");
const DATASOURCES = ["dtstack_smoke_DORIS_doris3", "test_lindorm_spark_DORIS_doris3", "test_lindorm_spark_DORIS_doris"];

test.setTimeout(20 * 60 * 1000);

async function gotoPage(page: Page, routePath: string): Promise<void> {
  await page.keyboard.press("Escape").catch(() => {});
  await page.addInitScript((projectId) => {
    for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
      sessionStorage.setItem(key, projectId);
      localStorage.setItem(key, projectId);
    }
  }, PROJECT_ID);
  await page.goto(`${BASE_URL}/dataAssets/#${routePath}?pid=${PROJECT_ID}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4_000);
}

async function dump(page: Page, label: string, extra: Record<string, unknown> = {}): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const body = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  const report = { label, url: page.url(), body: body.replace(/\s+/g, " ").slice(0, 3000), ...extra };
  fs.writeFileSync(path.join(OUT_DIR, `${label}.json`), JSON.stringify(report, null, 2));
  await page.screenshot({ path: path.join(OUT_DIR, `${label}.png`) });
  console.log(`[probe-ds] ${label} ${JSON.stringify(extra).slice(0, 400)}`);
}

test("探测新旧 Doris 数据源连通性与数据库列表", async ({ page }) => {
  // 1) 数据源管理页
  await gotoPage(page, "/dataSourceManage");
  for (const name of DATASOURCES) {
    const search = page.locator("input[placeholder*='搜索']:visible, input[placeholder*='名称']:visible").first();
    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill(name, { timeout: 10_000 });
      await page.keyboard.press("Enter");
      await page.waitForTimeout(3_000);
    }
    const row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: name }).first();
    const rowText = (await row.innerText({ timeout: 5_000 }).catch(() => "<not found>")) ?? "<not found>";
    await dump(page, `ds-row-${name}`, { rowText: rowText.replace(/\s+/g, " ").slice(0, 500) });
    // 尝试测试连接
    const testBtn = row.getByText(/测试连接|连接测试/).first();
    if (await testBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await testBtn.click({ timeout: 10_000 });
      await page.waitForTimeout(6_000);
      const message = await page
        .locator(".ant-message-notice:visible, .ant-notification-notice:visible, .ant-modal:visible")
        .allInnerTexts()
        .catch(() => []);
      await dump(page, `ds-testconn-${name}`, { message });
      await page.keyboard.press("Escape").catch(() => {});
    }
  }

  // 2) 元数据同步弹窗实时数据库列表
  for (const name of DATASOURCES) {
    await gotoPage(page, "/metaDataSync");
    const addBtn = page
      .getByRole("button", { name: /新增周期同步任务/ })
      .or(page.locator("button").filter({ hasText: /新增.*同步/ }))
      .first();
    await addBtn.click({ timeout: 15_000 });
    const modal = page.locator(".ant-modal:visible, dialog:visible").first();
    await modal.waitFor({ state: "visible", timeout: 10_000 });
    const dsCombobox = modal.locator(".ant-select").first();
    await dsCombobox.locator(".ant-select-selector").click({ timeout: 15_000 });
    await page.waitForTimeout(2_000);
    const dsDropdown = page.locator(".ant-select-dropdown:visible").last();
    const dsOptions = await dsDropdown.locator(".ant-select-item-option").allInnerTexts().catch(() => []);
    const target = dsDropdown
      .locator(".ant-select-item-option:not(.ant-select-item-option-disabled)")
      .filter({ hasText: name })
      .first();
    if (!(await target.isVisible({ timeout: 3_000 }).catch(() => false))) {
      await dump(page, `sync-modal-ds-missing-${name}`, { dsOptions });
      await page.keyboard.press("Escape").catch(() => {});
      continue;
    }
    await target.click({ timeout: 10_000 });
    await page.waitForTimeout(8_000);
    const dbCombobox = modal.locator(".ant-table-row .ant-select").first();
    await dbCombobox.locator(".ant-select-selector").click({ timeout: 15_000 });
    await page.waitForTimeout(8_000);
    const dbDropdown = page.locator(".ant-select-dropdown:visible").last();
    const dbOptions = await dbDropdown.locator(".ant-select-item-option").allInnerTexts().catch(() => []);
    const dbText = (await dbDropdown.innerText({ timeout: 3_000 }).catch(() => "")) ?? "";
    await dump(page, `sync-modal-db-${name}`, { dbOptions, dbText: dbText.replace(/\s+/g, " ").slice(0, 500) });
    await page.keyboard.press("Escape").catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
  }
});


