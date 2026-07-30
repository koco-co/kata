// Lindorm 数据资产适配用例的数据质量项目、通用配置与脏数据设置断言。

import { getEnvConfig } from "../../../../../../../_shared/automation/runtime/env-profile";
import { buildDataAssetsApiUrl } from "../../../../../../../_shared/automation/runtime/env-setup";
import { waitForUiSettled } from "../../../../../../../../../runtime/automation/playwright";
import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import ExcelJS from "exceljs";
import {
  expectDqSuccess,
  waitForDqJson,
} from "../../../../../../../_shared/automation/pages/data-quality/api";
import type {
  DqApiResponse,
  DqRuleSetPageData,
} from "../../../../../../../_shared/automation/pages/data-quality/contracts";
import {
  getProjectId,
  gotoDataQualityPage,
  PROJECT_STORAGE_KEY,
} from "../../../../../../../_shared/automation/pages/data-quality/project-context";
import { expectNonEmptyString } from "../../../../../../../_shared/automation/pages/data-quality/record-assertions";
import {
  expectDqAdminFullMenu,
  expectDqApiPaths,
  expectDqLimitedPermission,
  expectDqPagePermissionTarget,
  expectRuleSetPage,
  expectRuleSetSearchTarget,
} from "./page-context";
import { clickDqCompactButton } from "../../../../../../../_shared/automation/pages/data-quality/form-controls";

function getQualityProjectName(): string {
  return getEnvConfig().projects.quality.name;
}

type DqJsonValidationConfigRecord = {
  id?: string | number;
  jsonKey?: string;
  name?: string | null;
  value?: string | null;
  dataSourceType?: number;
  createBy?: string;
  updateBy?: string;
  createAt?: string;
  updateAt?: string;
  createUser?: string;
  lastEditUser?: string;
  gmtCreate?: string;
  gmtModified?: string;
  children?: DqJsonValidationConfigRecord[];
};

type DqJsonValidationConfigPage = {
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  totalPage?: number;
  data?: DqJsonValidationConfigRecord[];
};

export async function expectDataQualityCommonConfigPermissionContract(
  adminPage: Page,
  limitedPage: Page,
  sourceRef: string,
): Promise<void> {
  await expectDqAdminFullMenu(adminPage, sourceRef);
  await expectDqPagePermissionTarget(adminPage, sourceRef, {
    path: "/dq/generalConfig/jsonValidationConfig",
    title: /通用配置|json格式校验管理/,
    operations: /新增|编辑|删除|导入|导出/,
  });
  await expectDqLimitedPermission(limitedPage, sourceRef, {
    path: "/dq/generalConfig/jsonValidationConfig",
    title: /通用配置|json格式校验管理/,
    forbiddenMenu: /通用配置/,
    operations: /新增|编辑|删除|导入|导出/,
  });
}

export async function expectDataQualityProjectCreateEditContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/project/projectList");
  const body = page.locator("body");

  await expectDqCompactButton(page, "创建项目", sourceRef);
  for (const header of [
    "项目名称",
    "项目标识",
    "项目描述",
    "项目成员",
    "项目管理员",
    "创建时间",
    "项目空间关联",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 项目信息列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  const suffix = String(Date.now());
  const projectName = `autodq_project_${suffix}`;
  const projectIdent = `autodq_${suffix}`;
  const initialDescription = `created by playwright ${suffix}`;
  const editedDescription = `edited by playwright ${suffix}`;
  let created = false;

  try {
    await clickDqCompactButton(page, "创建项目", sourceRef);
    const createModal = await expectDqProjectModal(page, sourceRef, "创建项目");
    await fillDqProjectModal(page, createModal, sourceRef, {
      projectName,
      projectIdent,
      description: initialDescription,
      selectAdmin: true,
    });
    await submitDqProjectModal(page, createModal, sourceRef, "创建项目保存");

    const createdRow = await expectDqProjectRow(page, sourceRef, projectName, projectIdent);
    await expect(createdRow, `${sourceRef}: 新建项目应回显初始描述`).toContainText(
      initialDescription,
      {
        timeout: 30000,
      },
    );
    created = true;

    await createdRow.getByRole("button", { name: "编辑" }).click({ timeout: 30000 });
    const editModal = await expectDqProjectModal(page, sourceRef, "编辑项目");
    await fillDqProjectModal(page, editModal, sourceRef, {
      description: editedDescription,
      selectAdmin: false,
    });
    await submitDqProjectModal(page, editModal, sourceRef, "编辑项目保存");

    const editedRow = await expectDqProjectRow(page, sourceRef, projectName, projectIdent);
    await expect(editedRow, `${sourceRef}: 编辑后列表应回显修改后的项目描述`).toContainText(
      editedDescription,
      { timeout: 30000 },
    );
  } finally {
    if (created) {
      await deleteDqProjectBestEffort(page, projectName, projectIdent);
    }
  }
}

export async function expectDataQualityProjectPinDeleteContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/project/projectList");
  await expect(page.locator("body"), `${sourceRef}: 项目信息列表应加载成功`).toContainText(
    "创建项目",
    {
      timeout: 30000,
    },
  );
  await expect(
    page.locator(".ant-layout-sider").first(),
    `${sourceRef}: 当前使用项目应保持为 ${getQualityProjectName()}`,
  ).toContainText(getQualityProjectName(), { timeout: 30000 });

  const suffix = String(Date.now());
  const projectName = `autodq_top_${suffix}`;
  const projectIdent = `autodqtop_${suffix}`;
  const description = `top delete by playwright ${suffix}`;
  let created = false;
  let deleted = false;

  try {
    await clickDqCompactButton(page, "创建项目", sourceRef);
    const createModal = await expectDqProjectModal(page, sourceRef, "创建项目");
    await fillDqProjectModal(page, createModal, sourceRef, {
      projectName,
      projectIdent,
      description,
      selectAdmin: true,
    });
    await submitDqProjectModal(page, createModal, sourceRef, "置顶删除验证项目创建");
    const createdRow = await expectDqProjectRow(page, sourceRef, projectName, projectIdent);
    created = true;

    await createdRow.getByRole("button", { name: "置顶" }).click({ timeout: 30000 });
    await gotoDataQualityPage(page, "/dq/project/projectList");
    const pinnedRow = await expectDqProjectRow(page, sourceRef, projectName, projectIdent);
    await expect(pinnedRow, `${sourceRef}: 置顶后项目应进入取消置顶状态`).toContainText(
      "取消置顶",
      {
        timeout: 30000,
      },
    );

    await deleteDqProjectAndAssert(page, sourceRef, projectName, projectIdent);
    deleted = true;
    await expect(
      page.locator(".ant-layout-sider").first(),
      `${sourceRef}: 删除临时项目后当前使用项目仍为 ${getQualityProjectName()}`,
    ).toContainText(getQualityProjectName(), { timeout: 30000 });
  } finally {
    if (created && !deleted) {
      await deleteDqProjectBestEffort(page, projectName, projectIdent);
    }
  }
}

