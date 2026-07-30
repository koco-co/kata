// Lindorm 数据资产适配用例的规则库页面流程与断言。

import { buildDataAssetsApiUrl } from "../../../../../../../_shared/automation/runtime/env-setup";
import { waitForUiSettled } from "../../../../../../../../../runtime/automation/playwright";
import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import ExcelJS from "exceljs";
import { DQ_RULE_MAIN_TABLE } from "../../fixtures/data-quality-tables";
import {
  deleteCustomSqlById,
  deleteCustomSqlByNameBestEffort,
  expectDqSuccess,
  getDqRuleTaskRecords,
  queryRuleSetRecords,
  waitForDqJson,
  waitForRuleTaskPageQuery,
} from "../../../../../../../_shared/automation/pages/data-quality/api";
import type {
  DqApiResponse,
  DqRuleBaseCustomSqlPage,
  DqRuleBaseCustomSqlRecord,
  DqRuleSetPackage,
  DqRuleSetPageData,
  DqRuleSetRecord,
  DqRuleSetRule,
  DqRuleTaskPageQuery,
  DqRuleTaskRecord,
} from "../../../../../../../_shared/automation/pages/data-quality/contracts";
import {
  getProjectId,
  gotoDataQualityPage,
  PROJECT_STORAGE_KEY,
} from "../../../../../../../_shared/automation/pages/data-quality/project-context";
import {
  expectNonEmptyString,
  formatRuleBaseCustomRelationRange,
  formatRuleBaseCustomRuleType,
} from "../../../../../../../_shared/automation/pages/data-quality/record-assertions";
import {
  checkDqNoReport,
  chooseDqFieldOptionByText,
  chooseFirstDqSelectOption,
  clickActiveAntdOption,
  clickDqCompactButton,
  clickDqSubmitButton,
  clickDqText,
  getActiveAntdOptionTexts,
} from "../../../../../../../_shared/automation/pages/data-quality/form-controls";
import {
  expectDqAdminFullMenu,
  expectDqApiPaths,
  expectDqLimitedPermission,
  expectDqPage,
  expectDqPagePermissionTarget,
  expectRuleSetPage,
  expectRuleSetSearchTarget,
  getRequestJson,
  selectDqFormOption,
} from "./page-context";
import {
  clickNextUntilMonitorRuleConfig,
  clickNextUntilScheduleConfig,
  clickRuleSetPackageAddButton,
  clickRuleSetSubmitButton,
  configureManualPartition,
  fillRuleSetRuleDescription,
  gotoNewRuleTaskMonitorObjectPageForTable,
  saveRuleSetRuleRow,
  selectRuleSetField,
  selectRuleTaskRulePackageOnCurrentPage,
  switchRuleSetStrength,
} from "../../../../../../../_shared/automation/pages/data-quality/page-context";

type DqRuleBaseTemplateRecord = {
  id?: string | number;
  functionId?: string | number;
  functionName?: string;
  functionExplain?: string;
  ruleTaskType?: number;
  relationNumber?: string | number;
  relationRange?: number;
  description?: string;
  openStatus?: number;
};

type DqRuleBaseTemplatePage = {
  contentList?: DqRuleBaseTemplateRecord[];
  total?: string | number;
};

type DqRuleBaseCustomRegexRecord = {
  id?: string | number;
  projectId?: string | number;
  ruleName?: string;
  ruleType?: number;
  associationScope?: number;
  ruleDesc?: string | null;
  ruleContent?: string;
  associationRuleCount?: string | number;
};

type DqRuleBaseCustomRegexPage = {
  contentList?: DqRuleBaseCustomRegexRecord[];
  total?: string | number;
};

export async function expectDataQualityRuleBaseShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/ruleBase",
    labels: ["规则库配置", "内置规则", "自定义正则", "自定义sql模版", "导出规则库"],
    tableHeaders: [
      "规则名称",
      "规则解释",
      "规则分类",
      "关联范围",
      "关联规则数",
      "规则状态",
      "规则描述",
    ],
    apiPaths: ["/dassets/v1/valid/monitorRuleTemplate/pageQuery"],
  });
}

