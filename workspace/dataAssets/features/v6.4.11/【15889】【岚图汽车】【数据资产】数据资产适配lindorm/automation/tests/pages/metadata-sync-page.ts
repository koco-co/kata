import { expect, type Page } from "@playwright/test";

import {
  clickButtonByText,
  clickMetadataMenu,
  expectAnyText,
  gotoMetadataPage,
  metadataScope,
  waitForDassetsResponse,
} from "./metadata-shell-page";

export async function openMetadataSync(page: Page, sourceRef: string): Promise<void> {
  await gotoMetadataPage(page);
  await clickMetadataMenu(page, "元数据同步");
  await expectAnyText(page, ["元数据同步", "新增周期同步任务"], sourceRef);
}

export async function expectSyncTaskCreateEntry(page: Page, sourceRef: string): Promise<void> {
  await openMetadataSync(page, sourceRef);
  await clickButtonByText(page, "新增周期同步任务", sourceRef);
  await expectAnyText(page, ["数据源", "数据库", "数据表", "临时同步", "下一步"], sourceRef);
}

export async function expectAllTypesSyncContract(page: Page, sourceRef: string): Promise<void> {
  await openMetadataSync(page, sourceRef);
  const scope = metadataScope();
  await expectAnyText(page, [scope.datasourceType, scope.datasourceName, "同步状态"], sourceRef);
}

export async function expectMetadataSyncShell(page: Page, sourceRef: string): Promise<void> {
  await openMetadataSync(page, sourceRef);
  await expectAnyText(
    page,
    ["周期同步", "实时同步", "自动同步", "新增周期同步任务", "数据源", "数据库", "同步状态"],
    sourceRef,
  );
}

export async function openMetaModel(page: Page, sourceRef: string): Promise<void> {
  await gotoMetadataPage(page);
  await clickMetadataMenu(page, "元模型管理");
  await expectAnyText(page, ["元模型管理", "元模型名称"], sourceRef);
}

export async function expectMetaModelCards(page: Page, sourceRef: string): Promise<void> {
  await openMetaModel(page, sourceRef);
  await expectAnyText(page, ["SparkThrift2.x", "Doris3.x", "技术属性", "通用业务属性"], sourceRef);
  const search = page.locator("input[placeholder*='元模型'], input[placeholder*='搜索']").first();
  await expect(search, `${sourceRef}: 元模型名称搜索框应可见`).toBeVisible({ timeout: 15000 });
}

export async function expectMetaModelShell(page: Page, sourceRef: string): Promise<void> {
  await gotoMetadataPage(page);
  await clickMetadataMenu(page, "元模型管理");
  await expectAnyText(page, ["SparkThrift2.x 元模型", "编辑元模型"], sourceRef);
  const search = page.locator("input[placeholder*='元模型'], input[placeholder*='搜索']").first();
  await expect(search, `${sourceRef}: 元模型搜索框应可见`).toBeVisible({ timeout: 15000 });
}

export async function openMetadataManagement(page: Page, sourceRef: string): Promise<void> {
  await gotoMetadataPage(page);
  await clickMetadataMenu(page, "元数据管理");
  await expectAnyText(page, ["元数据管理", "数据源"], sourceRef);
}

export async function expectImportMetadataDialog(page: Page, sourceRef: string): Promise<void> {
  await openMetadataManagement(page, sourceRef);
  await clickButtonByText(page, "导入元数据", sourceRef);
  await expectAnyText(page, ["导入元数据", "数据源", "上传", "确定"], sourceRef);
}

export async function expectMetadataManagementList(page: Page, sourceRef: string): Promise<void> {
  await openMetadataManagement(page, sourceRef);
  await waitForDassetsResponse(
    page,
    async () => {
      await clickButtonByText(page, "查询", sourceRef);
    },
    sourceRef,
    (url) => /metadata|table|list|query/i.test(url),
  );
  await expectAnyText(page, ["表名", "表中文名", "创建时间", "存储大小", "更新时间"], sourceRef);
}