export async function expectDataQualityProjectDefaultMonitorDatabaseContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/project/projectList");
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 项目信息列表应加载成功`).toContainText("创建项目", {
    timeout: 30000,
  });

  const projectRow = await expectDqProjectRow(page, sourceRef, "lt_dq_main_project", "lt_dq_main");
  await projectRow.getByRole("button", { name: "编辑" }).click({ timeout: 30000 });
  const editModal = await expectDqProjectModal(page, sourceRef, "编辑项目");
  await expect(editModal, `${sourceRef}: 项目编辑弹窗应展示默认监控数据源库配置`).toContainText(
    /默认监控数据源|默认监控数据源库|SparkThrift/i,
    { timeout: 30000 },
  );

  await selectDqFormOptionByRegex(
    page,
    /默认监控数据源|默认监控数据源库/,
    /SparkThrift|spark|thrift|SchemaA|voyah|default/i,
    sourceRef,
  );
  await submitDqProjectModal(page, editModal, sourceRef, "默认监控数据源库保存");

  const editedRow = await expectDqProjectRow(page, sourceRef, "lt_dq_main_project", "lt_dq_main");
  await expect(editedRow, `${sourceRef}: 默认监控数据源库保存后项目仍在列表中`).toContainText(
    "lt_dq_main_project",
    {
      timeout: 30000,
    },
  );

  await gotoDataQualityPage(page, "/dq/ruleSet");
  await clickDqCompactButton(page, "新建规则集", sourceRef);
  await expect(
    page.locator("body"),
    `${sourceRef}: 新建规则集应默认带出监控数据源库相关字段`,
  ).toContainText(/数据源|数据库|SparkThrift|SchemaA/i, { timeout: 30000 });
  await page.keyboard.press("Escape");

  await gotoDataQualityPage(page, "/dq/rule");
  await clickDqCompactButton(page, "新建监控规则", sourceRef);
  await expect(
    page.locator("body"),
    `${sourceRef}: 新建规则任务应默认带出监控对象数据源库字段`,
  ).toContainText(/数据源|数据库|SparkThrift|SchemaA/i, { timeout: 30000 });
}

export async function expectDataQualityDirtyDataManagementContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/project/dirtyDataManage");
  const body = page.locator("body");
  for (const text of ["脏数据管理", "独立存储"]) {
    await expect(body, `${sourceRef}: 脏数据管理页面应展示「${text}」`).toContainText(text, {
      timeout: 30000,
    });
  }
  for (const header of [
    "数据源",
    "数据源类型",
    "脏数据存储库",
    "数据存储时效",
    "更新人",
    "脏数据存储",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 脏数据管理列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  const row = await expectDirtyDataStorageRow(page, sourceRef);
  await editDirtyDataStorageRow(page, sourceRef, row, {
    dirtyStore: "dq_dirty_store",
    retentionDays: "30",
    enableStorage: true,
  });
  const updatedRow = await expectDirtyDataStorageRow(page, sourceRef);
  for (const expectedText of ["dq_dirty_store", "30"]) {
    await expect(updatedRow, `${sourceRef}: 脏数据管理列表应回显「${expectedText}」`).toContainText(
      expectedText,
      { timeout: 30000 },
    );
  }
  await expect(updatedRow, `${sourceRef}: 脏数据管理列表应展示更新人或开关状态`).toContainText(
    /admin|开启|启用|是|关闭|禁用|否/i,
    { timeout: 30000 },
  );

  await gotoDataQualityPage(page, "/dq/taskQuery");
  await expect(
    page.locator("body"),
    `${sourceRef}: 开启脏数据存储后校验结果页应可查看异常实例明细入口`,
  ).toContainText(/查看详情|查看明细|下载明细|校验不通过|校验异常/, { timeout: 30000 });
}

export async function expectDataQualityDirtyDataStorageEditContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/project/dirtyDataManage");
  const row = await expectDirtyDataStorageRow(page, sourceRef);
  await editDirtyDataStorageRow(page, sourceRef, row, {
    dirtyStore: "dq_dirty_store",
    retentionDays: "30",
    enableStorage: true,
  });
  const updatedRow = await expectDirtyDataStorageRow(page, sourceRef);
  await expect(updatedRow, `${sourceRef}: 编辑独立存储后应回显脏数据存储库`).toContainText(
    "dq_dirty_store",
    {
      timeout: 30000,
    },
  );
  await expect(updatedRow, `${sourceRef}: 编辑独立存储后应回显数据存储时效`).toContainText("30", {
    timeout: 30000,
  });
  await expect(updatedRow, `${sourceRef}: 编辑独立存储后应展示更新人或操作状态`).toContainText(
    /admin|开启|启用|是|关闭|禁用|否/i,
    { timeout: 30000 },
  );
}

export async function expectDataQualityCommonConfigJsonShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");

  const body = page.locator("body");
  for (const label of ["通用配置", "json格式校验管理"]) {
    await expect(body, `${sourceRef}: json格式校验管理页面应展示「${label}」`).toContainText(
      label,
      {
        timeout: 30000,
      },
    );
  }
  for (const label of ["导入", "导出", "新增"]) {
    await expectDqCompactButton(page, label, sourceRef);
  }

  for (const header of [
    "key",
    "中文名称",
    "value格式",
    "数据源类型",
    "创建人",
    "创建时间",
    "更新人",
    "更新时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: json格式校验管理列表应展示列「${header}」`).toContainText(
      header,
      {
        timeout: 30000,
      },
    );
  }

  await expectDqApiPaths(page, sourceRef, "/dq/generalConfig/jsonValidationConfig 列表", [
    "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
  ]);
}

export async function expectDataQualityCommonConfigJsonImportModalShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  await clickDqCompactButton(page, "导入", sourceRef);

  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, `${sourceRef}: 导入弹窗应打开`).toBeVisible({ timeout: 30000 });
  for (const label of ["导入", "重复处理规则", "重复则跳过", "上传文件"]) {
    await expect(modal, `${sourceRef}: 导入弹窗应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(
    modal.locator("input[type='file']").first(),
    `${sourceRef}: 导入弹窗应包含文件上传控件`,
  ).toBeAttached({ timeout: 30000 });
  await closeDqModal(page, sourceRef);
}

export async function expectDataQualityCommonConfigJsonExportConfirmShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  await clickDqCompactButton(page, "导出", sourceRef);

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 导出只验证确认壳，不点击确认下载`).toContainText(
    "请确认是否导出列表数据",
    { timeout: 30000 },
  );
  await clickDqCompactButton(page, "取消", sourceRef);
}