export async function expectDataQualityRuleBaseCustomRegexContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleBase");
  await clickDqText(page, "自定义正则", sourceRef);

  const body = page.locator("body");
  for (const label of [
    "自定义正则",
    "新增自定义正则",
    "规则名称",
    "规则分类",
    "关联范围",
    "关联规则数",
    "规则描述",
  ]) {
    await expect(body, `${sourceRef}: 自定义正则列表应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(
    page.locator("input[placeholder='请输入规则名称进行搜索']:visible").first(),
    `${sourceRef}: 自定义正则列表应展示规则名称搜索输入框`,
  ).toBeVisible({ timeout: 30000 });
}

export async function expectDataQualityRuleBaseCustomRegexAddContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆VIN正则";
  const ruleDesc = "校验车辆VIN格式";
  const ruleContent = "^[A-Z0-9]{17}$";
  const testData = "LTV202601160001AA";
  let createdId: string | number | undefined;

  await deleteCustomRegexByNameBestEffort(page, sourceRef, ruleName);

  try {
    const listResponse = waitForDqJson<DqRuleBaseCustomRegexPage>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/list",
    );
    await gotoDataQualityPage(page, "/dq/ruleBase");
    await page.locator(".ant-tabs-tab").filter({ hasText: "自定义正则" }).click({ timeout: 30000 });
    expectCustomRegexPage(
      expectDqSuccess(await listResponse, `${sourceRef}: 自定义正则列表应请求成功`),
      `${sourceRef}: 自定义正则列表接口应返回有效结构`,
      { allowEmpty: true },
    );

    const body = page.locator("body");
    for (const label of [
      "新增自定义正则",
      "规则名称",
      "规则分类",
      "关联范围",
      "关联规则数",
      "规则描述",
    ]) {
      await expect(body, `${sourceRef}: 自定义正则列表应展示「${label}」`).toContainText(label, {
        timeout: 30000,
      });
    }

    await page.getByRole("button", { name: /新增自定义正则/ }).click({ timeout: 30000 });
    const modal = page.locator(".ant-modal:visible").last();
    await expect(modal, `${sourceRef}: 新增自定义正则弹窗应打开`).toContainText("新增自定义规则", {
      timeout: 30000,
    });
    for (const label of [
      "规则名称",
      "规则类型",
      "有效性",
      "关联范围",
      "字段级",
      "规则描述",
      "正则",
      "测试数据",
    ]) {
      await expect(modal, `${sourceRef}: 新增弹窗应展示「${label}」`).toContainText(label, {
        timeout: 30000,
      });
    }

    await modal.locator("#ruleName").fill(ruleName, { timeout: 30000 });
    await modal.locator("#ruleDesc").fill(ruleDesc, { timeout: 30000 });
    await modal.locator("#ruleContent").fill(ruleContent, { timeout: 30000 });
    await modal.getByPlaceholder("请输入正则数据").fill(testData, { timeout: 30000 });
    await modal.getByRole("button", { name: /正则匹配测试/ }).click({ timeout: 30000 });
    await expect(modal, `${sourceRef}: 正则匹配测试应返回匹配成功`).toContainText(
      /符合正则|匹配成功/,
      { timeout: 30000 },
    );

    const saveResponse = waitForDqJson<boolean>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/addOrUpdate",
    );
    const savedListResponse = waitForDqJson<DqRuleBaseCustomRegexPage>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/list",
      (payload) => (payload.data?.contentList ?? []).some((record) => record.ruleName === ruleName),
    );
    await modal.getByRole("button", { name: /确\s*定/ }).click({ timeout: 30000 });
    expectDqSuccess(await saveResponse, `${sourceRef}: 保存自定义正则应请求成功`);

    const savedRecords = expectCustomRegexPage(
      expectDqSuccess(await savedListResponse, `${sourceRef}: 保存后自定义正则列表应刷新成功`),
      `${sourceRef}: 保存后自定义正则列表应返回记录`,
    );
    const savedRecord = savedRecords.find((record) => record.ruleName === ruleName);
    expect(savedRecord, `${sourceRef}: 保存后接口应返回「${ruleName}」`).toBeTruthy();
    createdId = savedRecord?.id;
    expect(savedRecord?.ruleContent, `${sourceRef}: 接口应保存 VIN 正则表达式`).toBe(ruleContent);
    expect(savedRecord?.ruleDesc, `${sourceRef}: 接口应保存规则描述`).toBe(ruleDesc);
    expect(
      formatCustomRegexRuleType(savedRecord?.ruleType, sourceRef),
      `${sourceRef}: 规则类型应为有效性`,
    ).toBe("有效性");
    expect(
      formatCustomRegexAssociationScope(savedRecord?.associationScope, sourceRef),
      `${sourceRef}: 关联范围应为字段级`,
    ).toBe("字段级");

    const row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: ruleName }).first();
    await expect(row, `${sourceRef}: 保存后列表应展示「${ruleName}」`).toBeVisible({
      timeout: 30000,
    });
    for (const expectedText of [ruleName, "有效性", "字段级", "0", ruleDesc]) {
      await expect(row, `${sourceRef}: 自定义正则行应展示「${expectedText}」`).toContainText(
        expectedText,
        { timeout: 30000 },
      );
    }

    await expectRuleSetCustomRegexOption(page, sourceRef, ruleName);
  } finally {
    if (createdId) {
      await deleteCustomRegexById(page, sourceRef, createdId);
    }
  }
}

export async function expectDataQualityRuleBaseCustomRegexEditDetailDeleteContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "车辆VIN正则-待删除";
  const originalDesc = "校验车辆VIN格式-待删除";
  const editedDesc = "校验车辆VIN格式-已编辑";
  const ruleContent = "^[A-Z0-9]{17}$";
  let targetId: string | number | undefined;

  await deleteCustomRegexByNameBestEffort(page, sourceRef, ruleName);
  targetId = await createCustomRegexFixture(page, sourceRef, {
    ruleName,
    ruleType: 3,
    associationScope: 1,
    ruleDesc: originalDesc,
    ruleContent,
  });

  try {
    const listResponse = waitForDqJson<DqRuleBaseCustomRegexPage>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/list",
      (payload) => (payload.data?.contentList ?? []).some((record) => record.ruleName === ruleName),
    );
    await gotoDataQualityPage(page, "/dq/ruleBase");
    await page.locator(".ant-tabs-tab").filter({ hasText: "自定义正则" }).click({ timeout: 30000 });
    const records = expectCustomRegexPage(
      expectDqSuccess(await listResponse, `${sourceRef}: 自定义正则列表应请求成功`),
      `${sourceRef}: 自定义正则列表应返回记录`,
    );
    const originalRecord = records.find((record) => record.ruleName === ruleName);
    expect(originalRecord, `${sourceRef}: 自定义正则列表应包含待编辑规则`).toBeTruthy();

    let row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: ruleName }).first();
    await expect(row, `${sourceRef}: 待编辑自定义正则行应可见`).toBeVisible({ timeout: 30000 });
    await expect(
      row.getByRole("button", { name: "编辑" }),
      `${sourceRef}: 未引用规则应展示编辑入口`,
    ).toBeEnabled({
      timeout: 30000,
    });
    await expect(
      row.getByRole("button", { name: "删除" }),
      `${sourceRef}: 未引用规则应展示删除入口`,
    ).toBeEnabled({
      timeout: 30000,
    });

    await row.getByRole("button", { name: "编辑" }).click({ timeout: 30000 });
    const modal = page.locator(".ant-modal:visible").last();
    await expect(modal, `${sourceRef}: 编辑自定义正则弹窗应打开`).toContainText("编辑自定义规则", {
      timeout: 30000,
    });
    await expect(modal.locator("#ruleName"), `${sourceRef}: 编辑弹窗应回显规则名称`).toHaveValue(
      ruleName,
      {
        timeout: 30000,
      },
    );
    await expect(modal.locator("#ruleDesc"), `${sourceRef}: 编辑弹窗应回显规则描述`).toHaveValue(
      originalDesc,
      {
        timeout: 30000,
      },
    );
    await expect(modal.locator("#ruleContent"), `${sourceRef}: 编辑弹窗应回显正则内容`).toHaveValue(
      ruleContent,
      {
        timeout: 30000,
      },
    );

    const saveResponse = waitForDqJson<boolean>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/addOrUpdate",
    );
    const editedListResponse = waitForDqJson<DqRuleBaseCustomRegexPage>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/list",
      (payload) =>
        (payload.data?.contentList ?? []).some(
          (record) => String(record.id) === String(targetId) && record.ruleDesc === editedDesc,
        ),
    );
    await modal.locator("#ruleDesc").fill(editedDesc, { timeout: 30000 });
    await modal.getByRole("button", { name: /确\s*定/ }).click({ timeout: 30000 });
    expectDqSuccess(await saveResponse, `${sourceRef}: 编辑保存自定义正则应请求成功`);

    const editedRecords = expectCustomRegexPage(
      expectDqSuccess(await editedListResponse, `${sourceRef}: 编辑后自定义正则列表应刷新成功`),
      `${sourceRef}: 编辑后自定义正则列表应返回记录`,
    );
    const editedRecord = editedRecords.find((record) => String(record.id) === String(targetId));
    expect(editedRecord?.ruleDesc, `${sourceRef}: 编辑后接口应回显最新规则描述`).toBe(editedDesc);

    row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: ruleName }).first();
    await expect(row, `${sourceRef}: 编辑后列表应展示目标规则`).toContainText(editedDesc, {
      timeout: 30000,
    });

    const detailResponse = waitForDqJson<DqRuleBaseCustomRegexRecord>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/detail",
      (payload) => String(payload.data?.id) === String(targetId),
    );
    await row.locator("a").filter({ hasText: ruleName }).click({ timeout: 30000 });
    const detail = expectDqSuccess(await detailResponse, `${sourceRef}: 自定义正则详情应请求成功`);
    expect(detail.ruleDesc, `${sourceRef}: 详情接口应回显编辑后的规则描述`).toBe(editedDesc);
    expect(detail.ruleContent, `${sourceRef}: 详情接口应回显正则内容`).toBe(ruleContent);
    const detailDialog = page
      .locator(".ant-drawer:visible,.ant-modal:visible,[role=dialog]:visible")
      .last();
    await expect(detailDialog, `${sourceRef}: 点击规则名称应打开详情面板`).toBeVisible({
      timeout: 30000,
    });
    for (const expectedText of [ruleName, "有效性", "字段级", "0", editedDesc, ruleContent]) {
      await expect(detailDialog, `${sourceRef}: 详情面板应展示「${expectedText}」`).toContainText(
        expectedText,
        { timeout: 30000 },
      );
    }
    await page.keyboard.press("Escape");
    await expect(detailDialog, `${sourceRef}: 详情面板关闭后才能删除规则`).toBeHidden({
      timeout: 30000,
    });

    row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: ruleName }).first();
    const deleteResponse = waitForDqJson<boolean>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/delete",
    );
    const refreshedListResponse = waitForDqJson<DqRuleBaseCustomRegexPage>(
      page,
      "/dassets/v1/valid/monitorRuleLibrary/list",
      (payload) =>
        !(payload.data?.contentList ?? []).some((record) => String(record.id) === String(targetId)),
    );
    await row.getByRole("button", { name: "删除" }).click({ timeout: 30000 });
    const confirm = page.locator(".ant-popover:visible,.ant-modal:visible").last();
    await expect(confirm, `${sourceRef}: 删除未引用规则应弹出确认`).toContainText("确定要删除吗", {
      timeout: 30000,
    });
    await confirm
      .getByRole("button", { name: /确\s*定/ })
      .last()
      .click({ timeout: 30000 });
    expectDqSuccess(await deleteResponse, `${sourceRef}: 删除未引用自定义正则应请求成功`);
    expectCustomRegexPage(
      expectDqSuccess(await refreshedListResponse, `${sourceRef}: 删除后自定义正则列表应刷新成功`),
      `${sourceRef}: 删除后自定义正则列表应返回有效结构`,
      { allowEmpty: true },
    );
    await expect(row, `${sourceRef}: 删除后目标规则应从列表消失`).toBeHidden({ timeout: 30000 });
    targetId = undefined;
  } finally {
    if (targetId) {
      await deleteCustomRegexById(page, sourceRef, targetId).catch(() => {});
    }
  }
}

export async function expectDataQualityRuleBaseReferencedCustomRegexDeleteProtectionContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await ensureReferencedCustomRegexFixture(page, sourceRef);
  const records = await listCustomRegexRecords(page, sourceRef);
  const referenced = records.find((record) => Number(record.associationRuleCount) > 0);
  expect(
    referenced,
    `${sourceRef}: ltqc-local 应存在已被规则引用的自定义正则，用于验证删除保护`,
  ).toBeTruthy();
  const ruleName = expectNonEmptyString(
    referenced?.ruleName,
    `${sourceRef}: 已引用自定义正则应包含规则名称`,
  );

  await gotoDataQualityPage(page, "/dq/ruleBase");
  await page.locator(".ant-tabs-tab").filter({ hasText: "自定义正则" }).click({ timeout: 30000 });
  const row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: ruleName }).first();
  await expect(row, `${sourceRef}: 已引用自定义正则行应可见`).toBeVisible({ timeout: 30000 });
  await expect(row, `${sourceRef}: 已引用自定义正则应展示关联规则数`).toContainText(
    String(referenced?.associationRuleCount),
    { timeout: 30000 },
  );

  const deleteButton = row.getByRole("button", { name: "删除" });
  if (await deleteButton.isDisabled({ timeout: 3000 }).catch(() => false)) {
    await expect(deleteButton, `${sourceRef}: 已引用自定义正则删除入口应禁用`).toBeDisabled({
      timeout: 30000,
    });
    return;
  }

  await deleteButton.click({ timeout: 30000 });
  await expect(
    page.locator("body"),
    `${sourceRef}: 删除已引用自定义正则应提示先调整引用规则`,
  ).toContainText(/引用|关联|调整规则|不能删除|无法删除/, { timeout: 30000 });
}

async function ensureReferencedCustomRegexFixture(page: Page, sourceRef: string): Promise<void> {
  const existingReferenced = (await listCustomRegexRecords(page, sourceRef)).find(
    (record) => Number(record.associationRuleCount) > 0,
  );
  if (existingReferenced) return;

  const ruleName = "手机号正则-已引用";
  await deleteCustomRegexByNameBestEffort(page, sourceRef, ruleName);
  await createCustomRegexFixture(page, sourceRef, {
    ruleName,
    ruleType: 3,
    associationScope: 1,
    ruleDesc: "验证已引用自定义正则删除保护",
    ruleContent: "^1[3-9]\\d{9}$",
  });
  const createdRuleId = expectNonEmptyString(
    (await listCustomRegexRecords(page, sourceRef)).find((record) => record.ruleName === ruleName)
      ?.id,
    `${sourceRef}: 自定义正则 fixture 创建后应返回 id`,
  );

  const packageName = await attachCustomRegexToArchiveRuleSet(
    page,
    sourceRef,
    ruleName,
    createdRuleId,
  );
  await ensureReferencedCustomRegexRuleTask(page, sourceRef, ruleName, packageName);
  await expect
    .poll(
      async () => {
        const records = await listCustomRegexRecords(page, sourceRef);
        return records.find((record) => record.ruleName === ruleName)?.associationRuleCount ?? 0;
      },
      {
        message: `${sourceRef}: 自定义正则 ${ruleName} 应被规则集引用`,
        timeout: 60000,
      },
    )
    .not.toBe("0");
}

async function attachCustomRegexToArchiveRuleSet(
  page: Page,
  sourceRef: string,
  ruleName: string,
  ruleId: string,
): Promise<string> {
  const tableName = DQ_RULE_MAIN_TABLE;
  const ruleSetRecords = await queryRuleSetRecords(page, tableName);
  const targetRuleSet = ruleSetRecords.find((record) => record.tableName === tableName);
  expect(
    targetRuleSet?.id,
    `${sourceRef}: 应存在可挂载自定义正则的规则集 ${tableName}`,
  ).toBeTruthy();

  await gotoDataQualityPage(
    page,
    `/dq/ruleSet/edit/${targetRuleSet?.id}?projectId=${getProjectId()}`,
  );
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 规则集编辑页应打开`).toContainText(/编辑规则集|添加规则/, {
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

  const packageName = `自定义正则引用规则包-${ruleId}`;
  await createDedicatedRuleSetPackage(page, sourceRef, packageName);
  await page.getByText("添加规则", { exact: true }).first().click({ timeout: 30000 });
  await page.getByText("有效性校验", { exact: true }).last().click({ timeout: 30000 });
  await selectRuleSetStatisticFunctionBySearch(
    page,
    "自定义正则",
    "格式校验-自定义正则",
    sourceRef,
  );
  await selectRuleSetField(page, "owner_phone", sourceRef);
  await selectRuleSetCustomRuleBySearch(page, ruleName, sourceRef);
  await configureRuleSetCustomRegexExpectation(page, sourceRef, ruleName);
  await switchRuleSetStrength(page, "强规则", sourceRef);
  await fillRuleSetRuleDescription(page, `引用${ruleName}验证删除保护`);
  await saveRuleSetRuleRow(page, sourceRef, "新增已引用自定义正则规则");
  await clickRuleSetSubmitButton(page, sourceRef);
  await expect
    .poll(
      async () => {
        const currentDetail = await queryRuleSetDetail(page, sourceRef, targetRuleSet?.id);
        return (
          findRuleSetPackageReferencingCustomRegex(currentDetail, ruleId, ruleName)?.packageName ??
          ""
        );
      },
      {
        message: `${sourceRef}: 规则集详情应保存自定义正则「${ruleName}」引用`,
        timeout: 60000,
      },
    )
    .not.toBe("");
  const detail = await queryRuleSetDetail(page, sourceRef, targetRuleSet?.id);
  const savedPackage = findRuleSetPackageReferencingCustomRegex(detail, ruleId, ruleName);
  return expectNonEmptyString(
    savedPackage?.packageName,
    `${sourceRef}: 自定义正则引用应归属到规则包`,
  );
}

async function createDedicatedRuleSetPackage(
  page: Page,
  sourceRef: string,
  packageName: string,
): Promise<void> {
  await clickRuleSetPackageAddButton(page, sourceRef);
  const visiblePackageInput = page.locator('input[placeholder="请输入规则包名称"]:visible').last();
  if (await visiblePackageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await visiblePackageInput.fill(packageName, { timeout: 30000 });
    await visiblePackageInput.press("Tab", { timeout: 30000 });
  } else {
    const packageCombobox = page
      .locator(".ant-select:visible")
      .filter({ hasText: "请选择规则包名称" })
      .last();
    await expect(packageCombobox, `${sourceRef}: 新增规则包后应展示规则包名称选择框`).toBeVisible({
      timeout: 30000,
    });
    await packageCombobox.click({ force: true, timeout: 30000 });
    await page.keyboard.type(packageName);
    await page.keyboard.press("Enter");
  }
  await expect(
    page.locator("body"),
    `${sourceRef}: 专用规则包应回显「${packageName}」`,
  ).toContainText(packageName, {
    timeout: 30000,
  });

  const packageSelect = page
    .locator(".ant-select:visible")
    .filter({ hasText: /规则包|请选择规则包名称/ })
    .first();
  if (
    (await packageSelect.isVisible({ timeout: 3000 }).catch(() => false)) &&
    !((await packageSelect.textContent({ timeout: 30000 })) ?? "").includes(packageName)
  ) {
    await packageSelect.click({ timeout: 30000 });
    const clicked = await clickActiveAntdOption(page, packageName);
    expect(clicked, `${sourceRef}: 规则包下拉应包含专用规则包「${packageName}」`).toBe(true);
  }
}

async function ensureReferencedCustomRegexRuleTask(
  page: Page,
  sourceRef: string,
  ruleName: string,
  packageName: string,
): Promise<void> {
  const tableName = DQ_RULE_MAIN_TABLE;
  const taskName = `已引用自定义正则删除保护任务-${ruleName}`;
  const existingTask = (await queryRuleTaskRecords(page, tableName)).find(
    (record) => record.ruleName === taskName,
  );
  if (existingTask) return;

  await gotoNewRuleTaskMonitorObjectPageForTable(page, sourceRef, taskName, tableName);
  await configureManualPartition(page, sourceRef, "stat_date='20260116'");
  await clickNextUntilMonitorRuleConfig(page, sourceRef);
  await selectRuleTaskRulePackageOnCurrentPage(page, sourceRef, [packageName], "有效性校验");
  await clickNextUntilScheduleConfig(page, sourceRef);
  await chooseDqFieldOptionByText(page, /调度周期/, "手动触发", sourceRef);
  await chooseDqFieldOptionByText(page, /规则拼接包/, "1", sourceRef);
  await chooseFirstDqSelectOption(page, /资源组/, sourceRef);
  await chooseDqFieldOptionByText(page, /实例生成方式/, "立即生成", sourceRef);
  await chooseDqFieldOptionByText(page, /超时时间/, "不限制", sourceRef);
  await checkDqNoReport(page, sourceRef);

  const saveResponse = waitForRuleTaskPageQuery(page);
  void saveResponse.catch(() => {});
  const createResponse = page
    .waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/dassets\/v1\/valid\/monitor\/(add|save|edit|update|addOrUpdate)/.test(response.url()),
      { timeout: 60000 },
    )
    .catch(() => null);
  await clickDqSubmitButton(page, sourceRef);
  const createPayload = await createResponse.then((response) => response?.json().catch(() => null));
  if (createPayload) {
    expect(
      createPayload.success ?? createPayload.code === 1,
      `${sourceRef}: 新建规则任务 ${taskName} 应请求成功，实际返回 ${JSON.stringify(createPayload)}`,
    ).toBe(true);
  }
  await expect(page, `${sourceRef}: 规则任务 ${taskName} 保存后应返回规则任务管理`).toHaveURL(
    /\/dq\/rule(?:\?|$)/,
    {
      timeout: 60000,
    },
  );
  const savedPayload = await saveResponse.catch(() => undefined);
  if (savedPayload) {
    expect(
      savedPayload.success ?? savedPayload.code === 1,
      `${sourceRef}: 保存任务 ${taskName} 后列表应刷新成功`,
    ).toBe(true);
  }
  await expect
    .poll(
      async () =>
        (await queryRuleTaskRecords(page, tableName)).some(
          (record) => record.ruleName === taskName,
        ),
      {
        message: `${sourceRef}: 保存后规则任务列表 API 应返回 ${taskName}`,
        timeout: 60000,
      },
    )
    .toBe(true);
}

async function queryRuleSetDetail(
  page: Page,
  sourceRef: string,
  id: string | number | undefined,
): Promise<DqRuleSetRecord> {
  expect(id, `${sourceRef}: 查询规则集详情应有 id`).toBeTruthy();
  const response = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleSet/detail"),
    {
      data: { id: String(id) },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    },
  );
  expect(response.ok(), `${sourceRef}: 查询规则集详情 HTTP 应成功`).toBe(true);
  return expectDqSuccess(
    (await response.json()) as DqApiResponse<DqRuleSetRecord>,
    `${sourceRef}: 查询规则集详情应请求成功`,
  );
}

