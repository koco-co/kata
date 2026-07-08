import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = "http://shuzhan63-test-ltqc.k8s.dtstack.cn";
const projectId = "92";
const sessionPath = path.resolve(
  process.cwd(),
  "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
);
const outputDir = path.resolve(
  process.cwd(),
  "workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/runs/20260702-1058-dsstd001/debug-api-status",
);

mkdirSync(outputDir, { recursive: true });

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
page.on("dialog", (dialog) => dialog.dismiss().catch(() => {}));

const allResponses = [];
const requestFailures = [];
const consoleErrors = [];

page.on("response", (response) => {
  const url = response.url();
  if (/\/dassets\/|\/dmetadata\//.test(url)) {
    allResponses.push({
      status: response.status(),
      ok: response.ok(),
      url: url.replace(baseUrl, ""),
    });
  }
});

page.on("requestfailed", (request) => {
  requestFailures.push({
    url: request.url().replace(baseUrl, ""),
    failure: request.failure()?.errorText ?? "unknown",
  });
});

page.on("console", (message) => {
  if (message.type() === "error") {
    consoleErrors.push(message.text());
  }
});

async function responseSummary(response) {
  if (!response) return null;
  let bodySnippet = "";
  if (!response.ok()) {
    bodySnippet = await response
      .text()
      .then((text) => text.replace(/\s+/g, " ").slice(0, 600))
      .catch((error) => `read body failed: ${String(error).slice(0, 200)}`);
  }
  return {
    status: response.status(),
    ok: response.ok(),
    url: response.url().replace(baseUrl, ""),
    bodySnippet,
  };
}

async function probe(label, hashPath, expectedPaths) {
  const waits = expectedPaths.map((apiPath) =>
    page
      .waitForResponse((response) => response.url().includes(apiPath), { timeout: 30_000 })
      .catch(() => null),
  );

  await page.goto(`${baseUrl}/dataAssets/#${hashPath}?pid=${projectId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.evaluate(
    ({ id }) => {
      window.sessionStorage.setItem("X-Valid-Project-ID", id);
      window.sessionStorage.setItem("dq_project_id", id);
    },
    { id: projectId },
  );
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  const responses = await Promise.all(waits);
  const bodyText = await page
    .locator("body")
    .innerText({ timeout: 10_000 })
    .then((text) => text.replace(/\s+/g, " ").slice(0, 2_500))
    .catch((error) => `read body failed: ${String(error).slice(0, 300)}`);
  const screenshot = path.join(outputDir, `${label}.png`);
  await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});

  return {
    label,
    route: hashPath,
    finalUrl: page.url(),
    expected: await Promise.all(
      expectedPaths.map(async (apiPath, index) => ({
        apiPath,
        response: await responseSummary(responses[index]),
      })),
    ),
    bodyHasServerError: /服务器异常|请求异常/.test(bodyText),
    bodyText,
    screenshot,
  };
}

try {
  const pages = [
    await probe("standard-mapping", "/standardMapping", [
      "/dmetadata/v1/standardMapping/mappingList",
      "/dmetadata/v1/standardCatalog/listCatalog",
    ]),
    await probe("standard-check", "/standardCheck", [
      "/dmetadata/v1/standardTableCheck/configStandardTableCheckDatasource",
      "/dmetadata/v1/standardTableCheck/overview",
      "/dmetadata/v1/standardTableCheck/list",
    ]),
  ];

  writeFileSync(
    path.join(outputDir, "debug-api-status.json"),
    `${JSON.stringify(
      {
        sourceRef: "SR-DEBUG-20260702-DATA-STANDARD-API-STATUS",
        env: "ltqc-local",
        baseUrl,
        projectId,
        pages,
        allResponses,
        requestFailures,
        consoleErrors: consoleErrors.slice(0, 100),
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await browser.close();
}
