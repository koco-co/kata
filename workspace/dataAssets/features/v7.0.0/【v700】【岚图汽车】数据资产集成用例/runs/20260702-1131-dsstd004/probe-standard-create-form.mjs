import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = "http://shuzhan63-test-ltqc.k8s.dtstack.cn";
const projectId = "92";
const sessionPath = path.resolve(
  process.cwd(),
  "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
);
const outDir = path.resolve(
  process.cwd(),
  "workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/runs/20260702-1131-dsstd004/probe",
);

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState: sessionPath, viewport: { width: 1440, height: 900 } });
await context.addInitScript(
  ({ id }) => {
    window.sessionStorage.setItem("X-Valid-Project-ID", id);
    window.sessionStorage.setItem("dq_project_id", id);
  },
  { id: projectId },
);

const page = await context.newPage();
page.on("dialog", (dialog) => dialog.dismiss().catch(() => {}));

const responses = [];
page.on("response", (response) => {
  const url = response.url();
  if (/\/dmetadata\//.test(url)) {
    responses.push({
      status: response.status(),
      ok: response.ok(),
      url: url.replace(baseUrl, ""),
    });
  }
});

try {
  await page.goto(`${baseUrl}/dataAssets/#/dataStandard?pid=${projectId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.getByRole("button", { name: "新建标准" }).click();
  await page.waitForTimeout(1_000);

  const container = page.locator(".ant-layout-content, body").first();
  const formItems = await container.locator(".ant-form-item").evaluateAll((items) =>
    items.map((item) => item.textContent?.replace(/\s+/g, " ").trim() ?? "").filter(Boolean),
  );
  const inputs = await container.locator("input, textarea").evaluateAll((items) =>
    items.map((item) => ({
      tag: item.tagName,
      type: item.getAttribute("type"),
      placeholder: item.getAttribute("placeholder"),
      value: item.getAttribute("value"),
      ariaLabel: item.getAttribute("aria-label"),
      className: item.getAttribute("class"),
    })),
  );
  const buttons = await container.locator("button").evaluateAll((items) =>
    items.map((item) => item.textContent?.replace(/\s+/g, " ").trim() ?? "").filter(Boolean),
  );
  const selects = await container.locator(".ant-select").evaluateAll((items) =>
    items.map((item) => item.textContent?.replace(/\s+/g, " ").trim() ?? ""),
  );
  const bodyText = await container.innerText({ timeout: 10_000 }).catch(() => "");
  const aria = await container.ariaSnapshot({ timeout: 10_000 }).catch(() => "");
  const screenshot = path.join(outDir, "standard-create-form.png");
  await page.screenshot({ path: screenshot, fullPage: true });

  writeFileSync(
    path.join(outDir, "standard-create-form.json"),
    `${JSON.stringify(
      {
        finalUrl: page.url(),
        bodyText,
        formItems,
        inputs,
        buttons,
        aria: String(aria),
        responses,
        screenshot,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await browser.close();
}