function findRuleSetPackageReferencingCustomRegex(
  detail: DqRuleSetRecord,
  ruleId: string,
  ruleName: string,
): DqRuleSetPackage | undefined {
  for (const rulePackage of detail.packageVOList ?? []) {
    const rules = rulePackage.rules ?? [];
    const matched = rules.some((rule) => ruleSetRuleReferencesCustomRegex(rule, ruleId, ruleName));
    if (matched) return rulePackage;
  }
  return undefined;
}

function ruleSetRuleReferencesCustomRegex(
  rule: DqRuleSetRule,
  ruleId: string,
  ruleName: string,
): boolean {
  if (String(rule.ruleLibraryId ?? "") === ruleId || rule.ruleLibraryValue === ruleName)
    return true;
  return (rule.standardRules ?? []).some((standardRule) =>
    ruleSetRuleReferencesCustomRegex(standardRule, ruleId, ruleName),
  );
}

async function configureRuleSetCustomRegexExpectation(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const ruleScope = page.locator("body").filter({ hasText: ruleName });
  const calculationTypeSelect = ruleScope
    .locator(".ant-select:visible")
    .filter({ hasText: "请选择计算类型" })
    .last();
  await expect(
    calculationTypeSelect,
    `${sourceRef}: 自定义正则期望值应展示计算类型下拉`,
  ).toBeVisible({
    timeout: 30000,
  });
  await calculationTypeSelect.click({ force: true, timeout: 30000 });
  let clicked = await clickActiveAntdOption(page, "固定值");
  expect(clicked, `${sourceRef}: 自定义正则期望值计算类型应支持「固定值」`).toBe(true);

  const operatorSelect = ruleScope
    .locator(".ant-select:visible")
    .filter({ hasText: /^请选择$/ })
    .last();
  await expect(operatorSelect, `${sourceRef}: 自定义正则期望值应展示操作符下拉`).toBeVisible({
    timeout: 30000,
  });
  await operatorSelect.click({ force: true, timeout: 30000 });
  clicked = await clickActiveAntdOption(page, "=");
  expect(clicked, `${sourceRef}: 自定义正则期望值操作符应支持「=」`).toBe(true);

  const valueInput = ruleScope.locator('input[placeholder="请输入数值"]:visible').last();
  await expect(valueInput, `${sourceRef}: 自定义正则期望值应展示数值输入框`).toBeVisible({
    timeout: 30000,
  });
  await valueInput.fill("0", { timeout: 30000 });
  await expect(valueInput, `${sourceRef}: 自定义正则期望值数值应填入 0`).toHaveValue("0", {
    timeout: 30000,
  });
}

