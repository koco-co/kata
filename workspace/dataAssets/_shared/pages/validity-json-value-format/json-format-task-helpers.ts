// json-format-task-helpers.ts — 「有效性-json value格式校验」任务与结果查询辅助
//
// 面向校验结果查询（/dq/taskQuery）与数据质量报告（/dq/qualityReport）的高层流程：
// - ensureJsonFormatTask / ensureExecutedJsonTask：幂等确保场景规则集 + 规则任务存在并已执行到终态
// - waitForVisibleTaskRow / openTaskInstanceDetail / getTaskDetailRuleCard / openTaskRuleDetailDataDrawer：
//   校验结果查询的实例行、实例详情与明细数据浮层
// - openPreparedQualityReport / getQualityReportRuleRow / openQualityReportRuleDetail：质量报告规则行与明细
// 场景常量取自 validity-json-value-format feature 的 fixtures。

import { expect, type Locator, type Page } from "@playwright/test";

import {
  getCurrentDatasource,
  P0_PASS_SCENARIO,
  type JsonRuleScenario,
  runSuitePreconditions,
} from "../../../features/v6.4.10/【v6410】【岚图汽车】【数据质量】有效性JSONValue格式校验/automation/tests/fixtures/test-data";
import { waitForUiSettled } from "../../helpers/index";
import {
  chooseFormOptionByText,
  clickCompactButton,
  gotoDqPage,
  postDqApi,
  qualityProjectId,
  selectFormOptionByPattern,
  selectFormOptionBySearch,
} from "./rule-editor-base";
import { createRuleSetDraft, saveRuleSet } from "./json-format-utils";
import {
  addJsonFormatRule,
  currentMonitorDatasource,
  ensureJsonValidationKeysSeeded,
} from "./json-format-suite-helpers";

// ── 场景规则集/规则任务的幂等准备 ────────────────────────────

type RuleSetPageData = {
  contentList?: Array<{ id?: string | number; tableName?: string }>;
  data?: Array<{ id?: string | number; tableName?: string }>;
};

type RuleTaskPageData = {
  data?: Array<{ id?: string | number; ruleName?: string }>;
  rows?: Array<{ id?: string | number; ruleName?: string }>;
};

/** 按表名查询规则集 id（不存在时返回 undefined）。 */
async function findRuleSetIdByTableName(
  page: Page,
  tableName: string,
): Promise<string | number | undefined> {
  const data = await postDqApi<RuleSetPageData>(page, "/dassets/v1/valid/monitorRuleSet/pageQuery", {
    current: 1,
    size: 100,
  });
  const records = data?.contentList ?? data?.data ?? [];
  return records.find((record) => record.tableName === tableName)?.id ?? undefined;
}

/** 按任务名称查询规则任务 id（不存在时返回 undefined）。 */
async function findRuleTaskIdByName(
  page: Page,
  taskName: string,
): Promise<string | number | undefined> {
  const data = await postDqApi<RuleTaskPageData>(page, "/dassets/v1/valid/monitor/pageQuery", {
    currentPage: 1,
    pageSize: 100,
    projectId: qualityProjectId(),
  });
  const records = data?.data ?? data?.rows ?? [];
  return records.find((record) => record.ruleName === taskName)?.id ?? undefined;
}

/** 确保场景规则集存在：缺失时创建草稿、配置 json 格式校验规则并保存。 */
async function ensureScenarioRuleSet(page: Page, scenario: JsonRuleScenario): Promise<void> {
  if ((await findRuleSetIdByTableName(page, scenario.tableName)) !== undefined) return;
  await createRuleSetDraft(page, scenario.tableName, [scenario.packageName], currentMonitorDatasource());
  await addJsonFormatRule(page, scenario.packageName, {
    field: scenario.field,
    selectedKeyPaths: scenario.selectedKeyPaths,
    ruleStrength: scenario.ruleStrength ?? "强规则",
  });
  await saveRuleSet(page);
}