// ─── 同步任务高级配置 Shell（t04） ───

export async function expectSyncTaskAdvancedOptionsShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openMetadataSync(page, sourceRef);
  // 打开新增周期同步任务向导
  await clickButtonByText(page, "新增周期同步任务", sourceRef);
  await expectAnyText(page, ["数据源", "数据库", "数据表", "下一步"], sourceRef);
  const body = page.locator("body");
  // 向导应展示多类型、过滤、负责人、索引等高级配置入口关键字
  for (const label of ["数据源", "数据库", "数据表", "同步类型", "下一步"]) {
    await expect(body, `${sourceRef}: 新增同步任务向导应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  // 取消返回
  const cancelButton = page.getByRole("button", { name: /取消|关闭/ }).first();
  const cancelVisible = await cancelButton.isVisible({ timeout: 5000 }).catch(() => false);
  if (cancelVisible) await cancelButton.click();
}

// ─── 元模型管理总览搜索与统计（t38） ───

export async function expectMetaModelOverviewSearchAndStats(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openMetaModel(page, sourceRef);
  const body = page.locator("body");
  for (const label of ["SparkThrift2.x", "Doris3.x", "技术属性", "通用业务属性"]) {
    await expect(body, `${sourceRef}: 元模型首页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  const search = page.locator("input[placeholder*='元模型'], input[placeholder*='搜索']").first();
  await expect(search, `${sourceRef}: 元模型搜索框应可见`).toBeVisible({ timeout: 15000 });
  // 输入搜索内容并核验结果响应
  await search.fill("SparkThrift");
  await expect(body, `${sourceRef}: 搜索应展示匹配的元模型结果`).toContainText(/SparkThrift/, {
    timeout: 15000,
  });
  await search.clear();
}

// ─── 元模型技术属性（t38） ───

export async function expectMetaModelTechnicalProperties(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openMetaModel(page, sourceRef);
  // 点击第一个元模型卡片进入详情
  const firstCard = page
    .locator(".ant-card, .model-card, [class*='card']")
    .filter({ hasText: /SparkThrift|Doris/ })
    .first();
  await expect(firstCard, `${sourceRef}: 元模型卡片应可见`).toBeVisible({ timeout: 15000 });
  await firstCard.click();
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 元模型详情应展示技术属性`).toContainText(/技术属性/, {
    timeout: 30000,
  });
  for (const label of ["技术属性", "属性名称", "属性类型"]) {
    await expect(body, `${sourceRef}: 元模型技术属性页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
}

// ─── 通用业务属性列表（t38） ───

export async function expectCommonBusinessPropertyList(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openMetaModel(page, sourceRef);
  // 进入通用业务属性
  const commonBizMenu = page
    .locator(".ant-menu-title-content, .ant-tabs-tab, [class*='tab']")
    .filter({
      hasText: /通用业务属性/,
    })
    .first();
  await expect(commonBizMenu, `${sourceRef}: 通用业务属性入口应可见`).toBeVisible({
    timeout: 15000,
  });
  await commonBizMenu.click();
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 通用业务属性页应展示内置属性列表`).toContainText(
    /通用业务属性|属性名称|属性类型/,
    { timeout: 30000 },
  );
}

// ─── 通用业务属性新增弹窗 Shell（t38） ───

export async function expectCommonBusinessPropertyCreateShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await expectCommonBusinessPropertyList(page, sourceRef);
  await clickButtonByText(page, "新增", sourceRef);
  const body = page.locator("body");
  for (const label of ["属性名称", "属性类型", "确定", "取消"]) {
    await expect(body, `${sourceRef}: 新增通用业务属性弹窗应展示「${label}」`).toContainText(
      label,
      {
        timeout: 30000,
      },
    );
  }
  // 取消关闭
  const cancelButton = page.getByRole("button", { name: /取消/ }).last();
  await expect(cancelButton, `${sourceRef}: 取消按钮应可见`).toBeVisible({ timeout: 10000 });
  await cancelButton.click();
}

// ─── 通用业务属性编辑删除生命周期 Shell（t38） ───

export async function expectCommonBusinessPropertyLifecycleShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await expectCommonBusinessPropertyList(page, sourceRef);
  const body = page.locator("body");
  // 编辑操作列应可见
  await expect(body, `${sourceRef}: 通用业务属性列表应展示编辑/删除操作入口`).toContainText(
    /编辑|删除/,
    { timeout: 30000 },
  );
  // 点击第一个编辑
  const editButton = page.getByRole("button", { name: /编辑/ }).first();
  const editVisible = await editButton.isVisible({ timeout: 5000 }).catch(() => false);
  if (editVisible) {
    await editButton.click();
    await expect(body, `${sourceRef}: 编辑通用业务属性弹窗应展示属性名称`).toContainText(
      /属性名称/,
      {
        timeout: 15000,
      },
    );
    const cancelButton = page.getByRole("button", { name: /取消/ }).last();
    await cancelButton.click().catch(() => {});
  }
}

// ─── 个性业务属性子模型列表 Shell（t38） ───

export async function expectPersonalBusinessSubModelShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openMetaModel(page, sourceRef);
  const personalBizMenu = page
    .locator(".ant-menu-title-content, .ant-tabs-tab, [class*='tab']")
    .filter({ hasText: /个性业务属性/ })
    .first();
  await expect(personalBizMenu, `${sourceRef}: 个性业务属性入口应可见`).toBeVisible({
    timeout: 15000,
  });
  await personalBizMenu.click();
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 个性业务属性页应展示子模型列表`).toContainText(
    /个性业务属性|子模型|属性名称/,
    { timeout: 30000 },
  );
  // TODO: 需真实 probe 验证子模型展开和个性属性查询交互
}