export async function expectDataQualityCommonConfigJsonAddRegexShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  await clickDqCompactButton(page, "新增", sourceRef);

  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, `${sourceRef}: 新增弹窗应打开`).toBeVisible({ timeout: 30000 });
  for (const label of ["新建", "key", "中文名称", "value格式", "数据源类型"]) {
    await expect(modal, `${sourceRef}: 新增弹窗应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(modal, `${sourceRef}: 数据源类型默认应展示 SparkThrift2.x`).toContainText(
    /SparkThrift2\.x|sparkthrift2\.x/i,
    { timeout: 30000 },
  );
  await expect(
    modal.getByText("测试数据", { exact: true }),
    `${sourceRef}: 未填写 value格式 前不展示测试数据输入`,
  ).toHaveCount(0);

  const valueFormatInput = modal
    .locator(".ant-form-item")
    .filter({ hasText: "value格式" })
    .locator("input")
    .first();
  await valueFormatInput.fill("^[a-zA-Z]+$");

  await expect(modal, `${sourceRef}: value格式填写后应展示正则测试区域`).toContainText("测试数据", {
    timeout: 30000,
  });
  const testDataInput = modal.locator("textarea").first();
  await expect(testDataInput, `${sourceRef}: 正则测试输入框应可见`).toBeVisible({ timeout: 30000 });
  await testDataInput.fill("testValue");

  const regexTestButton = modal.getByRole("button", { name: /正则匹配测试/ }).first();
  await expect(regexTestButton, `${sourceRef}: 正则匹配测试按钮应可见`).toBeVisible({
    timeout: 30000,
  });
  await regexTestButton.click();
  await expect(modal, `${sourceRef}: 正则匹配测试应显示成功结果`).toContainText(
    /符合正则|匹配成功/,
    {
      timeout: 30000,
    },
  );
  await closeDqModal(page, sourceRef);
}

export async function expectDataQualityCommonConfigJsonAddFullContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const key = "vehicle";
  const name = "车辆信息";
  const value = '^[A-Za-z0-9_{}:",]+$';
  const testData = '{"vin":"LTV202601160001AA"}';

  await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, key);

  try {
    await expectDataQualityCommonConfigJsonShell(page, sourceRef);
    await addJsonValidationKey(page, sourceRef, {
      key,
      name,
      value,
      testData,
      action: "新增 key",
    });

    const records = await listJsonValidationRecords(page, sourceRef, key);
    const savedRecord = records.find((record) => record.jsonKey === key);
    expect(savedRecord, `${sourceRef}: 新增后接口应返回 key ${key}`).toBeTruthy();
    expect(savedRecord?.name, `${sourceRef}: 新增后接口应保存中文名称`).toBe(name);
    expect(savedRecord?.value, `${sourceRef}: 新增后接口应保存 value格式`).toBe(value);
    expect(
      savedRecord?.dataSourceType,
      `${sourceRef}: 新增后接口应保存 SparkThrift2.x 数据源类型`,
    ).toBe(45);
    expectNonEmptyString(savedRecord?.createBy, `${sourceRef}: 新增后接口应返回创建人`);
    expectNonEmptyString(savedRecord?.createAt, `${sourceRef}: 新增后接口应返回创建时间`);

    await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
    await expectJsonValidationRow(page, sourceRef, key, name);
    await expectRuleSetJsonValidationKeyOption(page, sourceRef, key);
  } finally {
    await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, key);
  }
}

export async function expectDataQualityCommonConfigJsonImportSkipContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const suffix = Date.now();
  const existingKey = `skip_exist_${suffix}`;
  const newRootKey = `skip_new_${suffix}`;
  const newChildKey = `skip_child_${suffix}`;
  const existingOriginalName = "跳过已有键";
  const existingOriginalValue = "^[a-z]+$";
  const xlsxPath = join(tmpdir(), `${sourceRef.replace(/[^a-zA-Z0-9_-]/g, "_")}-${suffix}.xlsx`);

  await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, existingKey);
  await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, newRootKey);

  try {
    await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
    await addJsonValidationKey(page, sourceRef, {
      key: existingKey,
      name: existingOriginalName,
      value: existingOriginalValue,
      testData: "abc",
      action: "导入前置已有 key",
    });
    await createJsonValidationImportWorkbook(
      xlsxPath,
      [
        [existingKey, "覆盖后名称", "^[A-Z]+$"],
        [newRootKey, "导入新增父级", "^\\d+$"],
      ],
      [[newRootKey, newChildKey, "导入新增子级", "^[0-9]{3}$"]],
    );
    expect(existsSync(xlsxPath), `${sourceRef}: 导入 xlsx 文件应创建成功`).toBe(true);

    await importJsonValidationWorkbook(page, sourceRef, xlsxPath, "重复则跳过");

    const existingRecords = await listJsonValidationRecords(page, sourceRef, existingKey);
    const existingRecord = existingRecords.find((record) => record.jsonKey === existingKey);
    expect(existingRecord, `${sourceRef}: 导入后应仍可查询到已有 key`).toBeTruthy();
    expect(existingRecord?.name, `${sourceRef}: 重复则跳过不应覆盖已有 key 中文名称`).toBe(
      existingOriginalName,
    );
    expect(existingRecord?.value, `${sourceRef}: 重复则跳过不应覆盖已有 key value格式`).toBe(
      existingOriginalValue,
    );

    const newRecords = await listJsonValidationRecords(page, sourceRef, newRootKey);
    const newRoot = newRecords.find((record) => record.jsonKey === newRootKey);
    const newChild = newRecords.find((record) => record.jsonKey === newChildKey);
    expect(newRoot, `${sourceRef}: 导入后应新增一层 key ${newRootKey}`).toBeTruthy();
    expect(newRoot?.name, `${sourceRef}: 新增一层 key 应保存中文名称`).toBe("导入新增父级");
    expect(newRoot?.value, `${sourceRef}: 新增一层 key 应保存 value格式`).toBe("^\\d+$");
    expect(newChild, `${sourceRef}: 导入后应新增二层 key ${newChildKey}`).toBeTruthy();
    expect(newChild?.name, `${sourceRef}: 新增二层 key 应保存中文名称`).toBe("导入新增子级");
    expect(newChild?.value, `${sourceRef}: 新增二层 key 应保存 value格式`).toBe("^[0-9]{3}$");
  } finally {
    await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, existingKey);
    await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, newRootKey);
    if (existsSync(xlsxPath)) unlinkSync(xlsxPath);
  }
}

export async function expectDataQualityCommonConfigJsonImportCoverContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const suffix = Date.now();
  const existingKey = `cover_exist_${suffix}`;
  const newRootKey = `cover_new_${suffix}`;
  const newChildKey = `cover_child_${suffix}`;
  const existingOriginalName = "覆盖前名称";
  const existingOriginalValue = "^[a-z]+$";
  const existingUpdatedName = "覆盖后名称";
  const existingUpdatedValue = "^[A-Z]+$";
  const xlsxPath = join(tmpdir(), `${sourceRef.replace(/[^a-zA-Z0-9_-]/g, "_")}-${suffix}.xlsx`);

  await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, existingKey);
  await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, newRootKey);

  try {
    await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
    await addJsonValidationKey(page, sourceRef, {
      key: existingKey,
      name: existingOriginalName,
      value: existingOriginalValue,
      testData: "abc",
      action: "导入覆盖前置已有 key",
    });
    await createJsonValidationImportWorkbook(
      xlsxPath,
      [
        [existingKey, existingUpdatedName, existingUpdatedValue],
        [newRootKey, "覆盖导入新增父级", "^\\d+$"],
      ],
      [[newRootKey, newChildKey, "覆盖导入新增子级", "^[0-9]{3}$"]],
    );
    expect(existsSync(xlsxPath), `${sourceRef}: 覆盖导入 xlsx 文件应创建成功`).toBe(true);

    await importJsonValidationWorkbook(page, sourceRef, xlsxPath, "重复则覆盖更新");

    const existingRecords = await listJsonValidationRecords(page, sourceRef, existingKey);
    const existingRecord = existingRecords.find((record) => record.jsonKey === existingKey);
    expect(existingRecord, `${sourceRef}: 覆盖导入后应仍可查询到已有 key`).toBeTruthy();
    expect(existingRecord?.name, `${sourceRef}: 重复则覆盖更新应覆盖已有 key 中文名称`).toBe(
      existingUpdatedName,
    );
    expect(existingRecord?.value, `${sourceRef}: 重复则覆盖更新应覆盖已有 key value格式`).toBe(
      existingUpdatedValue,
    );

    const newRecords = await listJsonValidationRecords(page, sourceRef, newRootKey);
    const newRoot = newRecords.find((record) => record.jsonKey === newRootKey);
    const newChild = newRecords.find((record) => record.jsonKey === newChildKey);
    expect(newRoot, `${sourceRef}: 覆盖导入后应新增一层 key ${newRootKey}`).toBeTruthy();
    expect(newRoot?.name, `${sourceRef}: 覆盖导入新增一层 key 应保存中文名称`).toBe(
      "覆盖导入新增父级",
    );
    expect(newRoot?.value, `${sourceRef}: 覆盖导入新增一层 key 应保存 value格式`).toBe("^\\d+$");
    expect(newChild, `${sourceRef}: 覆盖导入后应新增二层 key ${newChildKey}`).toBeTruthy();
    expect(newChild?.name, `${sourceRef}: 覆盖导入新增二层 key 应保存中文名称`).toBe(
      "覆盖导入新增子级",
    );
    expect(newChild?.value, `${sourceRef}: 覆盖导入新增二层 key 应保存 value格式`).toBe(
      "^[0-9]{3}$",
    );
  } finally {
    await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, existingKey);
    await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, newRootKey);
    if (existsSync(xlsxPath)) unlinkSync(xlsxPath);
  }
}

export async function expectDataQualityCommonConfigJsonExportFilteredContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const suffix = Date.now();
  const key = `export_key_${suffix}`;
  const name = "导出筛选键";
  const value = "^[a-z0-9]+$";
  const downloadPath = join(
    tmpdir(),
    `${sourceRef.replace(/[^a-zA-Z0-9_-]/g, "_")}-${suffix}.xlsx`,
  );

  await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, key);

  try {
    await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
    await addJsonValidationKey(page, sourceRef, {
      key,
      name,
      value,
      testData: "abc123",
      action: "导出前置 key",
    });

    const searchResponse = waitForDqJson<DqJsonValidationConfigPage>(
      page,
      "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
    );
    await page.getByPlaceholder("请输入key名称查询").fill(key);
    await page.keyboard.press("Enter");
    const searchPage = expectDqSuccess(
      await searchResponse,
      `${sourceRef}: 导出前 key 名筛选应请求成功`,
    );
    const searchRecords = flattenJsonValidationRecords(
      expectJsonValidationPage(searchPage, `${sourceRef}: 导出前 key 名筛选应返回数据`),
    );
    expect(
      searchRecords.some((record) => record.jsonKey === key),
      `${sourceRef}: 筛选结果应包含前置 key`,
    ).toBe(true);

    await page.locator(".ant-table-filter-trigger").first().click({ timeout: 30000 });
    const dropdown = page
      .locator(".ant-dropdown:visible, .ant-table-filter-dropdown:visible")
      .last();
    await expect(dropdown, `${sourceRef}: 导出前数据源类型筛选下拉应打开`).toBeVisible({
      timeout: 30000,
    });
    const filterResponse = waitForDqJson<DqJsonValidationConfigPage>(
      page,
      "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
    );
    await dropdown.getByText("SparkThrift2.x", { exact: true }).click({ timeout: 30000 });
    await dropdown.getByRole("button", { name: "确 定" }).click({ timeout: 30000 });
    const filterPage = expectDqSuccess(
      await filterResponse,
      `${sourceRef}: 导出前数据源类型筛选应请求成功`,
    );
    const filterRecords = flattenJsonValidationRecords(
      expectJsonValidationPage(filterPage, `${sourceRef}: 导出前数据源类型筛选应返回数据`),
    );
    const targetRecord = filterRecords.find((record) => record.jsonKey === key);
    expect(
      targetRecord,
      `${sourceRef}: key 和 SparkThrift2.x 组合筛选后应包含前置 key`,
    ).toBeTruthy();
    expect(
      targetRecord?.dataSourceType,
      `${sourceRef}: 前置 key 数据源类型应为 SparkThrift2.x`,
    ).toBe(45);

    await exportJsonValidationWorkbook(page, sourceRef, downloadPath);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(downloadPath);
    const worksheet = workbook.worksheets[0];
    expect(worksheet, `${sourceRef}: json格式校验管理导出文件应包含工作表`).toBeTruthy();
    const rows = collectWorksheetRows(worksheet);
    const headers = rows[0] ?? [];
    for (const header of ["key", "中文名称", "value", "数据源类型"]) {
      expect(headers.join("\n"), `${sourceRef}: 导出文件应包含列「${header}」`).toContain(header);
    }

    const dataRows = rows.slice(1).filter((row) => row.some(Boolean));
    expect(dataRows.length, `${sourceRef}: 导出文件应包含筛选后的 key 数据`).toBeGreaterThan(0);
    expect(
      dataRows.every((row) => row[0] === key),
      `${sourceRef}: 导出文件应仅包含筛选 key ${key}`,
    ).toBe(true);
    const exportedRow = dataRows.find((row) => row[0] === key);
    expect(exportedRow?.[1], `${sourceRef}: 导出文件应包含中文名称`).toBe(name);
    expect(exportedRow?.[2], `${sourceRef}: 导出文件应包含 value格式`).toBe(value);
    expect(exportedRow?.[3], `${sourceRef}: 导出文件应包含 SparkThrift2.x 数据源类型`).toBe(
      "SparkThrift2.x",
    );
  } finally {
    await deleteJsonValidationKeyByKeyBestEffort(page, sourceRef, key);
    if (existsSync(downloadPath)) unlinkSync(downloadPath);
  }
}

export async function expectDataQualityCommonConfigJsonFilterPaginationContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const initialResponse = waitForDqJson<DqJsonValidationConfigPage>(
    page,
    "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
  );
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  const initialPage = expectDqSuccess(
    await initialResponse,
    `${sourceRef}: json格式校验管理列表应请求成功`,
  );
  expectJsonValidationPage(initialPage, `${sourceRef}: json格式校验管理列表应返回数据`);

  const searchKeyword = "vin";
  const searchResponse = waitForDqJson<DqJsonValidationConfigPage>(
    page,
    "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
  );
  await page.getByPlaceholder("请输入key名称查询").fill(searchKeyword);
  await page.keyboard.press("Enter");
  const searchPage = expectDqSuccess(await searchResponse, `${sourceRef}: key 名搜索应请求成功`);
  const searchRecords = expectJsonValidationPage(searchPage, `${sourceRef}: key 名搜索应返回数据`);
  expect(searchPage.currentPage, `${sourceRef}: key 名搜索后应回到第一页`).toBe(1);
  expect(
    searchRecords.every((record) =>
      flattenJsonValidationRecords([record]).some((item) =>
        String(item.jsonKey ?? "").includes(searchKeyword),
      ),
    ),
    `${sourceRef}: key 名搜索结果应仅展示命中 key 或其子层级`,
  ).toBe(true);
  await expect(
    page.locator(".ant-table"),
    `${sourceRef}: key 名搜索后列表应展示 vin`,
  ).toContainText("vin", {
    timeout: 30000,
  });

  const filterPage = await gotoJsonValidationWithInitialList(page, sourceRef);
  expectJsonValidationPage(filterPage, `${sourceRef}: 数据源筛选前列表应返回数据`);
  await page.locator(".ant-table-filter-trigger").first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-dropdown:visible, .ant-table-filter-dropdown:visible").last();
  await expect(dropdown, `${sourceRef}: 数据源类型筛选下拉应打开`).toBeVisible({ timeout: 30000 });
  for (const dataSourceType of ["SparkThrift2.x", "Hive2.x", "Doris3.x"]) {
    await expect(
      dropdown,
      `${sourceRef}: 数据源类型筛选项应包含「${dataSourceType}」`,
    ).toContainText(dataSourceType, { timeout: 30000 });
  }

  const sparkFilterResponse = waitForDqJson<DqJsonValidationConfigPage>(
    page,
    "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
  );
  await dropdown.getByText("SparkThrift2.x", { exact: true }).click({ timeout: 30000 });
  await dropdown.getByRole("button", { name: "确 定" }).click({ timeout: 30000 });
  const sparkPage = expectDqSuccess(
    await sparkFilterResponse,
    `${sourceRef}: SparkThrift2.x 筛选应请求成功`,
  );
  const sparkRecords = expectJsonValidationPage(
    sparkPage,
    `${sourceRef}: SparkThrift2.x 筛选应返回数据`,
  );
  expect(sparkPage.currentPage, `${sourceRef}: SparkThrift2.x 筛选后应回到第一页`).toBe(1);
  expect(
    flattenJsonValidationRecords(sparkRecords).every((record) => record.dataSourceType === 45),
    `${sourceRef}: SparkThrift2.x 筛选结果应全部为 dataSourceType=45`,
  ).toBe(true);
  await expect(
    page.locator(".ant-table"),
    `${sourceRef}: SparkThrift2.x 筛选后可见列表应展示数据源类型`,
  ).toContainText("SparkThrift2.x", { timeout: 30000 });

  const nextPageResponse = waitForDqJson<DqJsonValidationConfigPage>(
    page,
    "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
  );
  await page.locator(".ant-pagination-item-2").click({ timeout: 30000 });
  const secondPage = expectDqSuccess(
    await nextPageResponse,
    `${sourceRef}: 筛选结果翻页应请求成功`,
  );
  const secondPageRecords = expectJsonValidationPage(
    secondPage,
    `${sourceRef}: 筛选结果第二页应返回数据`,
  );
  expect(secondPage.currentPage, `${sourceRef}: 翻页后 currentPage 应为 2`).toBe(2);
  expect(secondPage.totalCount, `${sourceRef}: 翻页前后分页总数应一致`).toBe(sparkPage.totalCount);
  expect(
    flattenJsonValidationRecords(secondPageRecords).every((record) => record.dataSourceType === 45),
    `${sourceRef}: SparkThrift2.x 第二页结果应全部为 dataSourceType=45`,
  ).toBe(true);
}

export async function expectDataQualityCommonConfigJsonEditChildDeleteContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const suffix = String(Date.now());
  const parentKey = `autodq_parent_${suffix}`;
  const childKey = "vin";
  let created = false;
  let deleted = false;

  try {
    await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
    await addJsonValidationKey(page, sourceRef, {
      key: parentKey,
      name: "车辆信息",
      value: '^[A-Za-z0-9_{}:",-]+$',
      testData: '{"vin":"LTV202601160001AA"}',
      action: "新增父级 key",
    });
    created = true;

    let parentRow = await expectJsonValidationRow(page, sourceRef, parentKey, "车辆信息");
    await expect(parentRow, `${sourceRef}: 新增父级 key 应展示初始 value格式`).toContainText(
      '^[A-Za-z0-9_{}:",-]+$',
      { timeout: 30000 },
    );

    await parentRow.getByRole("button", { name: "编辑" }).click({ timeout: 30000 });
    await fillJsonValidationModal(page, sourceRef, {
      name: "车辆信息编辑",
      value: '^[A-Za-z0-9_{}:",.-]+$',
      testData: '{"vin":"LTV202601160001AA"}',
      action: "编辑父级 key",
    });

    parentRow = await expectJsonValidationRow(page, sourceRef, parentKey, "车辆信息编辑");
    await expect(parentRow, `${sourceRef}: 编辑保存后列表应回显最新 value格式`).toContainText(
      '^[A-Za-z0-9_{}:",.-]+$',
      { timeout: 30000 },
    );
    await expect(parentRow, `${sourceRef}: 编辑保存后列表应回显更新人`).toContainText(
      "admin@dtstack.com",
      {
        timeout: 30000,
      },
    );

    await parentRow.getByRole("button", { name: "新增子层级" }).click({ timeout: 30000 });
    await addJsonValidationKey(page, sourceRef, {
      key: childKey,
      name: "车辆VIN",
      value: "^[A-Z0-9]{17}$",
      testData: "LTV202601160001AA",
      action: "新增子层级 key",
      modalAlreadyOpen: true,
    });

    parentRow = await expectJsonValidationRow(page, sourceRef, parentKey, "车辆信息编辑");
    const expandButton = parentRow.locator(".ant-table-row-expand-icon").first();
    await expect(expandButton, `${sourceRef}: 父级 key 应展示可展开子层级入口`).toBeVisible({
      timeout: 30000,
    });
    await expandButton.click({ timeout: 30000 });
    const childRow = page
      .locator(".ant-table-tbody tr")
      .filter({ hasText: childKey })
      .filter({ hasText: "车辆VIN" })
      .first();
    await expect(childRow, `${sourceRef}: 展开父级 key 后应展示子层级 ${childKey}`).toBeVisible({
      timeout: 30000,
    });
    await expect(childRow, `${sourceRef}: 子层级应展示 value格式`).toContainText("^[A-Z0-9]{17}$", {
      timeout: 30000,
    });

    await deleteJsonValidationKeyAndAssert(page, sourceRef, parentKey);
    deleted = true;
    await expect(
      page.locator(".ant-table-tbody tr").filter({ hasText: parentKey }),
      `${sourceRef}: 删除父级 key 后父级应从列表移除`,
    ).toHaveCount(0, { timeout: 30000 });
    await expect(
      page
        .locator(".ant-table-tbody tr")
        .filter({ hasText: childKey })
        .filter({ hasText: "车辆VIN" }),
      `${sourceRef}: 删除父级 key 后子层级应联动移除`,
    ).toHaveCount(0, { timeout: 30000 });
  } finally {
    if (created && !deleted) {
      await deleteJsonValidationKeyBestEffort(page, parentKey);
    }
  }
}

async function gotoJsonValidationWithInitialList(
  page: Page,
  sourceRef: string,
): Promise<DqJsonValidationConfigPage> {
  await gotoDataQualityPage(page, "/dq/overview");
  const response = waitForDqJson<DqJsonValidationConfigPage>(
    page,
    "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
  );
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  return expectDqSuccess(await response, `${sourceRef}: json格式校验管理重新加载应请求成功`);
}

function expectJsonValidationPage(
  pageData: DqJsonValidationConfigPage,
  message: string,
): DqJsonValidationConfigRecord[] {
  const records = pageData.data ?? [];
  expect(pageData.currentPage, `${message}: currentPage 应为数字`).toBeGreaterThan(0);
  expect(pageData.pageSize, `${message}: pageSize 应为数字`).toBeGreaterThan(0);
  expect(pageData.totalCount, `${message}: totalCount 应为数字`).toBeGreaterThanOrEqual(
    records.length,
  );
  expect(records.length, message).toBeGreaterThan(0);
  for (const record of flattenJsonValidationRecords(records)) {
    expectNonEmptyString(record.jsonKey, `${message}: 记录应包含 key`);
    expect(typeof record.dataSourceType, `${message}: 记录应包含数据源类型编码`).toBe("number");
  }
  return records;
}

function flattenJsonValidationRecords(
  records: DqJsonValidationConfigRecord[],
): DqJsonValidationConfigRecord[] {
  return records.flatMap((record) => [
    record,
    ...flattenJsonValidationRecords(record.children ?? []),
  ]);
}

async function selectDqFormOptionByRegex(
  page: Page,
  label: RegExp,
  option: RegExp,
  sourceRef: string,
): Promise<void> {
  const formItem = page.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await expect(formItem, `${sourceRef}: 应展示目标表单项 ${label}`).toBeVisible({ timeout: 30000 });
  if (option.test((await formItem.textContent({ timeout: 30000 })) ?? "")) {
    return;
  }

  await formItem.locator(".ant-select:visible").first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  const targetOption = dropdown
    .locator(".ant-select-item-option:not(.ant-select-item-option-disabled)")
    .filter({ hasText: option })
    .first();
  await expect(targetOption, `${sourceRef}: 目标下拉应包含 ${option}`).toBeVisible({
    timeout: 30000,
  });
  await targetOption.click({ timeout: 30000 });
  await expect(formItem, `${sourceRef}: 表单项应选中 ${option}`).toContainText(option, {
    timeout: 30000,
  });
}

async function expectDqCompactButton(page: Page, label: string, sourceRef: string): Promise<void> {
  const spacedLabel = label.split("").join("\\s*");
  await expect(
    page.getByRole("button", { name: new RegExp(`^${spacedLabel}$`) }).first(),
    `${sourceRef}: 应展示「${label}」按钮`,
  ).toBeVisible({ timeout: 30000 });
}

async function closeDqModal(page: Page, sourceRef: string): Promise<void> {
  const modal = page.locator(".ant-modal:visible").last();
  await modal.locator(".ant-modal-close").first().click({ timeout: 30000 });
  await expect(modal, `${sourceRef}: 弹窗应关闭且未提交`).toBeHidden({ timeout: 30000 });
}

async function expectDqProjectModal(page: Page, sourceRef: string, title: string) {
  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, `${sourceRef}: ${title}弹窗应打开`).toBeVisible({ timeout: 30000 });
  await expect(modal, `${sourceRef}: ${title}弹窗标题应展示`).toContainText(title, {
    timeout: 30000,
  });
  for (const label of ["项目名称", "项目标识", "管理员", "项目描述"]) {
    await expect(modal, `${sourceRef}: ${title}弹窗应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  return modal;
}

async function fillDqProjectModal(
  page: Page,
  modal: ReturnType<Page["locator"]>,
  sourceRef: string,
  options: {
    projectName?: string;
    projectIdent?: string;
    description: string;
    selectAdmin: boolean;
  },
): Promise<void> {
  if (options.projectName) {
    await fillDqModalFormField(modal, "项目名称", options.projectName);
  }
  if (options.projectIdent) {
    await fillDqModalFormField(modal, "项目标识", options.projectIdent);
  }
  if (options.selectAdmin) {
    const adminField = modal.locator(".ant-form-item").filter({ hasText: "管理员" }).first();
    await adminField.locator(".ant-select-selector").first().click({ timeout: 30000 });
    const adminOption = page
      .locator(".ant-select-dropdown:visible")
      .getByText("admin@dtstack.com", { exact: true })
      .first();
    await expect(adminOption, `${sourceRef}: 管理员下拉应包含 admin@dtstack.com`).toBeVisible({
      timeout: 30000,
    });
    await adminOption.click({ timeout: 30000 });
    await expect(adminField, `${sourceRef}: 管理员字段应选中 admin@dtstack.com`).toContainText(
      "admin@dtstack.com",
      { timeout: 30000 },
    );
  }
  await fillDqModalFormField(modal, "项目描述", options.description);
}

async function fillDqModalFormField(
  modal: ReturnType<Page["locator"]>,
  label: string,
  value: string,
): Promise<void> {
  const field = modal.locator(".ant-form-item").filter({ hasText: label }).first();
  const control = field.locator("textarea, input").first();
  await control.fill(value, { timeout: 30000 });
  await expect(control, `表单字段「${label}」应填入目标值`).toHaveValue(value, { timeout: 30000 });
}

async function submitDqProjectModal(
  page: Page,
  modal: ReturnType<Page["locator"]>,
  sourceRef: string,
  action: string,
): Promise<void> {
  await modal.getByRole("button", { name: /确\s*定/ }).click({ timeout: 30000 });
  await expect(modal, `${sourceRef}: ${action}后弹窗应关闭`).toBeHidden({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: ${action}后页面应保持可见`).toBeVisible({
    timeout: 30000,
  });
}

async function expectDqProjectRow(
  page: Page,
  sourceRef: string,
  projectName: string,
  projectIdent: string,
) {
  const row = await findDqProjectRow(page, projectName, projectIdent);
  await expect(row, `${sourceRef}: 项目列表应展示 ${projectName}`).toBeVisible({ timeout: 30000 });
  await expect(row, `${sourceRef}: 项目行应展示项目标识 ${projectIdent}`).toContainText(
    projectIdent,
    {
      timeout: 30000,
    },
  );
  await expect(row, `${sourceRef}: 项目行应展示编辑入口`).toContainText("编辑", { timeout: 30000 });
  return row;
}

async function findDqProjectRow(page: Page, projectName: string, projectIdent: string) {
  const row = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: projectName })
    .filter({ hasText: projectIdent })
    .first();

  if (!(await row.isVisible({ timeout: 2000 }).catch(() => false))) {
    const firstPage = page.locator(".ant-pagination-item").filter({ hasText: /^1$/ }).first();
    if (await firstPage.isVisible({ timeout: 1000 }).catch(() => false)) {
      await firstPage.click({ timeout: 5000 }).catch(() => {});
      await waitForUiSettled(page);
    }
  }

  for (let pageIndex = 0; pageIndex < 8; pageIndex++) {
    if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
      return row;
    }
    const nextButton = page
      .locator(
        "li[title='下一页']:not(.ant-pagination-disabled) button, .ant-pagination-next:not(.ant-pagination-disabled) button",
      )
      .or(page.getByRole("button", { name: "right" }))
      .first();
    if (
      !(await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) ||
      !(await nextButton.isEnabled({ timeout: 1000 }).catch(() => false))
    ) {
      break;
    }
    await nextButton.click({ timeout: 5000 });
    await waitForUiSettled(page);
  }
  return row;
}

async function expectDirtyDataStorageRow(page: Page, sourceRef: string) {
  const row = page
    .locator(".ant-table-tbody tr:visible")
    .filter({
      hasText:
        /SparkThrift|Hive|MySQL|Doris|ClickHouse|PostgreSQL|Oracle|HDFS|Trino|MaxCompute|Greenplum|编辑/i,
    })
    .first();
  await expect(row, `${sourceRef}: 脏数据管理列表应至少展示一条可编辑存储配置`).toBeVisible({
    timeout: 30000,
  });
  await expect(row, `${sourceRef}: 脏数据管理行应展示编辑入口`).toContainText(/编辑|操作/, {
    timeout: 30000,
  });
  return row;
}

async function editDirtyDataStorageRow(
  page: Page,
  sourceRef: string,
  row: ReturnType<Page["locator"]>,
  options: {
    dirtyStore: string;
    retentionDays: string;
    enableStorage: boolean;
  },
): Promise<void> {
  const editEntry = row
    .getByRole("button", { name: /编辑/ })
    .or(row.getByText(/^编辑$/))
    .first();
  await expect(editEntry, `${sourceRef}: 脏数据管理行应提供编辑入口`).toBeVisible({
    timeout: 30000,
  });
  await editEntry.click({ timeout: 30000 });

  const panel = page
    .locator(".ant-modal:visible,.ant-drawer:visible,[role='dialog']:visible")
    .last();
  await expect(panel, `${sourceRef}: 编辑独立存储弹窗应打开`).toBeVisible({ timeout: 30000 });
  await expect(panel, `${sourceRef}: 编辑独立存储弹窗应展示关键字段`).toContainText(
    /脏数据存储|数据存储时效|独立存储/,
    { timeout: 30000 },
  );

  const switchControl = panel.locator(".ant-switch:visible,[role='switch']:visible").first();
  if (await switchControl.isVisible({ timeout: 3000 }).catch(() => false)) {
    const className = (await switchControl.getAttribute("class")) ?? "";
    const checkedAttr = await switchControl.getAttribute("aria-checked");
    const isChecked = checkedAttr === "true" || className.includes("ant-switch-checked");
    if (isChecked !== options.enableStorage) {
      await switchControl.click({ timeout: 30000 });
    }
  }

  await fillDqScopedFormValue(
    page,
    panel,
    /脏数据存储库|存储库|数据库/,
    options.dirtyStore,
    sourceRef,
  );
  await fillDqScopedFormValue(
    page,
    panel,
    /数据存储时效|存储时效|时效/,
    options.retentionDays,
    sourceRef,
  );
  await panel
    .getByRole("button", { name: /确\s*定|保\s*存/ })
    .last()
    .click({ timeout: 30000 });
  await expect(panel, `${sourceRef}: 编辑独立存储保存后弹窗应关闭`).toBeHidden({ timeout: 30000 });
}

async function fillDqScopedFormValue(
  page: Page,
  scope: ReturnType<Page["locator"]>,
  label: RegExp,
  value: string,
  sourceRef: string,
): Promise<void> {
  const field = scope.locator(".ant-form-item:visible").filter({ hasText: label }).first();
  await expect(field, `${sourceRef}: 编辑表单应展示 ${label}`).toBeVisible({ timeout: 30000 });

  const input = field.locator("input:not([type='hidden']):visible, textarea:visible").first();
  if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
    await input.fill(value, { timeout: 30000 });
    await expect(input, `${sourceRef}: 编辑字段应回显「${value}」`).toHaveValue(value, {
      timeout: 30000,
    });
    return;
  }

  await field.locator(".ant-select:visible").first().click({ timeout: 30000 });
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await page.keyboard.type(value);
  const option = dropdown.locator(".ant-select-item-option").filter({ hasText: value }).first();
  await expect(option, `${sourceRef}: 编辑字段下拉应包含「${value}」`).toBeVisible({
    timeout: 30000,
  });
  await option.click({ timeout: 30000 });
  await expect(field, `${sourceRef}: 编辑字段应选中「${value}」`).toContainText(value, {
    timeout: 30000,
  });
}

async function deleteDqProjectBestEffort(
  page: Page,
  projectName: string,
  projectIdent: string,
): Promise<void> {
  const row = await findDqProjectRow(page, projectName, projectIdent);
  if (!(await row.isVisible({ timeout: 3000 }).catch(() => false))) return;
  await row
    .getByRole("button", { name: "删除" })
    .click({ timeout: 5000 })
    .catch(() => {});
  const deleteDialog = page.locator(".ant-modal:visible, [role='dialog']:visible").last();
  if (await deleteDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
    await deleteDialog
      .getByPlaceholder("请输入项目名称")
      .fill(projectName, { timeout: 5000 })
      .catch(() => {});
    await deleteDialog
      .getByRole("button", { name: /删\s*除/ })
      .click({ timeout: 5000 })
      .catch(() => {});
    await row.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    return;
  }
  const confirmButton = page
    .locator(".ant-popover:visible, .ant-modal:visible")
    .getByRole("button", { name: /确\s*定/ })
    .last();
  if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmButton.click({ timeout: 5000 }).catch(() => {});
  }
  await row.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
}

async function deleteDqProjectAndAssert(
  page: Page,
  sourceRef: string,
  projectName: string,
  projectIdent: string,
): Promise<void> {
  const row = await expectDqProjectRow(page, sourceRef, projectName, projectIdent);
  await expect(row, `${sourceRef}: 待删除项目行应展示删除入口`).toContainText("删除", {
    timeout: 30000,
  });
  await row.getByRole("button", { name: "删除" }).click({ timeout: 30000 });
  const deleteDialog = page
    .locator(".ant-modal:visible, [role='dialog']:visible")
    .filter({ hasText: projectName })
    .last();
  await expect(deleteDialog, `${sourceRef}: 删除确认弹窗应展示目标项目`).toBeVisible({
    timeout: 30000,
  });
  await expect(deleteDialog, `${sourceRef}: 删除确认弹窗应说明删除不可恢复`).toContainText(
    "项目删除后无法恢复",
    {
      timeout: 30000,
    },
  );
  const nameInput = deleteDialog.getByPlaceholder("请输入项目名称");
  await nameInput.fill(projectName, { timeout: 30000 });
  await expect(nameInput, `${sourceRef}: 删除确认应输入目标项目名称`).toHaveValue(projectName, {
    timeout: 30000,
  });
  await deleteDialog.getByRole("button", { name: /删\s*除/ }).click({ timeout: 30000 });
  await expect(deleteDialog, `${sourceRef}: 删除提交后确认弹窗应关闭`).toBeHidden({
    timeout: 30000,
  });
  await expect(row, `${sourceRef}: 删除确认后项目应从列表移除`).toBeHidden({ timeout: 30000 });
}

async function addJsonValidationKey(
  page: Page,
  sourceRef: string,
  options: {
    key: string;
    name: string;
    value: string;
    testData: string;
    action: string;
    modalAlreadyOpen?: boolean;
  },
): Promise<void> {
  if (!options.modalAlreadyOpen) {
    await clickDqCompactButton(page, "新增", sourceRef);
  }
  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, `${sourceRef}: ${options.action}弹窗应打开`).toBeVisible({ timeout: 30000 });
  await modal.locator("#jsonKey").fill(options.key, { timeout: 30000 });
  await fillJsonValidationModal(page, sourceRef, options);
}

async function createJsonValidationImportWorkbook(
  filePath: string,
  rootRows: string[][],
  childRows: string[][] = [],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const rootSheet = workbook.addWorksheet("一层");
  rootSheet.addRow(["*key", "中文名称", "value格式"]);
  for (const row of rootRows) rootSheet.addRow(row);

  if (childRows.length > 0) {
    const childSheet = workbook.addWorksheet("二层");
    childSheet.addRow(["*上一层级的key名", "*key", "中文名称", "value格式"]);
    for (const row of childRows) childSheet.addRow(row);
  }

  await workbook.xlsx.writeFile(filePath);
}

async function importJsonValidationWorkbook(
  page: Page,
  sourceRef: string,
  filePath: string,
  duplicateRule: "重复则跳过" | "重复则覆盖更新",
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  await clickDqCompactButton(page, "导入", sourceRef);
  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, `${sourceRef}: 导入弹窗应打开`).toBeVisible({ timeout: 30000 });
  await expect(modal, `${sourceRef}: 导入弹窗应展示重复处理规则`).toContainText("重复处理规则", {
    timeout: 30000,
  });
  const targetRadio = modal.locator(".ant-radio-wrapper").filter({ hasText: duplicateRule });
  await expect(targetRadio, `${sourceRef}: 导入弹窗应可选择「${duplicateRule}」`).toBeVisible({
    timeout: 30000,
  });
  if (duplicateRule === "重复则覆盖更新") {
    await targetRadio.click({ timeout: 30000 });
  } else {
    await expect(
      targetRadio.locator("input[type='radio']"),
      `${sourceRef}: 默认应选中重复则跳过`,
    ).toBeChecked({
      timeout: 30000,
    });
  }
  await modal.locator("input[type='file']").setInputFiles(filePath);
  await modal
    .locator(".ant-upload-list-item")
    .waitFor({ state: "visible", timeout: 10000 })
    .catch(() => {});
  await modal.getByRole("button", { name: /^确\s*定$/ }).click({ timeout: 30000 });
  await expect(modal, `${sourceRef}: 导入提交后弹窗应关闭`).toBeHidden({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: 导入成功后页面应提示成功`).toContainText(
    /成功/,
    {
      timeout: 30000,
    },
  );
}

async function exportJsonValidationWorkbook(
  page: Page,
  sourceRef: string,
  downloadPath: string,
): Promise<void> {
  await clickDqCompactButton(page, "导出", sourceRef);
  const popconfirm = page.locator(".ant-popconfirm:visible, .ant-popover:visible").last();
  await expect(popconfirm, `${sourceRef}: 导出前应展示确认气泡`).toContainText(
    "请确认是否导出列表数据",
    {
      timeout: 30000,
    },
  );
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }),
    popconfirm.locator(".ant-btn-primary").click({ timeout: 30000 }),
  ]);
  expect(download.suggestedFilename(), `${sourceRef}: 导出文件名应为 xlsx`).toMatch(/\.xlsx$/i);
  await download.saveAs(downloadPath);
  expect(existsSync(downloadPath), `${sourceRef}: 导出文件应保存到本地临时目录`).toBe(true);
}

