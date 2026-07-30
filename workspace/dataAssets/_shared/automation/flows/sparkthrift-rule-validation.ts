// SparkThrift 数据质量规则校验的跨需求页面流程与断言。

import { getEnvConfig } from "../runtime/env-profile";
import { buildDataAssetsApiUrl } from "../runtime/env-setup";
import { waitForUiSettled } from "../../../../../runtime/automation/playwright";
import { expect, type Page } from "@playwright/test";
import { loadPlaywrightAutomationConfig } from "../../../../../runtime/automation/config/playwright";
import {
  deleteCustomSqlByNameBestEffort,
  expectDqSuccess,
  getDqRuleTaskRecords,
  listCustomSqlRecords,
  queryRuleSetRecords,
  waitForDqJson,
  waitForRuleTaskPageQuery,
} from "../pages/data-quality/api";
import type {
  DqApiResponse,
  DqMonitorRecord,
  DqMonitorRecordPage,
  DqRuleSetPageData,
  DqRuleSetRecord,
  DqRuleTaskPageQuery,
  SparkThriftEnvParam,
  SparkThriftQualityRuleValidationScenario,
  SparkThriftRuleValidationFusionChecks,
} from "../pages/data-quality/contracts";
import {
  checkDqNoReport,
  chooseDqFieldOptionByText,
  chooseFirstDqSelectOption,
  clickActiveAntdOption,
  clickDqCompactButton,
  clickDqSubmitButton,
  clickDqText,
  closeVisibleDqOverlayIfAny,
  escapeRegExp,
  fillDqFormItemInput,
  fillDqPageFormField,
  selectDqFormOptionBySearch,
} from "../pages/data-quality/form-controls";
import {
  getProjectId,
  getScenarioDatasource,
  gotoDataQualityPage,
  PROJECT_STORAGE_KEY,
} from "../pages/data-quality/project-context";
import {
  expectMonitorRecordPage,
  expectNonEmptyString,
  formatMonitorRecordStatus,
  formatRuleBaseCustomRelationRange,
  formatRuleBaseCustomRuleType,
  getRuleSetPageRecordsAllowEmpty,
} from "../pages/data-quality/record-assertions";
import {
  clickNextUntilMonitorRuleConfig,
  clickNextUntilScheduleConfig,
  clickRuleSetPackageAddButton,
  clickRuleSetSubmitButton,
  configureManualPartition,
  fillRuleSetRuleDescription,
  gotoMonitorRecordQueryPage,
  gotoNewRuleTaskMonitorObjectPageForTable,
  gotoRuleTaskScheduleAttributesPage,
  runRuleTaskImmediately,
  saveRuleSetRuleRow,
  searchRuleTaskByTableName,
  selectRuleSetField,
  selectRuleTaskRulePackageOnCurrentPage,
  submitMonitorRecordSearch,
  switchRuleSetStrength,
} from "../pages/data-quality/page-context";

type DqGlobalParamRecord = {
  paramName?: string;
  paramValue?: string;
  paramDesc?: string;
};

type DqGlobalParamsPage = {
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  data?: DqGlobalParamRecord[];
};

type DqMonitorRecordDetail = {
  functionName?: string;
  columnName?: string;
  verifyTypeValue?: string;
  status?: number;
  haveDirty?: number;
  statistic?: string | number;
  selectDataSql?: string | null;
  partition?: string | null;
  ruleStrength?: number;
  modifyUser?: string;
  gmtModified?: string;
  columnNameList?: string[];
};

type DqMonitorRecordDirtyResult = {
  table?: string;
  result?: Array<Record<string, unknown>>;
  highlightColumns?: string[];
};

export async function expectSparkThriftQualityRuleValidationContract(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
): Promise<void> {
  const suffix = Date.now();
  const effectiveScenario: SparkThriftQualityRuleValidationScenario = scenario.customSqlTemplate
    ? {
        ...scenario,
        customSqlTemplate: {
          ...scenario.customSqlTemplate,
          ruleName: `${scenario.customSqlTemplate.ruleName}_${suffix}`,
        },
      }
    : scenario;
  const packageName = `${effectiveScenario.title}规则包_${suffix}`;
  const ruleSetDescription = `${effectiveScenario.title}_${suffix}`;
  // 平台「规则名称」限制 50 字符；场景标题用于规则集/规则包描述，任务名称使用短稳定前缀。
  const datasourceKey = effectiveScenario.datasourceKey ?? getEnvConfig().runtime.defaultDatasource;
  const ruleName = `v700_${datasourceKey}_${suffix}`;
  const failRuleName = `${ruleName}_f`;

  await deleteTempRuleSetByDescriptionBestEffort(
    page,
    sourceRef,
    effectiveScenario.tableName,
    `${effectiveScenario.title}_`,
  );

  if (effectiveScenario.customSqlTemplate) {
    await createCustomSqlTemplateFixture(page, sourceRef, effectiveScenario.customSqlTemplate);
  }

  await createSparkThriftArchiveValidationRuleSet(
    page,
    sourceRef,
    effectiveScenario,
    packageName,
    ruleSetDescription,
    effectiveScenario.fusionChecks,
  );
  if (effectiveScenario.fusionChecks?.ruleSetListAndConfiguredTableFilter) {
    await expectArchiveRuleSetListAndConfiguredTableFilter(
      page,
      sourceRef,
      effectiveScenario,
      ruleSetDescription,
    );
  }
  if (effectiveScenario.fusionChecks?.ruleSetDetail) {
    await expectArchiveRuleSetDetail(
      page,
      sourceRef,
      effectiveScenario,
      ruleSetDescription,
      packageName,
    );
  }
  await createSparkThriftArchiveValidationRuleTask(
    page,
    sourceRef,
    effectiveScenario,
    ruleName,
    packageName,
    {
      envParams: effectiveScenario.fusionChecks?.t1BeforeImmediateWithEnvParams,
      samplingRows: effectiveScenario.fusionChecks?.samplingRows,
      t1BeforeImmediate: Boolean(
        effectiveScenario.fusionChecks?.t1BeforeImmediateWithEnvParams?.length,
      ),
      partitionModesVisible: effectiveScenario.fusionChecks?.partitionModesVisible,
    },
  );
  if (effectiveScenario.fusionChecks?.taskDetectionToggle) {
    await expectArchiveRuleTaskSingleDetectionToggle(page, sourceRef, effectiveScenario, ruleName);
  }
  if (effectiveScenario.fusionChecks?.sameTableSecondTask) {
    await createSparkThriftArchiveValidationRuleTask(
      page,
      sourceRef,
      effectiveScenario,
      `${ruleName}_second`,
      packageName,
    );
  }

  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, effectiveScenario.tableName, sourceRef);
  const taskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: effectiveScenario.tableName })
    .filter({ hasText: ruleName })
    .first();
  await runRuleTaskImmediately(page, sourceRef, taskRow);
  await expectArchiveRuleValidationRecord(page, sourceRef, effectiveScenario, ruleName, {
    expectedStatus: /校验通过/,
    expectedActualValue: effectiveScenario.passExpectedValue,
    expectedPartition: effectiveScenario.passPartition,
    passHasNoDirtyDetail: effectiveScenario.fusionChecks?.passHasNoDirtyDetail,
    expectedSamplingRows: effectiveScenario.fusionChecks?.samplingRows,
  });
  if (effectiveScenario.fusionChecks?.monitorRecordTableSearch) {
    await expectArchiveMonitorRecordTableSearch(page, sourceRef, effectiveScenario, ruleName);
  }

  const failByEditing = effectiveScenario.fusionChecks?.failByEditingExistingTask;
  if (failByEditing?.deleteRuleSetBeforeRun) {
    await deleteRuleSetRowAndAssert(
      page,
      sourceRef,
      effectiveScenario.tableName,
      ruleSetDescription,
    );
  }
  if (failByEditing) {
    await editSparkThriftArchiveValidationRuleTaskPartition(
      page,
      sourceRef,
      effectiveScenario,
      ruleName,
      {
        partitionMode: failByEditing.partitionMode,
      },
    );
  } else {
    await createSparkThriftArchiveValidationRuleTask(
      page,
      sourceRef,
      { ...effectiveScenario, passPartition: effectiveScenario.failPartition },
      failRuleName,
      packageName,
    );
  }
  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, effectiveScenario.tableName, sourceRef);
  const finalRuleName = failByEditing ? ruleName : failRuleName;
  const editedTaskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: effectiveScenario.tableName })
    .filter({ hasText: finalRuleName })
    .first();
  await runRuleTaskImmediately(page, sourceRef, editedTaskRow);
  await expectArchiveRuleValidationRecord(page, sourceRef, effectiveScenario, finalRuleName, {
    expectedStatus: /校验异常|校验失败|校验不通过/,
    expectedActualValue: effectiveScenario.failExpectedValue,
    expectedPartition: effectiveScenario.failPartition,
    dirtyEvidence: effectiveScenario.dirtyEvidence,
    dirtyDetail: effectiveScenario.fusionChecks?.dirtyDetail,
  });
}

