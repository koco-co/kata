import { expect, type Page } from "@playwright/test";

import {
  getDqRuleTaskRecords,
  waitForRuleTaskPageQuery,
} from "../../pages/data-quality/api";
import type {
  DqRuleTaskPageQuery,
  SparkThriftEnvParam,
  SparkThriftQualityRuleValidationScenario,
} from "../../pages/data-quality/contracts";
import {
  checkDqNoReport,
  chooseDqFieldOptionByText,
  chooseFirstDqSelectOption,
  clickDqCompactButton,
  clickDqSubmitButton,
} from "../../pages/data-quality/form-controls";
import { gotoDataQualityPage } from "../../pages/data-quality/project-context";
import {
  clickNextUntilMonitorRuleConfig,
  clickNextUntilScheduleConfig,
  configureManualPartition,
  gotoNewRuleTaskMonitorObjectPageForTable,
  gotoRuleTaskScheduleAttributesPage,
  searchRuleTaskByTableName,
  selectRuleTaskRulePackageOnCurrentPage,
} from "../../pages/data-quality/rule-task-page";
import { expectNoMonitorRecordForRuleTask } from "./monitor-record";
import { configureExistingPartition } from "./partition";

async function expectPartitionModeOptionsVisible(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const option of ["选择已有分区", "选择动态分区", "手动输入分区"]) {
    await expect(body, `${sourceRef}: 监控对象页应展示分区方式「${option}」`).toContainText(
      option,
      {
        timeout: 30000,
      },
    );
  }
}

async function configureSamplingCheckSetting(
  page: Page,
  sourceRef: string,
  sampleRows: string,
): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 新建监控规则页面应展示数据预览入口`).toContainText("数据预览", {
    timeout: 30000,
  });

  const previewButton = page.getByRole("button", { name: /数据预览/ }).first();
  if (await previewButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await previewButton.click({ timeout: 30000 }).catch(() => {});
  }

  const samplingArea = page
    .locator(".ant-form-item, .ant-row, .ant-card, section, div")
    .filter({ hasText: /抽样检查(设置|配置)?|抽样行数|采样行数/ })
    .first();
  await expect(samplingArea, `${sourceRef}: 页面应展示抽样检查设置区域`).toBeVisible({
    timeout: 30000,
  });

  const samplingSwitch = samplingArea.locator(".ant-switch, [role='switch']").first();
  await expect(samplingSwitch, `${sourceRef}: 抽样检查设置开关应可见`).toBeVisible({
    timeout: 30000,
  });
  const switchClass = (await samplingSwitch.getAttribute("class").catch(() => "")) ?? "";
  const ariaChecked = (await samplingSwitch.getAttribute("aria-checked").catch(() => "")) ?? "";
  if (!/checked/.test(switchClass) && ariaChecked !== "true") {
    await samplingSwitch.click({ timeout: 30000 });
  }

  const rowsInput = samplingArea
    .getByPlaceholder(/请输入.*行数|抽样行数|采样行数/)
    .or(samplingArea.locator("input[type='number'], .ant-input-number input, input").last())
    .last();
  await rowsInput.fill(sampleRows, { timeout: 30000 });
  await expect(rowsInput, `${sourceRef}: 抽样行数应填入 ${sampleRows}`).toHaveValue(sampleRows, {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 抽样检查设置应保持开启并展示行数`).toContainText(
    /抽样|行数|10/,
    {
      timeout: 30000,
    },
  );
}

async function gotoRuleTaskMonitorObjectPage(page: Page, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  const partitionControl = page.locator(".ant-form-item:visible, .ant-row:visible").filter({
    hasText: /选择已有分区|选择分区|分区方式|分区/,
  });
  if (
    await partitionControl
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
  )
    return;

  const monitorObjectStep = page
    .locator(".ant-steps-item, [class*='step']")
    .filter({ hasText: "监控对象" })
    .first();
  if (await monitorObjectStep.isVisible({ timeout: 3000 }).catch(() => false)) {
    await monitorObjectStep.click({ force: true, timeout: 30000 }).catch(() => {});
  } else {
    const previousButton = page.getByRole("button", { name: /上一步/ }).first();
    if (await previousButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await previousButton.click({ force: true, timeout: 30000 });
    }
  }

  await expect(body, `${sourceRef}: 编辑规则任务应切回监控对象分区配置`).toContainText(
    /选择已有分区|选择分区|分区方式|分区/,
    { timeout: 30000 },
  );
}

