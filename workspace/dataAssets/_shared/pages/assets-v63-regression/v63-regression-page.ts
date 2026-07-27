// v63-regression-page.ts — 数据资产 v6.3 回归（袋鼠云 ci63）数据质量壳层页对象。
// 覆盖：数据质量页面导航、壳层断言、质量项目列表接口与侧边菜单切换。
// 选择器与导航模式对齐 _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// 与 metadata-shell-page.ts 的既有实现。

import { expect, type Page } from "@playwright/test";

import { buildDataAssetsUrl, getEnvConfig, waitForUiSettled } from "../../helpers/test-setup";

const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";
const DQ_PROJECT_STORAGE_KEY = "dq_project_id";

/** 数据质量项目记录（getProjects 接口返回项）。 */
export type QualityProjectRecord = {
  id?: number | string;
  projectName?: string;
  name?: string;
};

/** 当前质量项目 id（取自 env profile，随环境切换；勿硬编码）。 */
function qualityProjectId(): number {
  return getEnvConfig().projects.quality.id;
}

function qualityProjectName(): string {
  return getEnvConfig().projects.quality.name;
}

/** 在页面加载前注入项目上下文（会话级，跟随后续导航）。 */
async function installProject(page: Page): Promise<void> {
  await page.addInitScript(
    ([assetKey, dqKey, pid]) => {
      sessionStorage.setItem(assetKey, pid);
      sessionStorage.setItem(dqKey, pid);
      localStorage.setItem("currentProject", pid);
    },
    [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(qualityProjectId())],
  );
}

/** 在已加载页面上补写项目上下文（SPA 路由切换后保持项目头）。 */
async function injectProject(page: Page): Promise<void> {
  await page.evaluate(
    ([assetKey, dqKey, pid]) => {
      sessionStorage.setItem(assetKey, pid);
      sessionStorage.setItem(dqKey, pid);
      localStorage.setItem("currentProject", pid);
    },
    [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(qualityProjectId())],
  );
}

/** 识别数据质量壳层的瞬态异常（5xx、版本提示、空 body），返回空串表示页面已稳定。 */
async function getTransientDqShellText(page: Page, status?: number): Promise<string> {
  const bodyText = await page
    .locator("body")
    .innerText({ timeout: 5000 })
    .catch(() => "");
  if (status && status >= 500) return bodyText || `HTTP ${status}`;
  if (bodyText.includes("发现新版本，请刷新获取新版本") || bodyText.includes("502 Bad Gateway")) {
    return bodyText;
  }
  const bodyChildCount = await page.evaluate(() => document.body.childElementCount).catch(() => 0);
  if (bodyText.trim().length === 0 && bodyChildCount === 0) return "empty body";
  return "";
}

/**
 * 进入数据质量指定路由并等待壳层稳定。
 * options.reload 用于 /dq/rule/add 这类新建页：注入项目上下文后 reload 才稳定渲染
 * （见 knowledge/sites dom-dataAssets.md「数据质量规则任务配置」）。
 */
export async function gotoDataQualityPage(
  page: Page,
  path: string,
  options: { reload?: boolean } = {},
): Promise<void> {
  await installProject(page);
  const url = buildDataAssetsUrl(path, qualityProjectId());
  let lastStatus: number | undefined;
  let lastBodyText = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    lastStatus = response?.status();
    await injectProject(page);
    if (options.reload) {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      await injectProject(page);
    }
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

/**
 * 断言数据质量壳层可用：不在登录页、不在 404 页，且 v6.3 核心菜单可见。
 * 菜单清单取自 feature fixture V63_REGRESSION_SCOPE.dqMenus 的顶层项。
 */
export async function expectDataQualityShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 不应跳转登录页`).not.toContainText(/欢迎登录|UIC账号登录|账号登录/, {
    timeout: 10000,
  });
  await expect(body, `${sourceRef}: 不应进入 404 页面`).not.toContainText("亲，是不是走错地方了？");
  await expect(body, `${sourceRef}: 项目选择器应显示 ${qualityProjectName()}`).toContainText(
    qualityProjectName(),
    { timeout: 30000 },
  );
  for (const menu of ["概览", "规则任务配置", "任务实例查询", "质量报告", "项目管理"]) {
    await expect(body, `${sourceRef}: 数据质量菜单应展示「${menu}」`).toContainText(menu, {
      timeout: 30000,
    });
  }
}

/** 逐个断言页面正文包含指定文本（表头、表单标签等静态契约）。 */
export async function expectTexts(
  page: Page,
  texts: readonly string[],
  sourceRef: string,
): Promise<void> {
  const body = page.locator("body");
  for (const text of texts) {
    await expect(body, `${sourceRef}: 页面应展示「${text}」`).toContainText(text, { timeout: 30000 });
  }
}

/** 调用 getProjects 接口返回当前租户可见的数据质量项目列表。 */
export async function fetchQualityProjects(page: Page): Promise<QualityProjectRecord[]> {
  return page.evaluate(async () => {
    const response = await fetch("/dassets/v1/valid/project/getProjects", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
      },
    });
    const json = (await response.json()) as { data?: QualityProjectRecord[] };
    return json.data ?? [];
  });
}

/**
 * 点击数据质量侧边菜单；子菜单（如 项目管理 下的 项目信息/脏数据管理）默认收起时先展开父级。
 * 实现按调用点契约重建，未经 live 验证。
 */
export async function clickDataQualityMenu(page: Page, label: string): Promise<void> {
  const menu = page
    .locator(".ant-menu-title-content")
    .filter({ hasText: new RegExp(`^${escapeRegExp(label)}$`) })
    .last();
  if (!(await menu.isVisible({ timeout: 5000 }).catch(() => false))) {
    const parent = page.locator(".ant-menu-submenu-title").filter({ hasText: "项目管理" }).last();
    if (await parent.isVisible({ timeout: 3000 }).catch(() => false)) {
      await parent.click({ timeout: 30000 });
    }
  }
  await expect(menu, `侧边菜单「${label}」应可点击`).toBeVisible({ timeout: 15000 });
  await menu.click({ timeout: 30000 });
  await injectProject(page);
  await expect(page.locator("body"), `应进入「${label}」`).toContainText(label, { timeout: 30000 });
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
