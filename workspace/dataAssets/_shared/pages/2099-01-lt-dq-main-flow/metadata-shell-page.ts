import { expect, type Page, type Response } from "@playwright/test";

import { buildDataAssetsUrl, getEnvConfig } from "../../helpers/test-setup";

export interface ResponseProbe {
  readonly url: string;
  readonly status: number;
}

export function metadataProjectId(): number {
  return getEnvConfig().projects.quality.id;
}

export function metadataScope() {
  const env = getEnvConfig();
  const datasource = env.datasources[env.runtime.defaultDatasource];
  const offline = env.projects.offline;
  if (!offline) {
    throw new Error(
      `${env.env}: 当前环境未配置离线项目；元数据同步类用例必须显式配置 projects.offline。`,
    );
  }
  return {
    projectId: env.projects.quality.id,
    projectName: env.projects.quality.name,
    offlineProjectId: offline.id,
    offlineProjectName: offline.name,
    datasourceName: datasource.metadata.name,
    datasourceType: datasource.uiLabel,
    datasourceProfile: datasource,
    database: datasource.sql.database,
    tablePrefix: "qa_auto_md",
  } as const;
}

export async function installMetadataProject(page: Page): Promise<void> {
  const projectId = metadataProjectId();
  await page.addInitScript((pid) => {
    sessionStorage.setItem("X-Valid-Project-ID", String(pid));
  }, projectId);
}

export async function injectMetadataProject(page: Page): Promise<void> {
  await page.evaluate((pid) => {
    sessionStorage.setItem("X-Valid-Project-ID", String(pid));
  }, metadataProjectId());
}

export async function gotoMetadataPage(page: Page, path = "/metaDataCenter"): Promise<void> {
  await installMetadataProject(page);
  await page.goto(buildDataAssetsUrl(path, metadataProjectId()), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await injectMetadataProject(page);
  await expect(page.locator("body"), "SR-ENV-PREFLIGHT-001: 元数据页面应完成渲染").toContainText(
    "元数据",
    { timeout: 30000 },
  );
}

export async function expectMetadataShell(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 不应跳转登录页`).not.toContainText(/欢迎登录|UIC账号登录|账号登录/, {
    timeout: 10000,
  });
  await expect(body, `${sourceRef}: 不应进入 404 页面`).not.toContainText("亲，是不是走错地方了？");
  await expect(body, `${sourceRef}: 元数据顶导应展示`).toContainText("元数据");
  for (const menu of ["数据地图", "元数据同步", "元模型管理", "元数据管理", "订阅的数据", "元数据质量"]) {
    await expect(body, `${sourceRef}: 元数据菜单应展示「${menu}」`).toContainText(menu);
  }
}

export async function fetchMetadataProjects(page: Page): Promise<ReadonlyArray<{ id?: number | string; projectName?: string }>> {
  return page.evaluate(async () => {
    const response = await fetch("/dassets/v1/valid/project/getProjects", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
      },
    });
    const json = (await response.json()) as { data?: Array<{ id?: number | string; projectName?: string }> };
    return json.data ?? [];
  });
}

export async function expectMetadataProject(page: Page, sourceRef: string): Promise<void> {
  const scope = metadataScope();
  const projects = await fetchMetadataProjects(page);
  expect(
    projects.some((project) => Number(project.id) === scope.projectId && project.projectName === scope.projectName),
    `${sourceRef}: getProjects 应包含 ${scope.projectName}(${scope.projectId})`,
  ).toBe(true);
}

export async function clickMetadataMenu(page: Page, label: string): Promise<void> {
  const menu = page.locator(".ant-menu-title-content").filter({ hasText: new RegExp(`^${escapeRegExp(label)}$`) }).last();
  await expect(menu, `SR-UI-PROBE-2099-01-MD-LTQC: 侧边菜单「${label}」应可点击`).toBeVisible({
    timeout: 15000,
  });
  await menu.click();
  await injectMetadataProject(page);
  await expect(page.locator("body"), `SR-UI-PROBE-2099-01-MD-LTQC: 应进入「${label}」`).toContainText(label, {
    timeout: 30000,
  });
}

export async function waitForDassetsResponse(
  page: Page,
  action: () => Promise<void>,
  sourceRef: string,
  matcher: (url: string) => boolean = () => true,
): Promise<ResponseProbe> {
  const responsePromise = page.waitForResponse(
    (response) => isDassetsOkResponse(response) && matcher(response.url()),
    { timeout: 45000 },
  );
  await action();
  const response = await responsePromise;
  expect(response.status(), `${sourceRef}: dassets 接口状态码应小于 500`).toBeLessThan(500);
  return { url: response.url(), status: response.status() };
}

export async function clickButtonByText(page: Page, text: string, sourceRef: string): Promise<void> {
  const button = page.getByRole("button", { name: new RegExp(escapeRegExp(text)) }).first();
  await expect(button, `${sourceRef}: 按钮「${text}」应可见`).toBeVisible({ timeout: 15000 });
  await button.click();
}

/**
 * 断言页面 body 至少包含 texts 中的一项（OR 语义）。
 *
 * 用于同一页面在不同环境/版本下文案存在等价变体的场景；调用方应保证候选文案
 * 都是真实的业务证据，不要传入搜索框回显等必然成立的词，否则断言退化为恒真。
 */
export async function expectAnyText(page: Page, texts: readonly string[], sourceRef: string): Promise<void> {
  const pattern = new RegExp(texts.map(escapeRegExp).join("|"));
  await expect(page.locator("body"), `${sourceRef}: 页面应包含 ${texts.join(" / ")}`).toContainText(pattern, {
    timeout: 30000,
  });
}

export function uniqueMetadataName(kind: string): string {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `qa_auto_md_${stamp}_${kind}`.toLowerCase();
}

function isDassetsOkResponse(response: Response): boolean {
  return response.url().includes("/dassets/") && response.status() >= 200 && response.status() < 500;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
