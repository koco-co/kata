// json-format-utils.ts — 「有效性-json value格式校验」规则集编辑流程工具
//
// 面向规则集管理（/dq/ruleSet）的规则集创建与「格式-json格式校验」规则配置：
// - createRuleSetDraft：新建规则集草稿（基础信息 → 监控规则步骤）
// - configureJsonFormatRule：在规则表单中完整配置 json 格式校验规则
// - addRuleToPackage / saveRuleSet / getRulePackageSection：转发自 rule-editor-base 的基础动作
// - SPARKTHRIFT_MONITOR_DATASOURCE / DORIS_MONITOR_DATASOURCE：监控数据源选择配置

import { expect, type Locator, type Page } from "@playwright/test";

import { getEnvConfig } from "../../../../../../_shared/automation/runtime/env-profile";
import {
  selectAntOption,
  waitForUiSettled,
} from "../../../../../../../../runtime/automation/playwright/index";

import {
  clickCompactButton,
  escapeRegExp,
  fillRuleDescription,
  gotoDqPage,
  pickValidationKeys,
  selectFormOptionByPattern,
  selectFormOptionBySearch,
  setRuleStrength,
} from "./rule-set-editor";

export { addRuleToPackage, getRulePackageSection, saveRuleSet } from "./rule-set-editor";

/** 「格式-json格式校验」统计函数在下拉中的选项文本（源码枚举 FORMAT_JSON_VERIFICATION = '51'）。 */
export const JSON_FORMAT_FUNCTION_NAME = "格式-json格式校验";

/**
 * 监控数据源选择配置。
 * optionPattern 用于「选择数据源」下拉匹配（显示名随环境变化，按关键字正则匹配）；
 * database 缺省时按 envKey 从环境 profile 解析。
 */
export interface MonitorDatasourceConfig {
  /** 环境 profile datasources 中的键（如 "sparkthrift"、"doris"）。 */
  readonly envKey: string;
  /** 「选择数据源」下拉的选项匹配模式。 */
  readonly optionPattern: RegExp;
  /** 数据库名；缺省时从环境 profile 解析。 */
  readonly database?: string;
}

/** SparkThrift2.x 监控数据源（关键字与 fixtures/data-15694 的 SPARKTHRIFT_DATASOURCE_KEYWORD 对齐）。 */
export const SPARKTHRIFT_MONITOR_DATASOURCE: MonitorDatasourceConfig = {
  envKey: "sparkthrift",
  optionPattern: /spark|thrift|hadoop/i,
};

/** Doris3.x 监控数据源（关键字与 fixtures/data-15694 的 DORIS_DATASOURCE_KEYWORD 对齐）。 */
export const DORIS_MONITOR_DATASOURCE: MonitorDatasourceConfig = {
  envKey: "doris",
  optionPattern: /doris/i,
};

type ResolvedMonitorDatasource = {
  readonly optionPattern: RegExp;
  readonly database?: string;
};

/** 解析生效的监控数据源：显式传入优先，否则取环境默认数据源。 */
function resolveMonitorDatasource(datasource?: MonitorDatasourceConfig): ResolvedMonitorDatasource {
  const env = getEnvConfig();
  if (datasource) {
    const profile = env.datasources[datasource.envKey];
    return {
      optionPattern: datasource.optionPattern,
      database: datasource.database ?? profile?.sql.database,
    };
  }
  const defaultKey = env.runtime.defaultDatasource;
  const profile = env.datasources[defaultKey];
  if (profile) {
    const aliases = profile.aliases.length > 0 ? profile.aliases : [defaultKey];
    return {
      optionPattern: new RegExp(aliases.map((alias) => escapeRegExp(alias)).join("|"), "i"),
      database: profile.sql.database,
    };
  }
  return { optionPattern: SPARKTHRIFT_MONITOR_DATASOURCE.optionPattern };
}

/**
 * 打开规则集管理列表页（/dq/ruleSet）。
 */
export async function gotoRuleSetList(page: Page): Promise<void> {
  await gotoDqPage(page, "/dq/ruleSet");
  await expectBodyContains(page, /规则集|新建规则集/, "规则集管理页应展示规则集内容");
}

async function expectBodyContains(
  page: Page,
  text: RegExp | string,
  message: string,
): Promise<void> {
  await expect(page.locator("body"), message).toContainText(text, { timeout: 30000 });
}

