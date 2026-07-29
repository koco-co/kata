import { expect, type Page } from "@playwright/test";
import { loadPlaywrightAutomationConfig } from "../../../../../lib/automation/playwright-config";

import { buildDataAssetsApiUrl, buildDataAssetsUrl, getEnvConfig } from "../../helpers/test-setup";

const ASSETS_INVENTORY_PATH = "/assetsStatistics";
const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";
const CARD_TITLE = "已接入数据源";
// 登录页特征文案（裸「登录」会误伤「按登录人次」等正常指标文案）
const LOGIN_PAGE_TEXT_RE = /欢迎登录|UIC账号登录|账号登录/;
const ERROR_TEXTS = ["亲，是不是走错地方了？", "请选择项目", "SQL 执行异常"] as const;
const METRIC_LABELS = ["昨日新增表数", "源数", "库数", "表数", "存储量"] as const;
const INVENTORY_MODULE_LABELS = [
  "已接入数据源",
  "数据地图分布",
  "数据目录分布",
  "数据价值排行",
  "存储资源情况",
] as const;
const INVENTORY_API_PATHS = [
  "/dassets/v1/dataInventory/resourceDistribution",
  "/dassets/v1/dataInventory/dataPreview",
  "/dassets/v1/dataInventory/dataDistribution",
  "/dassets/v1/dataInventory/dataValueRank",
  "/dassets/v1/dataInventory/top10Tables",
] as const;
const REQUIRED_DATASOURCE_OPTIONS = ["SparkThrift2.x", "Doris3.x"] as const;

export const ASSETS_INVENTORY_SCHEDULE_JOBS = {
  saveOneDayDataDistribution: "/dassets/v1/scheduleJob/saveOneDayDataDistribution",
  affectCountStatistic: "/dassets/v1/scheduleJob/affectCountStatistic",
  saveTop10TableData: "/dassets/v1/scheduleJob/saveTop10TableData",
  saveTodayPreviewData: "/dassets/v1/scheduleJob/saveTodayPreviewData",
  saveTodaySearchStatistic: "/dassets/v1/scheduleJob/saveTodaySearchStatistic",
} as const;

export type AssetsInventoryScheduleJob = keyof typeof ASSETS_INVENTORY_SCHEDULE_JOBS;

type AssetsInventorySnapshot = {
  chipTexts: string[];
  metricLabels: string[];
  statValues: string[];
};

function buildAssetsInventoryUrl(baseUrl: string | undefined, pid: number | string): string {
  if (!baseUrl) return buildDataAssetsUrl(ASSETS_INVENTORY_PATH, pid);

  const normalizedBase = baseUrl.replace(/\/$/, "");
  const productBase = normalizedBase.endsWith("/dataAssets") ? normalizedBase : `${normalizedBase}/dataAssets`;
  return `${productBase}/#${ASSETS_INVENTORY_PATH}?pid=${pid}`;
}

export async function gotoAssetsInventory(
  page: Page,
  baseUrl?: string,
  pid?: number | string,
): Promise<void> {
  const pidText = String(pid ?? getEnvConfig().projects.quality.id);
  await page.addInitScript(
    ([storageKey, projectId]) => {
      sessionStorage.setItem(storageKey, projectId);
    },
    [PROJECT_STORAGE_KEY, pidText],
  );

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/dassets/v1/") && response.status() >= 200 && response.status() < 400,
    { timeout: 60000 },
  );

  await page.goto(buildAssetsInventoryUrl(baseUrl, pidText), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.evaluate(
    ([storageKey, projectId]) => {
      sessionStorage.setItem(storageKey, projectId);
    },
    [PROJECT_STORAGE_KEY, pidText],
  );

  const response = await responsePromise;
  expect(response.status(), "资产盘点页应捕获 /dassets/v1/ 命名空间统计接口响应").toBeLessThan(400);
}