/** 填写新建监控规则的规则名称。 */
async function fillRuleTaskName(page: Page, ruleName: string): Promise<void> {
  const field = page.locator(".ant-form-item:visible").filter({ hasText: /规则名称/ }).first();
  const input = field.locator("input:visible").first();
  await expect(input, "应展示规则名称输入框").toBeVisible({ timeout: 30000 });
  await input.fill(ruleName, { timeout: 30000 });
  await expect(input, "规则名称应回显").toHaveValue(ruleName, { timeout: 30000 });
}

/** 在监控规则配置页引用指定规则包。 */
async function referenceRulePackage(page: Page, packageName: string): Promise<void> {
  const entry = page.getByText("引用规则包", { exact: true }).first();
  await expect(entry, "应展示「引用规则包」入口").toBeVisible({ timeout: 30000 });
  await entry.click({ timeout: 30000 });
  const dialog = page.locator(".ant-modal:visible, [role='dialog']:visible").last();
  await expect(dialog, "引用规则包选择弹窗应打开").toBeVisible({ timeout: 30000 });
  const option = dialog
    .locator(".ant-checkbox-wrapper, .ant-select-item-option, li, tr")
    .filter({ hasText: packageName })
    .first()
    .or(dialog.getByText(packageName, { exact: true }).first());
  await expect(option, `引用规则包弹窗应包含「${packageName}」`).toBeVisible({ timeout: 30000 });
  await option.click({ timeout: 30000 });
  await dialog
    .getByRole("button", { name: /确\s*定|引\s*用|保\s*存/ })
    .last()
    .click({ timeout: 30000 });
  await expect(page.locator("body"), `引入后应展示规则包「${packageName}」`).toContainText(
    packageName,
    { timeout: 30000 },
  );
}

/**
 * 确保场景规则任务存在：缺失时走「新建监控规则 → 引用规则包 → 手动触发/立即生成」流程创建。
 * 实现按调用点契约重建，未经 live 验证。
 */
async function ensureScenarioRuleTask(page: Page, scenario: JsonRuleScenario): Promise<void> {
  if ((await findRuleTaskIdByName(page, scenario.taskName)) !== undefined) return;
  const config = currentMonitorDatasource();

  await gotoDqPage(page, "/dq/rule/add");
  await expect(page, "新建监控规则应进入 /dq/rule/add").toHaveURL(/\/dq\/rule\/add/, {
    timeout: 30000,
  });
  const body = page.locator("body");
  await expect(body, "新建监控规则页应展示监控对象配置").toContainText(/监控对象|规则名称/, {
    timeout: 30000,
  });
  await fillRuleTaskName(page, scenario.taskName);
  await selectFormOptionByPattern(page, /数据源/, config.optionPattern);
  if (config.database) {
    await selectFormOptionBySearch(page, /数据库/, config.database);
  }
  await selectFormOptionBySearch(page, /数据表/, scenario.tableName);

  await clickCompactButton(page, "下一步");
  await expect(body, "监控对象保存后应进入监控规则配置页").toContainText(/监控规则|引用规则包/, {
    timeout: 30000,
  });
  await referenceRulePackage(page, scenario.packageName);

  await clickCompactButton(page, "下一步");
  await expect(body, "规则配置完成后应进入调度属性页面").toContainText(/调度属性|调度配置/, {
    timeout: 30000,
  });
  await chooseFormOptionByText(page, /调度周期/, "手动触发");
  await chooseFormOptionByText(page, /实例生成方式/, "立即生成");
  await chooseFormOptionByText(page, /超时时间/, "不限制");

  await clickCompactButton(page, "保存");
  await expect(body, "保存后应提示成功或返回规则任务管理").toContainText(/成功|规则任务管理/, {
    timeout: 30000,
  });
}

const ensuredTasks = new Set<string>();

/**
 * 幂等确保场景的校验key、规则集与规则任务均已就绪（按数据源 + 任务名缓存）。
 */
export async function ensureJsonFormatTask(page: Page, scenario: JsonRuleScenario): Promise<void> {
  const datasource = getCurrentDatasource();
  const cacheKey = `json-format-task:${datasource.cacheKey}:${scenario.taskName}`;
  if (ensuredTasks.has(cacheKey)) return;
  await runSuitePreconditions(page, datasource);
  await ensureJsonValidationKeysSeeded(page, scenario.keyPresets);
  await ensureScenarioRuleSet(page, scenario);
  await ensureScenarioRuleTask(page, scenario);
  ensuredTasks.add(cacheKey);
}