function collectWorksheetRows(worksheet: ExcelJS.Worksheet): string[][] {
  const rows: string[][] = [];
  worksheet.eachRow((row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      values[columnNumber - 1] = String(cell.text ?? "")
        .replace(/\s+/g, " ")
        .trim();
    });
    rows.push(values);
  });
  return rows;
}

async function fillJsonValidationModal(
  page: Page,
  sourceRef: string,
  options: {
    name: string;
    value: string;
    testData: string;
    action: string;
  },
): Promise<void> {
  const modal = page.locator(".ant-modal:visible").last();
  await modal.locator("#name").fill(options.name, { timeout: 30000 });
  await modal.locator("#value").fill(options.value, { timeout: 30000 });
  await expect(
    modal,
    `${sourceRef}: ${options.action}填写 value格式 后应展示测试数据`,
  ).toContainText("测试数据", { timeout: 30000 });
  await modal.locator("#testData").fill(options.testData, { timeout: 30000 });
  await modal.getByRole("button", { name: /正则匹配测试/ }).click({ timeout: 30000 });
  await expect(modal, `${sourceRef}: ${options.action}正则匹配测试应成功`).toContainText(
    /符合正则|匹配成功/,
    { timeout: 30000 },
  );

  const saveResponse = waitForDqJson<boolean>(
    page,
    options.action.includes("编辑")
      ? "/dassets/v1/valid/jsonValidationConfig/update"
      : "/dassets/v1/valid/jsonValidationConfig/add",
  );
  await modal.getByRole("button", { name: /确\s*定/ }).click({ timeout: 30000 });
  expectDqSuccess(await saveResponse, `${sourceRef}: ${options.action}保存应请求成功`);
  await expect(modal, `${sourceRef}: ${options.action}保存后弹窗应关闭`).toBeHidden({
    timeout: 30000,
  });
  await expect(
    page.locator("body"),
    `${sourceRef}: ${options.action}保存后应提示成功`,
  ).toContainText(/成功/, { timeout: 30000 });
}

