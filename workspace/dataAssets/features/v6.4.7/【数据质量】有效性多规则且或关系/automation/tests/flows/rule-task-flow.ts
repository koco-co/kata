// rule-task-helpers.ts — 「有效性多规则且或关系(#15695)」规则任务与质量报告页面对象
//
// 覆盖【数据质量 → 规则任务管理】任务确保/执行、【校验结果查询】实例等待与详情抽屉、
// 【数据质量报告】报告详情与规则明细。任务/实例终态等待不使用固定 sleep，
// 以状态轮询（搜索 → 读行文本 → 终态判定）实现。
//
// 注意：本文件按 11 个调用点文件的契约重建；任务缺失时的自动补建流程（规则集重建 +
// 新建监控规则向导）、抽样/分区等扩展配置标注为「按调用点契约重建，未经 live 验证」。

import { expect, type Locator, type Page } from "@playwright/test";

import { getEnvConfig } from "../../../../../../_shared/automation/runtime/env-profile";
import {
  expectAntMessage,
  selectAntOption,
  waitForTableLoaded,
  waitForUiSettled,
} from "../../../../../../../../runtime/automation/playwright/index";

import {
  addRuleToPackage,
  saveRuleSet,
} from "../../../../../../_shared/automation/pages/data-quality/rule-set-editor";
import {
  configureRangeEnumRule,
  createRuleSetDraft,
  deleteRuleSetsByTableNames,
  gotoDataQualityPage,
  selectRuleFieldAndFunction,
  type RangeEnumRuleConfig,
} from "../pages/range-enum-rule-editor";

/** 任务实例行的终态状态文案（成功/异常/失败均视为终态，由调用方断言具体结果）。 */
const TERMINAL_STATUS_PATTERN = /执行成功|校验通过|校验未通过|校验不通过|校验异常|执行失败|失败/;

/** env profile 数据源 key → feature fixture 数据源 id（与 fixtures/test-data.ts 同规则）。 */
const PROFILE_KEY_TO_DATASOURCE_ID: Readonly<Record<string, string>> = {
  sparkthrift: "sparkthrift2.x",
  doris: "doris3.x",
};

/** 独立「枚举值」统计函数规则配置（用于仅枚举值场景补建）。 */
type StandaloneEnumRule = {
  readonly field: string;
  readonly operator: string;
  readonly values: readonly string[];
};

/** 任务补建场景：规则集/表/规则包/规则配置与任务扩展配置。 */
type RuleTaskScenario = {
  readonly table: string;
  readonly ruleSet: string;
  readonly packageName: string;
  readonly rangeEnumRule?: RangeEnumRuleConfig;
  readonly standaloneEnumRule?: StandaloneEnumRule;
  readonly samplingPercent?: number;
  readonly partition?: string;
};

/**
 * 任务基础名 → 补建场景登记（规则配置取自各用例文件与 archive 前置条件）。
 * 实现按调用点契约重建，未经 live 验证。
 */