// ── 任务执行与实例终态等待 ───────────────────────────────────

type MonitorRecordItem = {
  id?: string | number;
  ruleName?: string;
  status?: number | string;
};

type MonitorRecordPageData = {
  data?: MonitorRecordItem[];
  totalCount?: number;
};

/** 校验实例终态：3=校验通过，4=校验失败，11=校验异常（与 formatMonitorRecordStatus 对齐）。 */
const TERMINAL_INSTANCE_STATUSES = new Set([3, 4, 11]);

/** 查询任务最新实例状态（无实例时返回 undefined）。 */
async function fetchLatestInstanceStatus(page: Page, taskName: string): Promise<number | undefined> {
  const data = await postDqApi<MonitorRecordPageData>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    {
      currentPage: 1,
      pageSize: 20,
      projectId: qualityProjectId(),
      bizTime: 0,
      fuzzyName: taskName,
    },
  );
  const record = (data?.data ?? []).find((item) => item.ruleName === taskName);
  return record?.status === undefined ? undefined : Number(record.status);
}

/** 任务最新实例是否已达到终态。 */
async function hasTerminalInstance(page: Page, taskName: string): Promise<boolean> {
  const status = await fetchLatestInstanceStatus(page, taskName);
  return status !== undefined && TERMINAL_INSTANCE_STATUSES.has(status);
}

/** 轮询等待任务最新实例达到终态。 */
async function waitForTerminalInstance(page: Page, taskName: string): Promise<void> {
  const timeoutMs = Number(process.env.KATA_DQ_MONITOR_TIMEOUT_MS ?? 2_700_000);
  await expect
    .poll(async () => hasTerminalInstance(page, taskName), {
      message: `任务「${taskName}」的校验实例应达到终态（校验通过/校验失败/校验异常）`,
      timeout: timeoutMs,
      intervals: [5000, 10000, 15000, 20000, 30000],
    })
    .toBe(true);
}

/** 在规则任务管理页按表名搜索并定位任务行。 */
async function findVisibleRuleTaskRow(page: Page, scenario: JsonRuleScenario): Promise<Locator> {
  await gotoDqPage(page, "/dq/rule");
  const searchInput = page
    .getByPlaceholder(/输入表名搜索|请输入表名|表名/)
    .or(page.locator("input[placeholder*='表名']"))
    .first();
  if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await searchInput.fill(scenario.tableName, { timeout: 30000 });
    const searchButton = page.getByRole("button", { name: /查\s*询|search/i }).first();
    if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchButton.click({ timeout: 30000 });
    } else {
      await page.keyboard.press("Enter");
    }
    await waitForUiSettled(page);
  }
  const row = page
    .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
    .filter({ hasText: scenario.tableName })
    .filter({ hasText: scenario.taskName })
    .first();
  await expect(row, `规则任务管理应展示任务「${scenario.taskName}」`).toBeVisible({ timeout: 30000 });
  return row;
}

/** 在任务行上点击「立即执行」并处理确认弹层。 */
async function runRuleTaskImmediately(page: Page, taskRow: Locator): Promise<void> {
  const execute = taskRow
    .getByRole("button", { name: /立即执行/ })
    .or(taskRow.getByText("立即执行"))
    .first();
  await expect(execute, "任务行应展示「立即执行」").toBeVisible({ timeout: 30000 });
  await execute.click({ timeout: 30000 });
  const confirm = page
    .locator(".ant-popover:visible, .ant-modal-confirm:visible, .ant-modal:visible")
    .last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    const confirmButton = confirm
      .getByRole("button", { name: /确\s*定|确\s*认|OK|是/ })
      .last();
    if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmButton.click({ timeout: 30000 });
    }
  }
  await expect(page.locator("body"), "点击立即执行后应提示提交或保持任务列表").toContainText(
    /成功|提交|执行|规则任务管理/,
    { timeout: 30000 },
  );
}

const executedTasks = new Set<string>();

/**
 * 幂等确保场景任务已执行且最新实例达到终态（按数据源 + 任务名缓存）。
 */
