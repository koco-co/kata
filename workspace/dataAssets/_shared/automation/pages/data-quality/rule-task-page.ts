// 数据质量规则任务页面流程与交互能力。

import { waitForUiSettled } from "../../../../../../runtime/automation/playwright";
import { expect, type Page } from "@playwright/test";
import { getDqRuleTaskRecords, waitForRuleTaskPageQuery } from "./api";
import type {
  DqRuleTaskRecord,
  SparkThriftQualityRuleValidationScenario,
} from "./contracts";
import {
  clickDqCompactButton,
  clickDqText,
  closeVisibleDqOverlayIfAny,
  fillDqPageFormField,
  selectDqFormOptionBySearch,
} from "./form-controls";
import {
  getScenarioDatasource,
  gotoDataQualityPage,
  injectDataQualityProjectContext,
} from "./project-context";

export async function gotoNewRuleTaskMonitorObjectPageForTable(
  page: Page,
  sourceRef: string,
  ruleName: string,
  tableName: string,
  comparisonTableName?: string,
  datasourceKey?: "sparkthrift" | "doris",
): Promise<ReturnType<Page["locator"]>> {
  await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 30000 });
  await gotoDataQualityPage(page, "/dq/rule/add");
  await expect(page, `${sourceRef}: 新建监控规则应进入 /dq/rule/add`).toHaveURL(/\/dq\/rule\/add/);

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 新建监控规则页面应展示监控对象配置`).toContainText(
    /监控对象|规则名称/,
    {
      timeout: 30000,
    },
  );
  await fillDqPageFormField(page, /规则名称/, ruleName);
  const datasource = getScenarioDatasource({
    datasourceKey,
  } as SparkThriftQualityRuleValidationScenario);
  await selectDqFormOptionBySearch(page, /数据源/, datasource.sourceName, sourceRef);
  await selectDqFormOptionBySearch(page, /数据库/, datasource.database, sourceRef);
  await selectDqFormOptionBySearch(page, /数据表/, tableName, sourceRef);
  if (comparisonTableName) {
    await selectDqFormOptionBySearch(page, /对比表|比较表|关联表/, comparisonTableName, sourceRef);
  }
  return body;
}

export async function clickNextUntilScheduleConfig(page: Page, sourceRef: string): Promise<void> {
  const scheduleField = page.locator(".ant-form-item:visible, .ant-row:visible").filter({
    hasText: /调度周期|调度配置|生效日期|实例生成方式/,
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nextButton = page.getByRole("button", { name: /^下\s*一\s*步$/ }).last();
    await expect(nextButton, `${sourceRef}: 监控规则页应展示下一步入口`).toBeVisible({
      timeout: 30000,
    });
    await nextButton.click({ force: true, timeout: 30000 });
    await page.keyboard.press("Enter").catch(() => {});
    if (
      await scheduleField
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    )
      return;
  }
  await expect(scheduleField.first(), `${sourceRef}: 下一步后应进入调度属性配置表单`).toBeVisible({
    timeout: 30000,
  });
}

export async function clickNextUntilMonitorRuleConfig(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const body = page.locator("body");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await clickDqCompactButton(page, "下一步", sourceRef);
    const monitorRuleEntry = body.getByText(/^(引用规则包|添加规则|新增规则包)$/).first();
    if (await monitorRuleEntry.isVisible({ timeout: 10000 }).catch(() => false)) {
      return;
    }
    await waitForUiSettled(page);
  }
  await expect(body, `${sourceRef}: 监控对象保存成功后应进入监控规则配置页`).toContainText(
    /引用规则包|添加规则|新增规则包/,
    { timeout: 30000 },
  );
}

async function selectVisibleDqOption(
  scope: ReturnType<Page["locator"]>,
  optionText: string,
  sourceRef: string,
): Promise<void> {
  const optionRow = scope
    .locator(".ant-checkbox-wrapper, .ant-select-item, .ant-table-row, tr, label")
    .filter({ hasText: optionText })
    .first();
  if (await optionRow.isVisible({ timeout: 3000 }).catch(() => false)) {
    await optionRow.click({ timeout: 30000 });
    return;
  }
  const option = scope.getByText(optionText, { exact: false }).first();
  await expect(option, `${sourceRef}: 应可选择「${optionText}」`).toBeVisible({ timeout: 30000 });
  await option.click({ timeout: 30000 });
}

export async function selectRuleTaskRulePackageOnCurrentPage(
  page: Page,
  sourceRef: string,
  packageNames: readonly string[],
  ruleCategory?: string,
): Promise<void> {
  await expect(page.locator("body"), `${sourceRef}: 监控规则页应展示引用规则包入口`).toContainText(
    /引用规则包|规则包/,
    {
      timeout: 30000,
    },
  );
  if (
    !(await page
      .getByText("引用规则包", { exact: true })
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false))
  ) {
    await selectDqFormOptionBySearch(page, /规则包/, packageNames[0], sourceRef);
    if (ruleCategory) {
      await selectDqFormOptionBySearch(page, /规则类型/, ruleCategory, sourceRef);
    }
    const importButton = page.getByRole("button", { name: /引\s*入/ }).last();
    await expect(importButton, `${sourceRef}: 监控规则页应展示引入入口`).toBeVisible({
      timeout: 30000,
    });
    const importResponse = page
      .waitForResponse(
        (response) =>
          response.url().includes("/dassets/v1/valid/monitorRulePackage/getMonitorRule") &&
          response.request().method() === "POST",
        { timeout: 30000 },
      )
      .catch(() => null);
    await importButton.click({ force: true, timeout: 30000 });
    const response = await importResponse;
    if (response) {
      const payload = await response.json().catch(() => null);
      expect(
        payload?.success ?? payload?.code === 1,
        `${sourceRef}: 引入规则包接口应返回成功`,
      ).toBe(true);
    }
    await expect(
      page
        .locator(".ant-message-notice:visible")
        .filter({ hasText: /引入成功/ })
        .last(),
      `${sourceRef}: 引入规则包后应提示成功`,
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator("body"), `${sourceRef}: 引入规则包后应展示规则明细`).toContainText(
      /生效范围|统计函数|校验方法|强弱规则/,
      { timeout: 30000 },
    );
    for (const packageName of packageNames) {
      await expect(
        page.locator("body"),
        `${sourceRef}: 引入规则包后应展示「${packageName}」`,
      ).toContainText(packageName, { timeout: 30000 });
    }
    return;
  }
  await clickDqText(page, "引用规则包", sourceRef);
  const dialog = page.locator(".ant-modal:visible, [role='dialog']:visible").last();
  const picker = (await dialog.isVisible({ timeout: 3000 }).catch(() => false))
    ? dialog
    : page.locator("body");

  for (const packageName of packageNames) {
    await selectVisibleDqOption(picker, packageName, sourceRef);
  }
  const confirm = picker.getByRole("button", { name: /确\s*定|引\s*用|保\s*存/ }).last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirm.click({ timeout: 30000 });
  }

  for (const packageName of packageNames) {
    await expect(
      page.locator("body"),
      `${sourceRef}: 引用规则包后应展示「${packageName}」`,
    ).toContainText(packageName, { timeout: 30000 });
  }
}

export async function configureManualPartition(
  page: Page,
  sourceRef: string,
  expectedPartition: string,
): Promise<void> {
  const body = page.locator("body");
  const manualRadio = page.getByRole("radio", { name: "手动输入分区" }).first();
  if (!(await manualRadio.isChecked({ timeout: 3000 }).catch(() => false))) {
    await page.getByText("手动输入分区", { exact: true }).last().click({ timeout: 30000 });
  }
  await expect(manualRadio, `${sourceRef}: 分区方式应切换为手动输入分区`).toBeChecked({
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 分区配置应回显手动输入分区`).toContainText(
    /手动输入分区|手动输入/,
    {
      timeout: 30000,
    },
  );

  const partitionArea = page
    .locator(".ant-form-item:visible, .ant-row:visible, div:visible")
    .filter({
      hasText: /选择分区|手动输入分区/,
    })
    .last();
  const manualPartitionInput = page
    .getByRole("textbox", { name: /手动输入分区|分区字段|分区值/ })
    .first();
  if (await manualPartitionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await manualPartitionInput.fill(expectedPartition, { timeout: 30000 });
    await expect(manualPartitionInput, `${sourceRef}: 多级分区表达式应填入`).toHaveValue(
      expectedPartition,
      {
        timeout: 30000,
      },
    );
  } else {
    const fallbackInput = page
      .getByPlaceholder(/请输入.*分区|分区.*表达式|partition/i)
      .or(page.locator("textarea:visible").last())
      .or(partitionArea.locator("textarea:visible, input:not([type='radio']):visible").last())
      .last();
    await expect(fallbackInput, `${sourceRef}: 手动分区应展示可输入控件`).toBeVisible({
      timeout: 30000,
    });
    await fallbackInput.fill(expectedPartition, { timeout: 30000 });
    await expect(fallbackInput, `${sourceRef}: 多级分区表达式应填入`).toHaveValue(
      expectedPartition,
      {
        timeout: 30000,
      },
    );
  }
}