async function selectRuleSetCustomRuleBySearch(
  page: Page,
  ruleName: string,
  sourceRef: string,
): Promise<void> {
  const customRuleSelect = page
    .locator(".ant-select")
    .filter({ hasText: "请选择自定义规则" })
    .last();
  await expect(customRuleSelect, `${sourceRef}: 自定义规则下拉应可见`).toBeVisible({
    timeout: 30000,
  });
  await customRuleSelect.click({ force: true, timeout: 30000 });
  await page.keyboard.type(ruleName);
  await expect
    .poll(
      async () => {
        const optionTexts = await getActiveAntdOptionTexts(page);
        return optionTexts.some((text) => text === ruleName || text.includes(ruleName));
      },
      {
        message: `${sourceRef}: 自定义规则下拉应包含「${ruleName}」`,
        timeout: 30000,
      },
    )
    .toBe(true);
  const clicked = await clickActiveAntdOption(page, ruleName);
  expect(clicked, `${sourceRef}: 自定义规则下拉应包含可点击选项「${ruleName}」`).toBe(true);
}

export async function expectDataQualityRuleBaseCustomSqlTemplate(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleBase");
  await clickDqText(page, "自定义sql模版", sourceRef);

  const body = page.locator("body");
  for (const label of ["自定义sql模版", "新增自定义sql模版", "规则名称", "规则分类", "关联范围"]) {
    await expect(body, `${sourceRef}: 自定义 SQL 模版列表应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/ruleBase 自定义 SQL 模版", [
    "/dassets/v1/valid/monitorRuleCustom/pageList",
  ]);

  await clickDqText(page, "新增自定义sql模版", sourceRef);
  await expect(page, `${sourceRef}: 新增自定义 SQL 模版应进入 /dq/ruleBase/sqlAdd`).toHaveURL(
    /\/dq\/ruleBase\/sqlAdd/,
  );

  for (const label of [
    "新增自定义SQL模板",
    "基本信息",
    "规则名称",
    "规则分类",
    "关联范围",
    "自定义配置",
  ]) {
    await expect(body, `${sourceRef}: 新增自定义 SQL 模版页面应展示「${label}」`).toContainText(
      label,
      {
        timeout: 30000,
      },
    );
  }

  await expectDqApiPaths(page, sourceRef, "/dq/ruleBase 新增自定义 SQL 模版", [
    "/dassets/v1/valid/monitor/getGlobalParams",
  ]);
}

export async function expectDataQualityRuleBaseCustomSqlBasicInfoSaveContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const ruleName = "自定义SQL主流程模板";
  const ruleDesc = "使用自定义sql模版统计目标字段质量";
  let createdId: string | number | undefined;

  await deleteCustomSqlByNameBestEffort(page, sourceRef, ruleName);

  try {
    await gotoDataQualityPage(page, "/dq/ruleBase");
    await page
      .locator(".ant-tabs-tab")
      .filter({ hasText: "自定义sql模版" })
      .click({ timeout: 30000 });

    const body = page.locator("body");
    for (const label of [
      "自定义sql模版",
      "新增自定义sql模版",
      "规则名称",
      "规则分类",
      "关联范围",
      "规则描述",
    ]) {
      await expect(body, `${sourceRef}: 自定义 SQL 模版列表应展示「${label}」`).toContainText(
        label,
        {
          timeout: 30000,
        },
      );
    }

    await clickDqText(page, "新增自定义sql模版", sourceRef);
    await expect(page, `${sourceRef}: 新增自定义 SQL 模版应进入 /dq/ruleBase/sqlAdd`).toHaveURL(
      /\/dq\/ruleBase\/sqlAdd/,
      { timeout: 30000 },
    );
    for (const label of [
      "新增自定义SQL模板",
      "基本信息",
      "规则名称",
      "规则分类",
      "关联范围",
      "规则描述",
    ]) {
      await expect(body, `${sourceRef}: 新增页应展示「${label}」`).toContainText(label, {
        timeout: 30000,
      });
    }

    await page.locator("#ruleName").fill(ruleName, { timeout: 30000 });
    await page.locator("#ruleDesc").fill(ruleDesc, { timeout: 30000 });
    await selectDqFormOption(page, "规则分类", "完整性校验", sourceRef);
    await selectDqFormOption(page, "关联范围", "字段", sourceRef);

    const saveRequest = page.waitForRequest((request) => {
      if (!request.url().includes("/dassets/v1/valid/monitorRuleCustom/addOrUpdate")) return false;
      const requestBody = getRequestJson(request);
      return (
        requestBody.ruleName === ruleName &&
        requestBody.ruleType === 1 &&
        requestBody.relationRange === 3 &&
        requestBody.ruleDesc === ruleDesc &&
        !("customConfiguration" in requestBody)
      );
    });
    const saveResponse = waitForDqJson<boolean>(
      page,
      "/dassets/v1/valid/monitorRuleCustom/addOrUpdate",
    );
    await clickDqCompactButton(page, "新增", sourceRef);
    await saveRequest;
    expectDqSuccess(
      await saveResponse,
      `${sourceRef}: 仅填写基础信息保存自定义 SQL 模版应请求成功`,
    );

    const listResponse = await page.request.post(
      buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleCustom/pageList"),
      {
        data: { current: 1, size: 100 },
        headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
        timeout: 60000,
      },
    );
    expect(listResponse.ok(), `${sourceRef}: 保存后查询自定义 SQL 模版列表 HTTP 应成功`).toBe(true);
    const pageData = expectDqSuccess(
      (await listResponse.json()) as DqApiResponse<DqRuleBaseCustomSqlPage>,
      `${sourceRef}: 保存后自定义 SQL 模版列表应请求成功`,
    );
    const record = (pageData.contentList ?? []).find((item) => item.ruleName === ruleName);
    expect(record, `${sourceRef}: 保存后列表接口应返回「${ruleName}」`).toBeTruthy();
    createdId = record?.id;
    expect(
      formatRuleBaseCustomRuleType(record?.ruleType, sourceRef),
      `${sourceRef}: 规则分类应为完整性校验`,
    ).toBe("完整性校验");
    expect(
      formatRuleBaseCustomRelationRange(record?.relationRange, sourceRef),
      `${sourceRef}: 关联范围应为字段`,
    ).toBe("字段");
    expect(record?.ruleDesc, `${sourceRef}: 列表接口应保存规则描述`).toBe(ruleDesc);

    await gotoDataQualityPage(page, "/dq/ruleBase");
    await page
      .locator(".ant-tabs-tab")
      .filter({ hasText: "自定义sql模版" })
      .click({ timeout: 30000 });
    const row = page.locator(".ant-table-tbody tr:visible").filter({ hasText: ruleName }).first();
    await expect(row, `${sourceRef}: 保存后列表应展示自定义 SQL 模版`).toBeVisible({
      timeout: 30000,
    });
    for (const expectedText of [ruleName, "完整性校验", "字段", ruleDesc]) {
      await expect(row, `${sourceRef}: 自定义 SQL 模版行应展示「${expectedText}」`).toContainText(
        expectedText,
        { timeout: 30000 },
      );
    }

    const detailResponse = waitForDqJson<DqRuleBaseCustomSqlRecord>(
      page,
      "/dassets/v1/valid/monitorRuleCustom/detail",
      (payload) => String(payload.data?.id) === String(createdId),
    );
    await row.locator("a").filter({ hasText: ruleName }).click({ timeout: 30000 });
    const detail = expectDqSuccess(
      await detailResponse,
      `${sourceRef}: 自定义 SQL 模版详情应请求成功`,
    );
    expect(detail.ruleName, `${sourceRef}: 详情应回显规则名称`).toBe(ruleName);
    expect(
      formatRuleBaseCustomRuleType(detail.ruleType, sourceRef),
      `${sourceRef}: 详情应回显规则分类`,
    ).toBe("完整性校验");
    expect(
      formatRuleBaseCustomRelationRange(detail.relationRange, sourceRef),
      `${sourceRef}: 详情应回显关联范围`,
    ).toBe("字段");
    expect(detail.ruleDesc, `${sourceRef}: 详情应回显规则描述`).toBe(ruleDesc);
  } finally {
    if (createdId) {
      await deleteCustomSqlById(page, sourceRef, createdId).catch(() => {});
    }
  }
}

export async function expectDataQualityRuleBaseCustomSqlParamConfigContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleBase");
  await clickDqText(page, "自定义sql模版", sourceRef);
  await clickDqText(page, "新增自定义sql模版", sourceRef);
  await expect(page, `${sourceRef}: 新增自定义 SQL 模版应进入 /dq/ruleBase/sqlAdd`).toHaveURL(
    /\/dq\/ruleBase\/sqlAdd/,
  );

  const body = page.locator("body");
  for (const label of [
    "新增自定义SQL模板",
    "基本信息",
    "自定义配置",
    "全局参数",
    "参数",
    "类型",
    "参数名称",
    "参数说明",
  ]) {
    await expect(body, `${sourceRef}: 自定义 SQL 模版参数配置页应展示「${label}」`).toContainText(
      label,
      {
        timeout: 30000,
      },
    );
  }

  const customSql = "select count(*) from ${test_table} where ${column_name} is null";
  await page.locator(".monaco-editor textarea").first().click({ timeout: 30000 });
  await page.keyboard.type(customSql);
  await expect(body, `${sourceRef}: 自定义配置编辑器应回显 SQL 内容`).toContainText(
    "select count(*) from ${test_table} where ${column_name} is null",
    { timeout: 30000 },
  );

  const testTableRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: "${test_table}" })
    .first();
  const columnNameRow = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: "${column_name}" })
    .first();
  await expect(testTableRow, `${sourceRef}: 参数列表应解析 ${"${test_table}"}`).toBeVisible({
    timeout: 30000,
  });
  await expect(columnNameRow, `${sourceRef}: 参数列表应解析 ${"${column_name}"}`).toBeVisible({
    timeout: 30000,
  });

  await testTableRow.locator(".ant-select").click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 参数类型下拉应打开`).toBeVisible({ timeout: 30000 });
  for (const option of ["数值", "数组", "逻辑关系", "当前校验表", "当前校验表字段", "自定义参数"]) {
    await expect(dropdown, `${sourceRef}: 参数类型下拉应包含「${option}」`).toContainText(option, {
      timeout: 30000,
    });
  }

  await dropdown.getByText("自定义参数", { exact: true }).click({ timeout: 30000 });
  await expect(
    testTableRow.getByPlaceholder("请输入参数名称"),
    `${sourceRef}: 参数名称应可编辑`,
  ).toBeVisible({ timeout: 30000 });
  await expect(
    testTableRow.getByPlaceholder("请输入参数说明"),
    `${sourceRef}: 参数说明应可编辑`,
  ).toBeVisible({ timeout: 30000 });

  await clickDqCompactButton(page, "新增", sourceRef);
  await expect(testTableRow, `${sourceRef}: 参数名称为空时应触发必填校验`).toContainText(
    "参数名称不能为空",
    { timeout: 30000 },
  );
  await expect(page, `${sourceRef}: 参数必填校验不应提交或离开新增页面`).toHaveURL(
    /\/dq\/ruleBase\/sqlAdd/,
  );
}

export async function expectDataQualityRuleBaseCustomSqlDetailEditProtectionContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const listResponse = waitForDqJson<DqRuleBaseCustomSqlPage>(
    page,
    "/dassets/v1/valid/monitorRuleCustom/pageList",
  );
  await gotoDataQualityPage(page, "/dq/ruleBase");
  await page
    .locator(".ant-tabs-tab")
    .filter({ hasText: "自定义sql模版" })
    .click({ timeout: 30000 });
  const pageData = expectDqSuccess(
    await listResponse,
    `${sourceRef}: 自定义 SQL 模版列表应请求成功`,
  );
  const records = expectCustomSqlTemplatePage(
    pageData,
    `${sourceRef}: 自定义 SQL 模版列表应返回记录`,
  );
  const target = expectCustomSqlReferencedRecord(records, sourceRef);
  const ruleName = expectNonEmptyString(target.ruleName, `${sourceRef}: 目标模板应包含规则名称`);
  const originalDesc = String(target.ruleDesc ?? "");
  const category = formatRuleBaseCustomRuleType(target.ruleType, sourceRef);
  const relationRange = formatRuleBaseCustomRelationRange(target.relationRange, sourceRef);
  const associationRuleCount = String(target.associationRuleCount);
  const customSql = expectNonEmptyString(
    target.customConfiguration,
    `${sourceRef}: 目标模板应包含自定义 SQL 内容`,
  );

  const row = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
  await expect(row, `${sourceRef}: 列表应展示被规则引用的自定义 SQL 模版`).toBeVisible({
    timeout: 30000,
  });
  for (const expectedText of [
    ruleName,
    category,
    relationRange,
    associationRuleCount,
    originalDesc,
  ]) {
    if (expectedText) {
      await expect(row, `${sourceRef}: 自定义 SQL 模版行应展示「${expectedText}」`).toContainText(
        expectedText,
        { timeout: 30000 },
      );
    }
  }
  await expect(
    row.getByRole("button", { name: "编辑" }),
    `${sourceRef}: 目标模板应展示编辑入口`,
  ).toBeEnabled({
    timeout: 30000,
  });
  await expect(
    row.getByRole("button", { name: "删除" }),
    `${sourceRef}: 已被引用的模板删除入口应禁用`,
  ).toBeDisabled({ timeout: 30000 });

  const detailLink = row.locator("a").filter({ hasText: ruleName }).first();
  if (await detailLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await detailLink.click({ timeout: 30000 });
    await waitForUiSettled(page);
    const detailDialog = page.locator('[role="dialog"]').last();
    await expect(detailDialog, `${sourceRef}: 点击模板名称应打开详情抽屉`).toBeVisible({
      timeout: 30000,
    });
    for (const expectedText of [
      ruleName,
      category,
      relationRange,
      associationRuleCount,
      originalDesc,
    ]) {
      if (expectedText) {
        await expect(detailDialog, `${sourceRef}: 详情抽屉应回显「${expectedText}」`).toContainText(
          expectedText,
          { timeout: 30000 },
        );
      }
    }
    for (const sqlToken of customSql.match(/\$\{[^}]+\}|select|where/gi) ?? []) {
      await expect(
        detailDialog,
        `${sourceRef}: 详情抽屉应回显 SQL 片段「${sqlToken}」`,
      ).toContainText(sqlToken, { timeout: 30000 });
    }
    await detailDialog.getByRole("img", { name: "closeBtn" }).click({ timeout: 30000 });
    await expect(detailDialog, `${sourceRef}: 详情抽屉关闭后才能操作列表编辑`).toBeHidden({
      timeout: 30000,
    });
  }
  if (!page.url().includes("/dq/ruleBase/sqlAdd")) {
    await row.getByRole("button", { name: "编辑" }).click({ timeout: 30000 });
  }
  await expect(page, `${sourceRef}: 编辑自定义 SQL 模板应进入 sqlAdd 路由`).toHaveURL(
    /\/dq\/ruleBase\/sqlAdd/,
  );

  const body = page.locator("body");
  await expect(page.locator("#ruleName"), `${sourceRef}: 编辑页规则名称应回显`).toHaveValue(
    ruleName,
    {
      timeout: 30000,
    },
  );
  await expect(page.locator("#ruleDesc"), `${sourceRef}: 编辑页规则描述应回显`).toHaveValue(
    originalDesc,
    {
      timeout: 30000,
    },
  );
  for (const expectedText of [category, relationRange]) {
    await expect(body, `${sourceRef}: 编辑页应回显「${expectedText}」`).toContainText(
      expectedText,
      {
        timeout: 30000,
      },
    );
  }
  for (const sqlToken of customSql.match(/\$\{[^}]+\}|select|where/gi) ?? []) {
    await expect(body, `${sourceRef}: 编辑页应回显 SQL 片段「${sqlToken}」`).toContainText(
      sqlToken,
      {
        timeout: 30000,
      },
    );
  }

  const editedDesc = `${originalDesc || "custom-sql"} auto ${Date.now()}`;
  let changed = false;
  try {
    await page.locator("#ruleDesc").fill(editedDesc, { timeout: 30000 });
    const saveResponse = waitForDqJson<boolean>(
      page,
      "/dassets/v1/valid/monitorRuleCustom/addOrUpdate",
    );
    await clickDqCompactButton(page, "保存", sourceRef);
    expectDqSuccess(await saveResponse, `${sourceRef}: 编辑自定义 SQL 模版保存应请求成功`);
    changed = true;

    const editedListResponse = waitForDqJson<DqRuleBaseCustomSqlPage>(
      page,
      "/dassets/v1/valid/monitorRuleCustom/pageList",
      (payload) =>
        (payload.data?.contentList ?? []).some(
          (item) => String(item.id) === String(target.id) && item.ruleDesc === editedDesc,
        ),
    );
    await gotoDataQualityPage(page, "/dq/ruleBase");
    await page
      .locator(".ant-tabs-tab")
      .filter({ hasText: "自定义sql模版" })
      .click({ timeout: 30000 });
    const editedRecords = expectCustomSqlTemplatePage(
      expectDqSuccess(await editedListResponse, `${sourceRef}: 编辑后列表应请求成功`),
      `${sourceRef}: 编辑后列表应返回记录`,
    );
    const editedRecord = editedRecords.find((item) => String(item.id) === String(target.id));
    expect(editedRecord?.ruleDesc, `${sourceRef}: 编辑后接口应回显最新规则描述`).toBe(editedDesc);
    await expect(
      page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first(),
      `${sourceRef}: 编辑后列表行应回显最新规则描述`,
    ).toContainText(editedDesc, { timeout: 30000 });
  } finally {
    if (changed) {
      const restoreResponse = await page.request.post(
        buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleCustom/addOrUpdate"),
        {
          data: {
            ...target,
            ruleDesc: originalDesc,
          },
          timeout: 60000,
        },
      );
      expect(restoreResponse.ok(), `${sourceRef}: 清理恢复自定义 SQL 模版描述 HTTP 应成功`).toBe(
        true,
      );
      expectDqSuccess(
        (await restoreResponse.json()) as DqApiResponse<boolean>,
        `${sourceRef}: 清理恢复自定义 SQL 模版描述应请求成功`,
      );
    }
  }
}

