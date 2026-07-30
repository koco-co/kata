// Lindorm 数据资产适配用例的数据质量报告页面流程与断言。

import { waitForUiSettled } from "../../../../../../../../../runtime/automation/playwright";
import { existsSync, unlinkSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import {
  SPARKTHRIFT_SOURCE_TYPE_LABEL,
  VEHICLE_INFO_DIM_TABLE,
  VEHICLE_ORDER_TABLE,
  VEHICLE_QUALITY_RULESET_TABLE,
} from "../../fixtures/data-quality-tables";
import type { DqApiResponse } from "../../../../../../../_shared/automation/pages/data-quality/contracts";
import {
  getDefaultDatasource,
  gotoDataQualityPage,
} from "../../../../../../../_shared/automation/pages/data-quality/project-context";
import {
  downloadDqArtifactWithSuggestedName,
  expectDownloadedArtifactContains,
  expectDqApiPaths,
  expectDqPage,
  getRequestJson,
  selectDqDateRange,
  selectDqFormOption,
} from "./page-context";
import {
  chooseDqFieldOptionByText,
  clickActiveAntdOption,
  clickDqCompactButton,
  clickDqText,
  closeDqOverlay,
  exactTextPattern,
  expectDqSuccess,
  expectNonEmptyString,
  fillDqFormItemInput,
  fillDqPageFormField,
  getActiveAntdOptionTexts,
  selectDqFormOptions,
  waitForDqJson,
} from "../../../../../../../_shared/automation/pages/data-quality/page-context";

type DqGeneratedReportRecord = {
  id?: string | number;
  reportName?: string;
  reportGenerateType?: number;
  dataContextStart?: string;
  dataContextEnd?: string;
  execEndTime?: string;
  status?: number;
  tableNames?: string | null;
};

type DqGeneratedReportPage = {
  contentList?: DqGeneratedReportRecord[];
  current?: string | number;
  size?: string | number;
  total?: string | number;
};

export async function expectDataQualityReportShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/qualityReport",
    labels: ["数据质量报告", "已配置报告", "已生成报告", "新增报告"],
    tableHeaders: [
      "报告名称",
      "关联数据表",
      "报告周期",
      "生成样式",
      "规则范围",
      "创建人",
      "创建时间",
      "修改人",
      "修改时间",
      "操作",
    ],
    apiPaths: ["/dassets/v1/valid/monitorReport/page"],
  });
}

export async function expectDataQualityGeneratedReportTab(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已生成报告", sourceRef);

  const body = page.locator("body");
  for (const label of ["已生成报告", "报告名称", "数据表", "生成时间", "报告状态", "报告详情"]) {
    await expect(body, `${sourceRef}: 已生成报告页签应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/qualityReport 已生成报告", [
    "/dassets/v1/valid/monitorReportRecord/pageList",
  ]);
}

async function expectVisibleRuleRows(
  page: Page,
  sourceRef: string,
  ruleNames: readonly string[],
): Promise<void> {
  const rows = page.locator(".ant-table-tbody tr:visible");
  for (const ruleName of ruleNames) {
    await expect(
      rows.filter({ hasText: ruleName }).first(),
      `${sourceRef}: 筛选结果应展示规则「${ruleName}」`,
    ).toBeVisible({
      timeout: 30000,
    });
  }
}

async function expectNoVisibleRuleRows(
  page: Page,
  sourceRef: string,
  ruleNames: readonly string[],
): Promise<void> {
  const rows = page.locator(".ant-table-tbody tr:visible");
  for (const ruleName of ruleNames) {
    await expect(
      rows.filter({ hasText: ruleName }),
      `${sourceRef}: 筛选结果不应展示规则「${ruleName}」`,
    ).toHaveCount(0, { timeout: 30000 });
  }
}

async function openReportRuleDirtyDetail(
  page: Page,
  sourceRef: string,
  rowPattern: RegExp,
): Promise<void> {
  const row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: rowPattern }).first();
  await expect(row, `${sourceRef}: 报告规则明细应展示 ${rowPattern}`).toBeVisible({
    timeout: 30000,
  });
  const detailEntry = row
    .getByText(/查看详情|查看明细/)
    .or(row.getByRole("button", { name: /查看详情|查看明细/ }))
    .or(row.getByRole("link", { name: /查看详情|查看明细/ }))
    .first();
  await expect(detailEntry, `${sourceRef}: 报告规则明细行应展示查看详情入口`).toBeVisible({
    timeout: 30000,
  });
  await detailEntry.click({ timeout: 30000 });
}

async function getCurrentDirtyDetailScope(page: Page): Promise<ReturnType<Page["locator"]>> {
  const overlay = page
    .locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible")
    .last();
  if (await overlay.isVisible({ timeout: 5000 }).catch(() => false)) return overlay;
  return page.locator("body");
}

async function closeDirtyDetailIfOverlay(page: Page, sourceRef: string): Promise<void> {
  const overlay = page
    .locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible")
    .last();
  if (await overlay.isVisible({ timeout: 3000 }).catch(() => false)) {
    await closeDqOverlay(page, sourceRef);
  }
}

export async function expectDataQualityReportCreateEntry(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已配置报告", sourceRef);
  await expect(
    page.locator("body"),
    `${sourceRef}: 已配置报告页签应展示新增报告入口`,
  ).toContainText("新增报告", {
    timeout: 30000,
  });
  await openConfiguredReportCreateForm(page, sourceRef);
  await expect(page, `${sourceRef}: 新增报告入口应保持在数据质量报告路由`).toHaveURL(
    /\/dq\/qualityReport/,
  );

  const body = page.locator("body");
  for (const label of ["新增报告", "报告名称", "报告周期", "生成样式", "规则范围"]) {
    await expect(body, `${sourceRef}: 新增报告页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/qualityReport 新增报告", [
    "/dassets/v1/valid/monitor/allCalender",
  ]);
}

export async function expectDataQualitySingleTableReportCreateContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const reportName = "SparkThrift2.x单表主流程报告";
  await gotoConfiguredReportPage(page, sourceRef);
  await deleteConfiguredReportIfExists(page, sourceRef, reportName);
  await expectConfiguredReportAbsent(page, sourceRef, reportName);
  await createConfiguredReport(page, sourceRef, {
    reportName,
    tables: ["json_report_fail"],
    period: "天",
    displayMode: "展示最新结果",
    needVehicleInfo: false,
  });
  await expectConfiguredReportRow(page, sourceRef, reportName, ["json_report_fail", "全部"]);
}

export async function expectDataQualityCustomReportCreateContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const reportName = "SparkThrift2.x自定义主流程报告";
  await gotoConfiguredReportPage(page, sourceRef);
  await deleteConfiguredReportIfExists(page, sourceRef, reportName);
  await expectConfiguredReportAbsent(page, sourceRef, reportName);
  await createConfiguredReport(page, sourceRef, {
    reportName,
    tables: ["json_report_fail", "json_format_test"],
    period: "一次性",
    displayMode: "展示全部结果",
    needVehicleInfo: false,
  });
  await expectConfiguredReportRow(page, sourceRef, reportName, [
    "json_report_fail",
    "json_format_test",
  ]);
  await clickDqText(page, "已生成报告", sourceRef);
  await searchGeneratedReportByName(page, sourceRef, reportName);
  await expect(
    page.locator("body"),
    `${sourceRef}: 已生成报告应可按自定义报告名称查询`,
  ).toContainText(reportName, { timeout: 30000 });
}

