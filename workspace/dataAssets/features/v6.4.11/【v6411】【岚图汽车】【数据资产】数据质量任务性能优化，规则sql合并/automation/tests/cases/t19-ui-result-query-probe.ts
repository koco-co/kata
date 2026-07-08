import path from "node:path";

import { expect, test } from "@playwright/test";

const BASE_URL = process.env.V6411_DQ_BASE_URL ?? "http://shuzhan63-test-ltqc.k8s.dtstack.cn";
const PROJECT_ID = process.env.V6411_DQ_PROJECT_ID ?? "92";
const RESULT_QUERY = process.env.V6411_UI_PROBE_RESULT_QUERY ?? "test_info_1_mr65adgj_01";
const SESSION_PATH = path.resolve(
  process.cwd(),
  process.env.V6411_DQ_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
);

test.use({ storageState: SESSION_PATH });
test.setTimeout(10 * 60 * 1000);

test("探测校验结果查询列表状态", async ({ page }) => {
  await gotoTaskQueryPage(page);
  const input = page
    .getByPlaceholder("请输入表名/任务名称搜索")
    .or(page.locator("input[placeholder*='任务名称']"))
    .or(page.locator("input[placeholder*='表名']"))
    .first();
  await expect(input, "校验结果查询应展示搜索框").toBeVisible({ timeout: 30_000 });
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    await input.fill(RESULT_QUERY, { timeout: 30_000 });
    await page.keyboard.press("Enter").catch(() => {});
    const search = input
      .locator("xpath=ancestor::*[contains(@class, 'ant-input-search')][1]")
      .locator("button:visible")
      .filter({ has: page.locator(".anticon-search") })
      .first();
    if (await search.isVisible({ timeout: 2_000 }).catch(() => false)) await search.click({ timeout: 30_000 });
    await expect(page.locator(".ant-spin-spinning"), "加载遮罩应消失").toHaveCount(0, { timeout: 60_000 });
    await page.waitForTimeout(1_000);
    const rows = await page
      .locator(".ant-table-tbody tr:visible")
      .evaluateAll((items) =>
        items
          .map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .slice(0, 20),
      );
    const payload = JSON.stringify({ attempt, query: RESULT_QUERY, rows }, null, 2);
    console.log(`[v6411-result-probe] ${payload}`);
    await test.info().attach(`result-query-attempt-${attempt}.json`, { body: payload, contentType: "application/json" });
    if (rows.some((row) => /校验通过|校验不通过|校验异常|运行失败|失败/.test(row))) break;
    await page.waitForTimeout(10_000);
  }
});

async function gotoTaskQueryPage(page: import("@playwright/test").Page): Promise<void> {
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
  await expect(page.locator("body"), "校验结果查询页应打开").toContainText("校验结果查询", { timeout: 30_000 });
}