export async function expectDataQualityRuleBaseBuiltInRulesShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const initialResponse = waitForDqJson<DqRuleBaseTemplatePage>(
    page,
    "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/ruleBase");
  const initialPage = expectDqSuccess(
    await initialResponse,
    `${sourceRef}: 内置规则列表应请求成功`,
  );

  const body = page.locator("body");
  for (const label of ["规则库配置", "内置规则", "自定义正则", "自定义sql模版", "导出规则库"]) {
    await expect(body, `${sourceRef}: 规则库配置应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  for (const header of [
    "规则名称",
    "规则解释",
    "规则分类",
    "关联范围",
    "关联规则数",
    "规则状态",
    "规则描述",
  ]) {
    await expect(body, `${sourceRef}: 内置规则列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  const initialRecords = expectRuleBaseRecords(initialPage, `${sourceRef}: 内置规则列表应返回记录`);
  expect(
    Number(initialPage.total),
    `${sourceRef}: 内置规则总数应大于当前页记录数`,
  ).toBeGreaterThanOrEqual(initialRecords.length);
  assertRuleBaseNewBuiltInRules(sourceRef, initialRecords);

  const searchKeyword = "key范围校验";
  const searchResponse = waitForDqJson<DqRuleBaseTemplatePage>(
    page,
    "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  );
  await page
    .locator("input[placeholder='请输入规则名称进行搜索']:visible")
    .first()
    .fill(searchKeyword);
  await page.keyboard.press("Enter");
  const searchRecords = expectRuleBaseRecords(
    expectDqSuccess(await searchResponse, `${sourceRef}: 规则名称搜索应请求成功`),
    `${sourceRef}: 规则名称搜索应返回记录`,
  );
  expect(
    searchRecords.every((record) => String(record.functionName ?? "").includes(searchKeyword)),
    `${sourceRef}: 搜索结果应仅包含命中规则名称`,
  ).toBe(true);
  await expect(body, `${sourceRef}: 搜索后列表应展示「${searchKeyword}」`).toContainText(
    searchKeyword,
    {
      timeout: 30000,
    },
  );

  await gotoRuleBaseWithInitialList(page, sourceRef);
  await assertRuleBaseCategoryFilter(page, sourceRef);

  await gotoRuleBaseWithInitialList(page, sourceRef);
  await assertRuleBaseRelationRangeFilter(page, sourceRef);
}

export async function expectDataQualityRuleBaseBuiltInExportContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const initialResponse = waitForDqJson<DqRuleBaseTemplatePage>(
    page,
    "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/ruleBase");
  const initialPage = expectDqSuccess(
    await initialResponse,
    `${sourceRef}: 内置规则列表应请求成功`,
  );
  const records = expectRuleBaseRecords(initialPage, `${sourceRef}: 内置规则列表应返回记录`);
  const target =
    records.find((record) => record.functionName && record.functionExplain && record.description) ??
    records[0];
  expect(target, `${sourceRef}: 导出校验应存在目标内置规则`).toBeTruthy();

  const exportButton = page.getByRole("button", { name: "导出规则库" });
  await expect(exportButton, `${sourceRef}: 应展示导出规则库按钮`).toBeVisible({ timeout: 30000 });
  await exportButton.click({ timeout: 30000 });

  const popconfirm = page.locator(".ant-popconfirm:visible, .ant-popover:visible").last();
  await expect(popconfirm, `${sourceRef}: 导出前应展示确认气泡`).toContainText(
    "请确认是否导出规则库",
    {
      timeout: 30000,
    },
  );
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }),
    popconfirm.locator(".ant-btn-primary").click({ timeout: 30000 }),
  ]);
  expect(download.suggestedFilename(), `${sourceRef}: 导出文件名应为内置规则库 xlsx`).toMatch(
    /内置规则库_.+\.xlsx$/,
  );

  const downloadPath = join(
    tmpdir(),
    `${sourceRef.replace(/[^a-zA-Z0-9_-]/g, "_")}-${Date.now()}.xlsx`,
  );
  await download.saveAs(downloadPath);
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(downloadPath);
    const worksheet = workbook.worksheets[0];
    expect(worksheet, `${sourceRef}: 导出文件应包含工作表`).toBeTruthy();

    const workbookText = collectWorksheetText(worksheet).join("\n");
    for (const header of ["规则名称", "规则解释", "规则分类", "关联范围", "规则状态", "规则描述"]) {
      expect(workbookText, `${sourceRef}: 导出文件应包含列「${header}」`).toContain(header);
    }

    const expectedTexts = [
      expectNonEmptyString(target.functionName, `${sourceRef}: 目标规则应包含规则名称`),
      expectNonEmptyString(target.functionExplain, `${sourceRef}: 目标规则应包含规则解释`),
      formatRuleBaseBuiltInRuleType(target.ruleTaskType, sourceRef),
      formatRuleBaseBuiltInRelationRange(target.relationRange, sourceRef),
      formatRuleBaseBuiltInOpenStatus(target.openStatus, sourceRef),
    ];
    if (target.description) {
      expectedTexts.push(target.description);
    }
    for (const expectedText of expectedTexts) {
      expect(workbookText, `${sourceRef}: 导出文件应包含内置规则内容「${expectedText}」`).toContain(
        expectedText,
      );
    }
  } finally {
    if (existsSync(downloadPath)) {
      unlinkSync(downloadPath);
    }
  }
}

