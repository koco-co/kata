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
const context = await browser.newContext({ storageState: sessionPath });
await context.addInitScript(
  ({ id }) => {
    window.sessionStorage.setItem("X-Valid-Project-ID", id);
    window.sessionStorage.setItem("dq_project_id", id);
  },
  { id: projectId },
);

const page = await context.newPage();
try {
  await page.goto(`${baseUrl}/dataAssets/#/dataStandard?pid=${projectId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  const data = await page.evaluate(async () => {
    const response = await fetch("/dmetadata/v1/standardCatalog/listCatalog", {
      credentials: "include",
    });
    return {
      status: response.status,
      ok: response.ok,
      text: await response.text(),
    };
  });
  writeFileSync(path.join(outDir, "standard-catalog-api.json"), `${JSON.stringify(data, null, 2)}\n`);
} finally {
  await browser.close();
}