export async function expectDataQualityReportDuplicateNameValidationContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const reportName = "供应商主数据完整性日报";
  await gotoConfiguredReportPage(page, sourceRef);
  await ensureConfiguredReportExists(page, sourceRef, {
    reportName,
    tables: ["json_report_fail"],
    period: "天",
    displayMode: "展示最新结果",
    needVehicleInfo: false,
  });
  const beforeRow = await getConfiguredReportRowText(page, sourceRef, reportName);

  await openConfiguredReportCreateForm(page, sourceRef);
  await fillDqPageFormField(page, /报告名称/, reportName);
  await chooseDqFieldOptionByText(page, /生成样式/, "质检式", sourceRef);
  await chooseDqFieldOptionByText(page, /规则范围/, "全部", sourceRef);
  await addConfiguredReportAssociatedTable(page, sourceRef, {
    dataSource: getDefaultDatasource().metadata.name,
    database: getDefaultDatasource().sql.database,
    table: "json_report_fail",
    task: "全部",
  });
  await chooseDqFieldOptionByText(page, /报告周期/, "天", sourceRef);
  await clickDqCompactButton(page, "确定", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 重复报告名称应提示已存在或重复`).toContainText(
    /已存在|重复|同名|报告名称/,
    { timeout: 30000 },
  );
  await expect(
    page.locator("body"),
    `${sourceRef}: 重复名称校验后仍停留在新增报告表单`,
  ).toContainText("新增报告", {
    timeout: 30000,
  });

  await page.keyboard.press("Escape").catch(() => {});
  await gotoConfiguredReportPage(page, sourceRef);
  await expectConfiguredReportRow(page, sourceRef, reportName, ["json_report_fail"]);
  const afterRow = await getConfiguredReportRowText(page, sourceRef, reportName);
  expect(afterRow, `${sourceRef}: 原报告配置不应被重复新增覆盖`).toBe(beforeRow);
}

export async function expectDataQualityReportEditViewDeleteContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const reportName = "车辆订单质量日报";
  await gotoConfiguredReportPage(page, sourceRef);
  await ensureConfiguredReportExists(page, sourceRef, {
    reportName,
    tables: ["json_format_test"],
    period: "天",
    displayMode: "展示最新结果",
    needVehicleInfo: false,
  });

  const row = await getConfiguredReportRow(page, sourceRef, reportName);
  for (const action of ["编辑", "查看报告", "删除"]) {
    await expect(row, `${sourceRef}: 报告操作列应展示「${action}」入口`).toContainText(action, {
      timeout: 30000,
    });
  }

  await row.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: 编辑报告表单应打开`).toContainText(
    /编辑|报告名称/,
    {
      timeout: 30000,
    },
  );
  await chooseDqFieldOptionByText(page, /报告周期/, "周", sourceRef);
  await chooseDqRadioOptionByText(page, "展示全部结果", sourceRef);
  const editResponse = waitForDqJson<unknown>(page, "/dassets/v1/valid/monitorReport");
  void editResponse.catch(() => {});
  await clickDqCompactButton(page, "确定", sourceRef);
  expectDqSuccess(await editResponse, `${sourceRef}: 编辑报告保存应请求成功`);
  await expectConfiguredReportRow(page, sourceRef, reportName, ["周"]);

  const editedRow = await getConfiguredReportRow(page, sourceRef, reportName);
  await editedRow
    .getByRole("button", { name: /查看报告/ })
    .first()
    .click({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: 查看报告应跳转已生成报告或详情`).toContainText(
    reportName,
    {
      timeout: 30000,
    },
  );

  await gotoConfiguredReportPage(page, sourceRef);
  const deletableRow = await getConfiguredReportRow(page, sourceRef, reportName);
  await deletableRow.getByRole("button", { name: /删除/ }).first().click({ timeout: 30000 });
  await expect(
    page.locator(".ant-modal, .ant-popover, body").last(),
    `${sourceRef}: 删除报告应展示确认文案`,
  ).toContainText(/删除|不会生成报告|已生成报告|确认/, { timeout: 30000 });
  const deleteResponse = waitForDqJson<unknown>(page, "/dassets/v1/valid/monitorReport");
  void deleteResponse.catch(() => {});
  await clickVisibleDeleteConfirm(page, sourceRef);
  expectDqSuccess(await deleteResponse, `${sourceRef}: 删除报告应请求成功`);
  await searchConfiguredReportByName(page, sourceRef, reportName);
  await expect(
    page.locator(".ant-table-tbody tr").filter({ hasText: reportName }),
    `${sourceRef}: 删除后已配置报告列表不再展示目标报告`,
  ).toHaveCount(0, { timeout: 30000 });
}

async function gotoConfiguredReportPage(page: Page, sourceRef: string): Promise<void> {
  const response = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReport/page",
  );
  void response.catch(() => {});
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已配置报告", sourceRef);
  await expectDqSuccess(await response, `${sourceRef}: 已配置报告列表应请求成功`);
  const body = page.locator("body");
  for (const label of [
    "已配置报告",
    "已生成报告",
    "报告名称",
    "关联数据表",
    "报告周期",
    "生成样式",
    "规则范围",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 已配置报告列表应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
}

async function expectConfiguredReportAbsent(
  page: Page,
  sourceRef: string,
  reportName: string,
): Promise<void> {
  await searchConfiguredReportByName(page, sourceRef, reportName);
  const rows = page.locator(".ant-table-tbody tr").filter({ hasText: reportName });
  await expect(rows, `${sourceRef}: 同名报告「${reportName}」应不存在，避免新增冲突`).toHaveCount(
    0,
    {
      timeout: 5000,
    },
  );
}

async function deleteConfiguredReportIfExists(
  page: Page,
  sourceRef: string,
  reportName: string,
): Promise<void> {
  await searchConfiguredReportByName(page, sourceRef, reportName);
  const rows = page.locator(".ant-table-tbody tr").filter({ hasText: reportName });
  if ((await rows.count()) === 0) return;

  const row = rows.first();
  const deleteEntry = row.getByRole("button", { name: /删除/ }).first();
  await expect(deleteEntry, `${sourceRef}: 同名测试报告存在时应可删除后重建`).toBeVisible({
    timeout: 30000,
  });
  await deleteEntry.click({ timeout: 30000 });
  await expect(
    page.locator(".ant-modal:visible, .ant-popover:visible, body").last(),
    `${sourceRef}: 删除同名测试报告应展示确认文案`,
  ).toContainText(/删除|不会生成报告|已生成报告|确认/, { timeout: 30000 });
  const deleteResponse = waitForDqJson<unknown>(page, "/dassets/v1/valid/monitorReport");
  void deleteResponse.catch(() => {});
  await clickVisibleDeleteConfirm(page, sourceRef);
  expectDqSuccess(await deleteResponse, `${sourceRef}: 删除同名测试报告应请求成功`);
  await searchConfiguredReportByName(page, sourceRef, reportName);
  await expect(rows, `${sourceRef}: 同名测试报告删除后应不再展示`).toHaveCount(0, {
    timeout: 30000,
  });
}

async function clickVisibleDeleteConfirm(page: Page, sourceRef: string): Promise<void> {
  const popup = page
    .locator(".ant-popover:visible, .ant-modal:visible, [role='tooltip']:visible")
    .last();
  await expect(popup, `${sourceRef}: 删除确认浮层应可见`).toBeVisible({ timeout: 30000 });
  const confirm = popup.getByRole("button", { name: /删\s*除|确\s*定|确\s*认/ }).last();
  await expect(confirm, `${sourceRef}: 删除确认浮层应展示确认按钮`).toBeVisible({ timeout: 30000 });
  await confirm.click({ timeout: 30000 });
}

async function ensureConfiguredReportExists(
  page: Page,
  sourceRef: string,
  options: {
    reportName: string;
    tables: string[];
    period: string;
    displayMode: string;
    needVehicleInfo: boolean;
  },
): Promise<void> {
  await searchConfiguredReportByName(page, sourceRef, options.reportName);
  if (
    (await page.locator(".ant-table-tbody tr").filter({ hasText: options.reportName }).count()) > 0
  )
    return;
  await createConfiguredReport(page, sourceRef, options);
  await expectConfiguredReportRow(page, sourceRef, options.reportName, options.tables);
}

async function createConfiguredReport(
  page: Page,
  sourceRef: string,
  options: {
    reportName: string;
    tables: string[];
    period: string;
    displayMode: string;
    needVehicleInfo: boolean;
  },
): Promise<void> {
  await openConfiguredReportCreateForm(page, sourceRef);
  const body = page.locator("body");
  for (const label of ["新增报告", "报告名称", "生成样式", "规则范围", "关联数据表", "报告周期"]) {
    await expect(body, `${sourceRef}: 新增报告表单应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await fillDqPageFormField(page, /报告名称/, options.reportName);
  await chooseDqFieldOptionByText(page, /生成样式/, "质检式", sourceRef);
  await chooseDqFieldOptionByText(page, /规则范围/, "全部", sourceRef);
  for (const table of options.tables) {
    await addConfiguredReportAssociatedTable(page, sourceRef, {
      dataSource: getDefaultDatasource().metadata.name,
      database: getDefaultDatasource().sql.database,
      table,
      task: "全部",
    });
  }
  await chooseDqFieldOptionByText(page, /报告周期/, options.period, sourceRef);
  await fillConfiguredReportDataCycle(page, sourceRef);
  await chooseDqRadioOptionByText(page, options.displayMode, sourceRef);
  await chooseDqRadioOptionByText(page, options.needVehicleInfo ? "是" : "否", sourceRef);

  const saveResponse = waitForDqJson<unknown>(page, "/dassets/v1/valid/monitorReport");
  void saveResponse.catch(() => {});
  await clickConfiguredReportDialogConfirm(page, sourceRef);
  expectDqSuccess(await saveResponse, `${sourceRef}: 报告保存应请求成功`);
}

async function addConfiguredReportAssociatedTable(
  page: Page,
  sourceRef: string,
  options: {
    dataSource: string;
    database: string;
    table: string;
    task: string;
  },
): Promise<void> {
  const dialog = page.locator(".ant-modal:visible, [role='dialog']:visible").last();
  await expect(dialog, `${sourceRef}: 新增报告弹窗应可见`).toBeVisible({ timeout: 30000 });
  let editableRows = dialog
    .locator(".ant-table-tbody tr")
    .filter({ hasText: /请选择数据源|请选择数据库|请选择数据表/ });
  if ((await editableRows.count()) === 0) {
    await dialog.getByRole("button", { name: /^新\s*增$/ }).click({ timeout: 30000 });
    await expect
      .poll(
        async () =>
          dialog
            .locator(".ant-table-tbody tr")
            .filter({ hasText: /请选择数据源|请选择数据库|请选择数据表/ })
            .count(),
        { message: `${sourceRef}: 关联数据表新增后应出现可编辑行`, timeout: 30000 },
      )
      .toBeGreaterThan(0);
    editableRows = dialog
      .locator(".ant-table-tbody tr")
      .filter({ hasText: /请选择数据源|请选择数据库|请选择数据表/ });
  }

  let row = editableRows.last();
  await selectDqTableRowOption(row, page, 0, options.dataSource, sourceRef);
  await waitForUiSettled(page);
  row = dialog
    .locator(".ant-table-tbody tr")
    .filter({ hasText: /请选择数据库|请选择数据表|请选择任务/ })
    .last();
  await selectDqTableRowOption(row, page, 1, options.database, sourceRef);
  await waitForUiSettled(page);
  row = dialog
    .locator(".ant-table-tbody tr")
    .filter({ hasText: /请选择数据表|请选择任务/ })
    .last();
  await selectDqTableRowOption(row, page, 2, options.table, sourceRef);
  row = dialog.locator(".ant-table-tbody tr").filter({ hasText: options.table }).last();
  if (
    await row
      .getByText("请选择任务", { exact: false })
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
  ) {
    await selectDqTableRowOption(row, page, 3, options.task, sourceRef);
  } else {
    await expect(row, `${sourceRef}: 关联任务应默认回显「${options.task}」`).toContainText(
      options.task,
      {
        timeout: 30000,
      },
    );
  }
}

async function selectDqTableRowOption(
  row: ReturnType<Page["locator"]>,
  page: Page,
  index: number,
  option: string,
  sourceRef: string,
): Promise<void> {
  const cell = row.locator("td").nth(index);
  const cellHandle = await cell.elementHandle({ timeout: 30000 });
  expect(cellHandle, `${sourceRef}: 关联数据表第 ${index + 1} 个单元格应存在`).toBeTruthy();
  const select = cell.locator(".ant-select").first();
  await expect(select, `${sourceRef}: 关联数据表第 ${index + 1} 个下拉应可见`).toBeVisible({
    timeout: 30000,
  });
  await select.click({ force: true, timeout: 30000 });
  await page.keyboard.type(option);
  const selectedItem = select
    .locator(".ant-select-selection-item")
    .filter({ hasText: exactTextPattern(option) })
    .first();
  if (await selectedItem.isVisible({ timeout: 3000 }).catch(() => false)) return;
  await expect
    .poll(() => getActiveAntdOptionTexts(page), {
      message: `${sourceRef}: 关联数据表下拉应出现选项「${option}」`,
      timeout: 30000,
    })
    .toContain(option);
  const clicked = await clickActiveAntdOption(page, option);
  expect(clicked, `${sourceRef}: 关联数据表下拉应包含可点击选项「${option}」`).toBe(true);
  await expect
    .poll(
      async () =>
        cellHandle?.evaluate((element) => element.textContent?.trim() ?? "").catch(() => ""),
      { message: `${sourceRef}: 关联数据表单元格应回显「${option}」`, timeout: 30000 },
    )
    .toContain(option);
}

async function openConfiguredReportCreateForm(page: Page, sourceRef: string): Promise<void> {
  await page.getByRole("button", { name: /^新\s*增\s*报\s*告$/ }).click({ timeout: 30000 });
  await expect(
    page
      .locator(".ant-form, main, body")
      .filter({ hasText: /新增报告/ })
      .first(),
    `${sourceRef}: 新增报告表单应打开`,
  ).toBeVisible({ timeout: 30000 });
}

async function fillConfiguredReportDataCycle(page: Page, sourceRef: string): Promise<void> {
  const field = page
    .locator(".ant-form-item, .ant-row")
    .filter({ hasText: /数据周期/ })
    .first();
  await expect(field, `${sourceRef}: 新增报告应展示数据周期`).toBeVisible({ timeout: 30000 });
  const inputs = field.locator("input[role='spinbutton']");
  await expect(inputs.first(), `${sourceRef}: 数据周期开始输入框应可见`).toBeVisible({
    timeout: 30000,
  });
  await inputs.nth(0).fill("1", { timeout: 30000 });
  await inputs.nth(1).fill("0", { timeout: 30000 });
  await expect(inputs.nth(0), `${sourceRef}: 数据周期开始值应填入`).toHaveValue("1", {
    timeout: 30000,
  });
  await expect(inputs.nth(1), `${sourceRef}: 数据周期结束值应填入`).toHaveValue("0", {
    timeout: 30000,
  });
}

async function clickConfiguredReportDialogConfirm(page: Page, sourceRef: string): Promise<void> {
  const dialog = page.locator(".ant-modal:visible, [role='dialog']:visible").last();
  const confirm = dialog.getByRole("button", { name: /^确\s*定$/ }).last();
  await expect(confirm, `${sourceRef}: 新增报告弹窗应展示确定按钮`).toBeVisible({ timeout: 30000 });
  await confirm.click({ force: true, timeout: 30000 });
}

async function expectConfiguredReportRow(
  page: Page,
  sourceRef: string,
  reportName: string,
  expectedTexts: string[],
): Promise<void> {
  await searchConfiguredReportByName(page, sourceRef, reportName);
  const row = page.locator(".ant-table-tbody tr").filter({ hasText: reportName }).first();
  await expect(row, `${sourceRef}: 已配置报告列表应展示新增报告「${reportName}」`).toBeVisible({
    timeout: 30000,
  });
  for (const expectedText of [reportName, ...expectedTexts]) {
    await expect(row, `${sourceRef}: 新增报告行应展示「${expectedText}」`).toContainText(
      expectedText,
      {
        timeout: 30000,
      },
    );
  }
}

async function getConfiguredReportRow(
  page: Page,
  sourceRef: string,
  reportName: string,
): Promise<ReturnType<Page["locator"]>> {
  await searchConfiguredReportByName(page, sourceRef, reportName);
  const row = page.locator(".ant-table-tbody tr").filter({ hasText: reportName }).first();
  await expect(row, `${sourceRef}: 已配置报告列表应展示「${reportName}」`).toBeVisible({
    timeout: 30000,
  });
  return row;
}

async function getConfiguredReportRowText(
  page: Page,
  sourceRef: string,
  reportName: string,
): Promise<string> {
  const row = await getConfiguredReportRow(page, sourceRef, reportName);
  return row.innerText({ timeout: 30000 });
}

async function searchConfiguredReportByName(
  page: Page,
  sourceRef: string,
  reportName: string,
): Promise<void> {
  const response = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReport/page",
  );
  void response.catch(() => {});
  await page
    .getByPlaceholder(/请输入报告名称|报告名称/)
    .first()
    .fill(reportName, { timeout: 30000 });
  await clickDqCompactButton(page, "查询", sourceRef);
  await expectDqSuccess(await response, `${sourceRef}: 已配置报告名称查询应请求成功`);
}