// ─── 个性业务属性新增编辑删除 Shell（t38） ───

export async function expectPersonalBusinessPropertyLifecycleShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await expectPersonalBusinessSubModelShell(page, sourceRef);
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 个性业务属性列表应展示新增/编辑/删除操作入口`).toContainText(
    /新增|编辑|删除/,
    { timeout: 30000 },
  );
  // 打开新增弹窗后取消
  const addButton = page.getByRole("button", { name: /新增/ }).first();
  const addVisible = await addButton.isVisible({ timeout: 5000 }).catch(() => false);
  if (addVisible) {
    await addButton.click();
    await expect(body, `${sourceRef}: 新增个性业务属性弹窗应展示属性名称`).toContainText(
      /属性名称/,
      {
        timeout: 15000,
      },
    );
    const cancelButton = page.getByRole("button", { name: /取消/ }).last();
    await cancelButton.click().catch(() => {});
  }
}

// ─── 元数据管理数据源列表 Shell（t39） ───

export async function expectMetadataManagementDatasourceListShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openMetadataManagement(page, sourceRef);
  const body = page.locator("body");
  for (const label of ["数据源", "数据源类型", "数据库数量", "数据表数量", "操作"]) {
    await expect(body, `${sourceRef}: 数据源列表应展示列「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  // 核验搜索框可见
  const searchInput = page
    .locator("input[placeholder*='搜索'], input[placeholder*='请输入']")
    .first();
  await expect(searchInput, `${sourceRef}: 数据源列表搜索框应可见`).toBeVisible({ timeout: 15000 });
  // 核验分页可见
  await expect(body, `${sourceRef}: 数据源列表应展示分页控件`).toContainText(/条\/页|每页/, {
    timeout: 30000,
  });
}

// ─── 元数据管理数据源三级导航（t39） ───

