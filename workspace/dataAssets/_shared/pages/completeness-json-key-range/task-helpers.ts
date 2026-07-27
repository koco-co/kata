/**
 * task-helpers.ts — 「完整性 JSON Key 范围校验」规则任务/校验结果/质量报告页对象
 *
 * 覆盖【数据质量 → 规则任务管理】（/dq/rule）、【校验结果查询】（/dq/taskQuery）、
 * 【数据质量报告】（/dq/qualityReport）三个页面的任务生命周期：
 *   任务创建（导入规则包）→ 立即执行 → 实例轮询 → 实例详情/失败明细/日志 → 质量报告。
 *
 * 说明：本文件按调用点契约重建（目录曾整体缺失），任务创建流程参考调用点 t16 的
 * 内联实现提炼；部分交互细节未经 live 验证，已在各函数注释中标注。
 */
import { expect, type Locator, type Page } from "@playwright/test";
import {
  applyRuntimeCookies,
  buildDataAssetsUrl,
  expectAntMessage,
  selectAntOption,
  uniqueName,
  waitForUiSettled,
} from "../../helpers/index";
import {
  getCurrentDatasource,
  injectProjectContext,
  resolveEffectiveQualityProjectId,
} from "../../../features/v6.4.10/【v6410】【岚图汽车】【数据质量】完整性JSONKey范围校验/automation/tests/fixtures/test-data";
import {
  DORIS_MONITOR_DATASOURCE,
  type MonitorDatasourceConfig,
  selectWithSearchRetry,
  SPARKTHRIFT_MONITOR_DATASOURCE,
} from "./key-range-utils";
import {
  ensureSavedScenarioRuleSet,
  type KeyRangeScenario,
  SCENARIOS,
} from "./suite-helpers";

/** 主场景监控任务名（对应 MD「task_json_key_range_test」，uniqueName 唯一化防跨 run 冲突） */
export const MAIN_TASK_NAME = uniqueName("task_json_key_range");
/** 校验方法切换场景监控任务名（对应 MD「task_json_method_switch」） */
export const METHOD_SWITCH_TASK_NAME = uniqueName("task_json_method_switch");
/** 失败日志场景监控任务名（引用已删除 key，执行预期失败） */
export const FAIL_LOG_TASK_NAME = uniqueName("task_json_key_range_flog");

/** 任务名 → 场景映射：ensureRuleTasks 据此为未知任务名兜底到主场景 */
const TASK_SCENARIO: ReadonlyMap<string, KeyRangeScenario> = new Map([
  [MAIN_TASK_NAME, SCENARIOS.main],
  [METHOD_SWITCH_TASK_NAME, SCENARIOS.methodSwitch],
  [FAIL_LOG_TASK_NAME, SCENARIOS.failLog],
]);

/** 按当前 fixtures 数据源上下文选择监控数据源配置 */
function monitorDatasource(): MonitorDatasourceConfig {
  return getCurrentDatasource().id === "doris3.x"
    ? DORIS_MONITOR_DATASOURCE
    : SPARKTHRIFT_MONITOR_DATASOURCE;
}