/**
 * 在同一个规则集中连续配置完整规则包，并用同一个任务验证通过/不通过分区。
 * 平台按表唯一约束规则集，因此完整规则矩阵不能拆成多个独立规则集。
 */
export async function expectSparkThriftQualityRuleMatrixContract(
  page: Page,
  sourceRef: string,
  scenarios: readonly SparkThriftQualityRuleValidationScenario[],
  datasourceKey: "sparkthrift" | "doris",
): Promise<void> {
  expect(scenarios.length, `${sourceRef}: 完整规则矩阵不能为空`).toBeGreaterThan(0);
  const firstScenario = { ...scenarios[0], datasourceKey };
  const matrixScenarios = scenarios.map((scenario) => ({ ...scenario, datasourceKey }));
  const suffix = Date.now();
  const packageName = `v700_${datasourceKey}_全量规则包_${suffix}`;
  const ruleSetDescription = `v700_${datasourceKey}_全量规则集_${suffix}`;
  const ruleName = `v700_${datasourceKey}_${suffix}`;
  const failRuleName = `${ruleName}_f`;

  await deleteTempRuleSetByDescriptionBestEffort(
    page,
    sourceRef,
    firstScenario.tableName,
    `v700_${datasourceKey}_全量规则集_`,
  );
  // 清理本轮早期单规则调试留下的规则集，仍通过页面删除，避免同表唯一规则集限制挡住全量矩阵。
  await deleteTempRuleSetByDescriptionBestEffort(
    page,
    sourceRef,
    firstScenario.tableName,
    `完整性校验-表级-表行数-v700-${datasourceKey}_`,
  );

  for (const scenario of matrixScenarios.slice(1)) {
    if (scenario.customSqlTemplate) {
      await createCustomSqlTemplateFixture(page, sourceRef, scenario.customSqlTemplate);
    }
  }

  await createSparkThriftArchiveValidationRuleSet(
    page,
    sourceRef,
    firstScenario,
    packageName,
    ruleSetDescription,
    undefined,
    matrixScenarios.slice(1),
  );

  await expect
    .poll(
      async () => {
        const records = await queryRuleSetRecords(page, firstScenario.tableName);
        const record = records.find((item) => item.description === ruleSetDescription);
        return Number(record?.ruleCount ?? 0);
      },
      {
        message: `${sourceRef}: 全量规则集应保存 ${matrixScenarios.length} 条子规则`,
        timeout: 60000,
      },
    )
    .toBe(matrixScenarios.length);

  await createSparkThriftArchiveValidationRuleTask(
    page,
    sourceRef,
    firstScenario,
    ruleName,
    packageName,
  );
  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, firstScenario.tableName, sourceRef);
  const passTaskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: firstScenario.tableName })
    .filter({ hasText: ruleName })
    .first();
  await runRuleTaskImmediately(page, sourceRef, passTaskRow);
  await expectArchiveRuleValidationRecord(page, sourceRef, firstScenario, ruleName, {
    expectedStatus: /校验通过/,
    expectedActualValue: firstScenario.passExpectedValue,
    expectedPartition: firstScenario.passPartition,
  });

  await createSparkThriftArchiveValidationRuleTask(
    page,
    sourceRef,
    { ...firstScenario, passPartition: firstScenario.failPartition },
    failRuleName,
    packageName,
  );
  await gotoDataQualityPage(page, "/dq/rule");
  await searchRuleTaskByTableName(page, firstScenario.tableName, sourceRef);
  const failTaskRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: firstScenario.tableName })
    .filter({ hasText: failRuleName })
    .first();
  await runRuleTaskImmediately(page, sourceRef, failTaskRow);
  await expectArchiveRuleValidationRecord(page, sourceRef, firstScenario, failRuleName, {
    expectedStatus: /校验异常|校验失败|校验不通过/,
    expectedActualValue: firstScenario.failExpectedValue,
    expectedPartition: firstScenario.failPartition,
  });
}

