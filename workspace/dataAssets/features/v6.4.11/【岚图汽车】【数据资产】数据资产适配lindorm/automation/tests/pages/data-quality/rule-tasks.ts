// Lindorm 数据资产适配用例的规则任务页面流程与断言。

import { expect, type Page } from "@playwright/test";
import { VEHICLE_QUALITY_RULESET_TABLE } from "../../fixtures/data-quality-tables";
import { expectDqPage } from "./page-context";
import {
  expectDqSuccess,
  getDqRuleTaskRecords,
  waitForDqJson,
  waitForRuleTaskPageQuery,
} from "../../../../../../../_shared/automation/pages/data-quality/api";
import type { DqMonitorRecordPage } from "../../../../../../../_shared/automation/pages/data-quality/contracts";
import {
  chooseDqFieldOptionByText,
  clickDqCompactButton,
  clickDqText,
} from "../../../../../../../_shared/automation/pages/data-quality/form-controls";
import { gotoDataQualityPage } from "../../../../../../../_shared/automation/pages/data-quality/project-context";
import { expectMonitorRecordPage } from "../../../../../../../_shared/automation/pages/data-quality/record-assertions";
import {
  gotoMonitorRecordQueryPage,
  submitMonitorRecordSearch,
} from "../../../../../../../_shared/automation/pages/data-quality/monitor-record-page";
import {
  gotoRuleTaskScheduleAttributesPage,
  runRuleTaskImmediately,
  searchRuleTaskByTableName,
} from "../../../../../../../_shared/automation/pages/data-quality/rule-task-page";

export async function expectDataQualityRuleShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/rule",
    labels: ["规则任务管理", "新建监控规则", "最近修改人", "我收藏的表"],
    tableHeaders: [
      "表",
      "任务名称",
      "数据源",
      "执行周期",
      "规则状态",
      "是否关联任务",
      "最近30天告警数",
      "最近修改人",
      "最近修改时间",
      "操作",
    ],
    apiPaths: ["/dassets/v1/valid/monitor/pageQuery"],
  });
}

export async function expectDataQualityRuleTaskCreateEntry(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule");
  await clickDqText(page, "新建监控规则", sourceRef);
  await expect(page, `${sourceRef}: 新建监控规则应进入 /dq/rule/add`).toHaveURL(/\/dq\/rule\/add/);

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
    await expect(body, `${sourceRef}: 新建监控规则页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
}

export async function expectDataQualityRuleTaskTimeoutHandlingContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆质量立即生成任务";
  await openRuleTaskScheduleForExistingTask(page, sourceRef, ruleName);
  await chooseDqFieldOptionByText(page, /超时时间/, "1分钟", sourceRef).catch(async () => {
    await chooseDqFieldOptionByText(page, /超时时间/, "1", sourceRef);
  });
  await clickDqCompactButton(page, "保存", sourceRef);
  await expect(
    page.locator("body"),
    `${sourceRef}: 短超时时间保存后应提示成功或返回规则任务管理`,
  ).toContainText(/成功|规则任务管理/, { timeout: 30000 });

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef).catch(() => {});
  const savedRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(savedRow, `${sourceRef}: 保存短超时后任务行应仍可见`).toBeVisible({
    timeout: 30000,
  });
  await runRuleTaskImmediately(page, sourceRef, savedRow);
  await expectLatestMonitorRecordTimeoutForRuleTask(page, sourceRef, ruleName);
}

async function openRuleTaskScheduleForExistingTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const initialResponse = waitForRuleTaskPageQuery(page);
  void initialResponse.catch(() => {});
  await gotoDataQualityPage(page, "/dq/rule");
  const initialRecords = getDqRuleTaskRecords(await initialResponse);
  const targetRecord = initialRecords.find((record) => record.ruleName === ruleName);
  expect(targetRecord, `${sourceRef}: 当前环境应存在规则任务「${ruleName}」`).toBeTruthy();

  await searchRuleTaskByTableName(page, VEHICLE_QUALITY_RULESET_TABLE, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: VEHICLE_QUALITY_RULESET_TABLE })
    .filter({ hasText: ruleName })
    .first();
  await expect(taskRow, `${sourceRef}: 规则任务列表应展示 ${ruleName}`).toBeVisible({
    timeout: 30000,
  });
  await taskRow.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });
  await gotoRuleTaskScheduleAttributesPage(page, sourceRef);
}

async function expectLatestMonitorRecordTimeoutForRuleTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const searchInput = await gotoMonitorRecordQueryPage(page, sourceRef);
  const responsePromise = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) => (payload.data?.data ?? []).some((record) => record.ruleName === ruleName),
  );
  void responsePromise.catch(() => {});
  await searchInput.fill(ruleName, { timeout: 30000 });
  await submitMonitorRecordSearch(page);
  const records = expectMonitorRecordPage(
    expectDqSuccess(await responsePromise, `${sourceRef}: 短超时任务校验结果查询应返回实例`),
    `${sourceRef}: 短超时任务校验结果查询应展示实例`,
  );
  const target = records.find((record) => record.ruleName === ruleName);
  expect(target, `${sourceRef}: 校验结果查询应包含短超时任务实例`).toBeTruthy();

  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 校验结果列表应展示短超时任务实例`).toBeVisible({
    timeout: 30000,
  });
  await expect(targetRow, `${sourceRef}: 短超时实例应展示失败或超时状态`).toContainText(
    /超时|timeout|失败|异常/i,
    { timeout: 30000 },
  );

  const logEntry = targetRow
    .getByRole("button", { name: /查看日志|日志/ })
    .or(targetRow.getByText(/查看日志|日志/))
    .first();
  if (await logEntry.isVisible({ timeout: 3000 }).catch(() => false)) {
    await logEntry.click({ timeout: 30000 });
    const logPanel = page
      .locator(".ant-modal:visible, .ant-drawer:visible, [role='dialog']:visible, body")
      .last();
    await expect(logPanel, `${sourceRef}: 短超时任务日志应包含超时原因`).toContainText(
      /超时|timeout/i,
      {
        timeout: 30000,
      },
    );
  }
}