export async function gotoRuleTaskScheduleAttributesPage(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 编辑规则任务应打开配置流程`).toContainText(
    /监控对象|监控规则|调度属性|调度配置/,
    { timeout: 30000 },
  );
  const scheduleField = page.locator(".ant-form-item:visible, .ant-row:visible").filter({
    hasText: /调度周期|调度配置|生效日期|实例生成方式/,
  });

  if (
    await scheduleField
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
  )
    return;

  const scheduleStep = page
    .locator(".ant-steps-item, [class*='step']")
    .filter({ hasText: /调度属性|调度配置/ })
    .last();
  if (await scheduleStep.isVisible({ timeout: 3000 }).catch(() => false)) {
    await scheduleStep.click({ force: true, timeout: 30000 }).catch(() => {});
  }
  if (
    await scheduleField
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
  )
    return;
  await clickNextUntilScheduleConfig(page, sourceRef);

  await expect(body, `${sourceRef}: 调度属性页面应展示环境参数配置入口`).toContainText(
    /环境参数|调度配置|超时时间/,
    { timeout: 30000 },
  );
}

export async function runRuleTaskImmediately(
  page: Page,
  sourceRef: string,
  taskRow: ReturnType<Page["locator"]>,
): Promise<void> {
  let execute = taskRow
    .getByRole("button", { name: /立即执行/ })
    .or(taskRow.getByText("立即执行"))
    .first();
  if (!(await execute.isVisible({ timeout: 3000 }).catch(() => false))) {
    const tableNameCell = taskRow
      .locator("td")
      .nth(1)
      .or(taskRow.locator(".ant-table-cell").nth(1));
    await expect(tableNameCell, `${sourceRef}: 任务行应展示可打开详情的表名单元格`).toBeVisible({
      timeout: 30000,
    });
    await tableNameCell.click({ timeout: 30000 });
    const drawer = page.locator(".ant-drawer:visible, [role='dialog']:visible").last();
    const scope = (await drawer.isVisible({ timeout: 5000 }).catch(() => false))
      ? drawer
      : page.locator("body");
    execute = scope
      .getByRole("button", { name: /立即执行|执行/ })
      .or(scope.getByText("立即执行"))
      .first();
  }
  await expect(execute, `${sourceRef}: 任务行应展示「立即执行」`).toBeVisible({ timeout: 30000 });
  await execute.click({ timeout: 30000 });

  const confirm = page
    .locator(".ant-popover:visible, .ant-modal-confirm:visible, .ant-modal:visible")
    .last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(confirm, `${sourceRef}: 立即执行应展示确认`).toContainText(/立即执行|执行/, {
      timeout: 30000,
    });
    const confirmButton = confirm.getByRole("button", { name: /确\s*定|确\s*认|OK|是/ }).last();
    if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmButton.click({ timeout: 30000 });
    }
  }
  await expect(
    page.locator("body"),
    `${sourceRef}: 点击立即执行后页面应提示提交或保持任务列表`,
  ).toContainText(/成功|提交|执行|规则任务管理/, { timeout: 30000 });
}

async function gotoRuleTaskManagementPage(page: Page, sourceRef: string): Promise<void> {
  await closeVisibleDqOverlayIfAny(page, sourceRef);
  await gotoDataQualityPage(page, "/dq/rule");

  const menuEntry = page.getByRole("link", { name: "规则任务管理" }).first();
  if (await menuEntry.isVisible({ timeout: 5000 }).catch(() => false)) {
    await menuEntry.click({ timeout: 30000 });
    await injectDataQualityProjectContext(page);
    await waitForUiSettled(page);
  }

  await expect(page, `${sourceRef}: URL 应进入规则任务管理路由`).toHaveURL(/\/dq\/rule(?:\?|$)/, {
    timeout: 30000,
  });
  await expect(
    page.getByRole("button", { name: "新建监控规则" }),
    `${sourceRef}: 规则任务管理应展示新建监控规则入口`,
  ).toBeVisible({ timeout: 30000 });
}

export async function searchRuleTaskByTableName(
  page: Page,
  tableName: string,
  sourceRef: string,
): Promise<DqRuleTaskRecord[]> {
  await gotoRuleTaskManagementPage(page, sourceRef);
  const responsePromise = waitForRuleTaskPageQuery(page);
  void responsePromise.catch(() => {});
  const searchInput = page
    .getByPlaceholder(/输入表名搜索|请输入表名|表名/)
    .or(page.locator("input[placeholder*='表名']"))
    .first();
  await expect(searchInput, `${sourceRef}: 规则任务管理应展示表名搜索输入框`).toBeVisible({
    timeout: 30000,
  });
  await searchInput.fill(tableName, { timeout: 30000 });
  const searchButton = page.getByRole("button", { name: /查\s*询|search/i }).first();
  await expect(searchButton, `${sourceRef}: 规则任务管理应展示查询入口`).toBeVisible({
    timeout: 30000,
  });
  await searchButton.click({ timeout: 30000 });
  const payload = await responsePromise;
  expect(payload.success ?? payload.code === 1, `${sourceRef}: 规则任务表名搜索应请求成功`).toBe(
    true,
  );
  return getDqRuleTaskRecords(payload);
}