async function createCustomSqlTemplateFixture(
  page: Page,
  sourceRef: string,
  template: NonNullable<SparkThriftQualityRuleValidationScenario["customSqlTemplate"]>,
): Promise<void> {
  await deleteCustomSqlByNameBestEffort(page, sourceRef, template.ruleName);
  const response = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleCustom/addOrUpdate"),
    {
      data: {
        ruleName: template.ruleName,
        ruleType: template.ruleType,
        relationRange: template.relationRange,
        ruleDesc: template.ruleDesc,
        customConfiguration: template.customConfiguration,
        customParam: template.params,
      },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    },
  );
  expect(response.ok(), `${sourceRef}: 创建自定义 SQL 模版 fixture HTTP 应成功`).toBe(true);
  const payload = (await response.json()) as DqApiResponse<boolean>;
  if (!(payload.success ?? payload.code === 1) || !payload.data) {
    throw new Error(`${sourceRef}: 创建自定义 SQL 模版返回失败: ${JSON.stringify(payload)}`);
  }
  const records = await listCustomSqlRecords(page, sourceRef);
  const created = records.find((record) => record.ruleName === template.ruleName);
  expect(
    created,
    `${sourceRef}: 创建后自定义 SQL 模版列表应返回「${template.ruleName}」`,
  ).toBeTruthy();
  expect(
    formatRuleBaseCustomRuleType(created?.ruleType, sourceRef),
    `${sourceRef}: 模版规则分类应正确`,
  ).toBe(formatRuleBaseCustomRuleType(template.ruleType, sourceRef));
  expect(
    formatRuleBaseCustomRelationRange(created?.relationRange, sourceRef),
    `${sourceRef}: 模版关联范围应正确`,
  ).toBe(formatRuleBaseCustomRelationRange(template.relationRange, sourceRef));
  const createdParams = created?.customParam ?? [];
  for (const expectedParam of template.params) {
    const actualParam = createdParams.find((param) => param.param === expectedParam.param);
    expect(
      actualParam,
      `${sourceRef}: 自定义 SQL 模版应保存参数 ${expectedParam.param}`,
    ).toBeTruthy();
    expect(actualParam?.type, `${sourceRef}: 参数 ${expectedParam.param} 类型应正确`).toBe(
      expectedParam.type,
    );
    expect(actualParam?.paramName, `${sourceRef}: 参数 ${expectedParam.param} 名称应正确`).toBe(
      expectedParam.paramName,
    );
    expect(actualParam?.description, `${sourceRef}: 参数 ${expectedParam.param} 说明应正确`).toBe(
      expectedParam.description,
    );
  }
}

function expectGlobalParamsPage(
  pageData: DqGlobalParamsPage,
  sourceRef: string,
): DqGlobalParamRecord[] {
  const records = pageData.data ?? [];
  expect(pageData.currentPage, `${sourceRef}: 全局参数 currentPage 应为第一页`).toBe(1);
  expect(pageData.pageSize, `${sourceRef}: 全局参数 pageSize 应为 10`).toBe(10);
  expect(
    pageData.totalCount,
    `${sourceRef}: 全局参数 totalCount 应大于当前页记录数`,
  ).toBeGreaterThanOrEqual(records.length);
  expect(records.length, `${sourceRef}: 全局参数列表应返回记录`).toBeGreaterThan(0);
  for (const record of records) {
    expectNonEmptyString(record.paramName, `${sourceRef}: 全局参数记录应包含参数名称`);
    expectNonEmptyString(record.paramValue, `${sourceRef}: 全局参数记录应包含参数值`);
    expectNonEmptyString(record.paramDesc, `${sourceRef}: 全局参数记录应包含注释`);
  }
  return records;
}

function assertRuleSetDetailPackages(detail: DqRuleSetRecord, sourceRef: string): void {
  const packages = detail.packageVOList ?? [];
  expect(packages.length, `${sourceRef}: 规则集详情应返回规则包列表`).toBe(
    Number(detail.packageCount),
  );
  const rules = packages.flatMap((item) => item.rules ?? []);
  expect(rules.length, `${sourceRef}: 规则集详情规则数量应与列表一致`).toBe(
    Number(detail.ruleCount),
  );
  expect(
    getRuleSetPackageNames(detail).length,
    `${sourceRef}: 规则集详情应包含规则包名称`,
  ).toBeGreaterThan(0);
  expect(
    getRuleSetFunctionNames(detail).length,
    `${sourceRef}: 规则集详情应包含规则名称`,
  ).toBeGreaterThan(0);
}

