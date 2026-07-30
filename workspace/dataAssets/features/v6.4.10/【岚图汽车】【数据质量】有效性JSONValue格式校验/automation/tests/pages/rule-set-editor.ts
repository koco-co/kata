// rule-editor-base.ts — 「有效性-json value格式校验」规则集编辑器基础动作
//
// 提供同目录其他模块共用的底层能力：
// - DataAssets 数据质量页面导航（注入质量项目上下文，参考 starrocks3x-quality-page 的写法）
// - 规则包定位、添加规则、保存规则集等编辑器基础动作
// - 校验key TreeSelect 的开下拉/勾选原语
// 选择器模式与 2099-01-lt-dq-main-flow/data-quality-page.ts 保持一致（Ant Design）。

import { expect, type Locator, type Page } from "@playwright/test";

import { getEnvConfig } from "../../../../../../_shared/automation/runtime/env-profile";
import {
  applyRuntimeCookies,
  buildDataAssetsApiUrl,
  buildDataAssetsUrl,
} from "../../../../../../_shared/automation/runtime/env-setup";
import { waitForUiSettled } from "../../../../../../../../runtime/automation/playwright/index";

const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";
const DQ_PROJECT_STORAGE_KEY = "dq_project_id";
const initializedPages = new WeakSet<Page>();

/** 当前质量项目 id（取自 env profile，随环境切换；勿硬编码）。 */
export function qualityProjectId(): number {
  return getEnvConfig().projects.quality.id;
}

async function ensurePageContext(page: Page): Promise<void> {
  if (initializedPages.has(page)) return;
  await applyRuntimeCookies(page);
  await page.addInitScript(
    ([assetKey, dqKey, id]) => {
      sessionStorage.setItem(assetKey, id);
      sessionStorage.setItem(dqKey, id);
      localStorage.setItem("currentProject", id);
    },
    [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(qualityProjectId())],
  );
  initializedPages.add(page);
}

async function injectProjectContext(page: Page): Promise<void> {
  await page
    .evaluate(
      ([assetKey, dqKey, id]) => {
        sessionStorage.setItem(assetKey, id);
        sessionStorage.setItem(dqKey, id);
        localStorage.setItem("currentProject", id);
      },
      [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(qualityProjectId())],
    )
    .catch(() => undefined);
}

/**
 * 打开数据质量指定路由（hash 路由），并注入质量项目上下文。
 * 实现按同区域既有页面对象（starrocks3x / lt-dq-main-flow）的导航模式重建。
 */
