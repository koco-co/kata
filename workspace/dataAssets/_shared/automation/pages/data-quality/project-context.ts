import type { Page } from "@playwright/test";

import { waitForUiSettled } from "../../../../../../runtime/automation/playwright";
import { getEnvConfig } from "../../runtime/env-profile";
import { buildDataAssetsUrl } from "../../runtime/env-setup";
import type { SparkThriftQualityRuleValidationScenario } from "./contracts";

export const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";

const DQ_PROJECT_STORAGE_KEY = "dq_project_id";

export function getProjectId(): string | number {
  return getEnvConfig().projects.quality.id;
}

export function getDefaultDatasource() {
  const env = getEnvConfig();
  return env.datasources[env.runtime.defaultDatasource];
}

async function installDataQualityProjectContext(page: Page): Promise<void> {
  await page.addInitScript(
    ([assetKey, dqKey, projectId]) => {
      sessionStorage.setItem(assetKey, projectId);
      sessionStorage.setItem(dqKey, projectId);
      localStorage.setItem(assetKey, projectId);
      localStorage.setItem(dqKey, projectId);
      localStorage.setItem("dataAssets_project_id", projectId);
      localStorage.setItem("currentProject", projectId);
    },
    [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(getProjectId())],
  );
}

export async function injectDataQualityProjectContext(page: Page): Promise<void> {
  await page.evaluate(
    ([assetKey, dqKey, projectId]) => {
      sessionStorage.setItem(assetKey, projectId);
      sessionStorage.setItem(dqKey, projectId);
      localStorage.setItem(assetKey, projectId);
      localStorage.setItem(dqKey, projectId);
      localStorage.setItem("dataAssets_project_id", projectId);
      localStorage.setItem("currentProject", projectId);
    },
    [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(getProjectId())],
  );
}

export async function gotoDataQualityPage(page: Page, path: string): Promise<void> {
  await installDataQualityProjectContext(page);
  const url = buildDataAssetsUrl(path, getProjectId());
  let lastStatus: number | undefined;
  let lastBodyText = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    lastStatus = response?.status();
    await injectDataQualityProjectContext(page);
    await waitForUiSettled(page);

    const transient = await getTransientDqShellText(page, lastStatus);
    if (!transient) return;
    lastBodyText = transient;
    await waitForUiSettled(page);
  }

  throw new Error(
    `数据质量页面未能稳定加载: ${url}, lastStatus=${lastStatus ?? "unknown"}, body=${lastBodyText}`,
  );
}

async function getTransientDqShellText(page: Page, status?: number): Promise<string> {
  const bodyText = await page
    .locator("body")
    .innerText({ timeout: 5000 })
    .catch(() => "");
  if (status && status >= 500) return bodyText || `HTTP ${status}`;
  if (bodyText.includes("发现新版本，请刷新获取新版本") || bodyText.includes("502 Bad Gateway"))
    return bodyText;
  const bodyChildCount = await page.evaluate(() => document.body.childElementCount).catch(() => 0);
  if (bodyText.trim().length === 0 && bodyChildCount === 0) return "empty body";
  return "";
}

export function getScenarioDatasource(scenario: SparkThriftQualityRuleValidationScenario): {
  sourceName: string;
  database: string;
} {
  const env = getEnvConfig();
  const key = scenario.datasourceKey ?? env.runtime.defaultDatasource;
  const profile = env.datasources[key];
  if (!profile) throw new Error(`环境未配置数据源 ${key}`);
  const sourceName = profile.aliases.find((alias) => alias !== key) ?? profile.uiLabel;
  return { sourceName, database: profile.sql.database };
}