export async function createSparkThriftArchiveValidationRuleTask(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  ruleName: string,
  packageName: string,
  options: {
    t1BeforeImmediate?: boolean;
    envParams?: readonly SparkThriftEnvParam[];
    samplingRows?: string;
    partitionModesVisible?: boolean;
  } = {},
): Promise<void> {
  const body = await gotoNewRuleTaskMonitorObjectPageForTable(
    page,
    sourceRef,
    ruleName,
    scenario.tableName,
    scenario.comparisonTableName,
    scenario.datasourceKey,
  );
  if (options.partitionModesVisible) {
    await expectPartitionModeOptionsVisible(page, sourceRef);
  }
  await configureExistingPartition(page, sourceRef, scenario.passPartition);
  if (options.samplingRows) {
    await configureSamplingCheckSetting(page, sourceRef, options.samplingRows);
  }
  await clickNextUntilMonitorRuleConfig(page, sourceRef);
  await selectRuleTaskRulePackageOnCurrentPage(
    page,
    sourceRef,
    [packageName],
    scenario.ruleCategory,
  );
  await clickNextUntilScheduleConfig(page, sourceRef);
  await chooseDqSchedulePeriod(page, sourceRef, options.t1BeforeImmediate ? "天" : "手动触发");
  await chooseDqFieldOptionByText(page, /规则拼接包/, "1", sourceRef);
  await chooseFirstDqSelectOption(page, /资源组/, sourceRef);
  const instanceGenerationField = page
    .locator(".ant-form-item:visible, .ant-row:visible, label:visible")
    .filter({
      hasText: /实例生成方式/,
    })
    .first();
  if (await instanceGenerationField.isVisible({ timeout: 2000 }).catch(() => false)) {
    await chooseDqFieldOptionByText(
      page,
      /实例生成方式/,
      options.t1BeforeImmediate ? "T+1生成" : "立即生成",
      sourceRef,
    );
  }
  await chooseDqFieldOptionByText(page, /超时时间/, "不限制", sourceRef);
  for (const envParam of options.envParams ?? []) {
    await configureSparkEnvParam(page, sourceRef, envParam.name, envParam.value);
  }
  await checkDqNoReport(page, sourceRef);

  const saveResponse = waitForRuleTaskPageQuery(page);
  void saveResponse.catch(() => {});
  await clickDqSubmitButton(page, sourceRef);
  await expect(
    body,
    `${sourceRef}: 规则任务 ${ruleName} 保存后应提示成功或返回规则任务管理`,
  ).toContainText(/成功|规则任务管理/, { timeout: 30000 });
  const savedPayload = await saveResponse.catch(() => undefined);
  if (savedPayload) {
    expect(
      savedPayload.success ?? savedPayload.code === 1,
      `${sourceRef}: 保存任务 ${ruleName} 后列表应刷新成功`,
    ).toBe(true);
  }
  await searchRuleTaskByTableName(page, scenario.tableName, sourceRef);

  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: scenario.tableName })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 保存后规则任务列表应展示 ${ruleName}`).toBeVisible({
    timeout: 30000,
  });
  if (!options.t1BeforeImmediate) return;

  await expect(taskRow, `${sourceRef}: T+1 任务应展示天级调度或 T+1 配置`).toContainText(
    /天|日|T\+1/,
    {
      timeout: 30000,
    },
  );
  await expectNoMonitorRecordForRuleTask(page, sourceRef, ruleName);
  await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });
  await gotoRuleTaskScheduleAttributesPage(page, sourceRef);
  for (const envParam of options.envParams ?? []) {
    await expect(
      page.locator("body"),
      `${sourceRef}: 环境参数应回显 ${envParam.name}`,
    ).toContainText(envParam.name, { timeout: 30000 });
    await expect(
      page.locator("body"),
      `${sourceRef}: 环境参数 ${envParam.name} 应回显 ${envParam.value}`,
    ).toContainText(envParam.value, { timeout: 30000 });
  }
  await chooseDqFieldOptionByText(page, /调度周期/, "手动触发", sourceRef);
  await chooseDqFieldOptionByText(page, /实例生成方式/, "立即生成", sourceRef);

  const resaveResponse = waitForRuleTaskPageQuery(page);
  void resaveResponse.catch(() => {});
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(
    page.locator("body"),
    `${sourceRef}: T+1 任务改为立即生成后应提示成功或返回规则任务管理`,
  ).toContainText(/成功|规则任务管理/, { timeout: 30000 });
  const resavedPayload = await resaveResponse.catch(() => undefined);
  if (resavedPayload) {
    expect(
      resavedPayload.success ?? resavedPayload.code === 1,
      `${sourceRef}: T+1 任务改为立即生成后列表应刷新成功`,
    ).toBe(true);
  }
  await searchRuleTaskByTableName(page, scenario.tableName, sourceRef);
  await expect(
    page
      .locator(".ant-table-tbody tr")
      .filter({ hasText: scenario.tableName })
      .filter({ hasText: ruleName })
      .first(),
    `${sourceRef}: 改为立即生成后规则任务列表仍展示 ${ruleName}`,
  ).toBeVisible({ timeout: 30000 });
}

async function chooseDqSchedulePeriod(
  page: Page,
  sourceRef: string,
  preferred: string,
): Promise<void> {
  const field = page
    .locator(".ant-form-item:visible")
    .filter({ hasText: /调度周期/ })
    .last();
  await expect(field, `${sourceRef}: 调度属性应展示调度周期`).toBeVisible({ timeout: 30000 });
  const select = field.locator(".ant-select").first();
  await select.click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  const preferredOption = dropdown.getByText(preferred, { exact: true }).first();
  const selected = (await preferredOption.isVisible({ timeout: 2000 }).catch(() => false))
    ? preferred
    : "天";
  const option = dropdown.getByText(selected, { exact: true }).first();
  await expect(option, `${sourceRef}: 调度周期下拉应包含「${selected}」`).toBeVisible({
    timeout: 10000,
  });
  await option.click({ timeout: 30000 });
  await expect(field, `${sourceRef}: 调度周期应选中「${selected}」`).toContainText(selected, {
    timeout: 30000,
  });
}

export async function expectArchiveRuleTaskSingleDetectionToggle(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  ruleName: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, scenario.tableName, sourceRef);
  let taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: scenario.tableName })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 关闭检测前应展示规则任务 ${ruleName}`).toBeVisible({
    timeout: 30000,
  });
  await ensureRuleTaskRowSelected(taskRow, 30000);
  const closePayload = await clickRuleTaskBatchDetectionAction(page, sourceRef, "关闭检测");
  const closedRecord = getDqRuleTaskRecords(closePayload).find(
    (record) => record.ruleName === ruleName,
  );
  expect(closedRecord?.isClosed, `${sourceRef}: 单任务关闭检测后 API 状态应为已关闭`).toBe(1);

  await searchRuleTaskByTableName(page, scenario.tableName, sourceRef);
  taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: scenario.tableName })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 关闭检测后列表应展示已关闭状态`).toContainText(
    "已关闭检测",
    {
      timeout: 30000,
    },
  );
  await ensureRuleTaskRowSelected(taskRow, 30000);
  const openPayload = await clickRuleTaskBatchDetectionAction(page, sourceRef, "开启检测");
  const openedRecord = getDqRuleTaskRecords(openPayload).find(
    (record) => record.ruleName === ruleName,
  );
  expect(openedRecord?.isClosed, `${sourceRef}: 单任务开启检测后 API 状态应为已开启`).toBe(0);

  await searchRuleTaskByTableName(page, scenario.tableName, sourceRef);
  await expect(
    page
      .locator(".ant-table-tbody tr")
      .filter({ hasText: scenario.tableName })
      .filter({ hasText: ruleName })
      .first(),
    `${sourceRef}: 开启检测后列表应恢复已开启状态`,
  ).toContainText("已开启检测", { timeout: 30000 });
}

export async function editSparkThriftArchiveValidationRuleTaskPartition(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  ruleName: string,
  options: { partitionMode?: "existing" | "manual" } = {},
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, scenario.tableName, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: scenario.tableName })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 编辑前规则任务应展示在列表`).toBeVisible({ timeout: 30000 });
  await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: 编辑规则任务应打开监控对象配置`).toContainText(
    /监控对象|选择分区|分区/,
    { timeout: 30000 },
  );
  await gotoRuleTaskMonitorObjectPage(page, sourceRef);
  if (options.partitionMode === "manual") {
    await configureManualPartition(
      page,
      sourceRef,
      manualPartitionExpression(scenario.failPartition),
    );
  } else {
    await configureExistingPartition(page, sourceRef, scenario.failPartition);
  }
  await gotoRuleTaskScheduleAttributesPage(page, sourceRef);
  const saveResponse = waitForRuleTaskPageQuery(page);
  void saveResponse.catch(() => {});
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(
    page.locator("body"),
    `${sourceRef}: 编辑分区保存后应提示成功或返回规则任务管理`,
  ).toContainText(/成功|规则任务管理/, { timeout: 30000 });
  const savedPayload = await saveResponse;
  expect(
    savedPayload.success ?? savedPayload.code === 1,
    `${sourceRef}: 编辑分区保存后列表应刷新成功`,
  ).toBe(true);
}

function manualPartitionExpression(partition: string): string {
  return partition
    .split(",")
    .map((token) => token.trim().replace(/'/g, ""))
    .join("/");
}

async function configureSparkEnvParam(
  page: Page,
  sourceRef: string,
  paramName: string,
  paramValue: string,
): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 调度属性页面应展示环境参数配置区域`).toContainText(
    /环境参数|参数名称|参数值/,
    { timeout: 30000 },
  );

  const envArea = page
    .locator(".ant-form-item, .ant-row, .ant-card, section, div")
    .filter({ hasText: /环境参数|参数名称|参数值/ })
    .first();
  const addButton = envArea
    .getByRole("button", { name: /新增|添加|增加/ })
    .or(page.getByRole("button", { name: /新增|添加|增加/ }))
    .last();
  if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await addButton.click({ timeout: 30000 });
  }

  const latestRow = page
    .locator(".ant-table-tbody tr, .ant-row, .ant-form-item")
    .filter({ hasText: /参数名称|参数值|环境参数|spark|logLevel/ })
    .last();
  const nameInput = latestRow
    .getByPlaceholder(/请输入参数名称|参数名称/)
    .or(latestRow.locator("input").nth(0))
    .or(page.getByPlaceholder(/请输入参数名称|参数名称/).last());
  await nameInput.fill(paramName, { timeout: 30000 });
  await expect(nameInput, `${sourceRef}: 环境参数名称应填入 ${paramName}`).toHaveValue(paramName, {
    timeout: 30000,
  });

  const valueInput = latestRow
    .getByPlaceholder(/请输入参数值|参数值/)
    .or(latestRow.locator("input").nth(1))
    .or(page.getByPlaceholder(/请输入参数值|参数值/).last());
  await valueInput.fill(paramValue, { timeout: 30000 });
  await expect(valueInput, `${sourceRef}: 环境参数值应填入 ${paramValue}`).toHaveValue(paramValue, {
    timeout: 30000,
  });
}

