// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L1274-L1286;#L1294-L1306;#L1311-L1323;#L1328-L1328
// intent: SR-INTENT-2099-01-MD-033
// probe: results/20260524-mf-metadata-sidebar-01/playwright/ui-probe/probe.json
// page: _shared/pages/2099-01-lt-dq-main-flow/metadata-shell-page.ts
// generated_at: 2026-05-24T12:40:39Z
// META: {"id":"MD-033","priority":"P2/P3","title":"元数据表详情右侧信息面板标签只读 Shell 可核验"}
// SourceRefs: SR-2099-01-MD-033, SR-UI-PROBE-20260524-MF-METADATA-SIDEBAR-001, SR-SELF-RUN-20260524-MF-METADATA-SIDEBAR-001
import { expect, type Page, type Response } from "@playwright/test";

import { test } from "../../../../../../_shared/fixtures/step-screenshot";
import { gotoMetadataPage } from "../../../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-shell-page";

test.setTimeout(120000);

test("【P2/P3】元数据表详情右侧信息面板标签只读 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 搜索并打开稳定数据表 → 表详情页右侧信息面板可见", async () => {
    await openMetadataTableDetail(page, "test_table", "SR-2099-01-MD-033");
    await expect(page.locator(".metaData_details"), "SR-2099-01-MD-033: 应进入表详情页").toContainText("表详情", {
      timeout: 30000,
    });
  });

  await step("步骤2: 查看右侧基本信息 → 只读标签 Shell 与权限标签可见", async () => {
    // SourceRef: 岚图主流程用例整理.md#L1274-L1286; UI probe right_panel_基本信息.
    await expectRightPanelLabels(page, "基本信息", [
      "资产类型",
      "表来源",
      "描述信息",
      "标签",
      "我的权限",
      "DQL(查询表记录)",
      "DML(增删表记录)",
      "DDL(变更表结构)",
      "数据目录",
    ], "SR-2099-01-MD-033");
  });

  await step("步骤3: 查看右侧技术属性 → 只读技术属性标签可见", async () => {
    // SourceRef: 岚图主流程用例整理.md#L1294-L1306; UI probe right_panel_技术属性.
    await expectRightPanelLabels(page, "技术属性", [
      "表名：",
      "数据源：",
      "表创建时间：",
      "数据库：",
      "存储格式：",
      "DDL最后变更时间：",
      "存储位置：",
      "存储大小：",
      "表行数：",
      "最近同步时间：",
    ], "SR-2099-01-MD-033");
  });

  await step("步骤4: 查看右侧业务属性 → 只读业务属性标签可见", async () => {
    // SourceRef: 岚图主流程用例整理.md#L1311-L1323; UI probe right_panel_业务属性.
    await expectRightPanelLabels(page, "业务属性", ["负责人：", "表中文名："], "SR-2099-01-MD-033");
  });

  await step("步骤5: 查看右侧热度统计 → 当前可见统计面板标题 Shell 可见", async () => {
    // SourceRef: 岚图主流程用例整理.md#L1328-L1328; UI probe right_panel_热度统计.
    await expectRightPanelHeading(page, "热度统计", "SR-2099-01-MD-033");
  });
});

async function openMetadataTableDetail(page: Page, keyword: string, sourceRef: string): Promise<void> {
  await gotoMetadataPage(page, "/metaDataSearch");

  const searchInput = page.getByPlaceholder("请输入表名、表中文名、库名、数据源名").first();
  await expect(searchInput, `${sourceRef}: 数据地图搜索框应可见`).toBeVisible({ timeout: 30000 });

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

  const detailResponsePromise = waitForTableDetail(page);
  await exactResultName.click();
  const detailResponse = await detailResponsePromise;
  expect(detailResponse.status(), `${sourceRef}: 数据表详情接口应返回 200`).toBe(200);

  await expect(page.locator(".meta__name"), `${sourceRef}: 表详情头部应展示表名 ${keyword}`).toContainText(
    keyword,
    { timeout: 30000 },
  );
}

async function expectRightPanelLabels(
  page: Page,
  panelLabel: string,
  labels: readonly string[],
  sourceRef: string,
): Promise<void> {
  const sidebar = page.locator(".detailSidebar").first();
  await expect(sidebar, `${sourceRef}: 表详情右侧信息面板容器应可见`).toBeVisible({ timeout: 30000 });
  const panel =
    panelLabel === "基本信息"
      ? sidebar.locator(".detailSidebar__category").first()
      : sidebar.locator(".category__item").filter({ hasText: panelLabel }).first();
  await expect(panel, `${sourceRef}: 右侧信息面板应展示「${panelLabel}」相关内容`).toContainText(labels[0], {
    timeout: 30000,
  });
  if (panelLabel === "基本信息") {
    await expect(
      sidebar.locator(".ant-tabs-tab-active").filter({ hasText: /^基本信息$/ }).first(),
      `${sourceRef}: 右侧信息面板当前激活页签应为「基本信息」`,
    ).toBeVisible({ timeout: 30000 });
  } else {
    await expect(
      panel.locator(".dtc-block-header-title").filter({ hasText: new RegExp(`^${escapeRegExp(panelLabel)}$`) }).first(),
      `${sourceRef}: 右侧信息面板标题应为「${panelLabel}」`,
    ).toBeAttached({ timeout: 30000 });
  }
  for (const label of labels) {
    await expect(panel, `${sourceRef}: 「${panelLabel}」应展示标签「${label}」`).toContainText(label, { timeout: 30000 });
  }
}

async function expectRightPanelHeading(page: Page, panelLabel: string, sourceRef: string): Promise<void> {
  const sidebar = page.locator(".detailSidebar").first();
  await expect(sidebar, `${sourceRef}: 表详情右侧信息面板容器应可见`).toBeVisible({ timeout: 30000 });
  const panel = sidebar.locator(".category__item").filter({ hasText: panelLabel }).first();
  await expect(
    panel.locator(".dtc-block-header-title").filter({ hasText: new RegExp(`^${escapeRegExp(panelLabel)}$`) }).first(),
    `${sourceRef}: 右侧信息面板标题应为「${panelLabel}」`,
  ).toBeAttached({ timeout: 30000 });
}

function waitForQueryDetail(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/datamap/queryDetail") &&
      response.request().method() === "POST",
    { timeout: 45000 },
  );
}

function waitForTableDetail(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/dassets/v1/dataTable/queryDetail") &&
      response.request().method() === "POST",
    { timeout: 45000 },
  );
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