export async function expectDataQualityRuleBaseBuiltInStatusToggleContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const initialResponse = waitForDqJson<DqRuleBaseTemplatePage>(
    page,
    "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/ruleBase");
  const initialPage = expectDqSuccess(
    await initialResponse,
    `${sourceRef}: 内置规则列表应请求成功`,
  );
  const records = expectRuleBaseRecords(initialPage, `${sourceRef}: 内置规则列表应返回记录`);
  const target = records.find(
    (record) =>
      record.id &&
      record.functionName === "字段值计算对比" &&
      record.relationNumber === 0 &&
      record.openStatus === 1,
  );
  expect(
    target,
    `${sourceRef}: 应存在未被规则引用且已开启的内置规则「字段值计算对比」`,
  ).toBeTruthy();
  const targetRecord = target as DqRuleBaseTemplateRecord;
  const ruleName = expectNonEmptyString(
    targetRecord.functionName,
    `${sourceRef}: 目标规则应包含规则名称`,
  );
  const ruleCategory = formatRuleBaseBuiltInRuleType(targetRecord.ruleTaskType, sourceRef);
  const relationRange = formatRuleBaseBuiltInRelationRange(targetRecord.relationRange, sourceRef);

  let restored = false;
  try {
    const row = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
    await expect(row, `${sourceRef}: 规则库列表应展示目标规则`).toBeVisible({ timeout: 30000 });
    for (const expectedText of [
      ruleName,
      expectNonEmptyString(targetRecord.functionExplain, `${sourceRef}: 目标规则应包含规则解释`),
      ruleCategory,
      relationRange,
      String(targetRecord.relationNumber),
      expectNonEmptyString(targetRecord.description, `${sourceRef}: 目标规则应包含规则描述`),
    ]) {
      await expect(row, `${sourceRef}: 目标规则行应展示「${expectedText}」`).toContainText(
        expectedText,
        {
          timeout: 30000,
        },
      );
    }

    const ruleSwitch = row.locator(".ant-switch").first();
    await expect(ruleSwitch, `${sourceRef}: 未引用规则的状态开关应可操作`).toBeEnabled({
      timeout: 30000,
    });
    await expect(ruleSwitch, `${sourceRef}: 目标规则初始应为开启`).toHaveAttribute(
      "aria-checked",
      "true",
      {
        timeout: 30000,
      },
    );

    const closeResponse = waitForDqJson<boolean>(
      page,
      "/dassets/v1/valid/monitorRuleTemplate/openOrClose",
    );
    const closedListResponse = waitForDqJson<DqRuleBaseTemplatePage>(
      page,
      "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
      (payload) =>
        (payload.data?.contentList ?? []).some(
          (item) => String(item.id) === String(targetRecord.id) && item.openStatus === 0,
        ),
    );
    await ruleSwitch.click({ timeout: 30000 });
    expectDqSuccess(await closeResponse, `${sourceRef}: 关闭内置规则应请求成功`);
    restored = false;
    await expect(ruleSwitch, `${sourceRef}: 关闭后状态开关应变为关闭`).toHaveAttribute(
      "aria-checked",
      "false",
      { timeout: 30000 },
    );
    const closedRecords = expectRuleBaseRecords(
      expectDqSuccess(await closedListResponse, `${sourceRef}: 关闭后规则库列表应刷新成功`),
      `${sourceRef}: 关闭后规则库列表应返回记录`,
    );
    expect(
      closedRecords.find((record) => String(record.id) === String(targetRecord.id))?.openStatus,
      `${sourceRef}: 关闭后接口应回显 openStatus=0`,
    ).toBe(0);

    await expectRuleSetAddFunctionOption(page, sourceRef, ruleCategory, ruleName, false);

    await gotoDataQualityPage(page, "/dq/ruleBase");
    const reopenedRow = page.locator(".ant-table-tbody tr").filter({ hasText: ruleName }).first();
    const reopenedSwitch = reopenedRow.locator(".ant-switch").first();
    await expect(reopenedSwitch, `${sourceRef}: 关闭后的目标规则应可再次开启`).toHaveAttribute(
      "aria-checked",
      "false",
      { timeout: 30000 },
    );
    const openResponse = waitForDqJson<boolean>(
      page,
      "/dassets/v1/valid/monitorRuleTemplate/openOrClose",
    );
    const openedListResponse = waitForDqJson<DqRuleBaseTemplatePage>(
      page,
      "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
      (payload) =>
        (payload.data?.contentList ?? []).some(
          (item) => String(item.id) === String(targetRecord.id) && item.openStatus === 1,
        ),
    );
    await reopenedSwitch.click({ timeout: 30000 });
    expectDqSuccess(await openResponse, `${sourceRef}: 再次开启内置规则应请求成功`);
    restored = true;
    await expect(reopenedSwitch, `${sourceRef}: 再次开启后状态开关应变为开启`).toHaveAttribute(
      "aria-checked",
      "true",
      { timeout: 30000 },
    );
    const openedRecords = expectRuleBaseRecords(
      expectDqSuccess(await openedListResponse, `${sourceRef}: 开启后规则库列表应刷新成功`),
      `${sourceRef}: 开启后规则库列表应返回记录`,
    );
    expect(
      openedRecords.find((record) => String(record.id) === String(targetRecord.id))?.openStatus,
      `${sourceRef}: 再次开启后接口应回显 openStatus=1`,
    ).toBe(1);

    await expectRuleSetAddFunctionOption(page, sourceRef, ruleCategory, ruleName, true);
  } finally {
    if (!restored) {
      await setRuleBaseBuiltInOpenStatus(page, sourceRef, targetRecord.id, 1);
    }
  }
}

export async function expectDataQualityRuleBasePermissionContract(
  adminPage: Page,
  limitedPage: Page,
  sourceRef: string,
): Promise<void> {
  await expectDqAdminFullMenu(adminPage, sourceRef);
  await expectDqPagePermissionTarget(adminPage, sourceRef, {
    path: "/dq/ruleBase",
    title: /规则库配置|内置规则|自定义正则|自定义SQL/,
    operations: /新增|编辑|删除|导出|关闭|开启/,
  });
  await expectDqLimitedPermission(limitedPage, sourceRef, {
    path: "/dq/ruleBase",
    title: /规则库配置|内置规则|自定义正则|自定义SQL/,
    forbiddenMenu: /规则库配置/,
    operations: /新增|编辑|删除|导出|关闭|开启/,
  });
}