async function searchGeneratedReportByName(
  page: Page,
  sourceRef: string,
  reportName: string,
): Promise<void> {
  const response = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReportRecord/pageList",
  );
  void response.catch(() => {});
  await page
    .getByPlaceholder(/请输入报告名称|报告名称/)
    .first()
    .fill(reportName, { timeout: 30000 });
  await clickDqCompactButton(page, "查询", sourceRef);
  await expectDqSuccess(await response, `${sourceRef}: 已生成报告名称查询应请求成功`);
}

async function openGeneratedReportDetail(
  page: Page,
  sourceRef: string,
  reportName: string,
  tableName: string,
): Promise<void> {
  const row = await openGeneratedReportListAndSearch(page, sourceRef, reportName);
  await expect(row, `${sourceRef}: 目标报告应展示关联数据表`).toContainText(tableName, {
    timeout: 30000,
  });
  await expect(row, `${sourceRef}: 目标报告应为已生成状态`).toContainText("已生成", {
    timeout: 30000,
  });

  const detailEntry = row
    .getByText("报告详情", { exact: true })
    .or(row.getByRole("button", { name: "报告详情" }))
    .or(row.getByRole("link", { name: "报告详情" }))
    .first();
  await expect(detailEntry, `${sourceRef}: 目标报告应展示报告详情入口`).toBeVisible({
    timeout: 30000,
  });
  await detailEntry.click({ timeout: 30000 });
  await waitForUiSettled(page);

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 报告详情页应展示报告名称`).toContainText(reportName, {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 报告详情页应展示关联数据表`).toContainText(tableName, {
    timeout: 30000,
  });
  for (const label of ["质量评估", "规则校验", "字段规则", "单表规则", "多表规则"]) {
    await expect(body, `${sourceRef}: 报告详情页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
}

async function openGeneratedReportListAndSearch(
  page: Page,
  sourceRef: string,
  reportName: string,
): Promise<ReturnType<Page["locator"]>> {
  const initialResponse = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReportRecord/pageList",
  );
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已生成报告", sourceRef);
  expectGeneratedReportPage(
    expectDqSuccess(await initialResponse, `${sourceRef}: 打开报告详情前已生成报告列表应请求成功`),
    `${sourceRef}: 打开报告详情前已生成报告列表应返回记录`,
  );
  await searchGeneratedReportByName(page, sourceRef, reportName);

  const row = page.locator(".ant-table-tbody tr").filter({ hasText: reportName }).first();
  await expect(row, `${sourceRef}: 已生成报告列表应展示目标报告「${reportName}」`).toBeVisible({
    timeout: 30000,
  });
  return row;
}

async function activateReportDetailSection(
  page: Page,
  sourceRef: string,
  sectionTitle: string,
): Promise<void> {
  const entry = page.getByText(sectionTitle, { exact: true }).first();
  await expect(entry, `${sourceRef}: 报告详情应展示「${sectionTitle}」入口`).toBeVisible({
    timeout: 30000,
  });
  await entry.scrollIntoViewIfNeeded({ timeout: 30000 }).catch(() => {});
  await entry.click({ timeout: 30000 }).catch(() => {});
  await expect(
    page.locator("body"),
    `${sourceRef}: 应定位到报告详情「${sectionTitle}」分区`,
  ).toContainText(sectionTitle, { timeout: 30000 });
}

export async function expectDataQualityGeneratedReportFilterContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已生成报告", sourceRef);

  const body = page.locator("body");
  for (const label of ["已生成报告", "报告名称", "数据表", "生成时间", "报告状态"]) {
    await expect(body, `${sourceRef}: 已生成报告筛选区应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  for (const placeholder of ["请输入报告名称", "请输入数据表名", "开始日期", "结束日期"]) {
    await expect(
      page.getByPlaceholder(placeholder).first(),
      `${sourceRef}: 已生成报告应展示占位符「${placeholder}」`,
    ).toBeVisible({ timeout: 30000 });
  }

  for (const header of [
    "报告名称",
    "关联数据表",
    "生成样式",
    "规则范围",
    "数据周期",
    "报告状态",
    "生成时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 已生成报告列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/qualityReport 已生成报告筛选列表", [
    "/dassets/v1/valid/monitorReportRecord/pageList",
  ]);
}

export async function expectDataQualityGeneratedReportCombinedFilterContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const initialResponse = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReportRecord/pageList",
  );
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已生成报告", sourceRef);
  const initialPage = expectDqSuccess(
    await initialResponse,
    `${sourceRef}: 已生成报告列表应请求成功`,
  );
  const initialReports = expectGeneratedReportPage(
    initialPage,
    `${sourceRef}: 已生成报告列表应返回记录`,
  );
  const target = expectGeneratedReportFilterTarget(initialReports, sourceRef);
  const reportName = expectNonEmptyString(
    target.reportName,
    `${sourceRef}: 目标报告应包含报告名称`,
  );
  const tableName = expectNonEmptyString(
    target.tableNames,
    `${sourceRef}: 目标报告应包含关联数据表`,
  );
  const execEndTime = expectNonEmptyString(
    target.execEndTime,
    `${sourceRef}: 目标报告应包含生成时间`,
  );
  const generatedDay = execEndTime.slice(0, 10);
  expect(generatedDay, `${sourceRef}: 目标报告生成日期格式应有效`).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  const body = page.locator("body");
  for (const label of ["已生成报告", "报告名称", "数据表", "生成时间", "报告状态"]) {
    await expect(body, `${sourceRef}: 已生成报告筛选区应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  for (const header of [
    "报告名称",
    "关联数据表",
    "生成样式",
    "规则范围",
    "数据周期",
    "报告状态",
    "生成时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 已生成报告列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  const filteredResponse = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReportRecord/pageList",
    (payload) =>
      (payload.data?.contentList ?? []).some((item) => String(item.id) === String(target.id)),
  );
  const filteredRequest = page.waitForRequest((request) => {
    if (!request.url().includes("/dassets/v1/valid/monitorReportRecord/pageList")) return false;
    const requestBody = getRequestJson(request);
    return (
      requestBody.search === reportName &&
      requestBody.tableName === tableName &&
      requestBody.startTime === generatedDay &&
      requestBody.endTime === generatedDay
    );
  });
  await page.getByPlaceholder("请输入报告名称").fill(reportName);
  await page.getByPlaceholder("请输入数据表名").fill(tableName);
  await selectDqDateRange(page, generatedDay, generatedDay, sourceRef);
  await clickDqCompactButton(page, "查询", sourceRef);
  await filteredRequest;
  const filteredPage = expectDqSuccess(await filteredResponse, `${sourceRef}: 组合筛选应请求成功`);
  const filteredReports = expectGeneratedReportPage(
    filteredPage,
    `${sourceRef}: 组合筛选应返回目标报告`,
  );
  expect(
    filteredReports.every(
      (item) =>
        String(item.reportName ?? "").includes(reportName) &&
        String(item.tableNames ?? "").includes(tableName) &&
        String(item.execEndTime ?? "").startsWith(generatedDay),
    ),
    `${sourceRef}: 组合筛选结果应同时匹配报告名称、数据表和生成日期`,
  ).toBe(true);
  expect(
    filteredReports.some((item) => String(item.id) === String(target.id)),
    `${sourceRef}: 组合筛选结果应包含目标报告 ${reportName}`,
  ).toBe(true);

  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: reportName }).first();
  await expect(targetRow, `${sourceRef}: 组合筛选后表格应展示目标报告`).toBeVisible({
    timeout: 30000,
  });
  for (const expectedText of [
    reportName,
    tableName,
    formatGeneratedReportGenerateType(target.reportGenerateType, sourceRef),
    formatGeneratedReportStatus(target.status, sourceRef),
    execEndTime,
  ]) {
    await expect(targetRow, `${sourceRef}: 目标报告行应展示「${expectedText}」`).toContainText(
      expectedText,
      {
        timeout: 30000,
      },
    );
  }

  const resetResponse = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReportRecord/pageList",
    (payload) => Number(payload.data?.total ?? 0) >= Number(filteredPage.total ?? 0),
  );
  const resetRequest = page.waitForRequest((request) => {
    if (!request.url().includes("/dassets/v1/valid/monitorReportRecord/pageList")) return false;
    const requestBody = getRequestJson(request);
    return (
      requestBody.current === 1 &&
      requestBody.size === 20 &&
      !("search" in requestBody) &&
      !("tableName" in requestBody) &&
      !("startTime" in requestBody) &&
      !("endTime" in requestBody)
    );
  });
  await clickDqCompactButton(page, "重置", sourceRef);
  await resetRequest;
  expectGeneratedReportPage(
    expectDqSuccess(await resetResponse, `${sourceRef}: 重置后列表应重新请求成功`),
    `${sourceRef}: 重置后列表应恢复记录`,
  );
  for (const placeholder of ["请输入报告名称", "请输入数据表名", "开始日期", "结束日期"]) {
    await expect(
      page.getByPlaceholder(placeholder).first(),
      `${sourceRef}: 重置后「${placeholder}」应清空`,
    ).toHaveValue("", { timeout: 30000 });
  }
}

export async function expectDataQualityGeneratedReportStatusFilterContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const initialResponse = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReportRecord/pageList",
  );
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已生成报告", sourceRef);
  expectGeneratedReportPage(
    expectDqSuccess(await initialResponse, `${sourceRef}: 已生成报告列表应请求成功`),
    `${sourceRef}: 已生成报告列表应返回记录`,
  );

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 已生成报告列表应展示报告状态列`).toContainText("报告状态", {
    timeout: 30000,
  });

  const statusField = page.locator(".ant-form-item").filter({ hasText: "报告状态" }).first();
  await statusField.locator(".ant-select").first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  for (const statusLabel of ["待生成", "生成中", "已生成", "生成失败", "持续生成中"]) {
    await expect(dropdown, `${sourceRef}: 报告状态筛选项应包含「${statusLabel}」`).toContainText(
      statusLabel,
      {
        timeout: 30000,
      },
    );
  }
  await page.keyboard.press("Escape");

  for (const status of [0, 1, 2, 3, 4]) {
    const statusLabel = formatGeneratedReportStatus(status, sourceRef);
    const filteredResponse = waitForDqJson<DqGeneratedReportPage>(
      page,
      "/dassets/v1/valid/monitorReportRecord/pageList",
      (payload) => {
        const records = payload.data?.contentList ?? [];
        return records.length > 0 && records.every((record) => Number(record.status) === status);
      },
    );
    const filteredRequest = page.waitForRequest((request) => {
      if (!request.url().includes("/dassets/v1/valid/monitorReportRecord/pageList")) return false;
      const requestBody = getRequestJson(request);
      return Number(requestBody.status) === status;
    });
    await selectDqFormOption(page, "报告状态", statusLabel, sourceRef);
    await clickDqCompactButton(page, "查询", sourceRef);
    await filteredRequest;
    const filteredPage = expectDqSuccess(
      await filteredResponse,
      `${sourceRef}: ${statusLabel} 筛选应请求成功`,
    );
    const filteredReports = expectGeneratedReportPage(
      filteredPage,
      `${sourceRef}: ${statusLabel} 筛选应返回报告记录`,
    );
    const target = filteredReports[0];
    const reportName = expectNonEmptyString(
      target?.reportName,
      `${sourceRef}: ${statusLabel} 目标报告应包含名称`,
    );
    expect(
      filteredReports.every((record) => Number(record.status) === status),
      `${sourceRef}: ${statusLabel} 筛选结果应全部为对应状态`,
    ).toBe(true);

    const row = page.locator(".ant-table-tbody tr").filter({ hasText: reportName }).first();
    await expect(row, `${sourceRef}: ${statusLabel} 筛选后应展示目标报告`).toBeVisible({
      timeout: 30000,
    });
    await expect(row, `${sourceRef}: 目标报告行应展示状态「${statusLabel}」`).toContainText(
      statusLabel,
      {
        timeout: 30000,
      },
    );

    if (status === 3) {
      const failedDetailEntry = row
        .getByText("失败详情", { exact: true })
        .or(row.getByRole("button", { name: "失败详情" }))
        .or(row.getByRole("link", { name: "失败详情" }))
        .first();
      await expect(failedDetailEntry, `${sourceRef}: 生成失败报告应展示失败详情入口`).toBeVisible({
        timeout: 30000,
      });
      await failedDetailEntry.click({ timeout: 30000 });
      const detailPanel = page
        .locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible")
        .last();
      await expect(detailPanel, `${sourceRef}: 失败详情弹窗或抽屉应打开`).toBeVisible({
        timeout: 30000,
      });
      await expect(detailPanel, `${sourceRef}: 失败详情应展示失败原因或日志摘要`).toContainText(
        /失败|异常|原因|日志|error|exception/i,
        { timeout: 30000 },
      );
      await closeDqOverlay(page, sourceRef);
      await expect(
        page.locator("body"),
        `${sourceRef}: 关闭失败详情后仍停留在已生成报告列表`,
      ).toContainText("已生成报告", { timeout: 30000 });
    }
  }
}

export async function expectDataQualityGeneratedReportDownloadContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const reportName = "供应商主数据有效性周报";
  const tableName = "dwd_supplier_info_di";

  const initialResponse = waitForDqJson<DqGeneratedReportPage>(
    page,
    "/dassets/v1/valid/monitorReportRecord/pageList",
  );
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已生成报告", sourceRef);
  expectGeneratedReportPage(
    expectDqSuccess(await initialResponse, `${sourceRef}: 已生成报告列表应请求成功`),
    `${sourceRef}: 已生成报告列表应返回记录`,
  );
  await searchGeneratedReportByName(page, sourceRef, reportName);

  const row = page.locator(".ant-table-tbody tr").filter({ hasText: reportName }).first();
  await expect(row, `${sourceRef}: 查询后应展示下载目标报告`).toBeVisible({ timeout: 30000 });
  await expect(row, `${sourceRef}: 下载目标报告应展示关联数据表`).toContainText(tableName, {
    timeout: 30000,
  });
  await expect(row, `${sourceRef}: 下载目标报告状态应为已生成`).toContainText("已生成", {
    timeout: 30000,
  });
  await expect(row, `${sourceRef}: 下载目标报告应展示报告详情入口`).toContainText("报告详情", {
    timeout: 30000,
  });

  const downloadEntry = row
    .getByText("下载", { exact: true })
    .or(row.getByRole("button", { name: "下载" }))
    .or(row.getByRole("link", { name: "下载" }))
    .first();
  await expect(downloadEntry, `${sourceRef}: 下载目标报告应展示下载入口`).toBeVisible({
    timeout: 30000,
  });

  let downloadPath = "";
  try {
    const artifact = await downloadDqArtifactWithSuggestedName(
      page,
      sourceRef,
      "generated-report",
      async () => {
        await downloadEntry.click({ timeout: 30000 });
      },
    );
    downloadPath = artifact.path;
    expect(artifact.suggestedName, `${sourceRef}: 下载文件名称应包含报告名称`).toContain(
      reportName,
    );
    await expectDownloadedArtifactContains(
      downloadPath,
      [reportName, tableName, "质量", "规则"],
      sourceRef,
    );
  } finally {
    if (downloadPath && existsSync(downloadPath)) unlinkSync(downloadPath);
  }
}

