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
  "workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/runs/preflight-260702-01/playwright/preflight",
);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState: sessionPath });
const page = await context.newPage();

const result = {
  baseUrl,
  targetUrl: `${baseUrl}/dataAssets`,
  finalUrl: "",
  title: "",
  responseStatus: null,
  loginDetected: false,
  visibleTextSample: "",
  screenshot: path.join(evidenceDir, "auth-probe.png"),
};

try {
  const response = await page.goto(result.targetUrl, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  result.responseStatus = response?.status() ?? null;
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  result.finalUrl = page.url();
  result.title = await page.title().catch(() => "");
  result.visibleTextSample = (await page.locator("body").innerText({ timeout: 10000 }).catch(() => ""))
    .replace(/\s+/g, " ")
    .slice(0, 1200);
  result.loginDetected =
    /\/login|\/uic\/#\/login/i.test(result.finalUrl) ||
    /登录|账号|密码|验证码|Sign in/i.test(result.visibleTextSample);
  await page.screenshot({ path: result.screenshot, fullPage: true });
} finally {
  writeFileSync(
    path.join(evidenceDir, "auth-probe.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  await browser.close();
}

if (result.loginDetected) {
  process.exitCode = 10;
}