const RULE_TASK_SCENARIOS: Readonly<Record<string, RuleTaskScenario>> = {
  task_15695_and: {
    table: "quality_test_num",
    ruleSet: "ruleset_15695_and",
    packageName: "且关系校验包",
    rangeEnumRule: {
      field: "score",
      range: {
        firstOperator: ">",
        firstValue: "1",
        condition: "且",
        secondOperator: "<",
        secondValue: "10",
      },
      enumOperator: "in",
      enumValues: ["1", "2", "3"],
      relation: "且",
      ruleStrength: "强规则",
    },
  },
  task_15695_or: {
    table: "quality_test_num",
    ruleSet: "ruleset_15695_or",
    packageName: "或关系校验包",
    rangeEnumRule: {
      field: "score",
      range: { firstOperator: ">", firstValue: "1" },
      enumOperator: "in",
      enumValues: ["-1"],
      relation: "或",
      ruleStrength: "强规则",
    },
  },
  task_15695_weak: {
    table: "quality_test_num",
    ruleSet: "ruleset_15695_weak",
    packageName: "弱规则校验包",
    rangeEnumRule: {
      field: "score",
      range: { firstOperator: ">", firstValue: "1" },
      enumOperator: "in",
      enumValues: ["1", "2", "3"],
      relation: "且",
      ruleStrength: "弱规则",
    },
  },
  task_15695_str: {
    table: "quality_test_str",
    ruleSet: "ruleset_15695_str",
    packageName: "string强转包",
    rangeEnumRule: {
      field: "score_str",
      range: {
        firstOperator: ">",
        firstValue: "1",
        condition: "且",
        secondOperator: "<",
        secondValue: "10",
      },
      enumOperator: "in",
      enumValues: ["5", "5.5", "15"],
      relation: "且",
      ruleStrength: "强规则",
    },
  },
  task_15695_sample: {
    table: "quality_test_sample",
    ruleSet: "ruleset_15695_sample",
    packageName: "抽样校验包",
    rangeEnumRule: {
      field: "score",
      range: { firstOperator: ">", firstValue: "1" },
      enumOperator: "in",
      enumValues: ["1", "2", "3"],
      relation: "且",
      ruleStrength: "强规则",
    },
    samplingPercent: 50,
  },
  task_15695_partition: {
    table: "quality_test_partition",
    ruleSet: "ruleset_15695_partition",
    packageName: "分区校验包",
    rangeEnumRule: {
      field: "score",
      range: { firstOperator: ">", firstValue: "1" },
      enumOperator: "in",
      enumValues: ["1", "2", "3"],
      relation: "且",
      ruleStrength: "强规则",
    },
    partition: "p20260401",
  },
  task_15695_enum_pass: {
    table: "quality_test_enum_pass",
    ruleSet: "ruleset_15695_enum_pass",
    packageName: "枚举通过包",
    standaloneEnumRule: { field: "category", operator: "in", values: ["1", "2", "3"] },
  },
  task_15695_enum_fail: {
    table: "quality_test_num",
    ruleSet: "ruleset_15695_enum_fail",
    packageName: "枚举失败包",
    standaloneEnumRule: { field: "category", operator: "in", values: ["1", "2", "3"] },
  },
  task_15695_enum_notin_fail: {
    table: "quality_test_num",
    ruleSet: "ruleset_15695_enum_notin_fail",
    packageName: "枚举notin失败包",
    standaloneEnumRule: { field: "category", operator: "not in", values: ["4", "5"] },
  },
};

/** 与 fixtures/test-data.ts 的 resolveVariantName 同规则：基础名 + 当前数据源后缀。 */
function resolveTaskVariantName(baseName: string): string {
  const env = getEnvConfig();
  const key = env.runtime.activeDatasources[0] ?? env.runtime.defaultDatasource;
  const datasourceId = PROFILE_KEY_TO_DATASOURCE_ID[key] ?? key;
  return `${baseName}_${datasourceId.replace(/\./g, "_")}`;
}

/** 当前页面是否已处于指定数据质量路由（按 hash 判定，/dq/rule 不会误匹配 /dq/ruleSet）。 */
function isOnPage(page: Page, route: string): boolean {
  return new RegExp(`${route}(\\?|#|$)`).test(page.url());
}

/** 进入【数据质量 → 规则任务管理】并等待任务表格加载。 */
async function gotoRuleTaskList(page: Page): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule");
  await waitForTableLoaded(page);
  await expect(page.locator("body"), "规则任务管理页应展示「新建监控规则」入口").toContainText(
    "新建监控规则",
    { timeout: 30000 },
  );
}

/** 进入【数据质量 → 校验结果查询】并等待实例表格加载。 */
async function gotoResultQuery(page: Page): Promise<void> {
  await gotoDataQualityPage(page, "/dq/taskQuery");
  await waitForTableLoaded(page);
  await expect(page.locator("body"), "校验结果查询页应展示搜索区").toContainText(
    /任务名称|计划时间/,
    {
      timeout: 30000,
    },
  );
}

/** 进入【数据质量 → 数据质量报告】并等待报告表格加载。 */
async function gotoQualityReport(page: Page): Promise<void> {
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await waitForTableLoaded(page);
  await expect(page.locator("body"), "数据质量报告页应展示报告内容").toContainText(
    /报告|已配置|已生成/,
    { timeout: 30000 },
  );
}

