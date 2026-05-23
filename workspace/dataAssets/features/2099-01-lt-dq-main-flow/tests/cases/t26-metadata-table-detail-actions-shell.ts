// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L942-L1115
// intent: SR-INTENT-2099-01-MD-026
// probe: results/20260523-1930-mf-metadata-table-detail-actions-01/probe-detail.png
// page: inline shell assertions; metadata table detail action entries
// generated_at: 2026-05-23T19:30:00+08:00
// META: {"id":"MD-026","priority":"P1/P2/P3","title":"元数据数据表详情页操作入口与表结构动作 Shell 可核验"}
// SourceRefs: SR-2099-01-MD-026, SR-UI-PROBE-20260523-MF-METADATA-TABLE-DETAIL-ACTIONS-001, SR-SELF-RUN-20260523-MF-METADATA-TABLE-DETAIL-ACTIONS-001
import { expect, type Locator, type Page, type Response } from "@playwright/test";

import { test } from "../../../../_shared/fixtures/step-screenshot";
import { gotoMetadataPage } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-shell-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(120000);

test("【P1/P2/P3】元数据数据表详情页操作入口与表结构动作 Shell 可核验", async ({
  page,
  step,
}) => {
  await step("步骤1: 搜索并打开稳定数据表 → 表详情页操作入口可见", async () => {
    await openMetadataTableDetail(page, "test_table", "SR-2099-01-MD-026");
    await expectTableDetailActionEntries(page, "test_table", "SR-2099-01-MD-026");
  });

  await step("步骤2: 点击表名复制图标 → 页面提示复制成功且不读取剪贴板", async () => {
    await copyTableNameViaUiMessage(page, "SR-2099-01-MD-026");
  });

  await step("步骤3: 打开删除/导出/订阅入口 → 仅校验弹窗 Shell 后取消", async () => {
    await expectDeleteExportSubscribeShells(page, "test_table", "SR-2099-01-MD-026");
  });

  await step("步骤4: 查看表结构字段列表并搜索 id → 字段接口与列表 Shell 可核验", async () => {
    await expectFieldListSearchAndPagination(page, "SR-2099-01-MD-026");
  });

  await step("步骤5: 切换建表语句 → 建表语句入口 Shell 可见且不执行底层 SQL", async () => {
    await expectCreateTableSqlEntry(page, "SR-2099-01-MD-026");
  });

  await step("步骤6: 打开批量编辑和添加标签入口 → 编辑/标签 Shell 可见但不保存", async () => {
    await expectBatchEditAndAddTagShells(page, "SR-2099-01-MD-026");
  });
});

async function openMetadataTableDetail(page: Page, keyword: string, sourceRef: string): Promise<void> {
  await gotoMetadataPage(page, "/metaDataSearch");

  const searchInput = page.getByPlaceholder("请输入表名、表中文名、库名、数据源名").first();
  await expect(searchInput, `${sourceRef}: 数据表二级页搜索框应可见`).toBeVisible({
    timeout: 30000,
  });

  const queryResponsePromise = waitForQueryDetail(page);
  await searchInput.fill(keyword);
  await searchInput.press("Enter");
  const queryResponse = await queryResponsePromise;
  expect(queryResponse.status(), `${sourceRef}: 数据地图查询接口应返回 200`).toBe(200);

  const exactResultName = page
    .locator(".lighting-text")
    .locator("xpath=..")
    .filter({ hasText: new RegExp(`^${escapeRegExp(keyword)}$`) })
    .first();
  await expect(exactResultName, `${sourceRef}: 查询结果应包含精确表名 ${keyword}`).toBeVisible({
    timeout: 30000,
  });

  const detailResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/dataTable/queryDetail") &&
      response.request().method() === "POST",
    { timeout: 45000 },
  );
  await exactResultName.click();
  const detailResponse = await detailResponsePromise;
  expect(detailResponse.status(), `${sourceRef}: 数据表详情接口应返回 200`).toBe(200);

  await expect(page.locator(".meta__name"), `${sourceRef}: 表详情头部应展示表名 ${keyword}`).toContainText(
    keyword,
    { timeout: 30000 },
  );
}

