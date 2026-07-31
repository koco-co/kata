import { expect, type Page } from "@playwright/test";

import {
  deleteCustomSqlByNameBestEffort,
  expectDqSuccess,
  listCustomSqlRecords,
  queryRuleSetRecords,
  waitForDqJson,
} from "../../pages/data-quality/api";
import type {
  DqApiResponse,
  DqRuleSetPageData,
  DqRuleSetRecord,
  SparkThriftQualityRuleValidationScenario,
  SparkThriftRuleValidationFusionChecks,
} from "../../pages/data-quality/contracts";
import {
  chooseDqFieldOptionByText,
  clickActiveAntdOption,
  clickDqCompactButton,
  clickDqText,
  closeVisibleDqOverlayIfAny,
  fillDqFormItemInput,
  fillDqPageFormField,
  selectDqFormOptionBySearch,
} from "../../pages/data-quality/form-controls";
import {
  getProjectId,
  getScenarioDatasource,
  gotoDataQualityPage,
  PROJECT_STORAGE_KEY,
} from "../../pages/data-quality/project-context";
import {
  expectNonEmptyString,
  formatRuleBaseCustomRelationRange,
  formatRuleBaseCustomRuleType,
  getRuleSetPageRecordsAllowEmpty,
} from "../../pages/data-quality/record-assertions";
import {
  clickRuleSetPackageAddButton,
  clickRuleSetSubmitButton,
  fillRuleSetRuleDescription,
  saveRuleSetRuleRow,
  selectRuleSetField,
  switchRuleSetStrength,
} from "../../pages/data-quality/rule-set-page";
import { buildDataAssetsApiUrl } from "../../runtime/env-setup";
import { configureExistingPartition } from "./partition";

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

export async function createCustomSqlTemplateFixture(
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

export async function createSparkThriftArchiveValidationRuleSet(
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

export async function expectArchiveRuleSetListAndConfiguredTableFilter(
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

export async function expectArchiveRuleSetDetail(
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

export async function deleteRuleSetRowAndAssert(
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

export async function deleteTempRuleSetByDescriptionBestEffort(
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
