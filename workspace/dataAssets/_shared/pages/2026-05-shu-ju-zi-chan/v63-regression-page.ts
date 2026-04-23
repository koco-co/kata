import { expect, type Page } from "@playwright/test";

import { buildDataAssetsUrl, getEnvConfig } from "../../helpers/test-setup";
import { SOURCE_REFS, V63_REGRESSION_SCOPE } from "../../../features/2026-05-shu-ju-zi-chan/tests/data/v63-regression-contract";

export function qualityProjectId(): number {
  return getEnvConfig().projects.quality.id;
}

export async function injectQualityProject(page: Page): Promise<void> {
  await page.evaluate((pid) => {
    sessionStorage.setItem("X-Valid-Project-ID", String(pid));
  }, qualityProjectId());
}

export async function gotoDataQualityPage(page: Page, path: string, options?: { reload?: boolean }): Promise<void> {
  await page.goto(buildDataAssetsUrl(path, qualityProjectId()), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await injectQualityProject(page);
  if (options?.reload) {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
    await injectQualityProject(page);
  }
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => undefined);
}

export async function expectDataQualityShell(page: Page, sourceRef = SOURCE_REFS.probeProject): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 不应跳转登录页`).not.toContainText("登录", { timeout: 10000 });
  await expect(body, `${sourceRef}: 不应进入 404 页面`).not.toContainText("亲，是不是走错地方了？");
  await expect(body, `${sourceRef}: 不应出现项目未选择提示`).not.toContainText("请选择项目");
  await expect(body, `${sourceRef}: 不应出现 SQL 执行异常`).not.toContainText("SQL 执行异常");
  await expect(body, `${sourceRef}: 当前质量项目应显示`).toContainText(V63_REGRESSION_SCOPE.qualityProjectName);

  for (const menu of V63_REGRESSION_SCOPE.dqMenus) {
    await expect(body, `${sourceRef}: 数据质量菜单应展示「${menu}」`).toContainText(menu);
  }
}

export async function expectTexts(page: Page, texts: readonly string[], sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const text of texts) {
    await expect(body, `${sourceRef}: 页面应展示「${text}」`).toContainText(text);
  }
}

export async function clickDataQualityMenu(page: Page, label: string): Promise<void> {
  await page.locator(".ant-menu-title-content").filter({ hasText: label }).last().click();
  await injectQualityProject(page);
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => undefined);
}

export async function fetchQualityProjects(page: Page): Promise<Array<{ id?: string | number; projectName?: string }>> {
  return page.evaluate(async () => {
    const response = await fetch("/dassets/v1/valid/project/getProjects", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
      },
    });
    const json = (await response.json()) as { data?: Array<{ id?: string | number; projectName?: string }> };
    return json.data ?? [];
  });
}
