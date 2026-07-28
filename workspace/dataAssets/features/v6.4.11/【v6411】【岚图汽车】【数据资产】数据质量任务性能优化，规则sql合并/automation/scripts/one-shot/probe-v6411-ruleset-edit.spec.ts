// 临时探测脚本：复现 §37 规则集编辑向导「下一步不推进」问题，逐步 dump 页面状态。
// 输出写入 $KATA_RUN_PATH/probe/；排查完后可删除。
import fs from "node:fs";
import path from "node:path";

import { test, type Page } from "@playwright/test";

import { getEnvConfig } from "../../../../../../_shared/helpers";

const ENV = getEnvConfig();
const BASE_URL = ENV.urls.baseUrl;
const PROJECT_ID = String(ENV.projects.quality.id);
const TABLE_NAME = (process.env.V6411_PROBE_TABLE ?? "test_info_1_qzmkxjrp_37").trim();
const OUT_DIR = path.join(process.env.KATA_RUN_PATH ?? ".", "probe");

test.setTimeout(10 * 60 * 1000);

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

async function dump(page: Page, label: string): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const buttons = await page.locator("button:visible").allInnerTexts().catch(() => ["<error>"]);
  const errors = await page
    .locator(".ant-form-item-explain-error:visible, .ant-message-error:visible, .ant-notification-notice-error:visible")
    .allInnerTexts()
    .catch(() => []);
  const steps = await page.locator(".ant-steps-item:visible").allInnerTexts().catch(() => []);
  const tabs = await page.locator(".ant-tabs-tab:visible").allInnerTexts().catch(() => []);
  const modals = await page.locator(".ant-modal:visible, .ant-modal-wrap:visible").allInnerTexts().catch(() => []);
  const spinners = await page.locator(".ant-spin-spinning:visible").count().catch(() => -1);
  const body = await page.locator("main").innerText({ timeout: 5_000 }).catch(() => "<no main>");
  const report = {
    label,
    url: page.url(),
    buttons,
    errors,
    steps,
    tabs,
    modals,
    spinners,
    main: body.slice(0, 2000),
  };
  fs.writeFileSync(path.join(OUT_DIR, `${label}.json`), JSON.stringify(report, null, 2));
  await page.screenshot({ path: path.join(OUT_DIR, `${label}.png`), fullPage: false });
  console.log(`[probe] ${label} url=${report.url} buttons=${JSON.stringify(buttons)} errors=${JSON.stringify(errors)}`);
}

test("探测规则集编辑向导下一步行为", async ({ page }) => {
  await gotoDq(page, "/dq/ruleSet");
  const input = page.locator("input[placeholder*='搜索']:visible, input[placeholder*='名称']:visible").first();
  await input.fill(TABLE_NAME, { timeout: 15_000 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(3_000);
  await dump(page, "01-list-searched");

  const row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: TABLE_NAME }).first();
  await row.getByText(/^编辑$/).first().click({ timeout: 15_000 });
  await page.waitForTimeout(5_000);
  await dump(page, "02-edit-opened");

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const save = page.locator("button:visible").filter({ hasText: /^保\s*存$/ }).last();
    if (await save.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await dump(page, `0${attempt + 2}-save-visible`);
      return;
    }
    const next = page.locator("button:visible").filter({ hasText: /^下\s*一\s*步$/ }).last();
    const nextInfo = await next.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { disabled: (el as HTMLButtonElement).disabled, cls: el.className, rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height } };
    }).catch((error) => ({ error: String(error) }));
    console.log(`[probe] attempt ${attempt} next button: ${JSON.stringify(nextInfo)}`);
    await next.click({ timeout: 15_000 }).catch((error) => console.log(`[probe] next click error: ${error}`));
    await page.waitForTimeout(4_000);
    await dump(page, `0${attempt + 2}-after-next-${attempt}`);
  }
});

