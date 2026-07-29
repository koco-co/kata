// 一次性迁移清理：通过 UI 删除绑定旧 Doris 数据源 test_lindorm_spark_DORIS_doris3 的
// v6411 批次(qzmkxjrp)规则任务与规则集，为新数据源 dtstack_smoke_DORIS_doris3 重建让路。
// 只删除行文本同时包含批次表名与旧数据源名的记录；删除完成或本批无旧记录后该脚本应移除。
import fs from "node:fs";
import path from "node:path";

import { test, type Page } from "@playwright/test";

import { getEnvConfig } from "../../../../../../_shared/helpers";
import { loadV6411AutomationSettings } from "../../tests/fixtures/v6411-automation-config";

const ENV = getEnvConfig();
const BASE_URL = ENV.urls.baseUrl;
const PROJECT_ID = String(ENV.projects.quality.id);
const OLD_DATASOURCE = "test_lindorm_spark_DORIS_doris3";
const AUTOMATION = loadV6411AutomationSettings();
const TABLE_SUFFIX = AUTOMATION.tableBatchSuffix;
const OUT_DIR = path.join(process.env.KATA_RUN_PATH ?? ".", "cleanup-old-doris");

test.setTimeout(90 * 60 * 1000);

function dorisTableNames(): string[] {
  const tables: string[] = [];
  const filter = AUTOMATION.cases;
  for (let caseNo = 1; caseNo <= 36; caseNo += 1) {
    const included = filter.split(",").some((item) => {
      const range = item.match(/^(\d+)-(\d+)$/);
      if (range) return caseNo >= Number(range[1]) && caseNo <= Number(range[2]);
      return caseNo === Number(item);
    });
    if (included) tables.push(`test_info_1_${TABLE_SUFFIX}_${String(caseNo).padStart(2, "0")}`);
  }
  return tables;
}

async function gotoDq(page: Page, routePath: string): Promise<void> {
  await page.keyboard.press("Escape").catch(() => {});
  await page.locator(".ant-drawer-close:visible, .ant-modal-close:visible").last().click({ timeout: 2_000 }).catch(() => {});
  await page.addInitScript((projectId) => {
    for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
      sessionStorage.setItem(key, projectId);
      localStorage.setItem(key, projectId);
    }
  }, PROJECT_ID);
  await page.goto(`${BASE_URL}/dataAssets/#${routePath}?pid=${PROJECT_ID}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3_000);
}

async function searchList(page: Page, query: string): Promise<void> {
  const input = page.locator("input[placeholder*='搜索']:visible, input[placeholder*='名称']:visible").first();
  await input.fill(query, { timeout: 15_000 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(3_000);
}

async function deleteMatchingRows(page: Page, tableName: string, kind: "rule-task" | "rule-set"): Promise<number> {
  let deleted = 0;
  for (let round = 0; round < 10; round += 1) {
    const row = page
      .locator(".ant-table-tbody tr:visible")
      .filter({ hasText: tableName })
      .filter({ hasText: OLD_DATASOURCE })
      .first();
    if (!(await row.isVisible({ timeout: 3_000 }).catch(() => false))) return deleted;
    const rowText = ((await row.innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
    const del = row.getByText(/^删除$/).first();
    await del.click({ timeout: 15_000 });
    await page.waitForTimeout(1_000);
    const confirm = page
      .locator(".ant-modal-confirm:visible button, .ant-popover:visible button, .ant-modal:visible button")
      .filter({ hasText: /^确\s*定$|^是$|^删\s*除$/ })
      .first();
    await confirm.click({ timeout: 15_000 });
    await page.waitForTimeout(3_000);
    deleted += 1;
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.appendFileSync(path.join(OUT_DIR, "deleted.jsonl"), `${JSON.stringify({ kind, tableName, rowText, at: new Date().toISOString() })}\n`);
    console.log(`[cleanup] deleted ${kind} ${tableName}: ${rowText.slice(0, 120)}`);
    await searchList(page, tableName);
  }
  throw new Error(`cleanup ${kind} ${tableName}: 超过 10 条匹配记录，停止以防误删`);
}

test("清理旧 Doris 数据源的 v6411 规则任务与规则集", async ({ page }) => {
  const summary: { table: string; tasks: number; ruleSets: number }[] = [];
  for (const tableName of dorisTableNames()) {
    await gotoDq(page, "/dq/rule");
    await searchList(page, tableName);
    const tasks = await deleteMatchingRows(page, tableName, "rule-task");
    await gotoDq(page, "/dq/ruleSet");
    await searchList(page, tableName);
    const ruleSets = await deleteMatchingRows(page, tableName, "rule-set");
    if (tasks + ruleSets > 0) summary.push({ table: tableName, tasks, ruleSets });
    console.log(`[cleanup] ${tableName}: tasks=${tasks} ruleSets=${ruleSets}`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(`[cleanup] done: ${JSON.stringify(summary)}`);
});