export async function triggerAssetsInventoryScheduleJob(
  page: Page,
  job: AssetsInventoryScheduleJob,
  sourceRef: string,
): Promise<void> {
  const path = ASSETS_INVENTORY_SCHEDULE_JOBS[job];
  const url = buildDataAssetsApiUrl(path);
  const response = await page.context().request.post(url, {
    timeout: getScheduleJobTimeoutMs(),
  });
  const status = response.status();
  expect(
    isAssetsScheduleJobAcceptedStatus(status),
    `${sourceRef}: 调度接口 ${path} 应调用成功，或在长耗时场景返回 504 后继续由页面统计结果核验`,
  ).toBe(true);
}

export async function triggerAssetsInventoryScheduleJobs(
  page: Page,
  jobs: readonly AssetsInventoryScheduleJob[],
  sourceRef: string,
): Promise<void> {
  for (const job of jobs) {
    await triggerAssetsInventoryScheduleJob(page, job, sourceRef);
  }
}

export async function expectAssetsInventoryShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 不应跳转登录页`).not.toContainText(LOGIN_PAGE_TEXT_RE, {
    timeout: 10000,
  });
  for (const errorText of ERROR_TEXTS) {
    await expect(body, `${sourceRef}: 不应出现异常文案「${errorText}」`).not.toContainText(errorText, {
      timeout: 10000,
    });
  }

  await expect(body, `${sourceRef}: 页面应展示资产盘点入口或已接入数据源卡片`).toContainText(
    /资产盘点|已接入数据源/,
    { timeout: 30000 },
  );
  await expect(body, `${sourceRef}: 已接入数据源卡片标题应展示`).toContainText(CARD_TITLE, { timeout: 30000 });

  const snapshot = await expect
    .poll(() => readAssetsInventorySnapshot(page), {
      message: `${sourceRef}: 已接入数据源卡片应展示类型 chip 和统计值`,
      timeout: 30000,
    })
    .toMatchObject({
      hasChip: true,
      hasNumericStat: true,
    });

  void snapshot;
}

export async function expectAssetsInventoryModules(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const label of INVENTORY_MODULE_LABELS) {
    await expect(body, `${sourceRef}: 资产盘点页应展示模块「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
}

export async function expectAssetsInventoryApiHealth(page: Page, sourceRef: string): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate((paths) => {
          const urls = performance.getEntriesByType("resource").map((entry) => entry.name);
          return paths.filter((path) => urls.some((url) => url.includes(path)));
        }, [...INVENTORY_API_PATHS]),
      {
        message: `${sourceRef}: 资产盘点页应请求核心 dataInventory 接口`,
        timeout: 30000,
      },
    )
    .toEqual([...INVENTORY_API_PATHS]);
}

export async function expectAssetsInventoryDropdowns(page: Page, sourceRef: string): Promise<void> {
  const selects = page.locator(".ant-select");
  await expect
    .poll(() => selects.count(), {
      message: `${sourceRef}: 资产盘点页应展示至少两个筛选下拉`,
      timeout: 15000,
    })
    .toBeGreaterThanOrEqual(2);

  await selects.first().click();
  const activeOptions = page.locator(
    ".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content",
  );
  await expect(activeOptions.first(), `${sourceRef}: 数据源类型下拉应展开`).toBeVisible({
    timeout: 10000,
  });
  const datasourceOptions = (await activeOptions.allInnerTexts()).map((text) =>
    text.replace(/\s+/g, " ").trim(),
  );
  for (const option of REQUIRED_DATASOURCE_OPTIONS) {
    expect(datasourceOptions, `${sourceRef}: 数据源类型下拉应包含 ${option}`).toContain(option);
  }
  await page.keyboard.press("Escape");

  await selects.nth(1).click();
  await expect(activeOptions.first(), `${sourceRef}: 分布属性/筛选下拉应展开`).toBeVisible({
    timeout: 10000,
  });
  const distributionOptions = (await activeOptions.allInnerTexts()).map((text) =>
    text.replace(/\s+/g, " ").trim(),
  );
  expect(distributionOptions, `${sourceRef}: 分布属性下拉应包含负责人`).toContain("负责人");
  await page.keyboard.press("Escape");
}

