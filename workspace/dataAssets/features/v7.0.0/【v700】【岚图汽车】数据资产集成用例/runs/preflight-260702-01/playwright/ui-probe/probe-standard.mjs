import { writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = "http://shuzhan63-test-ltqc.k8s.dtstack.cn";
const sessionPath = path.resolve(
  process.cwd(),
  "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
);
const evidenceDir = path.resolve(
  process.cwd(),
  "workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/runs/preflight-260702-01/playwright/ui-probe",
);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState: sessionPath });
await context.addInitScript(() => {
  window.sessionStorage.setItem("X-Valid-Project-ID", "92");
});

const page = await context.newPage();
page.on("dialog", (dialog) => dialog.dismiss().catch(() => {}));

const responses = [];
const requestFailures = [];
const consoleErrors = [];

page.on("response", (res) => {
  const url = res.url();
  if (/\/dassets\/|\/dmetadata\//.test(url)) {
    responses.push({
      status: res.status(),
      url: url.replace(baseUrl, ""),
    });
  }
});
page.on("requestfailed", (req) => {
  requestFailures.push({
    url: req.url().replace(baseUrl, ""),
    failure: req.failure()?.errorText ?? "unknown",
  });
});
page.on("console", (msg) => {
  if (msg.type() === "error") {
    consoleErrors.push(msg.text());
  }
});

async function settle() {
  await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

async function collect(label, screenshotName) {
  await settle();
  const bodyText = (await page.locator("body").innerText({ timeout: 10000 }).catch(() => ""))
    .replace(/\s+/g, " ")
    .slice(0, 2500);
  const anchors = await page.locator("a").evaluateAll((els) =>
    els.slice(0, 80).map((el) => ({
      text: el.textContent?.replace(/\s+/g, " ").trim() ?? "",
      href: el.getAttribute("href") ?? "",
    })),
  );
  const buttons = await page.locator("button").evaluateAll((els) =>
    els.slice(0, 80).map((el) => el.textContent?.replace(/\s+/g, " ").trim() ?? ""),
  );
  const tableHeaders = await page.locator(".ant-table-thead th").evaluateAll((els) =>
    els.map((el) => el.textContent?.replace(/\s+/g, " ").trim() ?? "").filter(Boolean),
  ).catch(() => []);
  const forms = await page.locator(".ant-form-item").evaluateAll((els) =>
    els.slice(0, 80).map((el) => el.textContent?.replace(/\s+/g, " ").trim() ?? "").filter(Boolean),
  ).catch(() => []);
  const aria = await page.locator("main, .ant-layout-content, body").first().ariaSnapshot({ timeout: 10000 }).catch(() => "");
  const screenshot = path.join(evidenceDir, screenshotName);
  await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
  return {
    label,
    url: page.url(),
    title: await page.title().catch(() => ""),
    bodyText,
    anchors,
    buttons,
    tableHeaders,
    forms,
    aria: String(aria).slice(0, 8000),
    screenshot,
  };
}

async function clickByText(text) {
  const loc = page.getByText(text, { exact: true }).first();
  await loc.waitFor({ state: "visible", timeout: 10000 });
  await loc.click();
  await settle();
}

const snapshots = [];
const clickResults = [];

try {
  await page.goto(`${baseUrl}/dataAssets/#/standardStatistic?pid=92`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  snapshots.push(await collect("standard-statistic", "standard-statistic.png"));

  for (const action of [
    ["标准管理", null],
    ["标准定义", "standard-definition.png"],
    ["标准映射", "standard-mapping.png"],
    ["落标检查", "standard-check.png"],
    ["标准基础", null],
    ["词根管理", "root-management.png"],
    ["码表管理", "code-management.png"],
    ["行业模版", "industry-template.png"],
    ["数据库拾取", "database-pick.png"],
  ]) {
    const [text, screenshot] = action;
    try {
      await clickByText(text);
      clickResults.push({ text, ok: true, url: page.url() });
      if (screenshot) {
        snapshots.push(await collect(text, screenshot));
      }
    } catch (error) {
      clickResults.push({ text, ok: false, error: String(error).slice(0, 800), url: page.url() });
    }
  }
} finally {
  writeFileSync(
    path.join(evidenceDir, "probe-standard.json"),
    `${JSON.stringify(
      {
        sourceRef: "SR-UI-PROBE-20260702-DATA-STANDARD-LTQC",
        env: "ltqc-local",
        baseUrl,
        snapshots,
        clickResults,
        responses: responses.slice(-200),
        requestFailures,
        consoleErrors: consoleErrors.slice(0, 100),
      },
      null,
      2,
    )}\n`,
  );
  await browser.close();
}