async function expectJsonValidationRow(
  page: Page,
  sourceRef: string,
  key: string,
  expectedName: string,
) {
  const row = page
    .locator(".ant-table-tbody tr")
    .filter({ hasText: key })
    .filter({ hasText: expectedName })
    .first();
  await expect(row, `${sourceRef}: json格式校验管理列表应展示 key ${key}`).toBeVisible({
    timeout: 30000,
  });
  await expect(row, `${sourceRef}: ${key} 应展示 SparkThrift2.x 数据源类型`).toContainText(
    "SparkThrift2.x",
    { timeout: 30000 },
  );
  await expect(row, `${sourceRef}: ${key} 应展示编辑、新增子层级和删除入口`).toContainText(
    /编辑.*新增子层级.*删除/s,
    { timeout: 30000 },
  );
  return row;
}

async function deleteJsonValidationKeyAndAssert(
  page: Page,
  sourceRef: string,
  key: string,
): Promise<void> {
  const row = page.locator(".ant-table-tbody tr").filter({ hasText: key }).first();
  await expect(row, `${sourceRef}: 待删除 key ${key} 应可见`).toBeVisible({ timeout: 30000 });
  await row.getByRole("button", { name: "删除" }).click({ timeout: 30000 });
  const confirm = page.locator(".ant-popover:visible, .ant-modal:visible").last();
  await expect(confirm, `${sourceRef}: 删除 key 应展示确认信息`).toContainText(
    "若存在子层级key信息会联动删除",
    {
      timeout: 30000,
    },
  );
  const deleteResponse = waitForDqJson<boolean>(
    page,
    "/dassets/v1/valid/jsonValidationConfig/delete",
  );
  await confirm
    .getByRole("button", { name: /删\s*除|确\s*定/ })
    .last()
    .click({ timeout: 30000 });
  expectDqSuccess(await deleteResponse, `${sourceRef}: 删除 key 请求应成功`);
}