export async function gotoDqPage(page: Page, path: string): Promise<void> {
  await ensurePageContext(page);
  await page.goto(buildDataAssetsUrl(path, qualityProjectId()), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await injectProjectContext(page);
  await waitForUiSettled(page);
}

/** 数据质量通用 API 响应信封。 */
export type DqApiEnvelope<T> = {
  success?: boolean;
  code?: number;
  data?: T;
  message?: string | null;
};

/**
 * 以页面会话调用 DataAssets 数据质量 POST API 并断言成功信封，返回 data 载荷。
 */
export async function postDqApi<T>(
  page: Page,
  apiPath: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  const response = await page.request.post(buildDataAssetsApiUrl(apiPath), {
    data,
    headers: {
      "Accept-Language": "zh-CN",
      [PROJECT_STORAGE_KEY]: String(qualityProjectId()),
    },
    timeout: 60000,
  });
  expect(response.ok(), `${apiPath} HTTP 状态应成功`).toBe(true);
  const payload = (await response.json()) as DqApiEnvelope<T>;
  expect(payload.success ?? payload.code === 1, `${apiPath} 应返回成功状态`).toBe(true);
  return payload.data as T;
}

/** 转义正则元字符，用于把业务文本安全嵌入 RegExp。 */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 点击文本型紧凑按钮（按钮名允许字符间有空白，如「下 一 步」）。
 */
export async function clickCompactButton(page: Page, label: string): Promise<void> {
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
 * 在表单项（.ant-form-item）中通过搜索选择下拉选项（精确文本）。
 * 参考 selectDqFormOptionBySearch：打开下拉后键盘输入过滤，再点击匹配项。
 */
export async function selectFormOptionBySearch(
  page: Page,
  label: RegExp,
  optionText: string,
): Promise<void> {
  const formItem = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await expect(formItem, `应展示目标表单项 ${label}`).toBeVisible({ timeout: 30000 });
  if ((await formItem.textContent({ timeout: 30000 }))?.includes(optionText)) {
    return;
  }
  const select = formItem.locator(".ant-select:visible").first();
  await expect(select, `「${label}」下拉应可见`).toBeVisible({ timeout: 30000 });
  await select.click({ force: true, timeout: 30000 });
  await page.keyboard.type(optionText);
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  const option = dropdown
    .locator(".ant-select-item-option")
    .filter({ hasText: optionText })
    .first();
  await expect(option, `「${label}」下拉应包含「${optionText}」`).toBeVisible({ timeout: 30000 });
  await option.click({ timeout: 30000 });
  await expect(formItem, `表单项应选中「${optionText}」`).toContainText(optionText, {
    timeout: 30000,
  });
}

/**
 * 在表单项中按正则选择下拉选项（用于数据源等显示名随环境变化的场景）。
 */
export async function selectFormOptionByPattern(
  page: Page,
  label: RegExp,
  optionPattern: RegExp,
): Promise<void> {
  const formItem = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await expect(formItem, `应展示目标表单项 ${label}`).toBeVisible({ timeout: 30000 });
  if (optionPattern.test((await formItem.textContent({ timeout: 30000 })) ?? "")) {
    return;
  }
  await formItem.locator(".ant-select:visible").first().click({ force: true, timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  const target = dropdown
    .locator(".ant-select-item-option:not(.ant-select-item-option-disabled)")
    .filter({ hasText: optionPattern })
    .first();
  await expect(target, `「${label}」下拉应包含 ${optionPattern}`).toBeVisible({ timeout: 30000 });
  await target.click({ timeout: 30000 });
  await expect(formItem, `表单项应选中 ${optionPattern}`).toContainText(optionPattern, {
    timeout: 30000,
  });
}

/**
 * 在表单项中选择文本选项（调度属性等简单下拉：打开后按精确文本点击）。
 */
export async function chooseFormOptionByText(
  page: Page,
  label: RegExp,
  optionText: string,
): Promise<void> {
  const field = page.locator(".ant-form-item:visible").filter({ hasText: label }).last();
  await expect(field, `应展示配置项 ${label}`).toBeVisible({ timeout: 30000 });
  if ((await field.textContent({ timeout: 30000 }))?.includes(optionText)) {
    return;
  }
  await field.locator(".ant-select").first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  const option = dropdown.getByText(optionText, { exact: true }).first();
  await expect(option, `「${label}」下拉应包含「${optionText}」`).toBeVisible({ timeout: 30000 });
  await option.click({ timeout: 30000 });
  await expect(field, `「${label}」应选中「${optionText}」`).toContainText(optionText, {
    timeout: 30000,
  });
}

/**
 * 按规则包名称定位规则集监控规则页中的规则包区块（.ruleSetMonitor__package）。
 */
export async function getRulePackageSection(page: Page, packageName: string): Promise<Locator> {
  const section = page.locator(".ruleSetMonitor__package").filter({ hasText: packageName }).first();
  await expect(section, `规则包「${packageName}」应可见`).toBeVisible({ timeout: 30000 });
  return section;
}

/**
 * 在指定规则包中添加一条规则，返回新渲染的规则表单（.ruleForm）。
 * ruleType 为规则分类入口文本（默认「有效性校验」）。
 * 实现按调用点契约重建，未经 live 验证。
 */
export async function addRuleToPackage(
  page: Page,
  packageName: string,
  ruleType = "有效性校验",
): Promise<Locator> {
  const packageSection = await getRulePackageSection(page, packageName);
  const existingForms = packageSection.locator(".ruleForm");
  const before = await existingForms.count();

  const addEntry = packageSection
    .getByText("添加规则", { exact: true })
    .first()
    .or(page.getByText("添加规则", { exact: true }).first());
  await expect(addEntry, `规则包「${packageName}」应展示「添加规则」入口`).toBeVisible({
    timeout: 30000,
  });
  await addEntry.click({ timeout: 30000 });
  await page.getByText(ruleType, { exact: true }).last().click({ timeout: 30000 });

  const ruleForm = packageSection.locator(".ruleForm").nth(before);
  await expect(ruleForm, `规则包「${packageName}」应新增「${ruleType}」规则表单`).toBeVisible({
    timeout: 30000,
  });
  return ruleForm;
}

/**
 * 页面级保存规则集：点击编辑器底部「保存」，容忍行内无保存按钮的场景。
 * 保存成功后可能出现成功提示，也可能直接跳回规则集列表。
 * 实现按调用点契约重建，未经 live 验证。
 */
export async function saveRuleSet(page: Page): Promise<void> {
  const saveButton = page.getByRole("button", { name: /^保\s*存$/ }).last();
  await expect(saveButton, "规则集编辑器应展示页面级「保存」入口").toBeVisible({ timeout: 30000 });
  await saveButton.click({ timeout: 30000 });

  // 部分环境保存前会弹确认框，做 best-effort 确认。
  const confirm = page.locator(".ant-modal:visible, .ant-popconfirm:visible").last();
  if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirm
      .getByRole("button", { name: /确\s*定|确\s*认/ })
      .last()
      .click({ timeout: 30000 })
      .catch(() => undefined);
  }

  const succeeded = await Promise.race([
    page
      .waitForURL(/\/dq\/ruleSet(?:\?|$)/, { timeout: 30000 })
      .then(() => true)
      .catch(() => false),
    page
      .locator(".ant-message-notice, .ant-notification-notice")
      .filter({ hasText: /成功/ })
      .first()
      .waitFor({ state: "visible", timeout: 30000 })
      .then(() => true)
      .catch(() => false),
  ]);
  expect(succeeded, "保存规则集应出现成功提示或返回规则集列表").toBe(true);
  await waitForUiSettled(page);
}

/** 定位规则表单中的校验key选择器（TreeSelect；兼容普通 Select 实现）。 */
export function getValidationKeySelect(ruleForm: Locator): Locator {
  const functionRow = ruleForm.locator(".rule__function-list__item").first();
  return functionRow
    .locator(".ant-tree-select")
    .first()
    .or(
      functionRow
        .locator(".ant-select")
        .filter({ hasText: /校验key/ })
        .first(),
    )
    .or(functionRow.locator(".ant-select").nth(1));
}

/** 校验key下拉浮层（TreeSelect 下拉；兼容普通 Select 下拉）。 */
export function getValidationKeyDropdown(page: Page): Locator {
  return page.locator(".ant-tree-select-dropdown:visible, .ant-select-dropdown:visible").last();
}

/**
 * 打开规则表单中的校验key下拉并返回浮层 Locator。
 */
export async function openValidationKeyTreeDropdown(
  page: Page,
  ruleForm: Locator,
): Promise<Locator> {
  const keySelect = getValidationKeySelect(ruleForm);
  await expect(keySelect, "规则表单应展示校验key选择器").toBeVisible({ timeout: 30000 });
  const dropdown = getValidationKeyDropdown(page);
  if (!(await dropdown.isVisible({ timeout: 1000 }).catch(() => false))) {
    await keySelect.locator(".ant-select-selector").first().click({ timeout: 30000 });
  }
  await expect(dropdown, "校验key下拉树应打开").toBeVisible({ timeout: 30000 });
  return dropdown;
}

/**
 * 在已打开的校验key下拉中逐个搜索并勾选指定 key（已勾选的跳过）。
 * 实现按调用点契约重建，未经 live 验证。
 */
export async function selectValidationKeysInDropdown(
  page: Page,
  keyNames: readonly string[],
): Promise<void> {
  const dropdown = getValidationKeyDropdown(page);
  const searchInput = dropdown.locator("input:visible").first();
  for (const keyName of keyNames) {
    if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchInput.fill(keyName);
      await waitForUiSettled(page);
    }
    const node = dropdown
      .locator(".ant-select-tree-treenode, .ant-tree-treenode")
      .filter({ hasText: keyName })
      .first();
    await expect(node, `校验key下拉应包含「${keyName}」`).toBeVisible({ timeout: 30000 });
    const checkbox = node.locator(".ant-select-tree-checkbox, .ant-tree-checkbox").first();
    const checked = await checkbox
      .evaluate((el) => el.className.includes("-checked"))
      .catch(() => false);
    if (!checked) {
      await node
        .locator(".ant-select-tree-node-content-wrapper, .ant-tree-node-content-wrapper")
        .first()
        .click({ timeout: 30000 });
      await waitForUiSettled(page);
    }
    if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchInput.fill("");
      await waitForUiSettled(page);
    }
  }
}

/**
 * 打开校验key下拉、勾选指定 key 并关闭浮层（Escape）。
 */
export async function pickValidationKeys(
  page: Page,
  ruleForm: Locator,
  keyNames: readonly string[],
): Promise<void> {
  if (keyNames.length === 0) return;
  await openValidationKeyTreeDropdown(page, ruleForm);
  await selectValidationKeysInDropdown(page, keyNames);
  await page.keyboard.press("Escape").catch(() => undefined);
  await waitForUiSettled(page);
}

/**
 * 设置规则表单的强弱规则（已选中时跳过）。
 */
export async function setRuleStrength(
  page: Page,
  ruleForm: Locator,
  label: "强规则" | "弱规则",
): Promise<void> {
  const field = ruleForm
    .locator(".ant-form-item:visible")
    .filter({ hasText: /强弱规则/ })
    .last()
    .or(
      page
        .locator(".ant-form-item:visible")
        .filter({ hasText: /强弱规则/ })
        .last(),
    );
  await expect(field, "应展示强弱规则配置项").toBeVisible({ timeout: 30000 });
  if ((await field.textContent({ timeout: 30000 }))?.includes(label)) {
    return;
  }
  await field.locator(".ant-select").first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  const option = dropdown.getByText(label, { exact: true }).first();
  await expect(option, `强弱规则下拉应包含「${label}」`).toBeVisible({ timeout: 30000 });
  await option.click({ timeout: 30000 });
  await expect(field, `强弱规则应选中「${label}」`).toContainText(label, { timeout: 30000 });
}

/**
 * 填写规则描述（编辑器全局唯一描述输入框，取最后一个可见的）。
 */
export async function fillRuleDescription(page: Page, value: string): Promise<void> {
  const control = page
    .locator('textarea[placeholder*="规则描述"]:visible, input[placeholder*="规则描述"]:visible')
    .last();
  await expect(control, "应展示规则描述输入框").toBeVisible({ timeout: 30000 });
  await control.fill(value, { timeout: 30000 });
  await expect(control, "规则描述应填入目标值").toHaveValue(value, { timeout: 30000 });
}
