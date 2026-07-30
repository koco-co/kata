// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L4246,#L4261,#L4276,#L4291,#L4305,#L4320,#L4337,#L4351,#L4365,#L4380,#L4394,#L4409,#L4425,#L4440,#L4457,#L4516,#L4534,#L4549,#L4564
// intent: SR-INTENT-2099-01-STD-025
// probe: SR-UI-PROBE-20260523-MF-STANDARD-BASIS-CODE-DB-001
// generated_at: 2026-05-23T19:30:00+08:00
// META: {"id":"STD-025","priority":"P2/P3","title":"标准基础词根、码表与数据库拾取只读 Shell 可核验"}
// SourceRefs: SR-2099-01-STD-ROOT-CREATE-L4246, SR-2099-01-STD-ROOT-EDIT-L4261, SR-2099-01-STD-ROOT-QUERY-L4276, SR-2099-01-STD-ROOT-DELETE-L4291, SR-2099-01-STD-ROOT-IMPORT-L4305, SR-2099-01-STD-DEFINE-REF-CODE-L4320, SR-2099-01-STD-CODE-CATALOG-CREATE-L4337, SR-2099-01-STD-CODE-CATALOG-EDIT-L4351, SR-2099-01-STD-CODE-CATALOG-MOVE-L4365, SR-2099-01-STD-CODE-CATALOG-DELETE-L4380, SR-2099-01-STD-CODE-CREATE-L4394, SR-2099-01-STD-CODE-EDIT-L4409, SR-2099-01-STD-CODE-IMPORT-SUCCESS-L4425, SR-2099-01-STD-CODE-IMPORT-ERROR-L4440, SR-2099-01-STD-CODE-SEARCH-L4457, SR-2099-01-STD-DB-COLLECT-CREATE-L4516, SR-2099-01-STD-DB-COLLECT-BATCH-REF-L4534, SR-2099-01-STD-DB-COLLECT-SINGLE-REF-L4549, SR-2099-01-STD-DB-COLLECT-REF-VALIDATION-L4564, SR-2099-01-STD-025, SR-UI-PROBE-20260523-MF-STANDARD-BASIS-CODE-DB-001, SR-SELF-RUN-20260523-MF-STANDARD-BASIS-CODE-DB-001
import { expect, type Page, type Response } from "@playwright/test";

import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { gotoStandardPage } from "../pages/standard-page";

test.setTimeout(120000);

test("【P2/P3】标准基础词根、码表与数据库拾取只读 Shell 可核验", async ({
  page,
  step,
}) => {
  // SourceRef: SR-2099-01-STD-025 covers 岚图主流程用例整理.md#L4246-L4564.
  // This test opens create/import/new-pick shells only; it does not submit, upload, export, delete, or reference data.
  await step("步骤1: 进入词根管理页面 → 查询列表、新建弹窗与导入弹窗 Shell 可见", async () => {
    await expectRootManageReadOnlyShell(page, "SR-2099-01-STD-025");
  });

  await step("步骤2: 进入码表管理页面 → 目录列表、新建代码与导入代码弹窗 Shell 可见", async () => {
    await expectCodeTableManageReadOnlyShell(page, "SR-2099-01-STD-025");
  });

  await step("步骤3: 进入数据库拾取页面 → 拾取列表、新建拾取弹窗与来源下拉 Shell 可见", async () => {
    await expectDatabaseCollectReadOnlyShell(page, "SR-2099-01-STD-025");
  });
});