export async function ensureExecutedJsonTask(page: Page, scenario: JsonRuleScenario): Promise<void> {
  const datasource = getCurrentDatasource();
  const cacheKey = `json-format-task-run:${datasource.cacheKey}:${scenario.taskName}`;
  await ensureJsonFormatTask(page, scenario);
  if (executedTasks.has(cacheKey)) return;
  const taskRow = await findVisibleRuleTaskRow(page, scenario);
  await runRuleTaskImmediately(page, taskRow);
  await waitForTerminalInstance(page, scenario.taskName);
  executedTasks.add(cacheKey);
}

/**
 * 确保 value格式主流程基线就绪：P0 通过场景的规则集、任务与已执行实例。
 * 实现按调用点契约重建，未经 live 验证。
 */
export async function ensureValueFormatMainBaseline(page: Page): Promise<void> {
  await ensureExecutedJsonTask(page, P0_PASS_SCENARIO);
}

// ── 校验结果查询 ─────────────────────────────────────────────

/**
 * 打开校验结果查询页，按任务名搜索并返回可见实例行。
 */
export async function waitForVisibleTaskRow(page: Page, taskName: string): Promise<Locator> {
  await gotoDqPage(page, "/dq/taskQuery");
  const searchInput = page
    .getByPlaceholder("请输入表名/任务名称搜索")
    .or(page.locator("input[placeholder*='任务名称']"))
    .or(page.locator("input[placeholder*='表名']"))
    .first();
  if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await searchInput.fill(taskName, { timeout: 30000 });
    const searchButton = page.getByRole("button", { name: /查\s*询|search/i }).first();
    if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchButton.click({ timeout: 30000 });
    } else {
      await page.keyboard.press("Enter");
    }
    await waitForUiSettled(page);
  }
  const row = page
    .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
    .filter({ hasText: taskName })
    .first();
  await expect(row, `校验结果查询应展示任务「${taskName}」实例行`).toBeVisible({ timeout: 60000 });
  return row;
}

/**
 * 打开实例行的「查看详情」，返回详情容器（抽屉/弹窗；若为整页详情则返回 body）。
 * 实现按调用点契约重建，未经 live 验证。
 */
export async function openTaskInstanceDetail(page: Page, instanceRow: Locator): Promise<Locator> {
  const entry = instanceRow
    .getByRole("button", { name: /查看详情|详情/ })
    .or(instanceRow.getByText(/查看详情/))
    .first();
  await expect(entry, "实例行应展示「查看详情」入口").toBeVisible({ timeout: 30000 });
  await entry.click({ timeout: 30000 });
  await waitForUiSettled(page);
  const overlay = page.locator(".ant-drawer:visible, .ant-modal:visible").last();
  if (await overlay.isVisible({ timeout: 10000 }).catch(() => false)) {
    await expect(overlay, "实例详情应展示监控报告内容").toContainText(/监控报告|校验/, {
      timeout: 30000,
    });
    return overlay;
  }
  const body = page.locator("body");
  await expect(body, "实例详情页应展示监控报告内容").toContainText(/监控报告|校验/, {
    timeout: 30000,
  });
  return body;
}

/**
 * 在实例详情容器中定位指定统计函数的规则卡片（表格行/卡片/描述列表等形态）。
 */
export function getTaskDetailRuleCard(detailContainer: Locator, functionName: string): Locator {
  return detailContainer
    .locator(
      ".ant-table-tbody tr:not(.ant-table-measure-row), .ant-card, .ant-descriptions, [class*='ruleCard'], [class*='ruleItem'], .ant-list-item",
    )
    .filter({ hasText: functionName })
    .first();
}

/**
 * 在实例详情中点击「查看明细」，返回明细数据浮层（抽屉/弹窗）。
 */
export async function openTaskRuleDetailDataDrawer(
  page: Page,
  detailContainer: Locator,
): Promise<Locator> {
  const entry = detailContainer
    .getByRole("button", { name: /查看明细/ })
    .or(detailContainer.getByText("查看明细", { exact: true }))
    .first();
  await expect(entry, "实例详情应展示「查看明细」入口").toBeVisible({ timeout: 30000 });
  await entry.click({ timeout: 30000 });
  const drawer = page.locator(".ant-drawer:visible, .ant-modal:visible").last();
  await expect(drawer, "明细数据浮层应打开").toBeVisible({ timeout: 30000 });
  return drawer;
}