async function readAssetsInventorySnapshot(page: Page): Promise<AssetsInventorySnapshot & {
  hasChip: boolean;
  hasNumericStat: boolean;
}> {
  const snapshot = await page.locator("body").evaluate(
    (body, { title, labels }) => {
      const metricLabels = labels as string[];
      const isVisible = (element: Element): boolean => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      };
      const normalizeText = (text: string | null | undefined): string => (text ?? "").replace(/\s+/g, " ").trim();
      const allElements = Array.from(body.querySelectorAll("*")).filter(isVisible);
      const titleElement =
        allElements.find((element) => normalizeText(element.textContent) === title) ??
        allElements.find((element) => normalizeText(element.textContent).includes(title));

      let root: Element = body;
      if (titleElement) {
        let current: Element | null = titleElement;
        for (let i = 0; current && i < 8; i++) {
          const text = normalizeText(current.textContent);
          const labelHits = metricLabels.filter((label) => text.includes(label)).length;
          if (labelHits >= 2) {
            root = current;
            break;
          }
          current = current.parentElement;
        }
      }

      const rootText = normalizeText(root.textContent);
      const foundMetricLabels = metricLabels.filter((label) => rootText.includes(label));
      const tokenTexts = Array.from(root.querySelectorAll("*"))
        .filter(isVisible)
        .map((element) => normalizeText(element.textContent))
        .filter((text) => text.length > 0 && text.length <= 40);

      const chipTexts = Array.from(new Set(tokenTexts.filter((text) => isDatasourceTypeChip(text))));
      const statValues = Array.from(new Set(extractStatValues(rootText)));

      function isDatasourceTypeChip(text: string): boolean {
        if (text === title) return false;
        if (metricLabels.includes(text)) return false;
        if (/^(?:\d+(?:\.\d+)?|--)(?:\s*(?:B|KB|MB|GB|TB|PB|个|张|条)?)?$/.test(text)) return false;
        if (/^(资产盘点|已接入数据源|统计|全部|暂无数据)$/.test(text)) return false;
        if (metricLabels.some((label) => text.includes(label))) return false;
        return /(spark|hive|mysql|oracle|doris|clickhouse|postgres|sqlserver|greenplum|tidb|hdfs|kafka|thrift|ftp|oss|s3|dm|达梦|数据源)/i.test(
          text,
        );
      }

      function extractStatValues(text: string): string[] {
        const values: string[] = [];
        for (const label of metricLabels) {
          const index = text.indexOf(label);
          if (index < 0) continue;
          const afterLabel = text.slice(index + label.length, index + label.length + 80);
          const match = afterLabel.match(/--|\d+(?:\.\d+)?/);
          if (match) values.push(match[0]);
        }
        return values;
      }

      return {
        chipTexts,
        metricLabels: foundMetricLabels,
        statValues,
      };
    },
    { title: CARD_TITLE, labels: [...METRIC_LABELS] },
  );

  return {
    ...snapshot,
    hasChip: snapshot.chipTexts.length > 0,
    hasNumericStat: snapshot.statValues.some((value) => /^\d+(?:\.\d+)?$/.test(value)),
  };
}

function getScheduleJobTimeoutMs(): number {
  return loadPlaywrightAutomationConfig().scheduleJobTimeoutMs;
}

export function isAssetsScheduleJobAcceptedStatus(status: number): boolean {
  return (status >= 200 && status < 400) || status === 504;
}

// ─── 趋势图相关常量 ───
const TREND_MODULE_LABELS = ["元数据变化趋势", "资产查询趋势"] as const;
const TREND_API_PATHS = [
  "/dassets/v1/dataInventory/dataPreviewTrend",
  "/dassets/v1/dataInventory/searchStatisticTrend",
] as const;
const REQUIRED_TREND_METRIC_OPTIONS = ["按登录人次", "按查询次数"] as const;