export async function expectDataQualityReportDetailFieldRuleFilterContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openGeneratedReportDetail(
    page,
    sourceRef,
    "供应商主数据有效性周报",
    "dwd_supplier_info_di",
  );
  await activateReportDetailSection(page, sourceRef, "字段规则");

  const body = page.locator("body");
  for (const label of ["字段规则", "规则类型", "规则名称", "字段名称", "字段类型", "质检结果"]) {
    await expect(body, `${sourceRef}: 字段规则筛选区应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  for (const ruleName of [
    "供应商名称非空校验",
    "供应商编码格式校验",
    "供应商编码唯一校验",
    "分区记录数波动校验",
  ]) {
    await expect(body, `${sourceRef}: 字段规则初始明细应包含「${ruleName}」`).toContainText(
      ruleName,
      {
        timeout: 30000,
      },
    );
  }

  await selectDqFormOptions(page, "规则类型", ["完整性校验", "有效性校验"], sourceRef);
  await fillDqFormItemInput(page, "规则名称", "供应商", sourceRef);
  await fillDqFormItemInput(page, "字段名称", "supplier", sourceRef);
  await fillDqFormItemInput(page, "字段类型", "STR", sourceRef);
  await selectDqFormOptions(page, "质检结果", ["校验失败", "校验不通过"], sourceRef);
  await clickDqCompactButton(page, "查询", sourceRef);

  await expectVisibleRuleRows(page, sourceRef, ["供应商名称非空校验", "供应商编码格式校验"]);
  await expectNoVisibleRuleRows(page, sourceRef, ["供应商编码唯一校验", "分区记录数波动校验"]);
  await expect(body, `${sourceRef}: 字段规则筛选后应展示校验失败结果`).toContainText("校验失败", {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 字段规则筛选后应展示校验不通过结果`).toContainText(
    "校验不通过",
    {
      timeout: 30000,
    },
  );
  await expect(body, `${sourceRef}: 字段规则筛选后应展示未通过原因`).toContainText(
    /完整性校验未通过|格式校验未通过/,
    {
      timeout: 30000,
    },
  );

  await clickDqCompactButton(page, "重置", sourceRef);
  for (const ruleName of [
    "供应商名称非空校验",
    "供应商编码格式校验",
    "供应商编码唯一校验",
    "分区记录数波动校验",
  ]) {
    await expect(body, `${sourceRef}: 字段规则重置后应恢复「${ruleName}」`).toContainText(
      ruleName,
      {
        timeout: 30000,
      },
    );
  }
}