async function deleteJsonValidationKeyBestEffort(page: Page, key: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig").catch(() => {});
  const row = page.locator(".ant-table-tbody tr").filter({ hasText: key }).first();
  if (!(await row.isVisible({ timeout: 3000 }).catch(() => false))) return;
  await row
    .getByRole("button", { name: "删除" })
    .click({ timeout: 5000 })
    .catch(() => {});
  const confirm = page.locator(".ant-popover:visible, .ant-modal:visible").last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirm
      .getByRole("button", { name: /删\s*除|确\s*定/ })
      .last()
      .click({ timeout: 5000 })
      .catch(() => {});
  }
  await row.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
}

async function listJsonValidationRecords(
  page: Page,
  sourceRef: string,
  search: string,
): Promise<DqJsonValidationConfigRecord[]> {
  const response = await page.request.post(
    buildDataAssetsApiUrl("/dassets/v1/valid/jsonValidationConfig/getTreeByPage"),
    {
      data: { currentPage: 1, pageSize: 100, search },
      headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
      timeout: 60000,
    },
  );
  expect(response.ok(), `${sourceRef}: 查询 json格式校验 key HTTP 应成功`).toBe(true);
  const pageData = expectDqSuccess(
    (await response.json()) as DqApiResponse<DqJsonValidationConfigPage>,
    `${sourceRef}: 查询 json格式校验 key 应请求成功`,
  );
  return flattenJsonValidationRecords(
    expectJsonValidationPage(pageData, `${sourceRef}: 查询 json格式校验 key 应返回有效结构`),
  );
}

