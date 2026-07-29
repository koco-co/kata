// 临时探测（单次复核）：元数据同步弹窗中对新 Doris 数据源搜索 test_lindorm_spark 数据库。
import fs from "node:fs";
import path from "node:path";

import { test } from "@playwright/test";

import { getEnvConfig } from "../../../../../../_shared/helpers";

const ENV = getEnvConfig();
const BASE_URL = ENV.urls.baseUrl;
const PROJECT_ID = String(ENV.projects.quality.id);
const OUT_DIR = path.join(process.env.KATA_RUN_PATH ?? ".", "probe-doris-db-recheck");
const DORIS = ENV.datasources.doris;
if (!DORIS) throw new Error("当前环境未配置 doris 数据源");
const DATASOURCE = DORIS.assets.name;
const DATABASE = DORIS.sql.database;

test.setTimeout(10 * 60 * 1000);

test("复核新 Doris 数据源实时库列表", async ({ page }) => {
  await page.addInitScript((projectId) => {
    for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
      sessionStorage.setItem(key, projectId);
      localStorage.setItem(key, projectId);
    }
  }, PROJECT_ID);
  await page.goto(`${BASE_URL}/dataAssets/#/metaDataSync?pid=${PROJECT_ID}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4_000);
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
  const dsOption = page
    .locator(".ant-select-dropdown:visible .ant-select-item-option:not(.ant-select-item-option-disabled)")
    .filter({ hasText: DATASOURCE })
    .first();
  await dsOption.click({ timeout: 10_000 });
  await page.waitForTimeout(8_000);
  const dbCombobox = modal.locator(".ant-table-row .ant-select").first();
  await dbCombobox.locator(".ant-select-selector").click({ timeout: 15_000 });
  await page.waitForTimeout(5_000);
  // 输入搜索词过滤
  await page.keyboard.type(DATABASE).catch(() => {});
  await page.waitForTimeout(5_000);
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  const options = await dropdown.locator(".ant-select-item-option").allInnerTexts().catch(() => []);
  const text = ((await dropdown.innerText({ timeout: 3_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "recheck.json"),
    JSON.stringify({ datasource: DATASOURCE, searched: DATABASE, options, text, at: new Date().toISOString() }, null, 2),
  );
  await page.screenshot({ path: path.join(OUT_DIR, "recheck.png") });
  console.log(`[recheck] searched=${DATABASE} options=${JSON.stringify(options)} text=${text.slice(0, 200)}`);
});