export async function expectDataQualityReportDetailSingleTableRuleFilterContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openGeneratedReportDetail(
    page,
    sourceRef,
    "供应商主数据有效性周报",
    "dwd_supplier_info_di",
  );
  await activateReportDetailSection(page, sourceRef, "单表规则");

  const body = page.locator("body");
  for (const label of ["单表规则", "规则类型", "规则名称", "质检结果"]) {
    await expect(body, `${sourceRef}: 单表规则筛选区应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  const filterForm = page.locator(".ant-form:visible").filter({ hasText: "规则名称" }).first();
  await expect(filterForm, `${sourceRef}: 单表规则筛选区不应展示字段名称筛选项`).not.toContainText(
    "字段名称",
    {
      timeout: 3000,
    },
  );
  await expect(filterForm, `${sourceRef}: 单表规则筛选区不应展示字段类型筛选项`).not.toContainText(
    "字段类型",
    {
      timeout: 3000,
    },
  );
  for (const ruleName of ["主键非空校验", "分区行数波动校验", "主键唯一校验"]) {
    await expect(body, `${sourceRef}: 单表规则初始明细应包含「${ruleName}」`).toContainText(
      ruleName,
      {
        timeout: 30000,
      },
    );
  }

  await selectDqFormOptions(page, "规则类型", ["完整性校验", "统计性校验"], sourceRef);
  await fillDqFormItemInput(page, "规则名称", "校验", sourceRef);
  await selectDqFormOptions(page, "质检结果", ["校验失败", "校验不通过"], sourceRef);
  await clickDqCompactButton(page, "查询", sourceRef);
  await expectVisibleRuleRows(page, sourceRef, ["主键非空校验", "分区行数波动校验"]);
  await expectNoVisibleRuleRows(page, sourceRef, ["主键唯一校验"]);

  await fillDqFormItemInput(page, "规则名称", "不存在的单表规则名称", sourceRef);
  await clickDqCompactButton(page, "查询", sourceRef);
  await expect(
    page.locator(".ant-table-placeholder:visible,.ant-empty:visible").first(),
    `${sourceRef}: 单表规则不存在名称筛选后应显示空状态`,
  ).toBeVisible({
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 单表规则空结果不应影响字段规则入口`).toContainText("字段规则", {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 单表规则空结果不应影响多表规则入口`).toContainText("多表规则", {
    timeout: 30000,
  });
}

export async function expectDataQualityReportDetailMultiTableRuleFilterContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openGeneratedReportDetail(
    page,
    sourceRef,
    "供应商主数据有效性周报",
    "dwd_supplier_info_di",
  );
  await activateReportDetailSection(page, sourceRef, "多表规则");

  const body = page.locator("body");
  for (const label of ["多表规则", "规则类型", "规则名称", "质检结果"]) {
    await expect(body, `${sourceRef}: 多表规则筛选区应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  const filterForm = page.locator(".ant-form:visible").filter({ hasText: "规则名称" }).first();
  await expect(filterForm, `${sourceRef}: 多表规则筛选区不应展示字段名称筛选项`).not.toContainText(
    "字段名称",
    {
      timeout: 3000,
    },
  );
  await expect(filterForm, `${sourceRef}: 多表规则筛选区不应展示字段类型筛选项`).not.toContainText(
    "字段类型",
    {
      timeout: 3000,
    },
  );
  for (const ruleName of [
    "主表与维表金额差异阈值校验",
    "主表与维表分区时效对齐校验",
    "主表与维表记录数差异校验",
  ]) {
    await expect(body, `${sourceRef}: 多表规则初始明细应包含「${ruleName}」`).toContainText(
      ruleName,
      {
        timeout: 30000,
      },
    );
  }

  await selectDqFormOptions(page, "规则类型", ["合理性校验", "时效性校验"], sourceRef);
  await fillDqFormItemInput(page, "规则名称", "主表与维表", sourceRef);
  await selectDqFormOptions(page, "质检结果", ["校验失败", "校验不通过"], sourceRef);
  await clickDqCompactButton(page, "查询", sourceRef);
  await expectVisibleRuleRows(page, sourceRef, [
    "主表与维表金额差异阈值校验",
    "主表与维表分区时效对齐校验",
  ]);
  await expectNoVisibleRuleRows(page, sourceRef, ["主表与维表记录数差异校验"]);
  await expect(body, `${sourceRef}: 多表规则筛选后应展示规则名称模糊匹配 token`).toContainText(
    "主表与维表",
    {
      timeout: 30000,
    },
  );

  await clickDqCompactButton(page, "重置", sourceRef);
  await expect(body, `${sourceRef}: 多表规则重置后应恢复原始记录`).toContainText(
    "主表与维表记录数差异校验",
    {
      timeout: 30000,
    },
  );
}

export async function expectDataQualityReportDetailDirtyDataDownloadContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openGeneratedReportDetail(page, sourceRef, "车辆订单唯一性日报", VEHICLE_ORDER_TABLE);

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 报告详情应展示车辆订单唯一性任务`).toContainText(
    "车辆订单唯一性任务",
    {
      timeout: 30000,
    },
  );
  await expect(body, `${sourceRef}: 报告详情应展示 vin 重复数校验规则`).toContainText(
    "vin重复数校验",
    {
      timeout: 30000,
    },
  );

  const ruleRow = page
    .locator(".ant-table-tbody tr:visible")
    .filter({ hasText: "vin重复数校验" })
    .first();
  await expect(ruleRow, `${sourceRef}: 规则校验明细应展示 vin 重复数校验行`).toBeVisible({
    timeout: 30000,
  });
  const detailEntry = ruleRow
    .getByText(/查看详情|查看明细/)
    .or(ruleRow.getByRole("button", { name: /查看详情|查看明细/ }))
    .or(ruleRow.getByRole("link", { name: /查看详情|查看明细/ }))
    .first();
  await expect(detailEntry, `${sourceRef}: vin 重复数校验行应展示查看详情入口`).toBeVisible({
    timeout: 30000,
  });
  await detailEntry.click({ timeout: 30000 });

  const detailScope = page
    .locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible")
    .last();
  const dirtyScope = (await detailScope.isVisible({ timeout: 5000 }).catch(() => false))
    ? detailScope
    : body;
  await expect(dirtyScope, `${sourceRef}: 脏数据明细应展示目标重复 vin`).toContainText(
    "LTV202603290001AA",
    {
      timeout: 30000,
    },
  );
  await expect(dirtyScope, `${sourceRef}: 脏数据明细应展示 vin 字段`).toContainText(/vin/i, {
    timeout: 30000,
  });

  const downloadEntry = dirtyScope
    .getByText(/下载|下载明细/)
    .or(dirtyScope.getByRole("button", { name: /下载|下载明细/ }))
    .or(dirtyScope.getByRole("link", { name: /下载|下载明细/ }))
    .first();
  await expect(downloadEntry, `${sourceRef}: 脏数据明细应展示下载入口`).toBeVisible({
    timeout: 30000,
  });

  let downloadPath = "";
  try {
    const artifact = await downloadDqArtifactWithSuggestedName(
      page,
      sourceRef,
      "report-dirty-data",
      async () => {
        await downloadEntry.click({ timeout: 30000 });
      },
    );
    downloadPath = artifact.path;
    await expectDownloadedArtifactContains(downloadPath, ["LTV202603290001AA", "vin"], sourceRef);
  } finally {
    if (downloadPath && existsSync(downloadPath)) unlinkSync(downloadPath);
  }
}

export async function expectDataQualityReportSamplingStatsContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openGeneratedReportDetail(
    page,
    sourceRef,
    "车辆质量抽样检查日报",
    VEHICLE_QUALITY_RULESET_TABLE,
  );

  const body = page.locator("body");
  for (const expectedText of ["车辆质量抽样校验任务", "抽样", "10", "质量评估", "规则校验"]) {
    await expect(body, `${sourceRef}: 抽样报告详情应展示「${expectedText}」`).toContainText(
      expectedText,
      {
        timeout: 30000,
      },
    );
  }
  await expect(body, `${sourceRef}: 抽样报告应展示通过率或规则统计`).toContainText(
    /通过率|校验规则数|规则数|表行数|抽样行数/,
    { timeout: 30000 },
  );
}

export async function expectDataQualityReportContinuousGenerationContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  let row = await openGeneratedReportListAndSearch(page, sourceRef, "车辆质量持续生成报告");
  await expect(row, `${sourceRef}: 持续生成报告应展示数据表`).toContainText(
    VEHICLE_QUALITY_RULESET_TABLE,
    {
      timeout: 30000,
    },
  );
  await expect(row, `${sourceRef}: 持续生成报告应展示持续生成中状态`).toContainText("持续生成中", {
    timeout: 30000,
  });
  const firstRowText = await row.innerText({ timeout: 30000 });
  expect(firstRowText, `${sourceRef}: 持续生成报告列表应展示生成时间`).toMatch(/\d{4}-\d{2}-\d{2}/);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await waitForUiSettled(page);
    await searchGeneratedReportByName(page, sourceRef, "车辆质量持续生成报告");
    row = page.locator(".ant-table-tbody tr").filter({ hasText: "车辆质量持续生成报告" }).first();
    const rowText = await row.innerText({ timeout: 30000 });
    if (/已生成|生成失败/.test(rowText)) break;
  }

  const finalRowText = await row.innerText({ timeout: 30000 });
  expect(finalRowText, `${sourceRef}: 持续生成报告刷新后状态应仍为已知状态`).toMatch(
    /持续生成中|已生成|生成失败/,
  );
  if (finalRowText.includes("已生成")) {
    await expect(row, `${sourceRef}: 已生成持续报告应展示报告详情入口`).toContainText("报告详情", {
      timeout: 30000,
    });
    await expect(row, `${sourceRef}: 已生成持续报告应展示下载入口`).toContainText("下载", {
      timeout: 30000,
    });
    const detailEntry = row.getByText("报告详情", { exact: true }).first();
    await detailEntry.click({ timeout: 30000 });
    await expect(page.locator("body"), `${sourceRef}: 持续报告详情应展示报告名称`).toContainText(
      "车辆质量持续生成报告",
      { timeout: 30000 },
    );
    return;
  }
  if (finalRowText.includes("生成失败")) {
    const failedDetailEntry = row.getByText("失败详情", { exact: true }).first();
    await expect(failedDetailEntry, `${sourceRef}: 生成失败持续报告应展示失败详情`).toBeVisible({
      timeout: 30000,
    });
    await failedDetailEntry.click({ timeout: 30000 });
    await expect(
      page.locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible").last(),
    ).toContainText(/失败|异常|原因|日志|error|exception/i, { timeout: 30000 });
    return;
  }

  await expect(
    row,
    `${sourceRef}: 持续生成中报告操作列应在可查看阶段展示报告详情或下载入口`,
  ).toContainText(/报告详情|下载|失败详情/, { timeout: 30000 });
}

export async function expectDataQualityReportSameTableMultiTaskContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openGeneratedReportDetail(page, sourceRef, "车辆订单多任务质量报告", VEHICLE_ORDER_TABLE);

  const body = page.locator("body");
  for (const expectedText of [
    "车辆订单完整性任务",
    "车辆订单唯一性任务",
    "完整性规则包",
    "唯一性规则包",
    "质量评估",
    "规则校验",
  ]) {
    await expect(body, `${sourceRef}: 多任务报告详情应展示「${expectedText}」`).toContainText(
      expectedText,
      {
        timeout: 30000,
      },
    );
  }

  const completenessRows = page
    .locator(".ant-table-tbody tr:visible")
    .filter({ hasText: /完整性|order_id|空值|非空/ });
  const uniquenessRows = page
    .locator(".ant-table-tbody tr:visible")
    .filter({ hasText: /唯一性|vin重复|重复数/ });
  await expect(
    completenessRows.first(),
    `${sourceRef}: 报告详情应展示车辆订单完整性任务规则结果`,
  ).toBeVisible({
    timeout: 30000,
  });
  await expect(
    uniquenessRows.first(),
    `${sourceRef}: 报告详情应展示车辆订单唯一性任务规则结果`,
  ).toBeVisible({
    timeout: 30000,
  });

  const detailText = await body.innerText({ timeout: 30000 });
  const completenessIndex = detailText.indexOf("车辆订单完整性任务");
  const uniquenessIndex = detailText.indexOf("车辆订单唯一性任务");
  expect(
    completenessIndex,
    `${sourceRef}: 报告详情应包含车辆订单完整性任务`,
  ).toBeGreaterThanOrEqual(0);
  expect(uniquenessIndex, `${sourceRef}: 报告详情应包含车辆订单唯一性任务`).toBeGreaterThanOrEqual(
    0,
  );
  expect(completenessIndex, `${sourceRef}: 两个不同任务应分别展示而非互相覆盖`).not.toBe(
    uniquenessIndex,
  );
}

export async function expectDataQualityReportSameTableMultiTaskDirtyDataContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openGeneratedReportDetail(page, sourceRef, "车辆订单多任务质量报告", VEHICLE_ORDER_TABLE);

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 多任务报告应展示完整性任务`).toContainText(
    "车辆订单完整性任务",
    {
      timeout: 30000,
    },
  );
  await expect(body, `${sourceRef}: 多任务报告应展示唯一性任务`).toContainText(
    "车辆订单唯一性任务",
    {
      timeout: 30000,
    },
  );

  await openReportRuleDirtyDetail(page, sourceRef, /order_id|空值|非空|完整性/);
  const completenessScope = await getCurrentDirtyDetailScope(page);
  await expect(
    completenessScope,
    `${sourceRef}: 完整性任务脏数据应展示 order_id 空值`,
  ).toContainText(/order_id|空值|NULL|为空/, {
    timeout: 30000,
  });
  await expect(completenessScope, `${sourceRef}: 完整性任务脏数据应展示 vin 空值`).toContainText(
    /vin|空值|NULL|为空/i,
    {
      timeout: 30000,
    },
  );
  await expect(
    completenessScope,
    `${sourceRef}: 完整性任务脏数据不应串入唯一性重复 vin`,
  ).not.toContainText("LTV202603290001AA", { timeout: 3000 });
  await closeDirtyDetailIfOverlay(page, sourceRef);

  await openReportRuleDirtyDetail(page, sourceRef, /vin重复|重复数|唯一性/);
  const uniquenessScope = await getCurrentDirtyDetailScope(page);
  await expect(uniquenessScope, `${sourceRef}: 唯一性任务脏数据应展示重复 vin`).toContainText(
    "LTV202603290001AA",
    { timeout: 30000 },
  );
  await expect(
    uniquenessScope,
    `${sourceRef}: 唯一性任务脏数据应展示重复记录数量或重复明细`,
  ).toContainText(/2|重复/, { timeout: 30000 });
  await expect(
    uniquenessScope,
    `${sourceRef}: 唯一性任务脏数据不应串入完整性 order_id 空值明细`,
  ).not.toContainText(/order_id\s*(为空|NULL|空值)/, { timeout: 3000 });
}

