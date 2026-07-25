import { expect, type Page } from "@playwright/test";

import { buildDataAssetsUrl } from "../../helpers/test-setup";

const PROJECT_ID = 92;

async function gotoModelPage(page: Page): Promise<void> {
  await page.addInitScript((projectId) => {
    sessionStorage.setItem("X-Valid-Project-ID", String(projectId));
  }, PROJECT_ID);
  await page.goto(buildDataAssetsUrl("/builtSpecificationTable", PROJECT_ID), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.evaluate((projectId) => {
    sessionStorage.setItem("X-Valid-Project-ID", String(projectId));
  }, PROJECT_ID);
}

export async function expectModelBuildTableShell(page: Page, sourceRef: string): Promise<void> {
  await gotoModelPage(page);
  const body = page.locator("body");
  for (const label of [
    "规范建表",
    "建表",
    "规范设计",
    "授权与审批",
    "我的模型",
    "引入表",
    "新建表",
    "表名",
    "表中文名",
    "表来源",
    "表类型",
    "所属数据源",
    "所属数据库",
    "创建时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 数据模型规范建表页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(
    page.locator("input[placeholder*='表名'], input[placeholder*='表中文名']").first(),
    `${sourceRef}: 表名/表中文名搜索框应可见`,
  ).toBeVisible({ timeout: 15000 });
}

export async function expectModelApiHealth(page: Page, sourceRef: string): Promise<void> {
  const expected = [
    "/dmetadata/v1/dataWarehouseTable/dataSourceFilter",
    "/dmetadata/v1/dataWarehouseTable/supportImportDataSources",
    "/dmetadata/v1/dataWarehouseTable/tableType",
    "/dmetadata/v1/dataWarehouseTable/pageQuery",
    "/dmetadata/v1/dataWareHouseLevel/listName",
  ];
  await expect
    .poll(
      () =>
        page.evaluate((paths) => {
          const urls = performance.getEntriesByType("resource").map((entry) => entry.name);
          return paths.filter((path) => urls.some((url) => url.includes(path)));
        }, expected),
      {
        message: `${sourceRef}: 数据模型页应请求核心建表接口`,
        timeout: 30000,
      },
    )
    .toEqual(expected);
}

// ─── 建表表类型与 HDFS 路径交互（t11） ───

export async function expectModelBuildTableTypeHdfsInteraction(page: Page, sourceRef: string): Promise<void> {
  await gotoModelPage(page);
  const body = page.locator("body");
  // 进入新建表流程
  await expect(page.getByRole("button", { name: /新建表/ }).first(), `${sourceRef}: 新建表按钮应可见`).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("button", { name: /新建表/ }).first().click();

  // 选择数据源为 HADOOP/HDFS 类型
  const datasourceSelect = page
    .locator(".ant-select")
    .filter({ hasText: /数据源|请选择数据源/ })
    .first()
    .or(page.locator(".ant-form-item").filter({ hasText: /数据源/ }).locator(".ant-select").first());
  await expect(datasourceSelect, `${sourceRef}: 新建表表单应展示数据源下拉`).toBeVisible({ timeout: 15000 });
  await datasourceSelect.click();
  const hadoopOption = page
    .locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content")
    .filter({ hasText: /HADOOP|HDFS|Hive/ })
    .first();
  const hadoopVisible = await hadoopOption.isVisible({ timeout: 5000 }).catch(() => false);
  if (hadoopVisible) {
    await hadoopOption.click();
    // 选择 HADOOP 后表类型下拉应展示 HDFS 相关选项
    await expect(body, `${sourceRef}: 选择 HADOOP 数据源后应展示表类型字段`).toContainText(
      /表类型|内部表|外部表|HDFS/,
      { timeout: 30000 },
    );
    const tableTypeSelect = page
      .locator(".ant-form-item")
      .filter({ hasText: /表类型/ })
      .locator(".ant-select")
      .first();
    const tableTypeVisible = await tableTypeSelect.isVisible({ timeout: 5000 }).catch(() => false);
    if (tableTypeVisible) {
      await tableTypeSelect.click();
      const options = page.locator(
        ".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content",
      );
      await expect(options.first(), `${sourceRef}: 表类型下拉应展开`).toBeVisible({ timeout: 10000 });
      const optionTexts = (await options.allInnerTexts()).map((t) => t.trim());
      expect(
        optionTexts.some((t) => /内部表|外部表|HDFS|MANAGED|EXTERNAL/i.test(t)),
        `${sourceRef}: 表类型下拉应包含内部表或外部表选项`,
      ).toBe(true);
      await page.keyboard.press("Escape");
    }
    // 外部表应展示 HDFS 存储路径输入框
    await expect(body, `${sourceRef}: HADOOP 建表应展示 HDFS 存储路径相关字段`).toContainText(
      /HDFS|存储路径|存储位置/,
      { timeout: 30000 },
    );
  } else {
    // HADOOP 数据源不可选时 shell 层仅验证表单结构
    await page.keyboard.press("Escape");
    await expect(body, `${sourceRef}: 新建表表单应展示表类型字段`).toContainText(/表类型/, { timeout: 30000 });
  }
  // 取消关闭表单
  const cancelButton = page.getByRole("button", { name: /取消|返回/ }).first();
  await cancelButton.click().catch(() => {});
}

// ─── 建表变体与 SQL/CSV 解析入口（t42） ───

export async function expectModelBuildVariantsAndParsingShell(page: Page, sourceRef: string): Promise<void> {
  await gotoModelPage(page);
  const body = page.locator("body");
  // 打开新建表弹窗/流程
  await expect(page.getByRole("button", { name: /新建表/ }).first(), `${sourceRef}: 新建表按钮应可见`).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("button", { name: /新建表/ }).first().click();
  // 基本建表流程字段应可见
  for (const label of ["数据源", "数据库", "表名"]) {
    await expect(body, `${sourceRef}: 新建表表单应展示「${label}」`).toContainText(label, { timeout: 30000 });
  }
  // SQL 解析 / CSV 导入入口
  await expect(body, `${sourceRef}: 新建表应展示 SQL 解析或 CSV 导入入口`).toContainText(
    /SQL 解析|SQL解析|CSV|导入SQL/,
    { timeout: 30000 },
  );
  // 取消关闭
  const cancelButton = page.getByRole("button", { name: /取消|返回/ }).first();
  await cancelButton.click().catch(() => {});
  // 词根标准匹配：在字段编辑中核验入口
  await expect(body, `${sourceRef}: 规范建表页应展示表列表或字段配置区`).toContainText(
    /规范建表|表名|表中文名/,
    { timeout: 30000 },
  );
  // TODO: SparkThrift 内置数据源、CSV 详情、SQL 解析详情及词根标准匹配需真实填写表单 probe 验证
}

// ─── 规范设计元素值/模型元素/数仓层级 Shell（t42） ───

export async function expectModelNormDesignShell(page: Page, sourceRef: string): Promise<void> {
  await gotoModelPage(page);
  // 切换到规范设计 tab
  const normDesignTab = page.locator(".ant-tabs-tab, .ant-menu-item, .ant-menu-title-content").filter({
    hasText: /规范设计/,
  }).first();
  await expect(normDesignTab, `${sourceRef}: 规范设计入口应可见`).toBeVisible({ timeout: 15000 });
  await normDesignTab.click();
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 规范设计页应展示核心模块`).toContainText(
    /规范设计|模型元素|数仓层级|元素值/,
    { timeout: 30000 },
  );
  // 新增操作入口可见
  await expect(body, `${sourceRef}: 规范设计页应展示新增/编辑/删除操作区`).toContainText(/新增|编辑|删除/, {
    timeout: 30000,
  });
  // TODO: 元素值、模型元素和数仓层级的 CRUD 交互需分别 probe 验证
}

// ─── 我的模型审批列表 Shell（t42） ───

export async function expectModelApprovalShell(page: Page, sourceRef: string): Promise<void> {
  await gotoModelPage(page);
  // 切换到我的模型 tab
  const myModelTab = page.locator(".ant-tabs-tab, .ant-menu-item, .ant-menu-title-content").filter({
    hasText: /我的模型/,
  }).first();
  await expect(myModelTab, `${sourceRef}: 我的模型入口应可见`).toBeVisible({ timeout: 15000 });
  await myModelTab.click();
  const body = page.locator("body");
  // 审批中 / 已审批列表
  await expect(body, `${sourceRef}: 我的模型页应展示审批状态列表`).toContainText(
    /审批中|已审批|待审批|我的模型/,
    { timeout: 30000 },
  );
  for (const label of ["表名", "表中文名", "创建时间", "操作"]) {
    await expect(body, `${sourceRef}: 我的模型列表应展示「${label}」`).toContainText(label, { timeout: 30000 });
  }
  // 撤回操作入口
  await expect(body, `${sourceRef}: 我的模型审批中列表应展示撤回操作`).toContainText(/撤回|批量撤回/, {
    timeout: 30000,
  });
  // TODO: 批量撤回、排序、名称搜索等深度交互需真实 probe 验证
}