/** 导航到数据质量子页面（注入项目上下文 + 运行态 Cookie） */
async function gotoDqPath(page: Page, path: string): Promise<void> {
  await applyRuntimeCookies(page);
  const projectId = await resolveEffectiveQualityProjectId(page);
  await page.goto(buildDataAssetsUrl(path, projectId), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await injectProjectContext(page, projectId);
  await waitForUiSettled(page);
}

/** 打开【数据质量 → 规则任务管理】列表页 */
export async function gotoRuleTaskList(page: Page): Promise<void> {
  await gotoDqPath(page, "/dq/rule");
}

/** 打开【数据质量 → 校验结果查询】列表页 */
export async function gotoValidationResults(page: Page): Promise<void> {
  await gotoDqPath(page, "/dq/taskQuery");
}

/** 打开【数据质量 → 数据质量报告】列表页 */
export async function gotoQualityReport(page: Page): Promise<void> {
  await gotoDqPath(page, "/dq/qualityReport");
}

/** 按任务名定位列表行（不过滤可见性，由调用方断言） */
export function getTableRowByTaskName(page: Page, taskName: string): Locator {
  return page
    .locator(".ant-table-tbody tr:not(.ant-table-measure-row)")
    .filter({ hasText: taskName })
    .first();
}

/** 在列表页搜索框中按关键字过滤（无搜索框时静默跳过） */
async function searchTaskInList(page: Page, keyword: string): Promise<void> {
  const searchInput = page.locator(".ant-input-search input, input[placeholder]").first();
  if (await searchInput.isEditable({ timeout: 3000 }).catch(() => false)) {
    await searchInput.fill(keyword);
    await searchInput.press("Enter");
    await waitForUiSettled(page);
  }
}

/**
 * 在规则任务列表中执行指定任务：优先点击行内【立即执行】；
 * 行内无入口时按 MD 步骤点击任务行表名展开抽屉，再点击抽屉内【立即执行】。
 * 最后断言「操作成功」提示。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function executeTaskFromList(page: Page, taskName: string): Promise<void> {
  await gotoRuleTaskList(page);
  await searchTaskInList(page, taskName);
  const row = getTableRowByTaskName(page, taskName);
  await expect(row, `规则任务列表应存在「${taskName}」`).toBeVisible({ timeout: 15000 });
  const inlineTrigger = row
    .getByRole("button", { name: /立即执行/ })
    .first()
    .or(row.getByRole("link", { name: /立即执行/ }).first());
  if (await inlineTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
    await inlineTrigger.click();
  } else {
    // MD 步骤：点击任务行的表名展开抽屉，点击【立即执行】
    await row.locator("td").first().click();
    const drawer = page.locator(".ant-drawer:visible, .dtc-drawer:visible").last();
    await expect(drawer, "任务行抽屉应展开").toBeVisible({ timeout: 10000 });
    await drawer
      .getByRole("button", { name: /立即执行/ })
      .first()
      .click();
  }
  await expectAntMessage(page, /操作成功|执行成功|成功/, 15000);
}

/**
 * 通过 UI 完整流程创建监控任务（Step1 基础信息 → Step2 导入规则包 → Step3 调度属性 → 保存）。
 * 流程提炼自调用点 t16 的内联实现；Step3 各可选字段均带可见性守卫。
 * （实现按调用点契约重建，未经 live 验证）
 */
async function createRuleTask(
  page: Page,
  scenario: KeyRangeScenario,
  taskName: string,
): Promise<void> {
  const datasource = monitorDatasource();
  const projectId = await resolveEffectiveQualityProjectId(page);
  await applyRuntimeCookies(page);
  await page.goto(buildDataAssetsUrl("/dq/rule/add", projectId), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await injectProjectContext(page, projectId);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForUiSettled(page);

  const formItemSelect = (label: RegExp): Locator =>
    page
      .locator(".ant-form-item")
      .filter({ hasText: label })
      .first()
      .locator(".ant-select")
      .first();

  // Step 1 基础信息
  const nameItem = page
    .locator(".ant-form-item")
    .filter({ hasText: /^规则名称/ })
    .first();
  await expect(nameItem, "新建监控规则 Step1 应展示「规则名称」表单项").toBeVisible({
    timeout: 15000,
  });
  await nameItem.locator("input").first().fill(taskName);
  await selectWithSearchRetry(page, formItemSelect(/选择数据源/), datasource.keyword.source);
  await selectWithSearchRetry(page, formItemSelect(/选择数据库/), datasource.database);
  await selectWithSearchRetry(page, formItemSelect(/选择数据表/), scenario.tableName);
  await page.getByRole("button", { name: "下一步" }).first().click();
  await waitForUiSettled(page);

  // Step 2 监控规则：导入规则包（规则包 + 规则类型 → 引入）
  await selectAntOption(page, formItemSelect(/规则包/), scenario.packageName);
  await waitForUiSettled(page);
  await selectAntOption(page, formItemSelect(/规则类型/), /完整性校验|完整性/);
  await waitForUiSettled(page);
  await page
    .getByRole("button", { name: /引入/ })
    .first()
    .click();
  await expect(page.locator(".ruleForm").first(), "导入规则包后应展示规则表单").toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: "下一步" }).last().click();
  await waitForUiSettled(page);

  // Step 3 调度属性（各字段按页面实际渲染可选处理）
  const resourceGroupSelect = formItemSelect(/资源组/);
  if (await resourceGroupSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    await selectAntOption(page, resourceGroupSelect, /default|Default/i);
    await waitForUiSettled(page);
  }
  const packageCountInput = page
    .locator(".ant-form-item")
    .filter({ hasText: /规则拼接包/ })
    .locator("input")
    .first();
  if (await packageCountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await packageCountInput.fill("1");
  }
  const immediateRadio = page
    .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
    .filter({ hasText: /立即生成/ })
    .first();
  if (await immediateRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
    await immediateRadio.click();
    await waitForUiSettled(page);
  }
  const reportInput = page
    .locator(".ant-form-item")
    .filter({ hasText: /报告名称/ })
    .locator("input")
    .first();
  if (await reportInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await reportInput.fill(`${taskName}_rpt`);
  }
  const dataCycleInputs = page
    .locator(".ant-form-item")
    .filter({ hasText: /数据日期|数据周期/ })
    .locator("input");
  if (
    await dataCycleInputs
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
  ) {
    await dataCycleInputs.first().fill("1");
    if ((await dataCycleInputs.count()) > 1) {
      await dataCycleInputs.last().fill("0");
    }
  }
  // 是否需要车辆信息 → 否（岚图定制字段）
  const vehicleNoRadio = page
    .locator(".ant-form-item")
    .filter({ hasText: /是否需要车辆信息/ })
    .locator(".ant-radio-wrapper, .ant-radio-button-wrapper")
    .filter({ hasText: /^否$/ })
    .first();
  if (await vehicleNoRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
    await vehicleNoRadio.click();
    await waitForUiSettled(page);
  }

  // 保存并校验后端响应
  const saveResponsePromise = page
    .waitForResponse(
      (response) =>
        response.url().includes("/dassets/v1/valid/monitor/add") ||
        response.url().includes("/dassets/v1/valid/monitor/edit"),
    )
    .catch(() => null);
  await page
    .getByRole("button", { name: /新建|保存/ })
    .last()
    .click();
  await waitForUiSettled(page);
  const confirmModal = page.locator(".ant-modal-confirm:visible, .ant-modal:visible").last();
  if (await confirmModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmModal
      .getByRole("button", { name: /确认|确定/ })
      .first()
      .click();
  }
  const saveResponse = await saveResponsePromise;
  if (!saveResponse) {
    const formErrors = await page
      .locator(".ant-form-item-explain-error:visible")
      .allTextContents()
      .catch(() => [] as string[]);
    throw new Error(`监控任务保存请求未触发，表单错误：${formErrors.join(" | ") || "无"}`);
  }
  const saveResult = (await saveResponse.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
  } | null;
  if (!saveResult?.success) {
    throw new Error(`监控任务保存失败：${saveResult?.message ?? "未知错误"}`);
  }
  await gotoRuleTaskList(page);
  await searchTaskInList(page, taskName);
  await expect(getTableRowByTaskName(page, taskName), `任务「${taskName}」创建后应在列表可见`).toBeVisible(
    { timeout: 15000 },
  );
}

