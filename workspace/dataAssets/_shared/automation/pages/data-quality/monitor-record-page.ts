import { expect, type Page } from "@playwright/test";

import { waitForUiSettled } from "../../../../../../runtime/automation/playwright";
import { gotoDataQualityPage, injectDataQualityProjectContext } from "./project-context";

function monitorRecordSearchInput(page: Page): ReturnType<Page["locator"]> {
  return page
    .getByPlaceholder("请输入表名/任务名称搜索")
    .or(page.locator("input[placeholder*='任务名称']"))
    .or(page.locator("input[placeholder*='表名']"))
    .first();
}

export async function gotoMonitorRecordQueryPage(
  page: Page,
  sourceRef: string,
): Promise<ReturnType<Page["locator"]>> {
  await page.keyboard.press("Escape").catch(() => {});
  await gotoDataQualityPage(page, "/dq/taskQuery");

  const menuEntry = page.getByRole("link", { name: "校验结果查询" }).first();
  if (await menuEntry.isVisible({ timeout: 5000 }).catch(() => false)) {
    await menuEntry.click({ timeout: 30000 });
    await injectDataQualityProjectContext(page);
    await waitForUiSettled(page);
  }

  await expect(page, sourceRef + ": URL 应进入校验结果查询路由").toHaveURL(/\/dq\/taskQuery/, {
    timeout: 30000,
  });
  await expect(
    page.getByRole("button", { name: "新建监控规则" }),
    sourceRef + ": 校验结果查询不应停留在规则任务管理主内容",
  ).not.toBeVisible({ timeout: 10000 });

  const searchInput = monitorRecordSearchInput(page);
  await expect(searchInput, sourceRef + ": 校验结果查询应展示表名/任务名称搜索框").toBeVisible({
    timeout: 30000,
  });
  return searchInput;
}

export async function submitMonitorRecordSearch(page: Page): Promise<void> {
  const searchButton = page.getByRole("button", { name: /查\s*询|search/i }).first();
  if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchButton.click({ timeout: 30000 });
    return;
  }
  await page.keyboard.press("Enter");
}