export async function expectAssetsInventoryGuideDialogFlow(
  page: Page,
  sourceRef: string,
  projectId: number | string,
): Promise<void> {
  // 首次进入资产盘点 → 功能引导弹窗出现，勾选"不再提示"后确认，再次进入不再弹出
  await gotoAssetsInventory(page, undefined, projectId);
  const body = page.locator("body");

  // 检查引导弹窗是否出现（可能已被关闭过，允许不出现）
  const dialog = page.locator(".ant-modal:visible, [role='dialog']:visible").filter({
    hasText: /功能引导|引导|数据资产/,
  });
  const dialogVisible = await dialog.first().isVisible({ timeout: 5000 }).catch(() => false);
  if (dialogVisible) {
    // 勾选"不再提示"
    const noMoreCheckbox = dialog
      .first()
      .locator("input[type='checkbox'], .ant-checkbox-input")
      .first();
    const checkboxVisible = await noMoreCheckbox.isVisible({ timeout: 3000 }).catch(() => false);
    if (checkboxVisible) {
      await noMoreCheckbox.check({ timeout: 10000 }).catch(() => {});
    }
    // 确认关闭
    const confirmButton = dialog
      .first()
      .getByRole("button", { name: /确定|知道了|关闭|确认/ })
      .first();
    await expect(confirmButton, `${sourceRef}: 引导弹窗确认按钮应可见`).toBeVisible({ timeout: 10000 });
    await confirmButton.click();
    await expect(dialog.first(), `${sourceRef}: 引导弹窗应在确认后关闭`).not.toBeVisible({
      timeout: 10000,
    });

    // 再次进入，弹窗不应再出现
    await gotoAssetsInventory(page, undefined, projectId);
    const secondDialog = page.locator(".ant-modal:visible, [role='dialog']:visible").filter({
      hasText: /功能引导|引导|数据资产/,
    });
    await expect(
      secondDialog.first(),
      `${sourceRef}: 勾选不再提示后再次进入引导弹窗不应出现`,
    ).not.toBeVisible({ timeout: 5000 });
  }

  // 无论弹窗是否出现，资产盘点 shell 应可见
  await expect(body, `${sourceRef}: 资产盘点页应完成渲染`).toContainText(/资产盘点|已接入数据源/, {
    timeout: 30000,
  });
}

export async function expectAssetsInventoryTrendModules(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const label of TREND_MODULE_LABELS) {
    await expect(body, `${sourceRef}: 资产盘点页应展示趋势模块「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
}

export async function expectAssetsInventoryTrendApiHealth(page: Page, sourceRef: string): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate((paths) => {
          const urls = performance.getEntriesByType("resource").map((entry) => entry.name);
          return paths.filter((path) => urls.some((url) => url.includes(path)));
        }, [...TREND_API_PATHS]),
      {
        message: `${sourceRef}: 资产盘点趋势图应请求趋势相关接口`,
        timeout: 30000,
      },
    )
    .toEqual([...TREND_API_PATHS]);
}

export async function expectAssetsInventoryTrendDropdowns(page: Page, sourceRef: string): Promise<void> {
  // 找到趋势图区域内的下拉
  const trendSection = page
    .locator(".ant-card, section, div")
    .filter({ hasText: /资产查询趋势|元数据变化趋势/ })
    .last();
  const trendSelects = trendSection.locator(".ant-select").or(page.locator(".ant-select"));

  await expect
    .poll(() => trendSelects.count(), {
      message: `${sourceRef}: 趋势图区域应展示至少一个筛选下拉`,
      timeout: 15000,
    })
    .toBeGreaterThanOrEqual(1);

  // 展开最后一个（资产查询趋势的指标下拉）
  const selects = page.locator(".ant-select");
  const count = await selects.count();
  const lastSelect = selects.nth(count - 1);
  await lastSelect.click();
  const activeOptions = page.locator(
    ".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content",
  );
  await expect(activeOptions.first(), `${sourceRef}: 趋势图筛选下拉应展开`).toBeVisible({
    timeout: 10000,
  });
  const optionTexts = (await activeOptions.allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
  for (const option of REQUIRED_TREND_METRIC_OPTIONS) {
    expect(optionTexts, `${sourceRef}: 趋势图筛选下拉应包含 ${option}`).toContain(option);
  }
  await page.keyboard.press("Escape");
}