/**
 * 幂等确保指定监控任务存在：列表检索命中则跳过；
 * 未命中时先确保对应场景规则集已保存，再通过 UI 完整流程创建任务。
 */
export async function ensureRuleTasks(page: Page, taskNames: readonly string[]): Promise<void> {
  for (const taskName of taskNames) {
    await gotoRuleTaskList(page);
    await searchTaskInList(page, taskName);
    if (
      await getTableRowByTaskName(page, taskName)
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      continue;
    }
    const scenario = TASK_SCENARIO.get(taskName) ?? SCENARIOS.main;
    await ensureSavedScenarioRuleSet(page, scenario);
    await createRuleTask(page, scenario, taskName);
  }
}

/**
 * 在校验结果查询页轮询等待指定任务的最新实例进入终态
 * （校验通过/不通过/异常/失败，且不再运行中），返回该实例行 Locator。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function waitForTaskInstanceFinished(
  page: Page,
  taskName: string,
  timeoutMs: number,
): Promise<Locator> {
  await gotoValidationResults(page);
  await expect(async () => {
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
    await waitForUiSettled(page);
    await searchTaskInList(page, taskName);
    const row = getTableRowByTaskName(page, taskName);
    const rowText = await row.innerText({ timeout: 5000 });
    if (/运行中|执行中|排队|等待执行/.test(rowText)) {
      throw new Error(`任务「${taskName}」实例仍在运行中`);
    }
    if (!/校验通过|校验不通过|校验未通过|校验异常|执行失败|任务失败|失败|异常/.test(rowText)) {
      throw new Error(`任务「${taskName}」实例未进入终态：${rowText.slice(0, 200)}`);
    }
  }).toPass({ timeout: timeoutMs, intervals: [10_000, 20_000, 30_000] });
  const instanceRow = getTableRowByTaskName(page, taskName);
  await expect(instanceRow, `校验结果查询应展示任务「${taskName}」的实例行`).toBeVisible({
    timeout: 10000,
  });
  return instanceRow;
}

/**
 * 打开实例行的详情抽屉：点击行内【查看详情】按钮（无独立按钮时点击操作列最后一个按钮）。
 * 返回可见的详情抽屉 Locator。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function openTaskInstanceDetail(page: Page, instanceRow: Locator): Promise<Locator> {
  const detailButton = instanceRow
    .getByRole("button", { name: /查看详情|详情/ })
    .first()
    .or(instanceRow.locator("td").last().getByRole("button").first());
  await detailButton.click();
  const drawer = page.locator(".ant-drawer:visible, .dtc-drawer:visible").last();
  await expect(drawer, "实例详情抽屉应打开").toBeVisible({ timeout: 10000 });
  await waitForUiSettled(page);
  return drawer;
}

/** 在实例详情抽屉中按规则名定位规则卡片（无卡片结构时退化为文本定位） */
export function getTaskDetailRuleCard(detailDrawer: Locator, ruleName: string): Locator {
  return detailDrawer
    .locator(".ruleCard, .rule-item, .ant-card, .ant-collapse-item, tr")
    .filter({ hasText: ruleName })
    .first()
    .or(detailDrawer.getByText(ruleName).first());
}

