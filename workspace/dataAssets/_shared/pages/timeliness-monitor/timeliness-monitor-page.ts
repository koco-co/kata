// timeliness-monitor-page.ts — 【岚图汽车】【数据质量】时效性/及时性两个字段之间的时间差校验 页面对象。
// 覆盖：新建单表校验规则向导、监控对象填写、表字段接口、时效性校验规则入口与配置区契约。
// 选择器模式对齐 _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts。

import { expect, type Page } from "@playwright/test";

import {
  buildDataAssetsApiUrl,
  buildDataAssetsUrl,
  getEnvConfig,
  waitForUiSettled,
} from "../../helpers/test-setup";

const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";
const DQ_PROJECT_STORAGE_KEY = "dq_project_id";

/** 监控对象目标表（取自 feature fixture timeliness-multi-field-data.MONITOR_OBJECT.tableName）。 */
const MONITOR_TABLE = "dq_test_user_info_300";

/** 表字段接口（见 knowledge/sites dom-dataAssets.md：返回 create_time/update_time 等时间字段）。 */
const TABLE_COLUMN_API = "/dassets/v1/valid/monitor/tablecolumn";

/** 表字段记录；调用点只消费 key（字段名）。 */
export type MonitorTableColumn = {
  key: string;
};

/** 数据质量接口通用响应壳。 */
type DqApiResponse<T> = {
  code?: number;
  success?: boolean;
  data?: T;
};

/** 当前质量项目 id（取自 env profile，随环境切换；勿硬编码）。 */
function qualityProjectId(): number {
  return getEnvConfig().projects.quality.id;
}

/** 默认数据源显示名（取自 env profile 的默认数据源登记）。 */
function defaultDatasourceName(): string {
  const env = getEnvConfig();
  return env.datasources[env.runtime.defaultDatasource].metadata.name;
}

/** 默认数据源在数据资产侧的 id（monitor/tablecolumn 请求载荷）。 */
function defaultDatasourceAssetsId(): number {
  const env = getEnvConfig();
  return env.datasources[env.runtime.defaultDatasource].assets.id;
}

/** 默认数据源数据库名（取自 env profile 的默认数据源登记）。 */
function defaultDatabase(): string {
  const env = getEnvConfig();
  return env.datasources[env.runtime.defaultDatasource].sql.database;
}

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

/** 进入数据质量指定路由并等待壳层稳定；reload 用于新建页（注入项目上下文后 reload 才稳定渲染）。 */
async function gotoDqPage(page: Page, path: string, options: { reload?: boolean } = {}): Promise<void> {
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

/** 填写表单项输入框（按 label 正则定位 .ant-form-item）。 */
async function fillFormFieldByLabel(page: Page, label: RegExp, value: string): Promise<void> {
  const field = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  const control = field.locator("textarea, input").first();
  await control.fill(value, { timeout: 30000 });
  await expect(control, `表单字段「${label}」应填入目标值`).toHaveValue(value, { timeout: 30000 });
}

/** 读取当前活动 Ant Select 下拉的选项文本。 */
async function getActiveOptionTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const dropdowns = Array.from(document.querySelectorAll<HTMLElement>(".ant-select-dropdown")).filter(
      (element) => !element.className.includes("ant-select-dropdown-hidden"),
    );
    const activeDropdown = dropdowns.at(-1);
    if (!activeDropdown) return [];
    return Array.from(activeDropdown.querySelectorAll<HTMLElement>(".ant-select-item-option")).flatMap(
      (element) => {
        const values = [element.getAttribute("title")?.trim(), element.textContent?.trim()].filter(
          (value): value is string => Boolean(value),
        );
        return Array.from(new Set(values));
      },
    );
  });
}

/**
 * 在 Ant Select 表单项中搜索并选择目标项。
 * preferredText 用于同关键字命中多个选项时优先精确匹配（如数据源显示名）。
 */
