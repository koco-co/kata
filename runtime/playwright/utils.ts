/**
 * 通用测试工具函数
 */

/**
 * 生成带时间戳与随机后缀的唯一名称，用于测试数据避免命名冲突（含并发 worker 间碰撞）
 *
 * @param prefix - 名称前缀
 * @returns 格式如 "prefix_1713250800000_k3j9x2"
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
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${random}`;
}

/**
 * 获取当天日期字符串（本地时区；不用 toISOString，避免 UTC 与本地日期错位）
 *
 * @param now - 时钟注入点，默认当前时间；测试应传入固定 Date
 * @returns 格式如 "20260416"
 */
export function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
