/**
 * 通用测试工具函数
 */

/**
 * 生成带时间戳的唯一名称，用于测试数据避免命名冲突
 *
 * @param prefix - 名称前缀
 * @returns 格式如 "prefix_1713250800000"
 */
import type { Page } from "@playwright/test";

/**
 * Wait for observable loading indicators to disappear and yield a browser
 * microtask for UI state derived from the completed action to commit.
 *
 * This is intentionally state-based: fixed sleeps and network-idle are not
 * reliable synchronization contracts for an SPA.
 */
export async function waitForUiSettled(page: Page): Promise<void> {
  const loading = page.locator(
    '[aria-busy="true"], .ant-spin-spinning:visible, .ant-loading:visible, [data-loading="true"]',
  );
  await loading
    .first()
    .waitFor({ state: "hidden", timeout: 15_000 })
    .catch(() => undefined);
  await page.evaluate(() => Promise.resolve());
}

export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

/**
 * 获取当天日期字符串
 *
 * @returns 格式如 "20260416"
 */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}