async function selectFormOptionBySearch(
  page: Page,
  label: RegExp,
  keyword: string,
  preferredText?: string,
): Promise<void> {
  const formItem = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await expect(formItem, `应展示目标表单项「${label}」`).toBeVisible({ timeout: 30000 });
  const targetText = preferredText ?? keyword;
  if ((await formItem.textContent({ timeout: 30000 }))?.includes(targetText)) {
    return;
  }

  const select = formItem.locator(".ant-select:visible").first();
  await expect(select, `「${label}」下拉应可见`).toBeVisible({ timeout: 30000 });
  await select.click({ force: true, timeout: 30000 });
  await page.keyboard.type(keyword);
  await expect
    .poll(
      async () => {
        const optionTexts = await getActiveOptionTexts(page);
        return optionTexts.some((text) => text.includes(keyword));
      },
      {
        message: `「${label}」下拉应包含「${keyword}」`,
        timeout: 30000,
      },
    )
    .toBe(true);

  const dropdown = page.locator(".ant-select-dropdown:visible:not(.ant-select-dropdown-hidden)").last();
  const preferredOption = preferredText
    ? dropdown
        .locator(".ant-select-item-option")
        .filter({ hasText: preferredText })
        .first()
    : dropdown.locator(".ant-select-item-option").filter({ hasText: keyword }).first();
  await expect(preferredOption, `「${label}」下拉应包含可点击选项「${targetText}」`).toBeVisible({
    timeout: 30000,
  });
  await preferredOption.click({ timeout: 30000 });
  await expect(formItem, `表单项应选中「${targetText}」`).toContainText(keyword, { timeout: 30000 });
}

/** 点击向导底部按钮（允许按钮文本带空格，如「下 一 步」）。 */
async function clickCompactButton(page: Page, label: string): Promise<void> {
  const spacedLabel = label.split("").join("\\s*");
  await page
    .getByRole("button", { name: new RegExp(`^${spacedLabel}$`) })
    .first()
    .click({ timeout: 30000 });
  await expect(page.locator("body"), `点击「${label}」后页面主体应仍可见`).toBeVisible({
    timeout: 30000,
  });
}

/** 归一化表字段接口返回项为 { key }；字段名取 key/columnName/name/fieldName 中首个非空值。 */
function normalizeColumn(record: unknown): MonitorTableColumn | undefined {
  if (typeof record === "string") {
    return record.trim() ? { key: record.trim() } : undefined;
  }
  if (!record || typeof record !== "object") return undefined;
  const item = record as Record<string, unknown>;
  const candidate = item.key ?? item.columnName ?? item.name ?? item.fieldName;
  if (typeof candidate !== "string" || !candidate.trim()) return undefined;
  return { key: candidate.trim() };
}