export async function expectDataQualityReportDimensionVehicleConfigContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const configResponse = waitForDqJson<unknown>(
    page,
    "/dassets/v1/valid/monitorSideTable/getSideTableConfig",
  );
  await gotoDataQualityPage(page, "/dq/generalConfig/dimension");
  const configPayload = await configResponse;
  expect(
    configPayload.success ?? configPayload.code === 1,
    `${sourceRef}: 报告关联维表设置配置应请求成功`,
  ).toBe(true);

  const body = page.locator("body");
  for (const label of [
    "报告关联维表设置（hive）",
    "报告关联维表设置（doris）",
    "车辆信息关联维表设置",
    "数据源",
    "数据库",
    "数据表",
    "车辆数统计字段",
    "车系关联字段",
    "车型关联字段",
    "动力类型关联字段",
  ]) {
    await expect(body, `${sourceRef}: 报告关联维表设置页面应展示「${label}」`).toContainText(
      label,
      {
        timeout: 30000,
      },
    );
  }

  const selects = page.locator(".ant-select:visible");
  const datasourceLabel = `${getDefaultDatasource().metadata.name}（${SPARKTHRIFT_SOURCE_TYPE_LABEL}）`;
  const database = getDefaultDatasource().sql.database;
  await selects.nth(1).click({ timeout: 30000 });
  const sourceDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(sourceDropdown, `${sourceRef}: 数据源下拉应包含 ${datasourceLabel}`).toContainText(
    datasourceLabel,
    {
      timeout: 30000,
    },
  );
  await sourceDropdown.getByText(datasourceLabel, { exact: true }).click({
    timeout: 30000,
  });

  await selects.nth(2).click({ timeout: 30000 });
  await page.keyboard.type(database);
  const schemaDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(schemaDropdown, `${sourceRef}: 数据库下拉应包含 ${database}`).toContainText(
    database,
    {
      timeout: 30000,
    },
  );
  await page.keyboard.press("Enter");

  await selects.nth(3).click({ timeout: 30000 });
  await page.keyboard.type(VEHICLE_INFO_DIM_TABLE);
  const tableDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(
    tableDropdown,
    `${sourceRef}: 数据表下拉应包含前置维表 ${VEHICLE_INFO_DIM_TABLE}`,
  ).toContainText(VEHICLE_INFO_DIM_TABLE, { timeout: 30000 });
  const tableClicked = await clickActiveAntdOption(page, VEHICLE_INFO_DIM_TABLE);
  expect(
    tableClicked,
    `${sourceRef}: 数据表下拉应包含可点击前置维表 ${VEHICLE_INFO_DIM_TABLE}`,
  ).toBe(true);

  await selectDqAntSelectOption(page, selects.nth(4), "车辆数统计字段", "vehicle_count", sourceRef);
  await selectDqAntSelectOption(page, selects.nth(5), "车系关联字段", "car_series_code", sourceRef);
  await selectDqAntSelectOption(page, selects.nth(6), "车型关联字段", "car_model_code", sourceRef);
  await selectDqAntSelectOption(page, selects.nth(7), "动力类型关联字段", "power_type", sourceRef);

  const saveResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/valid/monitorSideTable/") &&
      !response.url().includes("/getSideTableConfig") &&
      response.request().method() === "POST" &&
      response.status() === 200,
    { timeout: 60000 },
  );
  await clickDqCompactButton(page, "保存", sourceRef);
  const savePayload = (await (await saveResponse).json()) as DqApiResponse<unknown>;
  expect(
    savePayload.success ?? savePayload.code === 1,
    `${sourceRef}: 报告关联维表保存应请求成功`,
  ).toBe(true);
  await expect(body, `${sourceRef}: 报告关联维表保存后应提示成功`).toContainText(/成功|保存/, {
    timeout: 30000,
  });

  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForUiSettled(page);
  for (const savedText of [
    VEHICLE_INFO_DIM_TABLE,
    "vehicle_count",
    "car_series_code",
    "car_model_code",
    "power_type",
  ]) {
    await expect(body, `${sourceRef}: 再次进入页面应回显「${savedText}」`).toContainText(
      savedText,
      {
        timeout: 30000,
      },
    );
  }
}