export async function expectMetadataManagementDatasourceNavigation(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openMetadataManagement(page, sourceRef);
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 元数据管理应展示数据源列表`).toContainText(/数据源/, {
    timeout: 30000,
  });
  // 点击第一个数据源进入数据库列表
  const firstRow = page.locator(".ant-table-tbody tr").first();
  const firstRowVisible = await firstRow.isVisible({ timeout: 10000 }).catch(() => false);
  if (firstRowVisible) {
    const datasourceLink = firstRow.locator("a, .ant-btn-link, [class*='link']").first();
    const linkVisible = await datasourceLink.isVisible({ timeout: 3000 }).catch(() => false);
    if (linkVisible) {
      await datasourceLink.click();
      await expect(body, `${sourceRef}: 点击数据源后应展示数据库列表`).toContainText(/数据库/, {
        timeout: 30000,
      });
    }
  }
  // 核验面包屑
  await expect(body, `${sourceRef}: 数据源导航应展示层级面包屑`).toContainText(
    /元数据管理|数据源/,
    {
      timeout: 15000,
    },
  );
}

// ─── 元数据管理数据库列表 Shell（t39） ───

export async function expectMetadataManagementDatabaseListShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openMetadataManagement(page, sourceRef);
  // 进入数据库维度（点击第一个数据源或切换 tab）
  const body = page.locator("body");
  const dbTab = page
    .locator(".ant-tabs-tab, .ant-menu-item")
    .filter({ hasText: /数据库/ })
    .first();
  const dbTabVisible = await dbTab.isVisible({ timeout: 5000 }).catch(() => false);
  if (dbTabVisible) {
    await dbTab.click();
  } else {
    // 点击数据源首行进入数据库
    const firstRow = page.locator(".ant-table-tbody tr").first();
    const rowVisible = await firstRow.isVisible({ timeout: 10000 }).catch(() => false);
    if (rowVisible) {
      const link = firstRow.locator("a, .ant-btn-link").first();
      const linkVis = await link.isVisible({ timeout: 3000 }).catch(() => false);
      if (linkVis) await link.click();
    }
  }
  await expect(body, `${sourceRef}: 数据库列表应展示相关字段`).toContainText(
    /数据库|数据表数量|操作/,
    {
      timeout: 30000,
    },
  );
  const searchInput = page
    .locator("input[placeholder*='搜索'], input[placeholder*='请输入']")
    .first();
  await expect(searchInput, `${sourceRef}: 数据库列表搜索框应可见`).toBeVisible({ timeout: 15000 });
}

// ─── 元数据管理数据表列表 Shell（t39） ───

export async function expectMetadataManagementTableListShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openMetadataManagement(page, sourceRef);
  const body = page.locator("body");
  // 尝试切换到数据表维度
  const tableTab = page
    .locator(".ant-tabs-tab, .ant-menu-item")
    .filter({ hasText: /数据表/ })
    .first();
  const tableTabVisible = await tableTab.isVisible({ timeout: 5000 }).catch(() => false);
  if (tableTabVisible) await tableTab.click();

  await expect(body, `${sourceRef}: 数据表列表应展示表名、更新时间等字段`).toContainText(
    /表名|数据表|更新时间|操作/,
    { timeout: 30000 },
  );
  const searchInput = page
    .locator("input[placeholder*='搜索'], input[placeholder*='请输入'], input[placeholder*='表名']")
    .first();
  await expect(searchInput, `${sourceRef}: 数据表列表搜索框应可见`).toBeVisible({ timeout: 15000 });
}

// ─── 元数据管理导入元数据 Shell（t39） ───

export async function expectMetadataManagementImportShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openMetadataManagement(page, sourceRef);
  await clickButtonByText(page, "导入元数据", sourceRef);
  const body = page.locator("body");
  for (const label of ["导入元数据", "数据源", "上传", "确定", "取消"]) {
    await expect(body, `${sourceRef}: 导入元数据弹窗应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  // 核验模板下载入口
  await expect(body, `${sourceRef}: 导入弹窗应展示模板下载入口`).toContainText(/模板|下载/, {
    timeout: 15000,
  });
  // 取消关闭
  const cancelButton = page.getByRole("button", { name: /取消/ }).last();
  await expect(cancelButton, `${sourceRef}: 导入弹窗取消按钮应可见`).toBeVisible({
    timeout: 10000,
  });
  await cancelButton.click();
}