/** 打开新建单表校验规则页并断言监控对象表单渲染完成。 */
export async function gotoMonitorRuleCreate(page: Page): Promise<void> {
  await gotoDqPage(page, "/dq/rule/add", { reload: true });
  const body = page.locator("body");
  for (const label of [
    "新建单表校验规则",
    "监控对象",
    "规则名称",
    "选择数据源",
    "选择数据库",
    "选择数据表",
    "下一步",
  ]) {
    await expect(body, `新建单表校验规则页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
}

/**
 * 填写监控对象：规则名称 + 数据源（SparkThrift2.x 默认数据源）+ 数据库 + 数据表。
 * 数据源/数据库取自 env profile 默认数据源，数据表对齐 feature fixture MONITOR_OBJECT。
 */
export async function fillMonitorObject(page: Page, ruleName: string): Promise<void> {
  await fillFormFieldByLabel(page, /规则名称/, ruleName);
  await selectFormOptionBySearch(page, /数据源/, "SparkThrift2.x", defaultDatasourceName());
  await selectFormOptionBySearch(page, /数据库/, defaultDatabase());
  await selectFormOptionBySearch(page, /数据表/, MONITOR_TABLE);
}

/**
 * 调用 monitor/tablecolumn 接口读取监控目标表的字段列表。
 * 请求载荷（dataSourceId/tableName）与响应字段名按调用点契约重建，未经 live 验证。
 */
export async function fetchMonitorTableColumns(page: Page): Promise<MonitorTableColumn[]> {
  const response = await page.request.post(buildDataAssetsApiUrl(TABLE_COLUMN_API), {
    data: { dataSourceId: defaultDatasourceAssetsId(), tableName: MONITOR_TABLE },
    headers: {
      "Accept-Language": "zh-CN",
      [PROJECT_STORAGE_KEY]: String(qualityProjectId()),
    },
  });
  expect(response.ok(), "monitor/tablecolumn HTTP 状态应成功").toBe(true);
  const payload = (await response.json()) as DqApiResponse<unknown[]>;
  expect(Boolean(payload.success ?? payload.code === 1), "monitor/tablecolumn 应返回成功状态").toBe(true);
  const records = Array.isArray(payload.data) ? payload.data : [];
  const columns = records
    .map(normalizeColumn)
    .filter((column): column is MonitorTableColumn => Boolean(column));
  expect(columns.length, "monitor/tablecolumn 应返回至少一个字段").toBeGreaterThan(0);
  return columns;
}

/** 从监控对象步骤进入监控规则步骤：点击「下一步」直至「添加规则」入口可见。 */
export async function gotoMonitorRulesStep(page: Page): Promise<void> {
  const body = page.locator("body");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (
      await body
        .getByText("添加规则", { exact: true })
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      return;
    }
    await clickCompactButton(page, "下一步");
    await waitForUiSettled(page);
  }
  await expect(body, "监控对象保存成功后应进入监控规则配置页").toContainText("添加规则", {
    timeout: 30000,
  });
}

/** 展开「添加规则」菜单并断言包含「时效性校验」分类；断言后按 Escape 收起菜单。 */
export async function expectTimelinessRuleEntry(page: Page): Promise<void> {
  await page.getByText("添加规则", { exact: true }).first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-dropdown-menu:visible, .ant-select-dropdown:visible").last();
  await expect(dropdown, "添加规则菜单应展开").toBeVisible({ timeout: 30000 });
  await expect(dropdown, "添加规则菜单应包含「时效性校验」").toContainText("时效性校验", {
    timeout: 30000,
  });
  await page.keyboard.press("Escape");
}

/**
 * 在「添加规则」菜单选择「时效性校验」分类，并在统计函数下拉选择「及时性校验」（多字段时间差校验）。
 * 流程对齐主流程规则集添加函数的已验证路径；分类/函数名为本需求新增项，未经 live 验证。
 */
export async function selectTimelinessRule(page: Page): Promise<void> {
  await page.getByText("添加规则", { exact: true }).first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-dropdown-menu:visible, .ant-select-dropdown:visible").last();
  await expect(dropdown, "添加规则菜单应展开").toBeVisible({ timeout: 30000 });
  await dropdown.getByText("时效性校验", { exact: true }).first().click({ timeout: 30000 });

  const body = page.locator("body");
  await expect(body, "选择时效性校验后应展示统计函数选择器").toContainText("请选择统计函数", {
    timeout: 30000,
  });
  await page
    .locator(".ant-select")
    .filter({ hasText: "请选择统计函数" })
    .last()
    .click({ timeout: 30000 });
  const functionDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(functionDropdown, "统计函数下拉应打开").toBeVisible({ timeout: 30000 });
  await functionDropdown.getByText("及时性校验", { exact: true }).first().click({ timeout: 30000 });
  await expect(body, "选择及时性校验后应展示多字段时间差校验配置区").toContainText(
    /多字段时间差校验|对比字段组|时间差/,
    { timeout: 30000 },
  );
}

/**
 * 断言「及时性校验-多字段时间差校验」配置区字段完整：字段、对比字段组、时间差。
 * 标签清单取自本 feature 用例步骤（「字段」「选择对比字段组」「时间差」）；
 * 字段组个数上限与比较符/时间单位下拉项未纳入静态契约。实现按调用点契约重建，未经 live 验证。
 */
export async function expectMultiFieldTimelinessContract(page: Page): Promise<void> {
  const body = page.locator("body");
  for (const label of ["字段", "对比字段组", "时间差"]) {
    await expect(body, `多字段时间差校验配置区应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
}