async function gotoRuleBaseWithInitialList(
  page: Page,
  sourceRef: string,
): Promise<DqRuleBaseTemplateRecord[]> {
  await gotoDataQualityPage(page, "/dq/overview");
  const response = waitForDqJson<DqRuleBaseTemplatePage>(
    page,
    "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/ruleBase");
  return expectRuleBaseRecords(
    expectDqSuccess(await response, `${sourceRef}: 规则库配置重新加载应请求成功`),
    `${sourceRef}: 规则库配置重新加载应返回内置规则`,
  );
}

async function assertRuleBaseCategoryFilter(page: Page, sourceRef: string): Promise<void> {
  await page.locator(".ant-table-filter-trigger").first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-dropdown:visible, .ant-table-filter-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 规则分类筛选下拉应打开`).toBeVisible({ timeout: 30000 });
  for (const category of [
    "完整性校验",
    "有效性校验",
    "唯一性校验",
    "统计性校验",
    "一致性校验",
    "时效性校验",
    "合理性校验",
  ]) {
    await expect(dropdown, `${sourceRef}: 规则分类筛选项应包含「${category}」`).toContainText(
      category,
      {
        timeout: 30000,
      },
    );
  }

  const categoryResponse = waitForDqJson<DqRuleBaseTemplatePage>(
    page,
    "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  );
  await dropdown.getByText("合理性校验", { exact: true }).click({ timeout: 30000 });
  await dropdown.getByRole("button", { name: "确 定" }).click({ timeout: 30000 });
  const categoryRecords = expectRuleBaseRecords(
    expectDqSuccess(await categoryResponse, `${sourceRef}: 合理性校验筛选应请求成功`),
    `${sourceRef}: 合理性校验筛选应返回记录`,
  );
  expect(
    categoryRecords.every((record) => record.ruleTaskType === 9),
    `${sourceRef}: 合理性校验筛选结果应全部为 ruleTaskType=9`,
  ).toBe(true);

  const names = new Set(categoryRecords.map((record) => record.functionName));
  for (const ruleName of ["多表字段值对比", "字段值计算对比", "数据变化趋势"]) {
    expect(names.has(ruleName), `${sourceRef}: 合理性校验应展示新增内置规则「${ruleName}」`).toBe(
      true,
    );
    await expect(
      page.locator("body"),
      `${sourceRef}: 合理性校验筛选后 UI 应展示「${ruleName}」`,
    ).toContainText(ruleName, { timeout: 30000 });
  }
}

async function assertRuleBaseRelationRangeFilter(page: Page, sourceRef: string): Promise<void> {
  await page.locator(".ant-table-filter-trigger").nth(1).click({ timeout: 30000 });
  const dropdown = page.locator(".ant-dropdown:visible, .ant-table-filter-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 关联范围筛选下拉应打开`).toBeVisible({ timeout: 30000 });
  for (const relationRange of ["字段", "单表", "多表"]) {
    await expect(dropdown, `${sourceRef}: 关联范围筛选项应包含「${relationRange}」`).toContainText(
      relationRange,
      { timeout: 30000 },
    );
  }

  const relationResponse = waitForDqJson<DqRuleBaseTemplatePage>(
    page,
    "/dassets/v1/valid/monitorRuleTemplate/pageQuery",
  );
  await dropdown.getByText("多表", { exact: true }).click({ timeout: 30000 });
  await dropdown.getByRole("button", { name: "确 定" }).click({ timeout: 30000 });
  const relationRecords = expectRuleBaseRecords(
    expectDqSuccess(await relationResponse, `${sourceRef}: 多表关联范围筛选应请求成功`),
    `${sourceRef}: 多表关联范围筛选应返回记录`,
  );
  expect(
    relationRecords.every((record) => record.relationRange === 1),
    `${sourceRef}: 多表筛选结果应全部为 relationRange=1`,
  ).toBe(true);
  await expect(page.locator("body"), `${sourceRef}: 多表筛选后 UI 应展示「多表」`).toContainText(
    "多表",
    {
      timeout: 30000,
    },
  );
}

function expectRuleBaseRecords(
  pageData: DqRuleBaseTemplatePage,
  message: string,
): DqRuleBaseTemplateRecord[] {
  const records = pageData.contentList ?? [];
  expect(records.length, message).toBeGreaterThan(0);
  for (const [index, record] of records.entries()) {
    expectNonEmptyString(record.functionName, `${message}: 第 ${index + 1} 条应包含规则名称`);
    expectNonEmptyString(record.functionExplain, `${message}: 第 ${index + 1} 条应包含规则解释`);
    expect(typeof record.ruleTaskType, `${message}: 第 ${index + 1} 条应包含规则分类编码`).toBe(
      "number",
    );
    expect(typeof record.relationRange, `${message}: 第 ${index + 1} 条应包含关联范围编码`).toBe(
      "number",
    );
    expect([0, 1], `${message}: 第 ${index + 1} 条规则状态应为开启或关闭`).toContain(
      record.openStatus,
    );
  }
  return records;
}

function expectCustomSqlTemplatePage(
  pageData: DqRuleBaseCustomSqlPage,
  message: string,
): DqRuleBaseCustomSqlRecord[] {
  const records = pageData.contentList ?? [];
  expect(Number(pageData.total), `${message}: total 应覆盖当前返回记录数`).toBeGreaterThanOrEqual(
    records.length,
  );
  expect(records.length, message).toBeGreaterThan(0);
  for (const [index, record] of records.entries()) {
    expectNonEmptyString(record.ruleName, `${message}: 第 ${index + 1} 条应包含规则名称`);
    formatRuleBaseCustomRuleType(record.ruleType, message);
    formatRuleBaseCustomRelationRange(record.relationRange, message);
    expect(
      Number(record.associationRuleCount),
      `${message}: 第 ${index + 1} 条关联规则数应为数字`,
    ).not.toBeNaN();
    expectNonEmptyString(
      record.customConfiguration,
      `${message}: 第 ${index + 1} 条应包含规则内容`,
    );
  }
  return records;
}

function expectCustomRegexPage(
  pageData: DqRuleBaseCustomRegexPage,
  message: string,
  options: { allowEmpty?: boolean } = {},
): DqRuleBaseCustomRegexRecord[] {
  const records = pageData.contentList ?? [];
  expect(Number(pageData.total), `${message}: total 应覆盖当前返回记录数`).toBeGreaterThanOrEqual(
    records.length,
  );
  if (!options.allowEmpty) {
    expect(records.length, message).toBeGreaterThan(0);
  }
  for (const [index, record] of records.entries()) {
    expectNonEmptyString(record.ruleName, `${message}: 第 ${index + 1} 条应包含规则名称`);
    formatCustomRegexRuleType(record.ruleType, message);
    formatCustomRegexAssociationScope(record.associationScope, message);
    expect(
      Number(record.associationRuleCount),
      `${message}: 第 ${index + 1} 条关联规则数应为数字`,
    ).not.toBeNaN();
    expectNonEmptyString(record.ruleContent, `${message}: 第 ${index + 1} 条应包含正则内容`);
  }
  return records;
}

async function deleteCustomRegexByNameBestEffort(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const records = await listCustomRegexRecords(page, sourceRef);
  for (const record of records.filter((item) => item.ruleName === ruleName)) {
    expect(
      Number(record.associationRuleCount),
      `${sourceRef}: 清理同名自定义正则前不应存在引用规则`,
    ).toBe(0);
    await deleteCustomRegexById(page, sourceRef, record.id);
  }
}

async function listCustomRegexRecords(
  page: Page,
  sourceRef: string,
): Promise<DqRuleBaseCustomRegexRecord[]> {
  const response = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleLibrary/list"),
    {
      data: { current: 1, size: 100 },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    },
  );
  expect(response.ok(), `${sourceRef}: 查询自定义正则列表 HTTP 应成功`).toBe(true);
  return expectCustomRegexPage(
    expectDqSuccess(
      (await response.json()) as DqApiResponse<DqRuleBaseCustomRegexPage>,
      `${sourceRef}: 查询自定义正则列表应请求成功`,
    ),
    `${sourceRef}: 查询自定义正则列表应返回有效结构`,
    { allowEmpty: true },
  );
}

async function createCustomRegexFixture(
  page: Page,
  sourceRef: string,
  data: {
    ruleName: string;
    ruleType: number;
    associationScope: number;
    ruleDesc: string;
    ruleContent: string;
  },
): Promise<string | number> {
  const response = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleLibrary/addOrUpdate"),
    {
      data,
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    },
  );
  expect(response.ok(), `${sourceRef}: 创建自定义正则 fixture HTTP 应成功`).toBe(true);
  expectDqSuccess(
    (await response.json()) as DqApiResponse<boolean>,
    `${sourceRef}: 创建自定义正则 fixture 应请求成功`,
  );
  const records = await listCustomRegexRecords(page, sourceRef);
  const created = records.find((record) => record.ruleName === data.ruleName);
  expect(created?.id, `${sourceRef}: 创建后自定义正则 fixture 应返回 id`).toBeTruthy();
  return created?.id as string | number;
}

async function deleteCustomRegexById(
  page: Page,
  sourceRef: string,
  ruleId: string | number | undefined,
): Promise<void> {
  expect(ruleId, `${sourceRef}: 删除自定义正则应有 id`).toBeTruthy();
  const response = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleLibrary/delete"),
    {
      data: { id: String(ruleId) },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    },
  );
  expect(response.ok(), `${sourceRef}: 删除自定义正则 HTTP 应成功`).toBe(true);
  expectDqSuccess(
    (await response.json()) as DqApiResponse<boolean>,
    `${sourceRef}: 删除自定义正则应请求成功`,
  );
}

function expectCustomSqlReferencedRecord(
  records: DqRuleBaseCustomSqlRecord[],
  sourceRef: string,
): DqRuleBaseCustomSqlRecord {
  const target = records.find(
    (record) =>
      record.id &&
      record.ruleName &&
      Number(record.associationRuleCount) > 0 &&
      record.customConfiguration,
  );
  expect(target, `${sourceRef}: 当前环境应存在已被规则引用的自定义 SQL 模版`).toBeTruthy();
  return target as DqRuleBaseCustomSqlRecord;
}