/** 在列表页搜索框按关键词过滤（占位符兼容表名/任务名称/报告名称/搜索），回车后等待列表刷新。 */
async function searchListByKeyword(page: Page, keyword: string): Promise<void> {
  const searchInput = page
    .locator(
      "input[placeholder*='搜索'], input[placeholder*='表名'], input[placeholder*='任务名称'], input[placeholder*='报告名称']",
    )
    .first();
  await expect(searchInput, "列表页应展示关键词搜索输入框").toBeVisible({ timeout: 30000 });
  await searchInput.fill(keyword, { timeout: 30000 });
  await page.keyboard.press("Enter");
  const queryButton = page.getByRole("button", { name: /查\s*询|search/i }).first();
  if (await queryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await queryButton.click({ timeout: 30000 });
  }
  await waitForUiSettled(page);
}

/** 在任务/实例列表中按任务名称定位数据行（同步返回 Locator，子串匹配）。 */
export function getTableRowByTaskName(page: Page, taskName: string): Locator {
  return page
    .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
    .filter({ hasText: taskName })
    .first();
}

/** 读取任务最新实例行文本；无实例时返回空串。 */
async function readLatestInstanceText(page: Page, taskName: string): Promise<string> {
  await searchListByKeyword(page, taskName);
  const row = getTableRowByTaskName(page, taskName);
  if (!(await row.isVisible({ timeout: 5000 }).catch(() => false))) return "";
  return (await row.innerText().catch(() => "")) ?? "";
}

/** 任务在校验结果查询中是否已存在终态实例。 */
async function hasFinishedInstance(page: Page, taskName: string): Promise<boolean> {
  if (!isOnPage(page, "/dq/taskQuery")) {
    await gotoResultQuery(page);
  }
  return TERMINAL_STATUS_PATTERN.test(await readLatestInstanceText(page, taskName));
}

/**
 * 在规则任务管理列表中执行指定任务（点击行内【执行】/【立即执行】并处理确认气泡），
 * 以「操作成功/已提交」全局提示作为提交成功信号。
 */
export async function executeTaskFromList(page: Page, taskName: string): Promise<void> {
  if (!isOnPage(page, "/dq/rule")) {
    await gotoRuleTaskList(page);
  }
  await searchListByKeyword(page, taskName);
  const row = getTableRowByTaskName(page, taskName);
  await expect(row, `规则任务列表应展示任务「${taskName}」`).toBeVisible({ timeout: 15000 });
  const executeEntry = row.getByRole("button", { name: /立即执行|执\s*行/ }).first();
  await expect(executeEntry, `任务「${taskName}」应展示执行入口`).toBeVisible({ timeout: 15000 });
  await executeEntry.click({ timeout: 30000 });

  const confirm = page
    .locator(".ant-popconfirm:visible, .ant-popover:visible, .ant-modal:visible")
    .last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    const confirmButton = confirm.getByRole("button", { name: /确\s*定|确\s*认|OK|是/ }).last();
    if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmButton.click({ timeout: 30000 });
    }
  }
  await expectAntMessage(page, /成功|已提交|执行/, 15000);
}

/**
 * 等待任务最新实例进入终态并返回实例行 Locator。
 * 未在校验结果查询页时先导航；轮询以「搜索 → 读行 → 终态判定」推进，超时后返回当前行
 * （由调用方对行内容做终态断言）。
 */
export async function waitForTaskInstanceFinished(
  page: Page,
  taskName: string,
  timeoutMs = 600000,
): Promise<Locator> {
  if (!isOnPage(page, "/dq/taskQuery")) {
    await gotoResultQuery(page);
  }
  const instanceRow = getTableRowByTaskName(page, taskName);
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const text = await readLatestInstanceText(page, taskName);
    if (TERMINAL_STATUS_PATTERN.test(text)) return instanceRow;
    if (Date.now() >= deadline) break;
    await waitForUiSettled(page);
    await gotoResultQuery(page);
  }
  await expect(instanceRow, `任务「${taskName}」应在 ${timeoutMs}ms 内产生实例记录`).toBeVisible({
    timeout: 10000,
  });
  return instanceRow;
}

/**
 * 打开实例详情抽屉（优先行内【查看详情】入口，兜底点击第二列单元格），返回抽屉 Locator。
 * 实例详情抽屉容器兼容平台自定义 .dtc-drawer 与标准 .ant-drawer。
 */