async function expectRootManageReadOnlyShell(page: Page, sourceRef: string): Promise<void> {
  const rootQueryResponsePromise = waitForPostResponse(
    page,
    "/dmetadata/v1/standardRoot/pageQuery",
  );
  const updateUsersResponsePromise = waitForPostResponse(
    page,
    "/dmetadata/v1/standardRoot/getUpdateUsers",
  );
  await gotoStandardPage(page, "/rootManage");

  await expectApiOk(rootQueryResponsePromise, sourceRef, "词根管理列表");
  await expectApiOk(updateUsersResponsePromise, sourceRef, "词根管理更新用户");

  const body = page.locator("body");
  for (const label of [
    "标准基础",
    "词根管理",
    "导入词根",
    "新建词根",
    "导出词根",
    "词根简称",
    "词根全称",
    "词根中文名",
    "被引用数量",
    "更新时间",
    "更新用户",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 词根管理页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(
    page.getByPlaceholder("请输入词根简称/全称/中文名进行搜索"),
    `${sourceRef}: 词根管理搜索框应可见`,
  ).toBeVisible({ timeout: 30000 });

  await expectModalShell(page, "新建词根", ["新建词根", "词根简称", "词根全称", "词根中文名"]);
  await expectModalShell(page, "导入词根", ["导入词根", "上传文件", "下载模板"]);
}

async function expectCodeTableManageReadOnlyShell(page: Page, sourceRef: string): Promise<void> {
  const catalogResponsePromise = waitForPostResponse(
    page,
    "/dmetadata/v1/standardCodeCatalog/listCatalog",
  );
  const codeQueryResponsePromise = waitForPostResponse(
    page,
    "/dmetadata/v1/standardCode/pageQuery",
  );
  const userResponsePromise = waitForPostResponse(page, "/dmetadata/v1/standardCode/listUser");
  await gotoStandardPage(page, "/codeTableManage");

  await expectApiOk(catalogResponsePromise, sourceRef, "代码目录");
  await expectApiOk(codeQueryResponsePromise, sourceRef, "码表管理列表");
  await expectApiOk(userResponsePromise, sourceRef, "码表管理更新用户");

  const body = page.locator("body");
  for (const label of [
    "标准基础",
    "码表管理",
    "代码目录",
    "导出代码",
    "导入代码",
    "新建代码",
    "代码名称",
    "代码编号",
    "代码说明",
    "被引用数量",
    "更新时间",
    "更新用户",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 码表管理页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(
    page.getByPlaceholder("请输入代码名称/代码编号进行搜索"),
    `${sourceRef}: 码表管理搜索框应可见`,
  ).toBeVisible({ timeout: 30000 });

  await expectModalShell(page, "新建代码", [
    "新增代码",
    "代码名称",
    "代码编号",
    "代码目录",
    "代码说明",
    "码表内容",
    "编码取值",
    "编码名称",
    "添加编码",
  ]);
  await expectModalShell(page, "导入代码", ["导入代码", "上传文件", "下载模板"]);
}

async function expectDatabaseCollectReadOnlyShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const collectionResponsePromise = waitForPostResponse(
    page,
    "/dmetadata/v1/databaseCollection/pageQueryCollection",
  );
  await gotoStandardPage(page, "/databaseCollect");
  await expectApiOk(collectionResponsePromise, sourceRef, "数据库拾取列表");

  const body = page.locator("body");
  for (const label of [
    "标准基础",
    "数据库拾取",
    "新建拾取",
    "拾取类型",
    "拾取来源",
    "拾取条件",
    "状态",
    "拾取数量",
    "创建时间",
    "完成时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 数据库拾取页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await page.getByRole("button", { name: "新建拾取" }).click();
  const modal = page.locator(".ant-modal-content:visible").filter({ hasText: "新建拾取" }).last();
  await expect(modal, `${sourceRef}: 新建拾取弹窗应可见`).toBeVisible({ timeout: 10000 });
  for (const label of ["新建拾取", "拾取类型", "词根管理", "数据标准", "拾取来源", "拾取条件"]) {
    await expect(modal, `${sourceRef}: 新建拾取弹窗应展示「${label}」`).toContainText(label, {
      timeout: 10000,
    });
  }

  await modal
    .locator(".ant-form-item")
    .filter({ hasText: "拾取来源" })
    .locator(".ant-select")
    .click();
  const sourceDropdown = page.locator(".ant-select-dropdown:visible").last();
  await expect(sourceDropdown, `${sourceRef}: 拾取来源下拉应可见`).toBeVisible({
    timeout: 10000,
  });
  for (const option of ["MySQL", "SparkThrift2.x", "STAR_ROCKS_3.x"]) {
    await expect(sourceDropdown, `${sourceRef}: 拾取来源下拉应展示「${option}」`).toContainText(
      option,
      { timeout: 10000 },
    );
  }
  await page.keyboard.press("Escape");

  await modal.getByRole("button", { name: /取\s*消/ }).click();
  await expect(modal, `${sourceRef}: 取消后新建拾取弹窗应关闭`).toBeHidden({ timeout: 10000 });
}

async function expectModalShell(
  page: Page,
  buttonName: string,
  expectedLabels: string[],
): Promise<void> {
  await page.getByRole("button", { name: buttonName }).click();
  const modal = page.locator(".ant-modal-content:visible").last();
  await expect(modal, `${buttonName}: 弹窗应可见`).toBeVisible({ timeout: 10000 });
  for (const label of expectedLabels) {
    await expect(modal, `${buttonName}: 弹窗应展示「${label}」`).toContainText(label, {
      timeout: 10000,
    });
  }
  await modal.getByRole("button", { name: /取\s*消/ }).click();
  await expect(modal, `${buttonName}: 取消后弹窗应关闭`).toBeHidden({ timeout: 10000 });
}

function waitForPostResponse(page: Page, apiPath: string): Promise<Response> {
  return page.waitForResponse(
    (response) => response.url().includes(apiPath) && response.request().method() === "POST",
    { timeout: 30000 },
  );
}

async function expectApiOk(
  responsePromise: Promise<Response>,
  sourceRef: string,
  label: string,
): Promise<void> {
  const response = await responsePromise;
  expect(response.status(), `${sourceRef}: ${label}接口应返回 200`).toBe(200);
}
