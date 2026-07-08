import path from "node:path";

import { expect, test } from "@playwright/test";

const BASE_URL = process.env.V6411_DQ_BASE_URL ?? "http://shuzhan63-test-ltqc.k8s.dtstack.cn";
const PROJECT_ID = process.env.V6411_DQ_PROJECT_ID ?? "92";
const TASK_QUERY = process.env.V6411_UI_PROBE_TASK ?? "test_info_1_mr64tjhw_01";
const CLICK_EXECUTE = process.env.V6411_UI_PROBE_CLICK_EXECUTE === "1";
const SESSION_PATH = path.resolve(
  process.cwd(),
  process.env.V6411_DQ_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
);

test.use({ storageState: SESSION_PATH });
test.setTimeout(10 * 60 * 1000);

test("探测规则任务列表的立即执行入口", async ({ page }) => {
  await gotoRuleTaskPage(page);
  await searchTable(page, TASK_QUERY);
  const row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: TASK_QUERY }).first();
  await expect(row, "应找到目标任务行").toBeVisible({ timeout: 30_000 });

  await dumpVisibleActions(page, row, "initial");

  const checkbox = row.locator("input[type='checkbox']").first();
  if (await checkbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await checkbox.click({ timeout: 30_000 });
    await dumpVisibleActions(page, row, "after-row-checkbox");
  }

  const topDown = page.locator("button:visible").filter({ has: page.locator(".anticon-down") }).first();
  if (await topDown.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await topDown.click({ timeout: 30_000 });
    await page.waitForTimeout(500);
    await dumpText(page, ".ant-dropdown:visible, .ant-dropdown-menu:visible, .ant-popover:visible", "top-dropdown");
    await page.keyboard.press("Escape").catch(() => {});
  }

  const tableCell = row.locator("td").nth(1);
  if (await tableCell.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await tableCell.click({ timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1_000);
    await dumpVisibleActions(page, row, "after-table-cell-click");
    await dumpExecuteCandidates(page, "after-table-cell-click");
    if (CLICK_EXECUTE) {
      await clickExecuteFromVisiblePanel(page);
      await page.waitForTimeout(3_000);
      await dumpVisibleActions(page, row, "after-execute-click");
      await dumpExecuteCandidates(page, "after-execute-click");
      await dumpText(page, ".ant-message:visible, .ant-notification:visible, body", "after-execute-body");
    }
    await page.keyboard.press("Escape").catch(() => {});
  }

  const taskNameCell = row.locator("td").nth(2);
  if (await taskNameCell.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await taskNameCell.click({ timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1_000);
    await dumpVisibleActions(page, row, "after-task-name-cell-click");
    await page.keyboard.press("Escape").catch(() => {});
  }
});

async function gotoRuleTaskPage(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(
    (projectId) => {
      for (const key of ["X-Valid-Project-ID", "dq_project_id", "dataAssets_project_id", "currentProject"]) {
        sessionStorage.setItem(key, projectId);
        localStorage.setItem(key, projectId);
      }
    },
    PROJECT_ID,
  );
  await page.goto(`${BASE_URL}/dataAssets/#/dq/rule?pid=${PROJECT_ID}`, {
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
  await expect(page.locator("body"), "规则任务管理页应打开").toContainText("规则任务管理", { timeout: 30_000 });
}

async function clickExecuteFromVisiblePanel(page: import("@playwright/test").Page): Promise<void> {
  let panel = page.locator(".ant-drawer:visible, .ant-modal:visible").last();
  if (!(await panel.isVisible({ timeout: 3_000 }).catch(() => false))) {
    panel = page.locator("body");
  }
  const execute = panel
    .getByRole("button", { name: /立即执行/ })
    .or(panel.locator("button:visible, a:visible").filter({ hasText: /立即执行/ }))
    .last();
  await expect(execute, "详情抽屉应展示立即执行按钮").toBeVisible({ timeout: 30_000 });
  await execute.click({ timeout: 30_000 });
  const confirm = page.locator(".ant-popover:visible, .ant-modal-confirm:visible, .ant-modal:visible").last();
  if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await dumpText(page, ".ant-popover:visible, .ant-modal-confirm:visible, .ant-modal:visible", "execute-confirm");
    const ok = confirm.getByRole("button", { name: /确\s*定|确\s*认|OK|是/ }).last();
    if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) await ok.click({ timeout: 30_000 });
  }
  await expect(page.locator(".ant-spin-spinning"), "立即执行后加载遮罩应消失").toHaveCount(0, { timeout: 60_000 });
}

async function searchTable(page: import("@playwright/test").Page, query: string): Promise<void> {
  const input = page
    .getByPlaceholder(/输入表名搜索|请输入表名\/任务名称搜索|请输入表名|表名/)
    .or(page.locator("input[placeholder*='表名']"))
    .first();
  await expect(input, "应展示搜索输入框").toBeVisible({ timeout: 30_000 });
  await input.fill(query, { timeout: 30_000 });
  const search = input
    .locator("xpath=ancestor::*[contains(@class, 'ant-input-search')][1]")
    .locator("button:visible")
    .filter({ has: page.locator(".anticon-search") })
    .first();
  await search.click({ timeout: 30_000 });
  await expect(page.locator(".ant-spin-spinning"), "加载遮罩应消失").toHaveCount(0, { timeout: 60_000 });
}

async function dumpVisibleActions(page: import("@playwright/test").Page, row: import("@playwright/test").Locator, label: string): Promise<void> {
  const rowText = ((await row.innerText({ timeout: 5_000 }).catch(() => "")) ?? "").replace(/\s+/g, " ");
  const pageActions = await page
    .locator("button:visible, a:visible")
    .evaluateAll((items) => items.map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean));
  const rowActions = await row
    .locator("button:visible, a:visible")
    .evaluateAll((items) => items.map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean));
  const payload = JSON.stringify({ label, rowText, pageActions, rowActions }, null, 2);
  console.log(`[v6411-execute-probe] ${payload}`);
  await test.info().attach(`${label}.json`, { body: payload, contentType: "application/json" });
}

async function dumpText(page: import("@playwright/test").Page, selector: string, label: string): Promise<void> {
  const text = await page
    .locator(selector)
    .evaluateAll((items) => items.map((item) => (item.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean))
    .catch((error) => [`<read failed: ${String(error)}>`]);
  const payload = JSON.stringify({ label, text }, null, 2);
  console.log(`[v6411-execute-probe] ${payload}`);
  await test.info().attach(`${label}.json`, { body: payload, contentType: "application/json" });
}

async function dumpExecuteCandidates(page: import("@playwright/test").Page, label: string): Promise<void> {
  const candidates = await page
    .locator("button:visible, a:visible, span:visible, div:visible")
    .filter({ hasText: /立即执行/ })
    .evaluateAll((items) =>
      items.slice(0, 20).map((item, index) => {
        const element = item as HTMLElement;
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          index,
          tagName: element.tagName,
          text: (element.textContent ?? "").replace(/\s+/g, " ").trim(),
          className: element.className,
          disabled:
            element.hasAttribute("disabled") ||
            element.getAttribute("aria-disabled") === "true" ||
            element.classList.contains("ant-btn-disabled"),
          pointerEvents: style.pointerEvents,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          outerHTML: element.outerHTML.slice(0, 800),
        };
      }),
    );
  const payload = JSON.stringify({ label, candidates }, null, 2);
  console.log(`[v6411-execute-probe] ${payload}`);
  await test.info().attach(`${label}-execute-candidates.json`, { body: payload, contentType: "application/json" });
}