export async function openTaskInstanceDetail(page: Page, instanceRow: Locator): Promise<Locator> {
  const detailEntry = instanceRow.getByRole("button", { name: /查看详情|详\s*情/ }).first();
  if (await detailEntry.isVisible({ timeout: 3000 }).catch(() => false)) {
    await detailEntry.click({ timeout: 30000 });
  } else {
    await instanceRow.locator("td").nth(1).click({ timeout: 30000 });
  }
  const drawer = page.locator(".dtc-drawer:visible, .ant-drawer:visible").last();
  await expect(drawer, "实例详情抽屉应打开").toBeVisible({ timeout: 15000 });
  return drawer;
}

/** 在实例详情抽屉中按统计函数名定位规则卡片/规则行（同步返回 Locator）。 */
export function getTaskDetailRuleCard(detailDrawer: Locator, ruleName: string): Locator {
  return detailDrawer
    .locator(
      ".ant-table-tbody tr:visible, [class*='rule-card'], [class*='ruleCard'], [class*='rule-item']",
    )
    .filter({ hasText: ruleName })
    .first();
}

/** 在实例详情抽屉中点击【查看明细】打开明细数据抽屉，返回明细抽屉 Locator。 */
export async function openTaskRuleDetailDataDrawer(
  page: Page,
  detailDrawer: Locator,
): Promise<Locator> {
  const entry = detailDrawer.getByRole("button", { name: "查看明细" }).first();
  await expect(entry, "实例详情应展示「查看明细」入口").toBeVisible({ timeout: 15000 });
  await entry.click({ timeout: 30000 });
  const dataDrawer = page.locator(".ant-drawer:visible").last();
  await expect(dataDrawer, "明细数据抽屉应打开展示明细内容").toContainText("明细", {
    timeout: 15000,
  });
  return dataDrawer;
}

/**
 * 确保指定任务存在：逐个检查任务列表，缺失时按登记场景补建
 * （重建表上既有规则集 → 新建规则集与规则 → 新建监控规则向导）。
 * 补建流程按调用点契约重建，未经 live 验证；结束后停留在规则任务管理列表。
 */
export async function ensureRuleTasks(page: Page, taskNames: readonly string[]): Promise<void> {
  await gotoRuleTaskList(page);
  for (const baseName of taskNames) {
    await searchListByKeyword(page, baseName);
    if (
      await getTableRowByTaskName(page, baseName)
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      continue;
    }
    await seedRuleTaskScenario(page, baseName);
    await gotoRuleTaskList(page);
  }
}

/**
 * 确保指定任务已执行完成：先确保任务存在，再对无终态实例的任务补一次执行并等待终态。
 * 结束后停留在校验结果查询页面。
 */
export async function ensureExecutedRuleTasks(
  page: Page,
  taskNames: readonly string[],
): Promise<void> {
  await ensureRuleTasks(page, taskNames);
  for (const baseName of taskNames) {
    if (await hasFinishedInstance(page, baseName)) continue;
    await executeTaskFromList(page, baseName);
    await waitForTaskInstanceFinished(page, baseName);
  }
  if (!isOnPage(page, "/dq/taskQuery")) {
    await gotoResultQuery(page);
  }
}

/**
 * 确保数据质量报告可用：先确保任务执行完成，再进入【数据质量 → 数据质量报告】页面。
 */
export async function ensureQualityReportsReady(
  page: Page,
  taskNames: readonly string[],
): Promise<void> {
  await ensureExecutedRuleTasks(page, taskNames);
  await gotoQualityReport(page);
}

/**
 * 打开指定任务的质量报告详情（.qualityInspection 区域可见即视为打开）。
 * 实现按调用点契约重建，未经 live 验证：报告行入口兼容【报告详情/查看详情/质量报告】。
 */
export async function openQualityReportDetail(page: Page, taskName: string): Promise<void> {
  if (!isOnPage(page, "/dq/qualityReport")) {
    await gotoQualityReport(page);
  }
  await searchListByKeyword(page, taskName);
  const row = getTableRowByTaskName(page, taskName);
  await expect(row, `质量报告列表应展示任务「${taskName}」`).toBeVisible({ timeout: 15000 });
  const detailEntry = row
    .getByRole("button", { name: /报告详情|查看详情|质量报告|详\s*情/ })
    .or(row.getByText(/报告详情|查看详情|质量报告/))
    .first();
  await expect(detailEntry, `任务「${taskName}」报告行应展示详情入口`).toBeVisible({
    timeout: 15000,
  });
  await detailEntry.click({ timeout: 30000 });
  await waitForUiSettled(page);
  await expect(
    page.locator(".qualityInspection").first(),
    `任务「${taskName}」质量报告详情应打开`,
  ).toBeVisible({ timeout: 30000 });
}