async function expectTableDetailActionEntries(page: Page, tableName: string, sourceRef: string): Promise<void> {
  const body = page.locator("body");
  for (const label of ["表详情", tableName, "删 除", "导 出", "订 阅", "表结构", "字段", "建表语句"]) {
    await expect(body, `${sourceRef}: 表详情页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expect(copyIcon(page), `${sourceRef}: 表名复制图标应可见`).toBeVisible({ timeout: 15000 });
  await expectActionButton(page, /删\s*除/, sourceRef);
  await expectActionButton(page, /导\s*出/, sourceRef);
  await expectActionButton(page, /订\s*阅/, sourceRef);
}

async function copyTableNameViaUiMessage(page: Page, sourceRef: string): Promise<void> {
  await copyIcon(page).click();
  await expect(
    page.locator(".ant-message-notice, .ant-notification-notice").filter({ hasText: "复制成功" }).first(),
    `${sourceRef}: 点击表名复制图标后应提示复制成功`,
  ).toBeVisible({ timeout: 10000 });
}

async function expectDeleteExportSubscribeShells(page: Page, tableName: string, sourceRef: string): Promise<void> {
  await openModalAction(page, /删\s*除/, sourceRef);
  await expectVisibleModal(page, sourceRef, [
    `确定删除表"${tableName}"吗?`,
    "删除方式",
    "删除元数据表",
    "表名",
  ]);
  await cancelVisibleModal(page, sourceRef);

  await openModalAction(page, /导\s*出/, sourceRef);
  await expectVisibleModal(page, sourceRef, ["确认导出元数据?", "取 消", "确 定"]);
  await cancelVisibleModal(page, sourceRef);

  await openModalAction(page, /订\s*阅/, sourceRef);
  await expectVisibleModal(page, sourceRef, ["订阅", "告警方式", "邮箱", "钉钉", "自定义告警通道", "取 消", "确 定"]);
  await cancelVisibleModal(page, sourceRef);
}

async function expectFieldListSearchAndPagination(page: Page, sourceRef: string): Promise<void> {
  await clickDetailSubTab(page, "字段", sourceRef);

  const body = page.locator("body");
  for (const label of ["字段名", "字段描述", "字段标签", "字段中文名", "数据类型"]) {
    await expect(body, `${sourceRef}: 表结构字段列表应展示列「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  const fieldSearch = page.getByPlaceholder("请输入字段名/字段描述/标签进行搜索").first();
  await expect(fieldSearch, `${sourceRef}: 字段列表搜索框应可见`).toBeVisible({ timeout: 15000 });

  const fieldResponsePromise = waitForTableColumnPage(page);
  await fieldSearch.fill("id");
  await fieldSearch.press("Enter");
  const fieldResponse = await fieldResponsePromise;
  expect(fieldResponse.status(), `${sourceRef}: 字段搜索 pageTableColumn 接口应返回 200`).toBe(200);
  await expect(body, `${sourceRef}: 字段搜索 id 后应展示字段 id`).toContainText(/\bid\b/, {
    timeout: 30000,
  });
  await expect(body, `${sourceRef}: 字段分页信息应展示总数与每页条数`).toContainText(
    /共\s*\d+\s*条数据，每页显示\s*\d+\s*条/,
    { timeout: 30000 },
  );
  await expect(page.locator(".ant-pagination").first(), `${sourceRef}: 字段分页控件应可见`).toBeVisible({
    timeout: 15000,
  });
}

async function expectCreateTableSqlEntry(page: Page, sourceRef: string): Promise<void> {
  await clickDetailSubTab(page, "建表语句", sourceRef);
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 表结构建表语句入口应可见`).toContainText("建表语句", {
    timeout: 30000,
  });
  await expectAnyCreateSqlShell(body, sourceRef);
}

async function expectBatchEditAndAddTagShells(page: Page, sourceRef: string): Promise<void> {
  await clickDetailSubTab(page, "字段", sourceRef);

  await clickButton(page, /批量编辑/, sourceRef);
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 批量编辑后应展示取消入口`).toContainText("取 消", {
    timeout: 15000,
  });
  await expect(body, `${sourceRef}: 批量编辑后应展示保存入口但本用例不点击`).toContainText("保 存", {
    timeout: 15000,
  });
  for (const placeholder of ["请输入字段描述", "请输入字段中文名"]) {
    await expect(
      page.getByPlaceholder(placeholder).first(),
      `${sourceRef}: 批量编辑应展示「${placeholder}」输入框`,
    ).toBeVisible({ timeout: 15000 });
  }
  await clickButton(page, /取\s*消/, sourceRef);
  await expect(page.getByRole("button", { name: /批量编辑/ }).first(), `${sourceRef}: 取消后应恢复批量编辑入口`).toBeVisible({
    timeout: 15000,
  });

  await clickButton(page, /添加标签/, sourceRef);
  await expectVisibleModal(page, sourceRef, ["添加标签", "标签名称", "按回车输入下个标签", "取 消", "确 定"]);
  await cancelVisibleModal(page, sourceRef);
}

async function expectVisibleModal(page: Page, sourceRef: string, labels: readonly string[]): Promise<Locator> {
  const modal = page.locator(".ant-modal:visible, [role='dialog']:visible").first();
  await expect(modal, `${sourceRef}: 操作弹窗应可见`).toBeVisible({ timeout: 10000 });
  for (const label of labels) {
    await expect(modal, `${sourceRef}: 操作弹窗应展示「${label}」`).toContainText(label, {
      timeout: 10000,
    });
  }
  return modal;
}

async function cancelVisibleModal(page: Page, sourceRef: string): Promise<void> {
  const modal = page.locator(".ant-modal:visible, [role='dialog']:visible").first();
  await clickButtonIn(modal, /取\s*消/, sourceRef);
  await expect(modal, `${sourceRef}: 点击取消后弹窗应关闭`).toBeHidden({ timeout: 10000 });
}

async function openModalAction(page: Page, name: RegExp, sourceRef: string): Promise<void> {
  await clickButton(page, name, sourceRef);
}

async function clickDetailSubTab(page: Page, label: string, sourceRef: string): Promise<void> {
  const control = page.getByText(label, { exact: true }).first();
  await expect(control, `${sourceRef}: 应可切换到表结构「${label}」入口`).toBeVisible({
    timeout: 15000,
  });
  await control.click();
}

async function clickButton(page: Page, name: RegExp, sourceRef: string): Promise<void> {
  const button = await expectActionButton(page, name, sourceRef);
  await button.click();
}

async function clickButtonIn(scope: Locator, name: RegExp, sourceRef: string): Promise<void> {
  const button = scope.getByRole("button", { name }).first();
  await expect(button, `${sourceRef}: 弹窗按钮 ${name.source} 应可见`).toBeVisible({ timeout: 10000 });
  await button.click();
}

async function expectActionButton(page: Page, name: RegExp, sourceRef: string): Promise<Locator> {
  const button = page.getByRole("button", { name }).first();
  await expect(button, `${sourceRef}: 操作按钮 ${name.source} 应可见`).toBeVisible({ timeout: 15000 });
  return button;
}

async function expectAnyCreateSqlShell(body: Locator, sourceRef: string): Promise<void> {
  await expect(
    body,
    `${sourceRef}: 建表语句入口应展示 SQL 内容或 ltqc-local 暂无数据缺省页`,
  ).toContainText(/create[\s\u00a0]+(?:external[\s\u00a0]+)?table|暂无数据/i, { timeout: 30000 });
}

function waitForQueryDetail(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/datamap/queryDetail") &&
      response.request().method() === "POST",
    { timeout: 45000 },
  );
}

function waitForTableColumnPage(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/dataTableColumn/pageTableColumn") &&
      response.request().method() === "POST",
    { timeout: 45000 },
  );
}

function copyIcon(page: Page): Locator {
  return page.locator(".meta__name .assets-svg-icon--hoverable").first();
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
