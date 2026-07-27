// rule-library-page.ts — 【岚图汽车】【数据质量】内置规则增加规则项 页面对象。
// 覆盖：规则库配置入口候选路由、新建单表校验规则向导（监控对象 → 监控规则步骤）、
// 添加规则菜单读取。选择器模式对齐 _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts。

import { expect, type Page } from "@playwright/test";

import {
  buildDataAssetsUrl,
  getEnvConfig,
  uniqueName,
  waitForUiSettled,
} from "../../helpers/test-setup";

const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";
const DQ_PROJECT_STORAGE_KEY = "dq_project_id";

/** 监控对象目标表（取自 feature fixture rule-library-contract.MONITOR_OBJECT.tableName）。 */
const MONITOR_TABLE = "dq_monitor_4ttoaeophhq0_29415";

/** 规则库配置候选路由；首项 /dq/ruleBase 为主流程已验证路由，其余为兜底候选。 */
const RULE_BASE_CANDIDATE_PATHS = ["/dq/ruleBase", "/dq/ruleLibrary", "/dq/ruleConfig"] as const;

/** 当前质量项目 id（取自 env profile，随环境切换；勿硬编码）。 */
function qualityProjectId(): number {
  return getEnvConfig().projects.quality.id;
}

/** 默认数据源显示名（取自 env profile 的默认数据源登记）。 */
function defaultDatasourceName(): string {
  const env = getEnvConfig();
  return env.datasources[env.runtime.defaultDatasource].metadata.name;
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

/**
 * 进入数据质量规则库配置候选路由：逐个尝试候选路径，停在未进入 404 且展示「规则库配置」的页面。
 * 实现按调用点契约重建；候选清单首项 /dq/ruleBase 来自主流程已验证路由，其余候选未经 live 验证。
 */
export async function gotoRuleBaseCandidate(page: Page): Promise<void> {
  let lastBodyText = "";
  for (const path of RULE_BASE_CANDIDATE_PATHS) {
    await gotoDqPage(page, path);
    const bodyText = await page
      .locator("body")
      .innerText({ timeout: 10000 })
      .catch(() => "");
    if (bodyText.includes("规则库配置") && !bodyText.includes("亲，是不是走错地方了？")) {
      return;
    }
    lastBodyText = bodyText;
  }
  throw new Error(`规则库配置候选路由均不可用，最后一次页面内容: ${lastBodyText.slice(0, 200)}`);
}

/**
 * 新建单表校验规则并进入监控规则步骤（第二步）：填写监控对象后点击「下一步」，
 * 直至「添加规则」入口可见。监控对象取值对齐 feature fixture MONITOR_OBJECT。
 */
export async function gotoMonitorRuleStep2(page: Page): Promise<void> {
  await gotoDqPage(page, "/dq/rule/add", { reload: true });
  const body = page.locator("body");
  for (const label of ["新建单表校验规则", "监控对象", "规则名称", "选择数据源", "选择数据库", "选择数据表"]) {
    await expect(body, `新建单表校验规则页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await fillFormFieldByLabel(page, /规则名称/, uniqueName("rule_library"));
  await selectFormOptionBySearch(page, /数据源/, "SparkThrift2.x", defaultDatasourceName());
  await selectFormOptionBySearch(page, /数据库/, defaultDatabase());
  await selectFormOptionBySearch(page, /数据表/, MONITOR_TABLE);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await body.getByText("添加规则", { exact: true }).first().isVisible({ timeout: 5000 }).catch(() => false)) {
      return;
    }
    await clickCompactButton(page, "下一步");
    await waitForUiSettled(page);
  }
  await expect(body, "监控对象保存成功后应进入监控规则配置页").toContainText("添加规则", {
    timeout: 30000,
  });
}

/**
 * 打开「添加规则」菜单并返回全部规则分类文本（去重、去空）；读取后按 Escape 收起菜单。
 * 菜单容器与菜单项选择器与规则集管理 full.spec 已验证选择器一致（.ant-dropdown-menu/.ant-select-dropdown）。
 */
export async function readAddRuleMenu(page: Page): Promise<string[]> {
  await page.getByText("添加规则", { exact: true }).first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-dropdown-menu:visible, .ant-select-dropdown:visible").last();
  await expect(dropdown, "添加规则菜单应展开").toBeVisible({ timeout: 30000 });
  const items = await dropdown
    .locator(".ant-dropdown-menu-item, .ant-select-item-option")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.textContent?.trim() ?? "").filter((text) => text.length > 0),
    );
  const uniqueItems = [...new Set(items)];
  expect(uniqueItems.length, "添加规则菜单应返回至少一个规则分类").toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  return uniqueItems;
}