/** 在质量报告详情中按规则名称定位规则行（同步返回 Locator，作用域限 .qualityInspection）。 */
export function getQualityReportRuleRow(page: Page, ruleName: string): Locator {
  return page
    .locator(".qualityInspection")
    .first()
    .locator(".ant-table-tbody tr:visible, [class*='rule']")
    .filter({ hasText: ruleName })
    .first();
}

/** 在质量报告规则行点击【查看详情】打开明细数据抽屉，返回明细抽屉 Locator。 */
export async function openQualityReportRuleDetail(page: Page, ruleRow: Locator): Promise<Locator> {
  const entry = ruleRow.getByRole("button", { name: "查看详情" }).first();
  await expect(entry, "规则报告行应展示「查看详情」入口").toBeVisible({ timeout: 15000 });
  await entry.click({ timeout: 30000 });
  const dataDrawer = page.locator(".ant-drawer:visible").last();
  await expect(dataDrawer, "规则明细数据抽屉应打开展示明细内容").toContainText("明细", {
    timeout: 15000,
  });
  return dataDrawer;
}

/** 补建缺失任务：重建规则集与规则，再经新建监控规则向导创建任务。 */
async function seedRuleTaskScenario(page: Page, baseName: string): Promise<void> {
  const scenario = RULE_TASK_SCENARIOS[baseName];
  expect(scenario, `未登记的规则任务「${baseName}」无法自动补建（缺少场景配置）`).toBeTruthy();
  const sc = scenario as RuleTaskScenario;

  // 一表一规则集：重建前释放表上既有规则集占用（历史任务实例保留在结果查询中）
  await deleteRuleSetsByTableNames(page, [sc.table]);
  await createRuleSetDraft(page, sc.table, [sc.packageName], sc.ruleSet);
  const ruleForm = await addRuleToPackage(page, sc.packageName);
  if (sc.rangeEnumRule) {
    await configureRangeEnumRule(page, ruleForm, sc.rangeEnumRule);
  } else if (sc.standaloneEnumRule) {
    await configureStandaloneEnumRule(page, ruleForm, sc.standaloneEnumRule);
  }
  await saveRuleSet(page);

  await createRuleTaskViaWizard(page, resolveTaskVariantName(baseName), sc);
}

/** 配置独立「枚举值」统计函数规则（操作符 in/not in + 枚举值列表 + 强规则）。 */
async function configureStandaloneEnumRule(
  page: Page,
  ruleForm: Locator,
  rule: StandaloneEnumRule,
): Promise<void> {
  const functionRow = await selectRuleFieldAndFunction(page, ruleForm, rule.field, "枚举值");
  await selectAntOption(page, functionRow.locator(".ant-select").nth(1), rule.operator);
  const enumInput = functionRow.locator(".ant-select").nth(2).locator("input").last();
  for (const value of rule.values) {
    await enumInput.fill(value);
    await page.keyboard.press("Enter");
    await waitForUiSettled(page);
  }
  const strengthField = ruleForm
    .locator(".ant-form-item:visible")
    .filter({ hasText: /强弱规则/ })
    .last();
  if (await strengthField.isVisible({ timeout: 3000 }).catch(() => false)) {
    if (!(await strengthField.textContent({ timeout: 30000 }))?.includes("强规则")) {
      await selectAntOption(page, strengthField.locator(".ant-select").first(), "强规则");
    }
  }
}

/** 在任务向导表单中按标签选择下拉项。 */
async function selectTaskFormOption(
  page: Page,
  label: RegExp,
  option: string | RegExp,
): Promise<void> {
  const formItem = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await expect(formItem, `任务向导应展示表单项 ${label}`).toBeVisible({ timeout: 30000 });
  if (
    typeof option === "string" &&
    (await formItem.textContent({ timeout: 30000 }))?.includes(option)
  ) {
    return;
  }
  await selectAntOption(page, formItem.locator(".ant-select:visible").first(), option);
}