// ── 数据质量报告 ─────────────────────────────────────────────

/** 在已生成报告列表按关键字搜索并返回首行（未命中返回 undefined）。 */
async function searchGeneratedReportRow(page: Page, keyword: string): Promise<Locator | undefined> {
  const searchInput = page
    .getByPlaceholder(/报告名称|请输入/)
    .or(page.locator("input[placeholder*='报告']"))
    .first();
  if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await searchInput.fill(keyword, { timeout: 30000 });
    const searchButton = page.getByRole("button", { name: /查\s*询|search/i }).first();
    if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchButton.click({ timeout: 30000 });
    } else {
      await page.keyboard.press("Enter");
    }
    await waitForUiSettled(page);
  }
  const row = page
    .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
    .filter({ hasText: keyword })
    .first();
  if (await row.isVisible({ timeout: 10000 }).catch(() => false)) {
    return row;
  }
  return undefined;
}

/**
 * 确保场景任务已执行，并打开其质量报告的「已生成报告」详情（单表规则分区），返回详情容器。
 * 实现按调用点契约重建，未经 live 验证。
 */
export async function openPreparedQualityReport(
  page: Page,
  scenario: JsonRuleScenario,
): Promise<Locator> {
  await ensureExecutedJsonTask(page, scenario);
  await gotoDqPage(page, "/dq/qualityReport");
  const generatedTab = page.getByText("已生成报告", { exact: true }).first();
  if (await generatedTab.isVisible({ timeout: 10000 }).catch(() => false)) {
    await generatedTab.click({ timeout: 30000 });
    await waitForUiSettled(page);
  }

  const row =
    (await searchGeneratedReportRow(page, scenario.taskName)) ??
    (await searchGeneratedReportRow(page, scenario.tableName));
  if (!row) {
    throw new Error(
      `已生成报告列表不存在任务「${scenario.taskName}」或表「${scenario.tableName}」对应的报告`,
    );
  }
  const detailEntry = row
    .getByText("报告详情", { exact: true })
    .or(row.getByRole("button", { name: "报告详情" }))
    .or(row.getByRole("link", { name: "报告详情" }))
    .first();
  await expect(detailEntry, "目标报告应展示「报告详情」入口").toBeVisible({ timeout: 30000 });
  await detailEntry.click({ timeout: 30000 });
  await waitForUiSettled(page);

  // json 格式校验为单表字段级规则，激活「单表规则」分区以渲染规则行。
  const sectionEntry = page.getByText("单表规则", { exact: true }).first();
  if (await sectionEntry.isVisible({ timeout: 10000 }).catch(() => false)) {
    await sectionEntry.scrollIntoViewIfNeeded({ timeout: 30000 }).catch(() => undefined);
    await sectionEntry.click({ timeout: 30000 }).catch(() => undefined);
    await waitForUiSettled(page);
  }

  const overlay = page.locator(".ant-drawer:visible, .ant-modal:visible").last();
  if (await overlay.isVisible({ timeout: 3000 }).catch(() => false)) {
    return overlay;
  }
  return page.locator("body");
}

/**
 * 在质量报告详情中定位指定统计函数的规则行。
 */
export function getQualityReportRuleRow(page: Page, functionName: string): Locator {
  return page
    .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
    .filter({ hasText: functionName })
    .first();
}

/**
 * 点击质量报告规则行的「查看详情」，返回明细浮层（抽屉/弹窗）。
 */
export async function openQualityReportRuleDetail(page: Page, ruleRow: Locator): Promise<Locator> {
  const entry = ruleRow.locator("button, a").filter({ hasText: "查看详情" }).first();
  await expect(entry, "报告规则行应展示「查看详情」入口").toBeVisible({ timeout: 30000 });
  await entry.click({ timeout: 30000 });
  const drawer = page.locator(".ant-drawer:visible, .ant-modal:visible").last();
  await expect(drawer, "报告规则明细浮层应打开").toBeVisible({ timeout: 30000 });
  return drawer;
}