// ─── 数据质量规则任务新建页抽样检查设置 Shell（t29） ───

export async function expectDataQualitySamplingConfigShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule/add");
  await expect(page, `${sourceRef}: 新建监控规则应进入 /dq/rule/add`).toHaveURL(/\/dq\/rule\/add/);
  const body = page.locator("body");
  for (const label of ["新建单表校验规则", "监控对象", "规则名称", "选择数据源", "下一步"]) {
    await expect(body, `${sourceRef}: 新建监控规则页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  // 核验数据预览与抽样检查设置入口可见
  await expect(body, `${sourceRef}: 新建监控规则页面应展示数据预览区域`).toContainText(/数据预览/, {
    timeout: 30000,
  });
  const samplingArea = page
    .locator(".ant-form-item, .ant-row, .ant-card, section, div")
    .filter({ hasText: /抽样检查|抽样行数|采样行数/ })
    .first();
  const samplingVisible = await samplingArea.isVisible({ timeout: 5000 }).catch(() => false);
  if (!samplingVisible) {
    // 点击数据预览区域展开抽样配置（按钮形式入口）
    const previewButton = page.getByRole("button", { name: /数据预览/ }).first();
    const previewVisible = await previewButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (previewVisible) await previewButton.click().catch(() => {});
  }
  await expect(
    page
      .locator(".ant-form-item, .ant-row, .ant-card, section, div")
      .filter({ hasText: /抽样检查|抽样行数|采样行数/ })
      .first(),
    `${sourceRef}: 新建监控规则页面应展示抽样检查设置区域`,
  ).toBeVisible({ timeout: 30000 });
  // 抽样检查开关可见
  const samplingSwitch = page
    .locator(".ant-form-item, .ant-row, .ant-card, section, div")
    .filter({ hasText: /抽样检查|抽样行数|采样行数/ })
    .first()
    .locator(".ant-switch, [role='switch']")
    .first();
  await expect(samplingSwitch, `${sourceRef}: 抽样检查设置开关应可见`).toBeVisible({
    timeout: 15000,
  });
}