/**
 * 经【新建监控规则】向导创建任务：Step1 监控对象 → Step2 引用规则包 → Step3 调度属性（手动触发）。
 * 抽样比例与指定分区为场景扩展配置，按调用点契约重建，未经 live 验证。
 */
async function createRuleTaskViaWizard(
  page: Page,
  taskName: string,
  scenario: RuleTaskScenario,
): Promise<void> {
  await gotoRuleTaskList(page);
  await page.getByText("新建监控规则", { exact: true }).first().click({ timeout: 30000 });
  await expect(page, "新建监控规则应进入 /dq/rule/add").toHaveURL(/\/dq\/rule\/add/, {
    timeout: 15000,
  });
  const body = page.locator("body");
  await expect(body, "新建监控规则页应展示「监控对象」").toContainText(/监控对象|规则名称/, {
    timeout: 30000,
  });

  const nameControl = page
    .locator(".ant-form-item:visible")
    .filter({ hasText: /规则名称|任务名称/ })
    .first()
    .locator("textarea, input")
    .first();
  await nameControl.fill(taskName, { timeout: 30000 });
  await expect(nameControl, "规则名称应填入目标值").toHaveValue(taskName, { timeout: 10000 });

  const env = getEnvConfig();
  const datasourceProfile = env.datasources[env.runtime.defaultDatasource];
  const aliases = (datasourceProfile?.aliases ?? []).map((alias) =>
    alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  await selectTaskFormOption(
    page,
    /数据源/,
    new RegExp(aliases.length > 0 ? aliases.join("|") : ".*", "i"),
  );
  await selectTaskFormOption(
    page,
    /数据库/,
    new RegExp(
      (datasourceProfile?.sql.database ?? "pw_test").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    ),
  );
  await selectTaskFormOption(page, /数据表/, scenario.table);

  await page
    .getByRole("button", { name: /^下\s*一\s*步$/ })
    .last()
    .click({ timeout: 30000 });
  await expect(body, "监控对象保存后应进入监控规则配置页").toContainText(
    /引用规则包|导入规则包|规则包/,
    { timeout: 30000 },
  );

  await page
    .getByText(/引用规则包|导入规则包/)
    .first()
    .click({ timeout: 30000 });
  const picker = page.locator(".ant-modal:visible, [role='dialog']:visible").last();
  await expect(picker, "引用规则包选择弹窗应打开").toBeVisible({ timeout: 15000 });
  const packageOption = picker.getByText(scenario.packageName, { exact: true }).first();
  await expect(packageOption, `规则包选择弹窗应包含「${scenario.packageName}」`).toBeVisible({
    timeout: 15000,
  });
  await packageOption.click({ timeout: 30000 });
  await picker
    .getByRole("button", { name: /确\s*定|引\s*用|保\s*存/ })
    .last()
    .click({ timeout: 30000 });
  await waitForUiSettled(page);

  await page
    .getByRole("button", { name: /^下\s*一\s*步$/ })
    .last()
    .click({ timeout: 30000 });
  await expect(body, "规则配置完成后应进入调度属性页面").toContainText(/调度属性|调度配置/, {
    timeout: 30000,
  });
  await selectTaskFormOption(page, /调度周期/, "手动触发");
  await selectTaskFormOption(page, /实例生成方式/, "立即生成");
  await selectTaskFormOption(page, /超时时间/, "不限制");

  if (scenario.samplingPercent !== undefined) {
    const samplingControl = page
      .locator(".ant-form-item:visible")
      .filter({ hasText: /抽样比例|抽样/ })
      .first()
      .locator("input")
      .first();
    await expect(samplingControl, "抽样任务应展示抽样比例输入框").toBeVisible({ timeout: 15000 });
    await samplingControl.fill(String(scenario.samplingPercent), { timeout: 30000 });
  }
  if (scenario.partition) {
    await selectTaskFormOption(page, /指定分区|分区/, scenario.partition);
  }

  await page
    .getByRole("button", { name: /^保\s*存$/ })
    .last()
    .click({ timeout: 30000 });
  await expectAntMessage(page, /成功/, 20000);
  await waitForUiSettled(page);
}