async function selectDqAntSelectOption(
  page: Page,
  select: ReturnType<Page["locator"]>,
  label: string,
  option: string,
  sourceRef: string,
): Promise<void> {
  await expect(select, `${sourceRef}: 「${label}」下拉应可见`).toBeVisible({ timeout: 30000 });
  await select.click({ force: true, timeout: 30000 });
  await page.keyboard.type(option);
  await expect
    .poll(
      async () => {
        const optionTexts = await getActiveAntdOptionTexts(page);
        return optionTexts.some((text) => text === option || text.includes(option));
      },
      {
        message: `${sourceRef}: 「${label}」下拉应包含「${option}」`,
        timeout: 30000,
      },
    )
    .toBe(true);
  const clicked = await clickActiveAntdOption(page, option);
  expect(clicked, `${sourceRef}: 「${label}」下拉应包含可点击选项「${option}」`).toBe(true);
  await expect(select, `${sourceRef}: 「${label}」应回显「${option}」`).toContainText(option, {
    timeout: 30000,
  });
}

async function chooseDqRadioOptionByText(
  page: Page,
  optionText: string,
  sourceRef: string,
): Promise<void> {
  const radio = page.getByRole("radio", { name: optionText }).first();
  if (await radio.isVisible({ timeout: 3000 }).catch(() => false)) {
    await radio.check({ timeout: 30000 });
  } else {
    await page.getByText(optionText, { exact: true }).last().click({ timeout: 30000 });
  }
  await expect(
    page.getByRole("radio", { name: optionText }),
    `${sourceRef}: 单选项应选中「${optionText}」`,
  ).toBeChecked({
    timeout: 30000,
  });
}

