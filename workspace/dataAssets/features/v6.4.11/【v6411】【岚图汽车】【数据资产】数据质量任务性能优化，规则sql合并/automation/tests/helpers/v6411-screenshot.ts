import fs from "node:fs";

import { test, type Page } from "@playwright/test";

export async function attachV6411Screenshot(page: Page, name: string, fullPage = true): Promise<void> {
  const fileName = `${name.replace(/[^\p{L}\p{N}._-]+/gu, "_")}.png`;
  const screenshotPath = test.info().outputPath(fileName);
  await page.screenshot({ path: screenshotPath, fullPage });
  await test.info().attach(name, { path: screenshotPath, contentType: "image/png" });
}

export async function attachV6411Text(name: string, body: string, contentType: string): Promise<void> {
  const fileName = name.replace(/[^\p{L}\p{N}._-]+/gu, "_");
  const attachmentPath = test.info().outputPath(fileName);
  fs.writeFileSync(attachmentPath, body, "utf8");
  await test.info().attach(name, { path: attachmentPath, contentType });
}