function formatCustomRegexRuleType(ruleType: unknown, sourceRef: string): string {
  const labels = new Map<unknown, string>([
    [1, "完整性"],
    [2, "唯一性"],
    [3, "有效性"],
    [6, "统计性"],
    [7, "一致性"],
    [8, "时效性"],
    [9, "合理性"],
  ]);
  const label = labels.get(ruleType);
  expect(label, `${sourceRef}: 自定义正则规则类型编码应可映射`).toBeTruthy();
  return label as string;
}

function formatCustomRegexAssociationScope(associationScope: unknown, sourceRef: string): string {
  const labels = new Map<unknown, string>([
    [1, "字段级"],
    [2, "表级"],
    [3, "多表"],
  ]);
  const label = labels.get(associationScope);
  expect(label, `${sourceRef}: 自定义正则关联范围编码应可映射`).toBeTruthy();
  return label as string;
}

function formatRuleBaseBuiltInRuleType(ruleTaskType: unknown, sourceRef: string): string {
  const label = formatRuleBaseCustomRuleType(ruleTaskType, sourceRef);
  expect(label, `${sourceRef}: 内置规则分类编码应可映射`).toBeTruthy();
  return label;
}

function formatRuleBaseBuiltInRelationRange(relationRange: unknown, sourceRef: string): string {
  const label = formatRuleBaseCustomRelationRange(relationRange, sourceRef);
  expect(label, `${sourceRef}: 内置规则关联范围编码应可映射`).toBeTruthy();
  return label;
}

function formatRuleBaseBuiltInOpenStatus(openStatus: unknown, sourceRef: string): string {
  const labels = new Map<unknown, string>([
    [0, "关闭"],
    [1, "开启"],
  ]);
  const label = labels.get(openStatus);
  expect(label, `${sourceRef}: 内置规则状态编码应可映射`).toBeTruthy();
  return label as string;
}

function collectWorksheetText(worksheet: ExcelJS.Worksheet): string[] {
  const texts: string[] = [];
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      const value = cell.value;
      if (value === null || value === undefined) return;
      if (typeof value === "object" && "richText" in value && Array.isArray(value.richText)) {
        texts.push(value.richText.map((item) => item.text).join(""));
        return;
      }
      if (typeof value === "object" && "result" in value && value.result !== undefined) {
        texts.push(String(value.result));
        return;
      }
      texts.push(String(value));
    });
  });
  return texts.map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function assertRuleBaseNewBuiltInRules(
  sourceRef: string,
  records: DqRuleBaseTemplateRecord[],
): void {
  const expectedRules = new Map([
    ["多表字段值对比", 9],
    ["字段值计算对比", 9],
    ["周期性校验", 8],
    ["及时性校验", 8],
    ["数据变化趋势", 9],
  ]);

  for (const [ruleName, ruleTaskType] of expectedRules) {
    const matches = records.filter((item) => item.functionName === ruleName);
    expect(matches.length, `${sourceRef}: 新增内置规则「${ruleName}」不应重复展示`).toBe(1);
    const record = matches[0];
    expect(record, `${sourceRef}: 内置规则列表应展示新增规则「${ruleName}」`).toBeTruthy();
    expect(record?.ruleTaskType, `${sourceRef}: 「${ruleName}」应归属预期规则分类`).toBe(
      ruleTaskType,
    );
  }
}

async function queryRuleTaskRecords(page: Page, tableName: string): Promise<DqRuleTaskRecord[]> {
  const response = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitor/pageQuery"),
    {
      data: { current: 1, size: 100, tableName },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    },
  );
  expect(response.ok(), `查询规则任务列表 HTTP 应成功`).toBe(true);
  const payload = (await response.json()) as DqRuleTaskPageQuery;
  expect(payload.success ?? payload.code === 1, `查询规则任务列表应请求成功`).toBe(true);
  return getDqRuleTaskRecords(payload);
}

async function selectRuleSetStatisticFunctionBySearch(
  page: Page,
  searchText: string,
  functionName: string,
  sourceRef: string,
): Promise<void> {
  const statisticSelect = page
    .locator(".ant-select")
    .filter({ hasText: /请选择统计函数|统计函数/ })
    .last();
  await statisticSelect.click({ timeout: 30000 });
  await page.keyboard.type(searchText);
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 统计函数搜索后应包含「${functionName}」`).toContainText(
    functionName,
    {
      timeout: 30000,
    },
  );
  const clicked = await clickActiveAntdOption(page, functionName);
  expect(clicked, `${sourceRef}: 统计函数下拉应包含可点击选项「${functionName}」`).toBe(true);
}

async function expectRuleSetAddFunctionOption(
  page: Page,
  sourceRef: string,
  categoryName: string,
  ruleName: string,
  shouldContain: boolean,
): Promise<void> {
  const pageQueryResponse = waitForDqJson<DqRuleSetPageData>(
    page,
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/ruleSet");
  const records = expectRuleSetPage(
    expectDqSuccess(await pageQueryResponse, `${sourceRef}: 规则集列表应请求成功`),
    `${sourceRef}: 规则集列表应返回记录`,
  );
  const targetRuleSet = expectRuleSetSearchTarget(records, sourceRef);

  await gotoDataQualityPage(
    page,
    `/dq/ruleSet/edit/${targetRuleSet.id}?projectId=${getProjectId()}`,
  );
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 规则集编辑页应打开`).toContainText("编辑规则集", {
    timeout: 30000,
  });
  if (!(await page.getByText("添加规则", { exact: true }).first().isVisible())) {
    await clickDqCompactButton(page, "下一步", sourceRef);
  }
  await expect(body, `${sourceRef}: 规则集编辑页应进入监控规则步骤`).toContainText("添加规则", {
    timeout: 30000,
  });

  await page.getByText("添加规则", { exact: true }).first().click({ timeout: 30000 });
  await page.getByText(categoryName, { exact: true }).last().click({ timeout: 30000 });
  await expect(body, `${sourceRef}: 添加规则后应展示统计函数选择器`).toContainText(
    "请选择统计函数",
    {
      timeout: 30000,
    },
  );
  await page.locator(".ant-select").filter({ hasText: "请选择统计函数" }).last().click({
    timeout: 30000,
  });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 统计函数下拉应打开`).toBeVisible({ timeout: 30000 });
  if (shouldContain) {
    await expect(
      dropdown,
      `${sourceRef}: 开启后规则集新增规则应可选择「${ruleName}」`,
    ).toContainText(ruleName, { timeout: 30000 });
  } else {
    await expect(
      dropdown,
      `${sourceRef}: 关闭后规则集新增规则不应可选择「${ruleName}」`,
    ).not.toContainText(ruleName, { timeout: 30000 });
  }
}

async function expectRuleSetCustomRegexOption(
  page: Page,
  sourceRef: string,
  ruleName: string,
): Promise<void> {
  const pageQueryResponse = waitForDqJson<DqRuleSetPageData>(
    page,
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
  );
  await gotoDataQualityPage(page, "/dq/ruleSet");
  const records = expectRuleSetPage(
    expectDqSuccess(await pageQueryResponse, `${sourceRef}: 规则集列表应请求成功`),
    `${sourceRef}: 规则集列表应返回记录`,
  );
  const targetRuleSet = expectRuleSetSearchTarget(records, sourceRef);

  await gotoDataQualityPage(
    page,
    `/dq/ruleSet/edit/${targetRuleSet.id}?projectId=${getProjectId()}`,
  );
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 规则集编辑页应打开`).toContainText("编辑规则集", {
    timeout: 30000,
  });
  if (!(await page.getByText("添加规则", { exact: true }).first().isVisible())) {
    await clickDqCompactButton(page, "下一步", sourceRef);
  }
  await page.getByText("添加规则", { exact: true }).first().click({ timeout: 30000 });
  await page.getByText("有效性校验", { exact: true }).last().click({ timeout: 30000 });

  await expect(body, `${sourceRef}: 添加有效性规则后应展示统计函数选择器`).toContainText(
    "请选择统计函数",
    { timeout: 30000 },
  );
  const statisticSelect = page.locator(".ant-select").filter({ hasText: "请选择统计函数" }).last();
  await statisticSelect.click({ timeout: 30000 });
  await page.keyboard.type("自定义正则");
  const statisticDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(statisticDropdown, `${sourceRef}: 统计函数下拉应包含自定义正则入口`).toContainText(
    "格式校验-自定义正则",
    { timeout: 30000 },
  );
  await page.keyboard.press("Enter");

  await expect(body, `${sourceRef}: 选择自定义正则统计函数后应展示自定义规则选择器`).toContainText(
    "请选择自定义规则",
    { timeout: 30000 },
  );
  const customRuleSelect = page
    .locator(".ant-select")
    .filter({ hasText: "请选择自定义规则" })
    .last();
  await customRuleSelect.click({ timeout: 30000 });
  await page.keyboard.type(ruleName);
  const customRuleDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(
    customRuleDropdown,
    `${sourceRef}: 规则集自定义规则下拉应可选择「${ruleName}」`,
  ).toContainText(ruleName, { timeout: 30000 });
}

async function setRuleBaseBuiltInOpenStatus(
  page: Page,
  sourceRef: string,
  ruleId: string | number | undefined,
  openStatus: 0 | 1,
): Promise<void> {
  expect(ruleId, `${sourceRef}: 恢复内置规则状态需要规则 id`).toBeTruthy();
  const response = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/monitorRuleTemplate/openOrClose"),
    {
      data: {
        id: String(ruleId),
        openOrClose: openStatus,
      },
      headers: {
        [PROJECT_STORAGE_KEY]: String(getProjectId()),
      },
      timeout: 60000,
    },
  );
  expect(response.ok(), `${sourceRef}: 恢复内置规则状态 HTTP 应成功`).toBe(true);
  expectDqSuccess(
    (await response.json()) as DqApiResponse<boolean>,
    `${sourceRef}: 恢复内置规则状态应请求成功`,
  );
}