function expectGeneratedReportPage(
  pageData: DqGeneratedReportPage,
  message: string,
): DqGeneratedReportRecord[] {
  const records = pageData.contentList ?? [];
  expect(Number(pageData.current), `${message}: current 应为数字`).toBeGreaterThan(0);
  expect(Number(pageData.size), `${message}: size 应为数字`).toBeGreaterThan(0);
  expect(Number(pageData.total), `${message}: total 应覆盖当前返回记录数`).toBeGreaterThanOrEqual(
    records.length,
  );
  expect(records.length, message).toBeGreaterThan(0);
  for (const record of records) {
    expectNonEmptyString(record.reportName, `${message}: 报告记录应包含报告名称`);
    expectNonEmptyString(record.execEndTime, `${message}: 报告记录应包含生成时间`);
    formatGeneratedReportGenerateType(record.reportGenerateType, message);
    formatGeneratedReportStatus(record.status, message);
  }
  return records;
}

function expectGeneratedReportFilterTarget(
  records: DqGeneratedReportRecord[],
  sourceRef: string,
): DqGeneratedReportRecord {
  const target = records.find(
    (record) =>
      record.id &&
      record.reportName &&
      record.tableNames &&
      record.execEndTime?.startsWith("2026-05"),
  );
  expect(
    target,
    `${sourceRef}: 当前环境应存在可用于报告名称、数据表和生成时间组合筛选的报告记录`,
  ).toBeTruthy();
  return target as DqGeneratedReportRecord;
}

function formatGeneratedReportGenerateType(reportGenerateType: unknown, sourceRef: string): string {
  expect([1, 2], `${sourceRef}: reportGenerateType 应为已知生成样式`).toContain(reportGenerateType);
  return reportGenerateType === 1 ? "分析式" : "质检式";
}

function formatGeneratedReportStatus(status: unknown, sourceRef: string): string {
  const labels = new Map<unknown, string>([
    [0, "待生成"],
    [1, "生成中"],
    [2, "已生成"],
    [3, "生成失败"],
    [4, "持续生成中"],
  ]);
  const label = labels.get(status);
  expect(label, `${sourceRef}: status 应为已生成报告已知状态`).toBeTruthy();
  return label as string;
}