async function deleteJsonValidationKeyByKeyBestEffort(
  page: Page,
  sourceRef: string,
  key: string,
): Promise<void> {
  const records = await listJsonValidationRecords(page, sourceRef, key).catch(() => []);
  for (const record of records.filter((item) => item.jsonKey === key)) {
    if (!record.id) continue;
    const response = await page.request.post(
      buildDataAssetsApiUrl("/dassets/v1/valid/jsonValidationConfig/delete"),
      {
        data: { id: String(record.id) },
        headers: { [PROJECT_STORAGE_KEY]: String(getProjectId()) },
        timeout: 60000,
      },
    );
    expect(response.ok(), `${sourceRef}: 清理同名 json格式校验 key HTTP 应成功`).toBe(true);
    expectDqSuccess(
      (await response.json()) as DqApiResponse<boolean>,
      `${sourceRef}: 清理同名 json格式校验 key 应请求成功`,
    );
  }
}

async function expectRuleSetJsonValidationKeyOption(
  page: Page,
  sourceRef: string,
  key: string,
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

  const statisticSelect = page.locator(".ant-select").filter({ hasText: "请选择统计函数" }).last();
  await statisticSelect.click({ timeout: 30000 });
  await page.keyboard.type("json");
  const statisticDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(
    statisticDropdown,
    `${sourceRef}: 统计函数下拉应包含格式-json格式校验`,
  ).toContainText("格式-json格式校验", { timeout: 30000 });
  await page.keyboard.press("Enter");

  await expect(body, `${sourceRef}: 选择格式-json格式校验后应展示校验 key 选择器`).toContainText(
    "请选择校验key",
    { timeout: 30000 },
  );
  const keySelect = page.locator(".ant-select").filter({ hasText: "请选择校验key" }).last();
  await keySelect.click({ timeout: 30000 });
  await page.keyboard.type(key);
  const keyDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(keyDropdown, `${sourceRef}: 规则集校验 key 下拉应可选择 ${key}`).toContainText(key, {
    timeout: 30000,
  });
  await keyDropdown.getByText(key, { exact: false }).first().click({ timeout: 30000 });
  await expect(
    page.locator(".ant-select").filter({ hasText: key }).last(),
    `${sourceRef}: 选择后规则集校验 key 应回显 ${key}`,
  ).toBeVisible({ timeout: 30000 });
}