/**
 * 在实例详情抽屉中点击【查看明细】，返回失败明细数据抽屉 Locator。
 */
export async function openTaskRuleDetailDataDrawer(
  page: Page,
  detailDrawer: Locator,
): Promise<Locator> {
  await detailDrawer
    .getByRole("button", { name: /查看明细|明细/ })
    .first()
    .click();
  const dataDrawer = page.locator(".ant-drawer:visible, .dtc-drawer:visible").last();
  await expect(dataDrawer, "失败明细抽屉应打开").toBeVisible({ timeout: 10000 });
  await waitForUiSettled(page);
  return dataDrawer;
}

/**
 * 打开失败实例的日志抽屉：先打开实例详情，再点击【查看日志】。
 * 返回日志抽屉/弹窗 Locator。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function openTaskLogDrawer(page: Page, instanceRow: Locator): Promise<Locator> {
  const detailDrawer = await openTaskInstanceDetail(page, instanceRow);
  await detailDrawer
    .getByRole("button", { name: /查看日志|日志/ })
    .first()
    .click();
  const logDrawer = page
    .locator(".ant-drawer:visible, .dtc-drawer:visible, .ant-modal:visible")
    .last();
  await expect(logDrawer, "日志抽屉应打开").toBeVisible({ timeout: 10000 });
  await waitForUiSettled(page);
  return logDrawer;
}

/**
 * 幂等确保指定任务已生成质量报告：报告列表命中则跳过；
 * 未命中时先执行任务并等待实例终态，再轮询报告列表（报告由实例异步生成）。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function ensureQualityReportsReady(
  page: Page,
  taskNames: readonly string[],
): Promise<void> {
  await ensureRuleTasks(page, taskNames);
  for (const taskName of taskNames) {
    await gotoQualityReport(page);
    await searchTaskInList(page, taskName);
    if (
      await getTableRowByTaskName(page, taskName)
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      continue;
    }
    await executeTaskFromList(page, taskName);
    await waitForTaskInstanceFinished(page, taskName, 480_000);
    await expect(async () => {
      await gotoQualityReport(page);
      await searchTaskInList(page, taskName);
      await expect(
        getTableRowByTaskName(page, taskName),
        `质量报告列表应生成任务「${taskName}」的报告行`,
      ).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 300_000, intervals: [15_000, 30_000, 60_000] });
  }
}

/**
 * 打开指定任务最新一次质量报告的详情：点击报告行【查看详情】。
 * 详情为抽屉/弹窗时返回该浮层；为独立页面时返回页面主体（并断言数据表已加载）。
 * （实现按调用点契约重建，未经 live 验证）
 */
export async function openQualityReportDetail(page: Page, taskName: string): Promise<Locator> {
  await gotoQualityReport(page);
  await searchTaskInList(page, taskName);
  const row = getTableRowByTaskName(page, taskName);
  await expect(row, `质量报告列表应存在任务「${taskName}」的报告行`).toBeVisible({
    timeout: 15000,
  });
  const detailButton = row
    .getByRole("button", { name: /查看详情|报告详情|详情/ })
    .first()
    .or(row.getByRole("link", { name: /查看详情|报告详情|详情/ }).first());
  await detailButton.click();
  await waitForUiSettled(page);
  const overlay = page.locator(".ant-drawer:visible, .ant-modal:visible").last();
  if (await overlay.isVisible({ timeout: 5000 }).catch(() => false)) {
    return overlay;
  }
  const main = page.locator("body");
  await expect(main.locator(".ant-table-tbody").first(), "报告详情页应加载规则数据表").toBeVisible(
    { timeout: 15000 },
  );
  return main;
}