/**
 * 创建规则集草稿：规则集列表 → 新建规则集 → 基础信息（数据源/数据库/数据表/规则包名称）→ 下一步进入监控规则步骤。
 * datasource 缺省时使用环境默认数据源。
 * 实现按调用点契约重建，未经 live 验证。
 */
export async function createRuleSetDraft(
  page: Page,
  tableName: string,
  packageNames: readonly string[],
  datasource?: MonitorDatasourceConfig,
): Promise<void> {
  const resolved = resolveMonitorDatasource(datasource);

  await gotoRuleSetList(page);
  await page.getByText("新建规则集", { exact: true }).first().click({ timeout: 30000 });
  await expect(page, "新建规则集应进入 /dq/ruleSet/add").toHaveURL(/\/dq\/ruleSet\/add/, {
    timeout: 30000,
  });
  await expectBodyContains(page, "基础信息", "新建规则集页应展示基础信息");

  await selectFormOptionByPattern(page, /数据源/, resolved.optionPattern);
  if (resolved.database) {
    await selectFormOptionBySearch(page, /数据库/, resolved.database);
  }
  await selectFormOptionBySearch(page, /数据表/, tableName);

  const packageInputs = page.getByPlaceholder("请输入规则包名称");
  for (let index = 0; index < packageNames.length; index += 1) {
    if (index > 0) {
      const addButton = page
        .getByRole("button", { name: /增加|添加规则包|新增规则包|添加/ })
        .first();
      await expect(addButton, "应展示新增规则包入口").toBeVisible({ timeout: 30000 });
      await addButton.click({ timeout: 30000 });
    }
    const input = packageInputs.nth(index);
    await expect(input, `第 ${index + 1} 个规则包名称输入框应可见`).toBeVisible({ timeout: 30000 });
    await input.fill(packageNames[index], { timeout: 30000 });
    await expect(input, `规则包名称应回显「${packageNames[index]}」`).toHaveValue(
      packageNames[index],
      {
        timeout: 30000,
      },
    );
  }
  await packageInputs
    .first()
    .press("Tab")
    .catch(() => undefined);

  await clickCompactButton(page, "下一步");
  await expectBodyContains(page, /监控规则|添加规则/, "下一步后应进入监控规则配置页");

  const firstPackage = packageNames[0];
  if (firstPackage) {
    await expect(
      page.locator(".ruleSetMonitor__package").filter({ hasText: firstPackage }).first(),
      `规则包「${firstPackage}」应展示在监控规则配置页`,
    ).toBeVisible({ timeout: 30000 });
  }
}

/** configureJsonFormatRule 的规则配置项。 */
export interface JsonFormatRuleOptions {
  /** 字段名（json/string 类型字段，如 "info"）。 */
  readonly field: string;
  /** 校验key 名（name 为 path 以 "-" 连接，如 "person-name"）。 */
  readonly keyNames: readonly string[];
  /** 强弱规则；缺省保持编辑器默认。 */
  readonly ruleStrength?: "强规则" | "弱规则";
  /** 规则描述；缺省不填写。 */
  readonly description?: string;
}

/**
 * 在规则表单中完整配置「格式-json格式校验」规则：字段 → 统计函数 → 校验key → 强弱规则 → 规则描述。
 * 实现按调用点契约重建，未经 live 验证。
 */
export async function configureJsonFormatRule(
  page: Page,
  ruleForm: Locator,
  options: JsonFormatRuleOptions,
): Promise<void> {
  const fieldSelect = ruleForm
    .locator(".ant-form-item")
    .filter({ hasText: /字段/ })
    .locator(".ant-select")
    .first();
  await selectAntOption(page, fieldSelect, options.field);
  await waitForUiSettled(page);

  const functionRow = ruleForm.locator(".rule__function-list__item").first();
  const functionSelect = functionRow.locator(".ant-select").first();
  await selectAntOption(page, functionSelect, JSON_FORMAT_FUNCTION_NAME);
  await waitForUiSettled(page);

  await pickValidationKeys(page, ruleForm, options.keyNames);

  if (options.ruleStrength) {
    await setRuleStrength(page, ruleForm, options.ruleStrength);
  }
  if (options.description) {
    await fillRuleDescription(page, options.description);
  }
}