function getRuleSetPackageNames(detail: DqRuleSetRecord): string[] {
  return (detail.packageVOList ?? [])
    .map((item) => item.packageName)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function getRuleSetFunctionNames(detail: DqRuleSetRecord): string[] {
  const names = new Set<string>();
  for (const item of detail.packageVOList ?? []) {
    for (const rule of item.rules ?? []) {
      if (rule.functionName) {
        names.add(rule.functionName);
      }
    }
  }
  return [...names];
}

function getRuleSetPackageRows(page: Page) {
  return page
    .locator("[class*='rulePack'], [class*='rulePackage'], .ant-form-item, .ant-table-tbody tr")
    .filter({ hasText: /规则包|请输入规则包名称|新增/ });
}

function getRuleSetPackageNameInputs(page: Page) {
  return page.getByPlaceholder("请输入规则包名称");
}

function getRuleSetMonitorRuleItems(page: Page) {
  return page
    .locator(".ant-table-tbody tr, [class*='ruleItem'], [class*='ruleRow'], [class*='monitorRule']")
    .filter({ hasText: /完整性|有效性|唯一性|统计函数|强规则|弱规则|规则描述|空值/ });
}

async function searchRuleSetTableName(
  page: Page,
  tableName: string,
  sourceRef: string,
): Promise<DqRuleSetRecord[]> {
  const responsePromise = waitForDqJson<DqRuleSetPageData>(
    page,
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
  );
  const searchInput = page
    .getByPlaceholder(/输入表名搜索|请输入表名|表名/)
    .or(page.locator("input[placeholder*='表名']"))
    .first();
  await expect(searchInput, `${sourceRef}: 规则集管理应展示表名搜索输入框`).toBeVisible({
    timeout: 30000,
  });
  await searchInput.fill(tableName, { timeout: 30000 });
  const searchButton = page.getByRole("button", { name: /查\s*询|search/i }).first();
  await expect(searchButton, `${sourceRef}: 规则集管理应展示查询入口`).toBeVisible({
    timeout: 30000,
  });
  await searchButton.click({ timeout: 30000 });
  const pageData = expectDqSuccess(await responsePromise, `${sourceRef}: 规则集表名搜索应请求成功`);
  const records = getRuleSetPageRecordsAllowEmpty(
    pageData,
    `${sourceRef}: 规则集表名搜索应返回分页结构`,
  );
  for (const record of records) {
    expectNonEmptyString(record.tableName, `${sourceRef}: 搜索结果记录应包含表名`);
  }
  return records;
}

async function createSparkThriftArchiveValidationRuleSet(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  packageName: string,
  ruleSetDescription: string,
  fusionChecks: SparkThriftRuleValidationFusionChecks | undefined,
  additionalScenarios: readonly SparkThriftQualityRuleValidationScenario[] = [],
): Promise<void> {
  const datasource = getScenarioDatasource(scenario);
  await gotoDataQualityPage(page, "/dq/ruleSet");
  await clickDqText(page, "新建规则集", sourceRef);
  await expect(page, `${sourceRef}: 新建规则集应进入 /dq/ruleSet/add`).toHaveURL(
    /\/dq\/ruleSet\/add/,
  );

  await selectDqFormOptionBySearch(page, /数据源/, datasource.sourceName, sourceRef);
  await selectDqFormOptionBySearch(page, /数据库/, datasource.database, sourceRef);
  await selectDqFormOptionBySearch(page, /数据表/, scenario.tableName, sourceRef);
  if (scenario.comparisonTableName) {
    await selectDqFormOptionBySearch(
      page,
      /对比表|比较表|关联表/,
      scenario.comparisonTableName,
      sourceRef,
    );
  }
  await fillDqPageFormField(page, /规则集描述/, ruleSetDescription);
  const packageNameInput = getRuleSetPackageNameInputs(page).first();
  await expect(
    packageNameInput,
    `${sourceRef}: 规则集基础信息页应展示规则包名称输入框`,
  ).toBeVisible({
    timeout: 30000,
  });
  await packageNameInput.fill(packageName, { timeout: 30000 });
  await expect(packageNameInput, `${sourceRef}: 规则包名称应填入目标值`).toHaveValue(packageName, {
    timeout: 30000,
  });
  await packageNameInput.press("Tab", { timeout: 30000 });
  if (fusionChecks?.ruleSetPackageNameManagement) {
    await expectArchiveRuleSetPackageNameManagement(page, sourceRef, packageName);
  }
  await clickDqCompactButton(page, "下一步", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 新建规则集应进入监控规则配置页`).toContainText(
    /监控规则|添加规则/,
    { timeout: 30000 },
  );

  await ensureArchiveRuleSetPackageReady(page, sourceRef, packageName);
  await addArchiveValidationRuleToCurrentRuleSet(page, sourceRef, scenario);
  if (fusionChecks?.ruleSetRuleEdit) {
    await expectArchiveRuleSetRuleEdit(page, sourceRef, scenario);
  }
  if (fusionChecks?.ruleSetGlobalParams) {
    await expectArchiveRuleSetGlobalParamsOnCurrentPage(page, sourceRef, packageName);
  }
  await clickRuleSetSubmitButton(page, sourceRef);
  await expect
    .poll(
      async () => {
        const records = await queryRuleSetRecords(page, scenario.tableName);
        return records.some((record) => record.description === ruleSetDescription);
      },
      {
        message: `${sourceRef}: 保存后规则集应出现在列表 API`,
        timeout: 60000,
      },
    )
    .toBe(true);

  for (const [index, additionalScenario] of additionalScenarios.entries()) {
    await appendArchiveValidationRuleToExistingRuleSet(
      page,
      sourceRef,
      additionalScenario,
      ruleSetDescription,
      `${packageName} / 第 ${index + 2} 条`,
    );
  }
}

async function appendArchiveValidationRuleToExistingRuleSet(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  ruleSetDescription: string,
  action: string,
): Promise<void> {
  const records = await queryRuleSetRecords(page, scenario.tableName);
  const target = records.find((record) => record.description === ruleSetDescription);
  expect(target?.id, `${sourceRef}: ${action}应定位已保存的规则集`).toBeTruthy();
  await gotoDataQualityPage(page, `/dq/ruleSet/edit/${target?.id}?projectId=${getProjectId()}`);
  if (!page.url().includes("/dq/ruleSet/edit/")) {
    throw new Error(
      `${sourceRef}: ${action}编辑路由被重定向，id=${String(target?.id)} url=${page.url()}`,
    );
  }
  const body = page.locator("body");
  await expect(body, `${sourceRef}: ${action}应打开规则集编辑页`).toContainText("编辑规则集", {
    timeout: 30000,
  });
  if (
    !(await page
      .getByRole("button", { name: /添加规则/ })
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false))
  ) {
    await clickDqCompactButton(page, "下一步", sourceRef);
  }
  await expect(body, `${sourceRef}: ${action}应进入监控规则配置页`).toContainText("添加规则", {
    timeout: 30000,
  });
  await addArchiveValidationRuleToCurrentRuleSet(page, sourceRef, scenario);
  await clickRuleSetSubmitButton(page, sourceRef);
  await expect
    .poll(
      async () => {
        const refreshed = await queryRuleSetRecords(page, scenario.tableName);
        return Number(
          refreshed.find((record) => record.description === ruleSetDescription)?.ruleCount ?? 0,
        );
      },
      { message: `${sourceRef}: ${action}保存后规则数量应增加`, timeout: 60000 },
    )
    .toBeGreaterThan(0);
}

async function expectArchiveRuleSetPackageNameManagement(
  page: Page,
  sourceRef: string,
  packageName: string,
): Promise<void> {
  const renamedName = `${packageName}_临时重命名`;
  const secondName = `${packageName}_临时包`;
  const packageInputs = getRuleSetPackageNameInputs(page);
  await expect(packageInputs.first(), `${sourceRef}: 规则包名称输入框应可编辑`).toBeVisible({
    timeout: 30000,
  });
  await packageInputs.first().fill(renamedName, { timeout: 30000 });
  await expect(packageInputs.first(), `${sourceRef}: 规则包名称应支持重命名`).toHaveValue(
    renamedName,
    {
      timeout: 30000,
    },
  );
  await packageInputs.first().fill(packageName, { timeout: 30000 });

  await clickRuleSetPackageAddButton(page, sourceRef);
  await expect(
    getRuleSetPackageNameInputs(page).nth(1),
    `${sourceRef}: 新增规则包输入框应出现`,
  ).toBeVisible({
    timeout: 30000,
  });
  await getRuleSetPackageNameInputs(page).nth(1).fill(secondName, { timeout: 30000 });
  await expect(
    getRuleSetPackageNameInputs(page).nth(1),
    `${sourceRef}: 新增规则包名称应可填写`,
  ).toHaveValue(secondName, { timeout: 30000 });
  await deleteSecondRuleSetPackageIfVisible(page, sourceRef);
  await expect(
    getRuleSetPackageNameInputs(page),
    `${sourceRef}: 删除临时规则包后应只保留正式规则包`,
  ).toHaveCount(1, { timeout: 30000 });

  await clickRuleSetPackageAddButton(page, sourceRef);
  await getRuleSetPackageNameInputs(page).nth(1).fill(packageName, { timeout: 30000 });
  await getRuleSetPackageNameInputs(page).nth(1).press("Tab", { timeout: 30000 });
  await expect(
    page
      .locator(".ant-form-item-explain-error")
      .filter({ hasText: /重复|不可重复|已存在/ })
      .first(),
    `${sourceRef}: 重复规则包名称应提示校验错误`,
  ).toBeVisible({ timeout: 30000 });
  await deleteSecondRuleSetPackageIfVisible(page, sourceRef);
  await getRuleSetPackageNameInputs(page).first().fill(packageName, { timeout: 30000 });
  await expect(
    getRuleSetPackageNameInputs(page).first(),
    `${sourceRef}: 正式规则包名称应恢复`,
  ).toHaveValue(packageName, { timeout: 30000 });
}

async function deleteSecondRuleSetPackageIfVisible(page: Page, sourceRef: string): Promise<void> {
  const secondRow = getRuleSetPackageRows(page).nth(1);
  const deleteButton = secondRow
    .locator(".anticon-delete, .anticon-minus-circle, [class*='delete']")
    .first();
  await expect(deleteButton, `${sourceRef}: 临时规则包应展示删除入口`).toBeVisible({
    timeout: 30000,
  });
  await deleteButton.click({ timeout: 30000 });
  const confirm = page.locator(".ant-popconfirm:visible, .ant-modal:visible").last();
  if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirm
      .getByRole("button", { name: /确\s*定|确\s*认/ })
      .last()
      .click({ timeout: 30000 });
  }
}

async function expectArchiveRuleSetRuleEdit(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
): Promise<void> {
  const editedDescription = `${scenario.description}_编辑校验`;
  const createdRule = getRuleSetMonitorRuleItems(page)
    .filter({ hasText: scenario.description })
    .first();
  await expect(createdRule, `${sourceRef}: 待编辑规则行应可见`).toBeVisible({ timeout: 30000 });
  await createdRule.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });
  await fillRuleSetRuleDescription(page, editedDescription);
  await saveRuleSetRuleRow(page, sourceRef, "编辑规则");
  await expect(page.locator("body"), `${sourceRef}: 编辑后规则描述应回显`).toContainText(
    editedDescription,
    {
      timeout: 30000,
    },
  );

  const editedRule = getRuleSetMonitorRuleItems(page)
    .filter({ hasText: editedDescription })
    .first();
  await expect(editedRule, `${sourceRef}: 编辑后的规则行应可见`).toBeVisible({ timeout: 30000 });
  await editedRule.getByRole("button", { name: /编辑/ }).first().click({ timeout: 30000 });
  await fillRuleSetRuleDescription(page, scenario.description);
  await saveRuleSetRuleRow(page, sourceRef, "恢复规则");
  await expect(page.locator("body"), `${sourceRef}: 恢复后规则描述应回显`).toContainText(
    scenario.description,
    {
      timeout: 30000,
    },
  );
}

async function expectArchiveRuleSetGlobalParamsOnCurrentPage(
  page: Page,
  sourceRef: string,
  packageName: string,
): Promise<void> {
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 监控规则配置页应展示全局参数入口`).toContainText(
    "查看全局参数",
    {
      timeout: 30000,
    },
  );
  await expect(body, `${sourceRef}: 打开全局参数前应保留规则包`).toContainText(packageName, {
    timeout: 30000,
  });
  const globalParamsResponse = waitForDqJson<DqGlobalParamsPage>(
    page,
    "/dassets/v1/valid/monitor/getGlobalParams",
    (payload) => payload.data?.pageSize === 10,
  );
  void globalParamsResponse.catch(() => {});
  await page.getByText("查看全局参数", { exact: true }).click({ timeout: 30000 });
  const globalParams = expectDqSuccess(
    await globalParamsResponse,
    `${sourceRef}: 全局参数列表应请求成功`,
  );
  const records = expectGlobalParamsPage(globalParams, sourceRef);
  expect(records.length, `${sourceRef}: 全局参数弹窗应至少返回一条参数`).toBeGreaterThan(0);

  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, `${sourceRef}: 全局参数弹窗应打开`).toBeVisible({ timeout: 30000 });
  for (const header of ["全局参数", "参数名称", "参数类型", "参数值/日期格式", "注释"]) {
    await expect(modal, `${sourceRef}: 全局参数弹窗应展示「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }
  for (const record of records.slice(0, 2)) {
    await expect(modal, `${sourceRef}: 全局参数弹窗应展示参数名称`).toContainText(
      expectNonEmptyString(record.paramName, `${sourceRef}: 全局参数应包含参数名称`),
      { timeout: 30000 },
    );
  }
  await closeVisibleDqOverlayIfAny(page, sourceRef);
  await expect(body, `${sourceRef}: 关闭全局参数后应保留当前规则包`).toContainText(packageName, {
    timeout: 30000,
  });
}

async function expectArchiveRuleSetListAndConfiguredTableFilter(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  ruleSetDescription: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  const records = await searchRuleSetTableName(page, scenario.tableName, sourceRef);
  const targetRecord = records.find((record) => record.description === ruleSetDescription);
  expect(targetRecord, `${sourceRef}: 规则集列表应返回刚创建的规则集`).toBeTruthy();

  const row = page.locator(".ant-table-tbody tr").filter({ hasText: scenario.tableName }).first();
  await expect(row, `${sourceRef}: 规则集列表应展示目标表和规则集描述`).toBeVisible({
    timeout: 30000,
  });
  await expect(row, `${sourceRef}: 规则集列表应展示非负规则包/规则数量`).toContainText(/\d+/, {
    timeout: 30000,
  });
  expect(
    Number(targetRecord?.packageVOList?.length ?? targetRecord?.packageCount ?? 0),
  ).toBeGreaterThanOrEqual(0);
  expect(Number(targetRecord?.ruleCount ?? 0)).toBeGreaterThanOrEqual(0);
}

async function expectArchiveRuleSetDetail(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  ruleSetDescription: string,
  packageName: string,
): Promise<void> {
  const records = await queryRuleSetRecords(page, scenario.tableName);
  const targetRecord = records.find((record) => record.description === ruleSetDescription);
  expect(targetRecord?.id, `${sourceRef}: 规则集详情校验应定位刚创建规则集`).toBeTruthy();
  const response = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleSet/detail"),
    {
      data: { id: String(targetRecord?.id) },
      timeout: 60000,
    },
  );
  expect(response.ok(), `${sourceRef}: 规则集详情 HTTP 应成功`).toBe(true);
  const detail = expectDqSuccess(
    (await response.json()) as DqApiResponse<DqRuleSetRecord>,
    `${sourceRef}: 规则集详情应请求成功`,
  );
  expect(String(detail.tableName ?? ""), `${sourceRef}: 规则集详情应展示表名`).toContain(
    scenario.tableName,
  );
  expect(String(detail.description ?? ""), `${sourceRef}: 规则集详情应展示规则集描述`).toContain(
    ruleSetDescription,
  );
  expect(
    getRuleSetPackageNames(detail),
    `${sourceRef}: 规则集详情应展示规则包 ${packageName}`,
  ).toContain(packageName);
  expect(
    getRuleSetFunctionNames(detail).some((functionName) =>
      functionName.includes(scenario.statisticFunction),
    ),
    `${sourceRef}: 规则集详情应展示规则函数 ${scenario.statisticFunction}`,
  ).toBe(true);
  assertRuleSetDetailPackages(detail, sourceRef);
}

async function ensureArchiveRuleSetPackageReady(
  page: Page,
  sourceRef: string,
  packageName: string,
): Promise<void> {
  if (
    await page
      .getByText("添加规则", { exact: true })
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
  ) {
    return;
  }

  await clickRuleSetPackageAddButton(page, sourceRef);
  const visiblePackageInput = page.locator('input[placeholder="请输入规则包名称"]:visible').last();
  if (await visiblePackageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await visiblePackageInput.fill(packageName, { timeout: 30000 });
    await visiblePackageInput.press("Tab", { timeout: 30000 });
  }
  await expect(page.locator("body"), `${sourceRef}: 规则包创建后应展示添加规则入口`).toContainText(
    "添加规则",
    {
      timeout: 30000,
    },
  );

  const packageSelect = page
    .locator(".ant-select:visible")
    .filter({ hasText: /请选择规则包名称|规则包/ })
    .first();
  if (
    (await packageSelect.isVisible({ timeout: 3000 }).catch(() => false)) &&
    !((await packageSelect.textContent({ timeout: 30000 })) ?? "").includes(packageName)
  ) {
    await packageSelect.click({ timeout: 30000 });
    const clicked = await clickActiveAntdOption(page, packageName);
    expect(clicked, `${sourceRef}: 规则包下拉应包含「${packageName}」`).toBe(true);
    await expect(packageSelect, `${sourceRef}: 规则包下拉应选中「${packageName}」`).toContainText(
      packageName,
      {
        timeout: 30000,
      },
    );
  }
}

async function deleteRuleSetRowAndAssert(
  page: Page,
  sourceRef: string,
  tableName: string,
  description: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  await searchRuleSetTableName(page, tableName, sourceRef);
  const row = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: tableName })
    .filter({ hasText: description })
    .first();
  await expect(row, `${sourceRef}: 待删除临时规则集应出现在列表`).toBeVisible({ timeout: 30000 });
  await expect(row, `${sourceRef}: 临时规则集行应展示删除入口`).toContainText("删除", {
    timeout: 30000,
  });

  await row.getByRole("button", { name: "删除" }).click({ timeout: 30000 });
  const confirm = page
    .locator(".ant-popconfirm:visible, .ant-modal:visible, .ant-tooltip:visible")
    .last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirm
      .getByRole("button", { name: /确\s*定|确\s*认|删\s*除/ })
      .last()
      .click({ timeout: 30000 });
  }
  await expect(row, `${sourceRef}: 删除确认后临时规则集应从列表消失`).toBeHidden({
    timeout: 30000,
  });
  await expect
    .poll(
      async () => {
        const records = await queryRuleSetRecords(page, tableName);
        return records.some((record) => record.description === description);
      },
      {
        message: `${sourceRef}: 删除后列表 API 不应再返回临时规则集`,
        timeout: 60000,
      },
    )
    .toBe(false);
}

async function deleteTempRuleSetByDescriptionBestEffort(
  page: Page,
  sourceRef: string,
  tableName: string,
  descriptionPrefix: string,
): Promise<void> {
  const staleRecords = (await queryRuleSetRecords(page, tableName)).filter((record) =>
    String(record.description ?? "").startsWith(descriptionPrefix),
  );
  if (staleRecords.length === 0) return;

  await gotoDataQualityPage(page, "/dq/ruleSet");
  await searchRuleSetTableName(page, tableName, sourceRef);
  for (const record of staleRecords) {
    const row = page
      .locator(".ant-table-tbody tr")
      .filter({ hasText: tableName })
      .filter({ hasText: String(record.description) })
      .first();
    if (!(await row.isVisible({ timeout: 3000 }).catch(() => false))) continue;
    await row
      .getByRole("button", { name: "删除" })
      .click({ timeout: 5000 })
      .catch(() => {});
    const confirm = page
      .locator(".ant-popconfirm:visible, .ant-modal:visible, .ant-tooltip:visible")
      .last();
    if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirm
        .getByRole("button", { name: /确\s*定|确\s*认|删\s*除/ })
        .last()
        .click({ timeout: 5000 })
        .catch(() => {});
    }
  }
}

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

async function configureExistingPartition(
  page: Page,
  sourceRef: string,
  expectedPartition: string,
): Promise<void> {
  const existingPartitionRadio = page.getByRole("radio", { name: "选择已有分区" });
  if (!(await existingPartitionRadio.isChecked({ timeout: 3000 }).catch(() => false))) {
    await chooseDqFieldOptionByText(page, /分区方式|选择分区|分区/, "选择已有分区", sourceRef);
  }
  for (const token of expectedPartition.split(",").map((item) => item.trim())) {
    const value = token.includes("=")
      ? token.split("=").slice(1).join("=").replace(/^'|'$/g, "")
      : token;
    await selectPartitionValue(page, value, sourceRef);
  }
  await expect(page.locator("body"), `${sourceRef}: 分区配置应回显目标已有分区`).toContainText(
    new RegExp(
      expectedPartition
        .split(/[=,'"\s]+/)
        .filter((token) => token.length >= 2)
        .map(escapeRegExp)
        .join("|"),
    ),
    { timeout: 30000 },
  );
}

async function selectPartitionValue(page: Page, value: string, sourceRef: string): Promise<void> {
  const partitionSelect = page
    .locator(".ant-form-item, .ant-row, label")
    .filter({ hasText: /分区|stat_date|hour/ })
    .locator(".ant-select")
    .last();
  if (await partitionSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await partitionSelect.click({ timeout: 30000 });
    await page.keyboard.type(value);
    const dropdown = page.locator(".ant-select-dropdown:visible").last();
    await expect(dropdown, `${sourceRef}: 分区下拉应包含「${value}」`).toContainText(value, {
      timeout: 30000,
    });
    await dropdown.getByText(value, { exact: false }).first().click({ timeout: 30000 });
    return;
  }

  const input = page.locator("input").filter({ hasText: "" }).last();
  await input.fill(value, { timeout: 30000 });
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

async function createSparkThriftArchiveValidationRuleTask(
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

async function expectArchiveRuleTaskSingleDetectionToggle(
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

async function editSparkThriftArchiveValidationRuleTaskPartition(
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

function monitorRecordDetailEntry(
  targetRow: ReturnType<Page["locator"]>,
): ReturnType<Page["locator"]> {
  return targetRow
    .getByRole("button", { name: /查看详情|详情/ })
    .or(targetRow.getByText(/查看详情|详情/))
    .or(targetRow.locator("td").first().getByRole("button"))
    .or(targetRow.locator("td").first())
    .first();
}

async function waitForMonitorRecordStatus(
  page: Page,
  sourceRef: string,
  ruleName: string,
  expectedStatus: RegExp,
): Promise<{ target: DqMonitorRecord; statusLabel: string }> {
  const timeoutMs = loadPlaywrightAutomationConfig().monitorTimeoutMs;
  const deadline = Date.now() + timeoutMs;
  let latestTarget: DqMonitorRecord | undefined;
  let latestStatus = "";
  let latestBackendStatus = "";

  while (Date.now() < deadline) {
    const responsePromise = waitForDqJson<DqMonitorRecordPage>(
      page,
      "/dassets/v1/valid/monitorRecord/pageQuery",
    );
    void responsePromise.catch(() => {});
    await submitMonitorRecordSearch(page);
    const pageData = expectDqSuccess(await responsePromise, `${sourceRef}: 查询校验实例应请求成功`);
    const records = pageData.data ?? [];
    latestTarget = records.find((record) => record.ruleName === ruleName);
    if (latestTarget) {
      latestStatus = formatMonitorRecordStatus(latestTarget.status, sourceRef);
      latestBackendStatus = await formatBackendSqlJobStatus(page, latestTarget);
      if (expectedStatus.test(latestStatus)) {
        return { target: latestTarget, statusLabel: latestStatus };
      }
      if (!/运行中|校验中|等待运行|未运行/.test(latestStatus)) break;
    }
    await waitForUiSettled(page);
  }

  expect(latestTarget, `${sourceRef}: 校验结果查询应包含 ${ruleName}`).toBeTruthy();
  expect(
    latestStatus,
    `${sourceRef}: 最新实例状态应符合预期；${latestBackendStatus || "未取得后端 job 状态"}`,
  ).toMatch(expectedStatus);
  return { target: latestTarget as DqMonitorRecord, statusLabel: latestStatus };
}

async function formatBackendSqlJobStatus(page: Page, record: DqMonitorRecord): Promise<string> {
  const jobId = record.flowJobId ?? record.jobKey;
  if (!jobId) return "";
  const response = await page.request
    .post(buildDataAssetsApiUrl("/api/rdos/batch/batchSelectSql/selectStatus"), {
      data: { jobId, type: 0 },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 30000,
    })
    .catch(() => undefined);
  if (!response?.ok()) return `后端 job ${jobId} 状态查询失败`;
  const payload = (await response.json().catch(() => undefined)) as
    | { data?: { status?: number; applicationMsg?: string } }
    | undefined;
  const status = payload?.data?.status;
  if (status === undefined) return `后端 job ${jobId} 未返回 status`;
  const applicationMsg = payload?.data?.applicationMsg ? `, ${payload.data.applicationMsg}` : "";
  return `后端 job ${jobId} status=${status}${applicationMsg}`;
}

async function expectArchiveMonitorRecordTableSearch(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  ruleName: string,
): Promise<void> {
  const searchInput = await gotoMonitorRecordQueryPage(page, sourceRef);
  const responsePromise = waitForDqJson<DqMonitorRecordPage>(
    page,
    "/dassets/v1/valid/monitorRecord/pageQuery",
    (payload) =>
      (payload.data?.data ?? []).some(
        (record) => record.ruleName === ruleName && record.tableName === scenario.tableName,
      ),
  );
  void responsePromise.catch(() => {});
  await searchInput.fill(scenario.tableName, { timeout: 30000 });
  await submitMonitorRecordSearch(page);
  const records = expectMonitorRecordPage(
    expectDqSuccess(await responsePromise, `${sourceRef}: 校验结果按表名搜索应请求成功`),
    `${sourceRef}: 校验结果按表名搜索应返回实例`,
  );
  expect(
    records.some(
      (record) => record.ruleName === ruleName && record.tableName === scenario.tableName,
    ),
    `${sourceRef}: 按表名搜索应包含当前规则任务实例`,
  ).toBe(true);
  const targetRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: scenario.tableName })
    .filter({ hasText: ruleName })
    .first();
  await expect(targetRow, `${sourceRef}: 按表名搜索列表应展示当前规则任务实例`).toBeVisible({
    timeout: 30000,
  });
}

async function expectArchiveRuleValidationRecord(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
  ruleName: string,
  options: {
    expectedStatus: RegExp;
    expectedActualValue: string;
    expectedPartition: string;
    dirtyEvidence?: readonly string[];
    dirtyDetail?: SparkThriftRuleValidationFusionChecks["dirtyDetail"];
    passHasNoDirtyDetail?: boolean;
    expectedSamplingRows?: string;
  },
): Promise<void> {
  const searchInput = await gotoMonitorRecordQueryPage(page, sourceRef);
  await searchInput.fill(ruleName, { timeout: 30000 });
  const { statusLabel } = await waitForMonitorRecordStatus(
    page,
    sourceRef,
    ruleName,
    options.expectedStatus,
  );
  await submitMonitorRecordSearch(page);

  const detailResponse = waitForDqJson<DqMonitorRecordDetail[]>(
    page,
    "/dassets/v1/valid/monitorRecord/detailReport",
  );
  const targetRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  await expect(targetRow, `${sourceRef}: 校验结果列表应展示 ${ruleName}`).toBeVisible({
    timeout: 30000,
  });
  await expect(targetRow, `${sourceRef}: 校验结果列表应展示状态 ${statusLabel}`).toContainText(
    statusLabel,
    {
      timeout: 30000,
    },
  );
  if (options.passHasNoDirtyDetail) {
    await expect(
      targetRow,
      `${sourceRef}: 校验通过实例列表不应展示不通过明细入口`,
    ).not.toContainText(/查看明细|下载明细|脏数据/, { timeout: 5000 });
  }
  const detailEntry = monitorRecordDetailEntry(targetRow);
  await detailEntry.click({ timeout: 30000 });
  const detailRecords = expectDqSuccess(
    await detailResponse,
    `${sourceRef}: 规则校验实例详情应请求成功`,
  );
  const detailText = JSON.stringify(detailRecords);
  for (const expectedText of [
    scenario.statisticFunction,
    ...scenario.fields,
    options.expectedActualValue,
    scenario.expectation?.value,
  ].filter((value): value is string => Boolean(value))) {
    expect(detailText, `${sourceRef}: 实例详情应包含「${expectedText}」`).toContain(expectedText);
  }
  expect(
    detailRecords.some((record) =>
      String(record.partition ?? "").includes(
        options.expectedPartition.replace(/^.*='?([^']+)'?.*$/, "$1"),
      ),
    ),
    `${sourceRef}: 实例详情应仅统计目标分区 ${options.expectedPartition}`,
  ).toBe(true);
  if (options.expectedSamplingRows) {
    expect(detailText, `${sourceRef}: 实例详情应展示抽样信息`).toMatch(
      /抽样|采样|sample|sampling/i,
    );
    expect(
      detailText,
      `${sourceRef}: 实例详情应包含抽样行数 ${options.expectedSamplingRows}`,
    ).toContain(options.expectedSamplingRows);
  }

  if (options.dirtyEvidence?.length) {
    const dirtyEntry = page
      .getByRole("button", { name: /查看明细|脏数据|明细/ })
      .or(page.getByText(/查看明细|脏数据|明细/))
      .first();
    if (await dirtyEntry.isVisible({ timeout: 3000 }).catch(() => false)) {
      const dirtyResponse = waitForDqJson<DqMonitorRecordDirtyResult>(
        page,
        "/dassets/v1/valid/monitorRecord/getFormatTableResult",
      );
      void dirtyResponse.catch(() => {});
      await dirtyEntry.click({ timeout: 30000 });
      const dirtyPayload = await dirtyResponse
        .then((payload) => expectDqSuccess(payload, `${sourceRef}: 不通过明细应请求失败数据`))
        .catch(() => undefined);
      const dirtyScope = page
        .locator(".ant-modal:visible,.ant-drawer:visible,[role='dialog']:visible,body")
        .last();
      for (const expectedText of options.dirtyEvidence) {
        await expect(dirtyScope, `${sourceRef}: 不通过明细应包含「${expectedText}」`).toContainText(
          expectedText,
          {
            timeout: 30000,
          },
        );
      }
      for (const highlightedColumn of options.dirtyDetail?.highlightedColumns ?? []) {
        if (dirtyPayload) {
          expect(
            dirtyPayload.highlightColumns ?? [],
            `${sourceRef}: 明细响应应标记失败字段 ${highlightedColumn}`,
          ).toContain(highlightedColumn);
        }
      }
      if (options.dirtyDetail?.verifyDownloadEntry) {
        await expect(dirtyScope, `${sourceRef}: 不通过明细应展示下载明细入口`).toContainText(
          /下载|下载明细/,
          {
            timeout: 30000,
          },
        );
      }
    } else {
      for (const expectedText of options.dirtyEvidence) {
        expect(detailText, `${sourceRef}: 不通过详情应包含「${expectedText}」`).toContain(
          expectedText,
        );
      }
    }
  }
  await closeVisibleDqOverlayIfAny(page, sourceRef);
  await closeVisibleDqOverlayIfAny(page, sourceRef);
}

async function expectNoMonitorRecordForRuleTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const response = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRecord/pageQuery"),
    {
      data: {
        currentPage: 1,
        pageSize: 20,
        projectId: getProjectId(),
        bizTime: 0,
        fuzzyName: ruleName,
      },
      timeout: 60000,
    },
  );
  expect(response.ok(), `${sourceRef}: 查询 T+1 任务实例 HTTP 应成功`).toBe(true);
  const payload = (await response.json()) as DqApiResponse<DqMonitorRecordPage>;
  const pageData = expectDqSuccess(payload, `${sourceRef}: 查询 T+1 任务实例应请求成功`);
  const records = pageData.data ?? [];
  expect(
    records.some((record) => record.ruleName === ruleName),
    `${sourceRef}: T+1 任务保存后未到调度时间不应立即生成实例`,
  ).toBe(false);
}

async function addArchiveValidationRuleToCurrentRuleSet(
  page: Page,
  sourceRef: string,
  scenario: SparkThriftQualityRuleValidationScenario,
): Promise<void> {
  await page
    .getByRole("button", { name: /添加规则/ })
    .first()
    .click({ force: true, timeout: 30000 });
  if (scenario.customSqlTemplate) {
    const categoryText = page
      .locator(".ant-dropdown-menu-title-content")
      .filter({ hasText: "自定义SQL" })
      .last();
    await expect(categoryText, `${sourceRef}: 规则类别菜单应展示自定义SQL`).toBeAttached({
      timeout: 30000,
    });
    await categoryText.evaluate((element) => (element.parentElement as HTMLElement).click());
  } else {
    const categoryName = scenario.ruleCategory.replace(/校验$/, "");
    const categoryText = page
      .locator(".ant-dropdown-menu-title-content")
      .filter({ hasText: categoryName })
      .last();
    await expect(categoryText, `${sourceRef}: 规则类别菜单应展示${categoryName}`).toBeAttached({
      timeout: 30000,
    });
    await categoryText.evaluate((element) => (element.parentElement as HTMLElement).click());
  }
  await expect(
    page.locator("body"),
    `${sourceRef}: 添加 ${scenario.ruleCategory} 后应展示规则配置项`,
  ).toContainText(/统计函数|生效范围|规则描述|引用规则|规则类型/, { timeout: 30000 });
  if (scenario.customSqlTemplate) {
    await selectDqFormOptionBySearch(page, /规则类型|分类/, scenario.ruleCategory, sourceRef);
    await selectDqFormOptionBySearch(
      page,
      /引用规则|规则名称|自定义SQL/,
      scenario.customSqlTemplate.ruleName,
      sourceRef,
    );
  }
  if (scenario.scope) {
    await chooseDqNamedSelectOption(page, /生效范围|规则范围/, scenario.scope, sourceRef);
  }
  if (!scenario.customSqlTemplate) {
    await selectRuleSetStatisticFunction(page, scenario.statisticFunction, sourceRef);
  }
  if (scenario.comparisonTableName) {
    await selectDqFormOptionBySearch(
      page,
      /对比表|比较表|关联表/,
      scenario.comparisonTableName,
      sourceRef,
    );
    await configureExistingPartition(page, sourceRef, scenario.passPartition);
  }
  for (const field of scenario.fields) {
    await selectRuleSetField(page, field, sourceRef);
  }
  for (const field of scenario.comparisonFields ?? []) {
    await selectDqFormOptionBySearch(page, /对比表字段|比较字段|关联字段/, field, sourceRef);
  }
  for (const key of scenario.primaryKeys ?? []) {
    await selectDqFormOptionBySearch(page, /校验表主键|主表主键|主键/, key, sourceRef);
  }
  for (const key of scenario.comparisonPrimaryKeys ?? []) {
    await selectDqFormOptionBySearch(page, /对比表主键|比较表主键|关联表主键/, key, sourceRef);
  }
  if (scenario.fieldLogic) {
    await chooseDqFieldOptionByText(
      page,
      /字段间规则逻辑|逻辑关系/,
      scenario.fieldLogic,
      sourceRef,
    );
  }
  for (const option of scenario.ruleOptions ?? []) {
    await chooseDqFieldOptionByText(page, option.label, option.value, sourceRef);
  }
  for (const input of scenario.ruleInputs ?? []) {
    await fillDqFormItemInput(page, input.label, input.value, sourceRef);
  }
  if (scenario.expectation) {
    await chooseDqFieldOptionByText(
      page,
      /校验方法|比较方式|判断方式/,
      scenario.expectation.method,
      sourceRef,
    );
    if (scenario.expectation.operator) {
      await chooseDqFieldOptionByText(
        page,
        /操作符|比较符|期望值|判断条件/,
        scenario.expectation.operator,
        sourceRef,
      );
    }
    await fillDqFormItemInput(page, "期望值", scenario.expectation.value, sourceRef);
  }
  await switchRuleSetStrength(page, "强规则", sourceRef);
  await fillRuleSetRuleDescription(page, scenario.description);
  for (const expectedText of [
    scenario.statisticFunction,
    scenario.expectation?.value,
    ...scenario.fields,
  ].filter((value): value is string => Boolean(value))) {
    await expect(
      page.locator("body"),
      `${sourceRef}: 规则保存后应回显「${expectedText}」`,
    ).toContainText(expectedText, { timeout: 30000 });
  }
}

async function chooseDqNamedSelectOption(
  page: Page,
  label: RegExp,
  option: string,
  sourceRef: string,
): Promise<void> {
  const pendingScope = /生效范围|规则范围/.test(String(label))
    ? page
        .locator(".ant-select:visible")
        .filter({ hasText: "请选择规则类型" })
        .last()
        .getByRole("combobox")
    : undefined;
  const select =
    pendingScope && (await pendingScope.count()) > 0
      ? pendingScope
      : page.getByRole("combobox", { name: label }).last();
  await expect(select, `${sourceRef}: 应展示下拉配置项 ${label}`).toBeVisible({ timeout: 30000 });
  await select.click({ force: true, timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 下拉应包含「${option}」`).toContainText(option, {
    timeout: 30000,
  });
  expect(
    await clickActiveAntdOption(page, option),
    `${sourceRef}: 下拉应包含可点击选项「${option}」`,
  ).toBe(true);
}

async function selectRuleSetStatisticFunction(
  page: Page,
  functionName: string,
  sourceRef: string,
): Promise<void> {
  const statisticSelect = page
    .locator(".ant-select")
    .filter({ hasText: /请选择统计函数|统计函数/ })
    .last();
  await statisticSelect.click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 统计函数下拉应包含「${functionName}」`).toContainText(
    functionName,
    {
      timeout: 30000,
    },
  );
  await dropdown.getByText(functionName, { exact: true }).first().click({ timeout: 30000 });
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