async function clickRuleTaskBatchDetectionAction(
  page: Page,
  sourceRef: string,
  action: "关闭检测" | "开启检测",
): Promise<DqRuleTaskPageQuery> {
  const responsePromise = waitForRuleTaskPageQuery(page);
  void responsePromise.catch(() => {});
  const button = page
    .getByRole("button", { name: new RegExp(action) })
    .or(page.getByText(action, { exact: true }))
    .first();
  await expect(button, `${sourceRef}: 勾选任务后应展示批量「${action}」入口`).toBeVisible({
    timeout: 30000,
  });
  await expect(button, `${sourceRef}: 批量「${action}」入口应可点击`).toBeEnabled({
    timeout: 30000,
  });
  await button.click({ timeout: 30000 });

  const confirm = page
    .locator(".ant-popover:visible, .ant-modal:visible, [role='dialog']:visible")
    .last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(confirm, `${sourceRef}: 批量${action}应弹出确认`).toContainText(action, {
      timeout: 30000,
    });
    await confirm
      .getByRole("button", { name: /确\s*定|确认/ })
      .last()
      .click({ timeout: 30000 });
  }

  const payload = await responsePromise;
  expect(
    payload.success ?? payload.code === 1,
    `${sourceRef}: 批量${action}后规则任务列表应刷新成功`,
  ).toBe(true);
  return payload;
}

async function ensureRuleTaskRowSelected(
  row: ReturnType<Page["locator"]>,
  timeout: number,
): Promise<void> {
  const checkboxInput = row.locator("input[type='checkbox']").first();
  if (await checkboxInput.isChecked({ timeout: 1000 }).catch(() => false)) return;

  const checkboxWrapper = row.locator(".ant-checkbox-wrapper").first();
  if (await checkboxWrapper.isVisible({ timeout: 1000 }).catch(() => false)) {
    await checkboxWrapper.click({ timeout });
  } else {
    await checkboxInput.check({ force: true, timeout });
  }
}
