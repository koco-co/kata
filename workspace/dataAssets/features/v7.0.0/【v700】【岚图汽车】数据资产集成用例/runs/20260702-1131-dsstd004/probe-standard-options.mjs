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

async function visibleOptions() {
  return page
    .locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content, .ant-cascader-menu-item")
    .evaluateAll((items) => items.map((item) => item.textContent?.replace(/\s+/g, " ").trim() ?? "").filter(Boolean))
    .catch(() => []);
}

try {
  await page.goto(`${baseUrl}/dataAssets/#/dataStandard/addOrUpdateStandard?pid=${projectId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

  const combos = await page.locator("main [role=combobox], main .ant-select-selector").count();
  const snapshots = [];
  for (let index = 0; index < combos; index += 1) {
    const combo = page.locator("main [role=combobox], main .ant-select-selector").nth(index);
    const box = await combo.boundingBox().catch(() => null);
    const textBefore = await combo.textContent().catch(() => "");
    await combo.click({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(500);
    snapshots.push({
      index,
      textBefore: textBefore?.replace(/\s+/g, " ").trim(),
      box,
      options: await visibleOptions(),
    });
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(200);
  }
  writeFileSync(path.join(outDir, "standard-create-options.json"), `${JSON.stringify({ combos, snapshots }, null, 2)}\n`);
} finally {
  await browser.close();
}
